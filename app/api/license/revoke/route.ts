import { NextRequest, NextResponse } from "next/server";
import { revokeLicense } from "@/lib/license";
import { requireAdmin, successResponse, unauthorizedResponse, errorResponse } from "@/lib/utils";

export async function POST(request: NextRequest) {
  // Admin only
  const { authorized, admin } = await requireAdmin(request);
  if (!authorized || !admin) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { license_id } = body;

    if (!license_id) {
      return errorResponse("MISSING_LICENSE_ID");
    }

    const result = await revokeLicense(license_id);

    if (!result.success) {
      return errorResponse(result.error!);
    }

    return successResponse({});
  } catch (err: any) {
    console.error("[revoke] Error:", err);
    return errorResponse(err.message || "INTERNAL_ERROR", 500);
  }
}
