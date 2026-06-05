import { NextRequest, NextResponse } from "next/server";
import { seedAdmin } from "@/lib/auth";
import { requireAdmin, successResponse, unauthorizedResponse } from "@/lib/utils";

export async function POST(request: NextRequest) {
  // Only super admin can seed
  const { authorized, admin } = await requireAdmin(request);
  if (!authorized || !admin) return unauthorizedResponse();

  try {
    await seedAdmin();
    return successResponse({ message: "Seed completed" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
