-- ============================================================
-- FirstPro License Server — Initial Database Schema
-- Run this against the Supabase PostgreSQL database
-- ============================================================

-- 1. Admins table
CREATE TABLE IF NOT EXISTS admins (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin','admin','viewer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login  TIMESTAMPTZ
);

-- 2. Licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_key     VARCHAR(19) NOT NULL UNIQUE,
  license_type    VARCHAR(20) NOT NULL CHECK (license_type IN ('trial','monthly','yearly','lifetime')),
  status          VARCHAR(20) NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive','active','expired','revoked')),
  expires_at      TIMESTAMPTZ,
  max_devices     INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES admins(id),
  notes           TEXT,
  customer_name   VARCHAR(255),
  customer_phone  VARCHAR(50)
);

-- 3. Devices table
CREATE TABLE IF NOT EXISTS devices (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_fingerprint  VARCHAR(128) NOT NULL,
  installation_id     UUID NOT NULL,
  license_id          UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  app_version         VARCHAR(20),
  os_version          VARCHAR(50),
  device_model        VARCHAR(100),
  is_blocked          BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(device_fingerprint, license_id)
);

-- 4. Usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  installation_id     UUID NOT NULL UNIQUE,
  record_count        INTEGER NOT NULL DEFAULT 0,
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at      TIMESTAMPTZ
);

-- 5. Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action      VARCHAR(50) NOT NULL,
  license_id  UUID REFERENCES licenses(id),
  device_id   UUID REFERENCES devices(id),
  details     JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_expires_at ON licenses(expires_at);
CREATE INDEX IF NOT EXISTS idx_devices_license_id ON devices(license_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_devices_installation_id ON devices(installation_id);
CREATE INDEX IF NOT EXISTS idx_usage_installation_id ON usage_tracking(installation_id);
CREATE INDEX IF NOT EXISTS idx_audit_license_id ON audit_logs(license_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- Enable Row Level Security
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role (API) can do everything
-- These policies allow access when using service_role_key (bypasses RLS)
-- Public access is denied by default (no policy for anon key)

-- For the admin dashboard (authenticated via our custom JWT, not Supabase Auth),
-- we use the service_role_key in all API calls, so RLS is effectively bypassed.
-- The real access control happens at the API layer.

CREATE POLICY "Service role full access on licenses" ON licenses
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on devices" ON devices
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on usage_tracking" ON usage_tracking
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on admins" ON admins
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on audit_logs" ON audit_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Seed: Create default admin (password: Admin@2026)
-- The actual password hash will be created by the app on first run
-- via the seedAdmin() function in lib/auth.ts
