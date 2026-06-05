import { NextRequest, NextResponse } from "next/server";
import { getLicenseStatus } from "@/lib/license";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const license_key = url.searchParams.get("license_key");

    if (!license_key) {
      return errorResponse("MISSING_LICENSE_KEY");
    }

    const result = await getLicenseStatus(license_key);

    if (!result.success) {
      return errorResponse(result.error!);
    }

    return successResponse(result);
  } catch (err: any) {
    console.error("[status] Error:", err);
    return errorResponse(err.message || "INTERNAL_ERROR", 500);
  }
}
