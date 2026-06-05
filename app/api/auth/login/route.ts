import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { checkRateLimit } from "@/lib/utils";

export async function POST(request: NextRequest) {
  // Rate limit: 10 login attempts per hour per IP
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`login:${clientIp}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: "RATE_LIMIT_EXCEEDED" },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("MISSING_EMAIL_OR_PASSWORD");
    }

    const result = await authenticateAdmin(email, password);

    if (!result.success) {
      return errorResponse(result.error!);
    }

    return successResponse({
      token: result.token,
      admin: {
        id: result.admin!.adminId,
        email: result.admin!.email,
        role: result.admin!.role,
      },
    });
  } catch (err: any) {
    console.error("[auth/login] Error:", err);
    return errorResponse(err.message || "INTERNAL_ERROR", 500);
  }
}
