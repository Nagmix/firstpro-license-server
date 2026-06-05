import { NextRequest, NextResponse } from "next/server";
import { validateLicense } from "@/lib/license";
import { checkRateLimit, successResponse, errorResponse } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, device_fingerprint, installation_id, record_count } = body;

    if (!license_key || !device_fingerprint || !installation_id) {
      return errorResponse("MISSING_REQUIRED_FIELDS");
    }

    // Rate limit: 60 requests/hour per device
    if (!checkRateLimit(`validate:${device_fingerprint}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }

    const result = await validateLicense({
      license_key,
      device_fingerprint,
      installation_id,
      record_count,
    });

    if (!result.success) {
      const status = result.status === "expired" ? 403 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return successResponse({
      status: result.status,
      license_type: result.license_type,
      expires_at: result.expires_at,
      device_bound: result.device_bound,
      features: result.features,
    });
  } catch (err: any) {
    console.error("[validate] Error:", err);
    return errorResponse(err.message || "INTERNAL_ERROR", 500);
  }
}
