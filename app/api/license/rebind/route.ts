import { NextRequest, NextResponse } from "next/server";
import { rebindDevice } from "@/lib/license";
import { checkRateLimit, successResponse, errorResponse } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, old_device_fingerprint, new_device_fingerprint, installation_id } = body;

    if (!license_key || !old_device_fingerprint || !new_device_fingerprint || !installation_id) {
      return errorResponse("MISSING_REQUIRED_FIELDS");
    }

    // Rate limit: 3 requests/hour per device
    if (!checkRateLimit(`rebind:${old_device_fingerprint}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }

    const result = await rebindDevice({
      license_key,
      old_device_fingerprint,
      new_device_fingerprint,
      installation_id,
    });

    if (!result.success) {
      return errorResponse(result.error!);
    }

    return successResponse({});
  } catch (err: any) {
    console.error("[rebind] Error:", err);
    return errorResponse(err.message || "INTERNAL_ERROR", 500);
  }
}
