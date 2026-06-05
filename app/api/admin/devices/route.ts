import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin, successResponse, unauthorizedResponse, getPaginationParams } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) return unauthorizedResponse();

  try {
    const { limit, offset } = getPaginationParams(request);

    const { data, error, count } = await supabase
      .from("devices")
      .select("*, licenses(license_key, license_type, customer_name)", { count: "exact" })
      .order("last_seen_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return successResponse({ devices: data || [], total: count || 0 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
