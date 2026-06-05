import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";

// ── License Key Generation ──

function generateLicenseKeySegment(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateLicenseKey(): string {
  return `${generateLicenseKeySegment()}-${generateLicenseKeySegment()}-${generateLicenseKeySegment()}-${generateLicenseKeySegment()}`;
}

// ── Expiration Calculation ──

export function calculateExpiration(
  licenseType: string
): string | null {
  const now = new Date();
  switch (licenseType) {
    case "trial":
      now.setDate(now.getDate() + 14);
      return now.toISOString();
    case "monthly":
      now.setDate(now.getDate() + 30);
      return now.toISOString();
    case "yearly":
      now.setDate(now.getDate() + 365);
      return now.toISOString();
    case "lifetime":
      return null; // Never expires
    default:
      now.setDate(now.getDate() + 30);
      return now.toISOString();
  }
}

// ── Create License ──

export interface CreateLicenseParams {
  license_type: "trial" | "monthly" | "yearly" | "lifetime";
  max_devices?: number;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
  created_by?: string;
}

export async function createLicense(params: CreateLicenseParams) {
  const licenseKey = generateLicenseKey();
  const expiresAt = calculateExpiration(params.license_type);
  const maxDevices = params.max_devices || parseInt(
    process.env.MAX_DEVICES_PER_LICENSE || "1",
    10
  );

  const { data, error } = await supabase
    .from("licenses")
    .insert({
      license_key: licenseKey,
      license_type: params.license_type,
      status: "inactive",
      expires_at: expiresAt,
      max_devices: maxDevices,
      customer_name: params.customer_name,
      customer_phone: params.customer_phone,
      notes: params.notes,
      created_by: params.created_by,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create license: ${error.message}`);
  }

  return data;
}

// ── Activate License ──

export interface ActivateParams {
  license_key: string;
  device_fingerprint: string;
  installation_id: string;
  app_version?: string;
  os_version?: string;
  device_model?: string;
}

export async function activateLicense(params: ActivateParams) {
  const { license_key, device_fingerprint, installation_id, app_version, os_version, device_model } = params;

  // 1. Find the license
  const { data: license, error: licenseError } = await supabase
    .from("licenses")
    .select("*")
    .eq("license_key", license_key)
    .single();

  if (licenseError || !license) {
    return { success: false, error: "LICENSE_NOT_FOUND" };
  }

  // 2. Check if revoked
  if (license.status === "revoked") {
    return { success: false, error: "LICENSE_REVOKED" };
  }

  // 3. Check if expired
  if (license.expires_at && new Date(license.expires_at) < new Date()) {
    await supabase
      .from("licenses")
      .update({ status: "expired" })
      .eq("id", license.id);
    return { success: false, error: "LICENSE_EXPIRED" };
  }

  // 4. Check if device is blocked
  const { data: blockedDevice } = await supabase
    .from("devices")
    .select("id, is_blocked")
    .eq("device_fingerprint", device_fingerprint)
    .eq("license_id", license.id)
    .single();

  if (blockedDevice?.is_blocked) {
    return { success: false, error: "DEVICE_BLOCKED" };
  }

  // 5. Count devices bound to this license
  const { count: deviceCount } = await supabase
    .from("devices")
    .select("*", { count: "exact", head: true })
    .eq("license_id", license.id);

  // 6. Check if device already bound
  const { data: existingDevice } = await supabase
    .from("devices")
    .select("*")
    .eq("device_fingerprint", device_fingerprint)
    .eq("license_id", license.id)
    .single();

  if (existingDevice) {
    // Device already registered — update last_seen_at
    await supabase
      .from("devices")
      .update({
        last_seen_at: new Date().toISOString(),
        installation_id: installation_id, // Update to current installation
        app_version: app_version,
        os_version: os_version,
      })
      .eq("id", existingDevice.id);
  } else {
    // New device
    if ((deviceCount || 0) >= license.max_devices) {
      return { success: false, error: "MAX_DEVICES_EXCEEDED" };
    }

    await supabase.from("devices").insert({
      device_fingerprint,
      installation_id,
      license_id: license.id,
      app_version,
      os_version,
      device_model,
    });
  }

  // 7. Activate license if it was inactive
  if (license.status === "inactive") {
    await supabase
      .from("licenses")
      .update({ status: "active" })
      .eq("id", license.id);
  }

  // 8. Log audit
  await supabase.from("audit_logs").insert({
    action: "LICENSE_ACTIVATED",
    license_id: license.id,
    details: {
      device_fingerprint,
      installation_id,
      device_model,
    },
  });

  return {
    success: true,
    license: {
      id: license.id,
      license_key: license.license_key,
      license_type: license.license_type,
      status: "active",
      expires_at: license.expires_at,
      max_devices: license.max_devices,
    },
  };
}

// ── Validate License ──

export interface ValidateParams {
  license_key: string;
  device_fingerprint: string;
  installation_id: string;
  record_count?: number;
}

export async function validateLicense(params: ValidateParams) {
  const { license_key, device_fingerprint, installation_id, record_count } = params;

  // 1. Find the license
  const { data: license, error } = await supabase
    .from("licenses")
    .select("*")
    .eq("license_key", license_key)
    .single();

  if (error || !license) {
    return { success: false, error: "LICENSE_NOT_FOUND" };
  }

  // 2. Check if revoked
  if (license.status === "revoked") {
    return { success: false, error: "LICENSE_REVOKED", status: "revoked" };
  }

  // 3. Check expiration
  if (license.expires_at && new Date(license.expires_at) < new Date()) {
    await supabase
      .from("licenses")
      .update({ status: "expired" })
      .eq("id", license.id);
    return { success: false, error: "LICENSE_EXPIRED", status: "expired" };
  }

  // 4. Check device authorization
  const { data: device } = await supabase
    .from("devices")
    .select("id, is_blocked")
    .eq("license_id", license.id)
    .eq("device_fingerprint", device_fingerprint)
    .single();

  if (!device) {
    return { success: false, error: "DEVICE_NOT_AUTHORIZED" };
  }

  if (device.is_blocked) {
    return { success: false, error: "DEVICE_BLOCKED" };
  }

  // 5. Update last_seen_at
  await supabase
    .from("devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", device.id);

  // 6. Update usage tracking
  if (record_count !== undefined) {
    await supabase
      .from("usage_tracking")
      .upsert(
        {
          installation_id,
          record_count,
          last_updated: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "installation_id" }
      );
  }

  // 7. Determine features
  const isPremium =
    license.status === "active" &&
    license.license_type !== "trial";

  return {
    success: true,
    status: "active",
    license_type: license.license_type,
    expires_at: license.expires_at,
    device_bound: true,
    features: {
      max_records: isPremium ? -1 : parseInt(process.env.FREE_RECORD_LIMIT || "500", 10),
      ads_enabled: !isPremium,
      premium_features: isPremium,
    },
  };
}

// ── Rebind Device ──

export interface RebindParams {
  license_key: string;
  old_device_fingerprint: string;
  new_device_fingerprint: string;
  installation_id: string;
}

export async function rebindDevice(params: RebindParams) {
  const { license_key, old_device_fingerprint, new_device_fingerprint, installation_id } = params;

  const { data: license, error } = await supabase
    .from("licenses")
    .select("id, status")
    .eq("license_key", license_key)
    .single();

  if (error || !license) {
    return { success: false, error: "LICENSE_NOT_FOUND" };
  }

  if (license.status !== "active") {
    return { success: false, error: "LICENSE_NOT_ACTIVE" };
  }

  // Find old device
  const { data: oldDevice } = await supabase
    .from("devices")
    .select("id")
    .eq("license_id", license.id)
    .eq("device_fingerprint", old_device_fingerprint)
    .single();

  if (!oldDevice) {
    return { success: false, error: "OLD_DEVICE_NOT_FOUND" };
  }

  // Update device fingerprint
  const { error: updateError } = await supabase
    .from("devices")
    .update({
      device_fingerprint: new_device_fingerprint,
      installation_id: installation_id,
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", oldDevice.id);

  if (updateError) {
    return { success: false, error: "REBIND_FAILED" };
  }

  // Log audit
  await supabase.from("audit_logs").insert({
    action: "DEVICE_REBIND",
    license_id: license.id,
    details: {
      old_fingerprint: old_device_fingerprint,
      new_fingerprint: new_device_fingerprint,
    },
  });

  return { success: true };
}

// ── Revoke License ──

export async function revokeLicense(licenseId: string) {
  // 1. Update license status
  const { error } = await supabase
    .from("licenses")
    .update({ status: "revoked" })
    .eq("id", licenseId);

  if (error) {
    return { success: false, error: "REVOKE_FAILED" };
  }

  // 2. Block all devices
  await supabase
    .from("devices")
    .update({ is_blocked: true })
    .eq("license_id", licenseId);

  // 3. Log audit
  await supabase.from("audit_logs").insert({
    action: "LICENSE_REVOKED",
    license_id: licenseId,
  });

  return { success: true };
}

// ── Get License Status ──

export async function getLicenseStatus(licenseKey: string) {
  const { data: license, error } = await supabase
    .from("licenses")
    .select("id, license_key, status, license_type, expires_at, max_devices")
    .eq("license_key", licenseKey)
    .single();

  if (error || !license) {
    return { success: false, error: "LICENSE_NOT_FOUND" };
  }

  const { count: deviceCount } = await supabase
    .from("devices")
    .select("*", { count: "exact", head: true })
    .eq("license_id", license.id);

  const daysRemaining = license.expires_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(license.expires_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return {
    success: true,
    license_key: license.license_key,
    status: license.status,
    license_type: license.license_type,
    expires_at: license.expires_at,
    devices_count: deviceCount || 0,
    max_devices: license.max_devices,
    days_remaining: daysRemaining,
  };
}
