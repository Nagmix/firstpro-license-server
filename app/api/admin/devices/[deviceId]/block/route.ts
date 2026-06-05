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
    const body = await request.json();
    const { blocked } = body;

    if (blocked === undefined) {
      return errorResponse("MISSING_BLOCKED_FIELD");
    }

    const { error } = await supabase
      .from("devices")
      .update({ is_blocked: blocked })
      .eq("id", params.deviceId);

    if (error) {
      return errorResponse(error.message);
    }

    await supabase.from("audit_logs").insert({
      action: blocked ? "DEVICE_BLOCKED" : "DEVICE_UNBLOCKED",
      device_id: params.deviceId,
    });

    return successResponse({});
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
