import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin, successResponse, unauthorizedResponse, errorResponse } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) return unauthorizedResponse();

  try {
    const { error } = await supabase
      .from("devices")
      .delete()
      .eq("id", params.deviceId);

    if (error) {
      return errorResponse(error.message);
    }

    await supabase.from("audit_logs").insert({
      action: "DEVICE_UNBOUND",
      device_id: params.deviceId,
    });

    return successResponse({});
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
