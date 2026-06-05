import { SignJWT, jwtVerify } from "jose";
import { compare, hash } from "bcryptjs";
import { supabase } from "./supabase";

const JWT_SECRET = new TextEncoder().encode(
  process.env.SUPABASE_JWT_SECRET || "fallback-secret-change-me"
);

const LICENSE_SECRET = new TextEncoder().encode(
  process.env.LICENSE_SECRET_KEY || "fallback-license-secret"
);

const JWT_EXPIRY_DAYS = parseInt(process.env.JWT_EXPIRY_DAYS || "30", 10);

export interface AdminTokenPayload {
  adminId: string;
  email: string;
  role: string;
}

export interface DeviceTokenPayload {
  licenseId: string;
  deviceFingerprint: string;
  installationId: string;
  licenseType: string;
}

// ── Admin JWT ──

export async function generateAdminToken(
  payload: AdminTokenPayload
): Promise<string> {
  return new SignJWT({ ...payload, type: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY_DAYS}d`)
    .sign(JWT_SECRET);
}

export async function verifyAdminToken(
  token: string
): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "admin") return null;
    return {
      adminId: payload.adminId as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

// ── Device/Session JWT ──

export async function generateDeviceToken(
  payload: DeviceTokenPayload
): Promise<string> {
  return new SignJWT({ ...payload, type: "device" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY_DAYS}d`)
    .sign(LICENSE_SECRET);
}

export async function verifyDeviceToken(
  token: string
): Promise<DeviceTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, LICENSE_SECRET);
    if (payload.type !== "device") return null;
    return {
      licenseId: payload.licenseId as string,
      deviceFingerprint: payload.deviceFingerprint as string,
      installationId: payload.installationId as string,
      licenseType: payload.licenseType as string,
    };
  } catch {
    return null;
  }
}

// ── Admin Authentication ──

export async function authenticateAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; admin?: AdminTokenPayload; token?: string; error?: string }> {
  const { data: admin, error } = await supabase
    .from("admins")
    .select("id, email, role, password_hash")
    .eq("email", email)
    .single();

  if (error || !admin) {
    return { success: false, error: "INVALID_CREDENTIALS" };
  }

  const passwordMatch = await compare(password, admin.password_hash);
  if (!passwordMatch) {
    return { success: false, error: "INVALID_CREDENTIALS" };
  }

  // Update last_login
  await supabase
    .from("admins")
    .update({ last_login: new Date().toISOString() })
    .eq("id", admin.id);

  const payload: AdminTokenPayload = {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
  };

  const token = await generateAdminToken(payload);

  return { success: true, admin: payload, token };
}

// ── Seed Admin ──

export async function seedAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@digitalplanetx.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@2026";

  const { data: existing } = await supabase
    .from("admins")
    .select("id")
    .eq("email", adminEmail)
    .single();

  if (existing) return;

  const passwordHash = await hash(adminPassword, 12);

  await supabase.from("admins").insert({
    email: adminEmail,
    password_hash: passwordHash,
    role: "super_admin",
  });

  console.log(`[seed] Admin created: ${adminEmail}`);
}

// ── Hash password for new admins ──
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashStr: string
): Promise<boolean> {
  return compare(password, hashStr);
}
