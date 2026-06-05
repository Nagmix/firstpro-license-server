import { NextRequest, NextResponse } from "next/server";
import { activateLicense } from "@/lib/license";
import { generateDeviceToken } from "@/lib/auth";
import { checkRateLimit, successResponse, errorResponse, getClientIp } from "@/lib/utils";

export async function POST(request: NextRequest) {
  // Rate limit: 5 requests/hour per device fingerprint
  const clientIp = getClientIp(request);

  try {
    const body = await request.json();
    const { license_key, device_fingerprint, installation_id, app_version, os_version, device_model } = body;

    if (!license_key || !device_fingerprint || !installation_id) {
      return errorResponse("MISSING_REQUIRED_FIELDS");
    }

    // Rate limit per device fingerprint
    if (!checkRateLimit(`activate:${device_fingerprint}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }

    const result = await activateLicense({
      license_key,
      device_fingerprint,
      installation_id,
      app_version,
      os_version,
      device_model,
    });

    if (!result.success) {
      return errorResponse(result.error!);
    }

    // Generate session token
    const sessionToken = await generateDeviceToken({
      licenseId: result.license!.id,
      deviceFingerprint: device_fingerprint,
      installationId: installation_id,
      licenseType: result.license!.license_type,
    });

    return successResponse({
      status: "active",
      license_type: result.license!.license_type,
      expires_at: result.license!.expires_at,
      device_bound: true,
      session_token: sessionToken,
      grace_period_days: 7,
    });
  } catch (err: any) {
    console.error("[activate] Error:", err);
    return errorResponse(err.message || "INTERNAL_ERROR", 500);
  }
}
