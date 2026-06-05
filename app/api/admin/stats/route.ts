import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin, successResponse, unauthorizedResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) return unauthorizedResponse();

  try {
    const [activeLicenses, expiredLicenses, revokedLicenses, inactiveLicenses, totalDevices] =
      await Promise.all([
        supabase.from("licenses").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("licenses").select("*", { count: "exact", head: true }).eq("status", "expired"),
        supabase.from("licenses").select("*", { count: "exact", head: true }).eq("status", "revoked"),
        supabase.from("licenses").select("*", { count: "exact", head: true }).eq("status", "inactive"),
        supabase.from("devices").select("*", { count: "exact", head: true }),
      ]);

    return successResponse({
      stats: {
        activeLicenses: activeLicenses.count || 0,
        expiredLicenses: expiredLicenses.count || 0,
        revokedLicenses: revokedLicenses.count || 0,
        inactiveLicenses: inactiveLicenses.count || 0,
        totalDevices: totalDevices.count || 0,
        todayActivations: 0, // Can be calculated from audit_logs
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
