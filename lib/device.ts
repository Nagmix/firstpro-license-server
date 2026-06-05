import { supabase } from "./supabase";

// ── Device Fingerprint Validation ──

export function isValidDeviceFingerprint(fingerprint: string): boolean {
  // SHA-256 hex: 64 chars
  return /^[a-f0-9]{64}$/i.test(fingerprint);
}

export function isValidInstallationId(id: string): boolean {
  // UUID v4 format
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

// ── Detect Suspicious Activity ──

export async function checkSuspiciousActivity(
  deviceFingerprint: string,
  installationId: string
): Promise<{ suspicious: boolean; reason?: string }> {
  // 1. Check if same fingerprint is used with multiple licenses
  const { data: devicesWithFingerprint } = await supabase
    .from("devices")
    .select("license_id")
    .eq("device_fingerprint", deviceFingerprint);

  if (devicesWithFingerprint && devicesWithFingerprint.length > 2) {
    // Same device fingerprint with 3+ different licenses — suspicious
    return {
      suspicious: true,
      reason: "SAME_FINGERPRINT_MULTIPLE_LICENSES",
    };
  }

  // 2. Check if installation_id changed fingerprint recently
  const { data: devicesWithInstallId } = await supabase
    .from("devices")
    .select("device_fingerprint, last_seen_at")
    .eq("installation_id", installationId)
    .order("last_seen_at", { ascending: false })
    .limit(5);

  if (devicesWithInstallId && devicesWithInstallId.length > 1) {
    const fingerprints = new Set(
      devicesWithInstallId.map((d) => d.device_fingerprint)
    );
    if (fingerprints.size > 1) {
      return {
        suspicious: true,
        reason: "INSTALLATION_ID_FINGERPRINT_MISMATCH",
      };
    }
  }

  return { suspicious: false };
}

// ── Get Device Info ──

export async function getDevicesForLicense(licenseId: string) {
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("license_id", licenseId)
    .order("last_seen_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getAllDevices(limit = 50, offset = 0) {
  const { data, error, count } = await supabase
    .from("devices")
    .select("*, licenses(license_key, license_type, customer_name)", { count: "exact" })
    .order("last_seen_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { devices: [], total: 0 };
  return { devices: data || [], total: count || 0 };
}

export async function blockDevice(deviceId: string, blocked: boolean) {
  const { error } = await supabase
    .from("devices")
    .update({ is_blocked: blocked })
    .eq("id", deviceId);

  if (error) return { success: false, error: error.message };

  await supabase.from("audit_logs").insert({
    action: blocked ? "DEVICE_BLOCKED" : "DEVICE_UNBLOCKED",
    device_id: deviceId,
  });

  return { success: true };
}

export async function unbindDevice(deviceId: string) {
  const { error } = await supabase
    .from("devices")
    .delete()
    .eq("id", deviceId);

  if (error) return { success: false, error: error.message };

  await supabase.from("audit_logs").insert({
    action: "DEVICE_UNBOUND",
    device_id: deviceId,
  });

  return { success: true };
}
