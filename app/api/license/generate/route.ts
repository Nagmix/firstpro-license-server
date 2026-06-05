import { NextRequest } from "next/server";
import { requireAdmin, successResponse, unauthorizedResponse, errorResponse, checkRateLimit, getClientIp } from "@/lib/utils";
import { createLicense } from "@/lib/license";

export async function POST(request: NextRequest) {
  // Rate limit: 20 requests/hour per IP
  const clientIp = getClientIp(request);
  if (!checkRateLimit(`generate:${clientIp}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: "RATE_LIMIT_EXCEEDED" },
      { status: 429 }
    );
  }

  // Verify admin auth
  const { authorized, admin } = await requireAdmin(request);
  if (!authorized || !admin) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { license_type, max_devices, customer_name, customer_phone, notes } = body;

    if (!license_type || !["trial", "monthly", "yearly", "lifetime"].includes(license_type)) {
      return errorResponse("INVALID_LICENSE_TYPE");
    }

    const license = await createLicense({
      license_type,
      max_devices,
      customer_name,
      customer_phone,
      notes,
      created_by: admin.adminId,
    });

    return successResponse({ license }, 201);
  } catch (err: any) {
    console.error("[generate] Error:", err);
    return errorResponse(err.message || "INTERNAL_ERROR", 500);
  }
}

import { NextResponse } from "next/server";
