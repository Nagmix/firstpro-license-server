import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin, successResponse, unauthorizedResponse } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) return unauthorizedResponse();

  try {
    const [licenseRes, devicesRes] = await Promise.all([
      supabase.from("licenses").select("*").eq("id", params.id).single(),
      supabase.from("devices").select("*").eq("license_id", params.id).order("last_seen_at", { ascending: false }),
    ]);

    if (licenseRes.error) {
      return NextResponse.json({ success: false, error: "LICENSE_NOT_FOUND" }, { status: 404 });
    }

    return successResponse({
      license: licenseRes.data,
      devices: devicesRes.data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
