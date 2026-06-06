import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy-initialised Supabase clients.
// Next.js runs route-module top-level code at BUILD time where the
// environment variables may not be available.  By deferring client
// creation to the first actual request we avoid the
// "supabaseUrl is required" build-time crash.

let _supabase: SupabaseClient | null = null;
let _supabasePublic: SupabaseClient | null = null;

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}. ` +
      `Make sure it is set in your Vercel project settings or .env.local file.`
    );
  }
  return value;
}

/** Admin client with service role — full access, bypasses RLS */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = getEnvOrThrow("NEXT_PUBLIC_SUPABASE_URL");
    const key = getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY");
    _supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabase;
}

/** Public client with anon key — limited access */
export function getSupabasePublic(): SupabaseClient {
  if (!_supabasePublic) {
    const url = getEnvOrThrow("NEXT_PUBLIC_SUPABASE_URL");
    const key = getEnvOrThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    _supabasePublic = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabasePublic;
}

// Legacy named exports (lazy getter wrappers) — keeps existing imports working
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

export const supabasePublic = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabasePublic() as any)[prop];
  },
});
