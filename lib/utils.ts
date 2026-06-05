import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "./auth";

// ── Response Helpers ──

export function successResponse(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}

export function rateLimitResponse() {
  return NextResponse.json(
    { success: false, error: "RATE_LIMIT_EXCEEDED" },
    { status: 429 }
  );
}

// ── Admin Auth Middleware Helper ──

export async function requireAdmin(
  request: NextRequest
): Promise<{ authorized: boolean; admin?: { adminId: string; email: string; role: string } }> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { authorized: false };
  }

  const token = authHeader.substring(7);
  const admin = await verifyAdminToken(token);

  if (!admin) {
    return { authorized: false };
  }

  return { authorized: true, admin };
}

// ── Rate Limiting (in-memory, per-instance) ──

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  rateLimitMap.forEach((entry, key) => {
    if (entry.resetAt < now) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => rateLimitMap.delete(key));
}, 10 * 60 * 1000);

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

// ── Get Client IP ──

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ── License Key Validation ──

export function isValidLicenseKey(key: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key);
}

// ── Pagination Helper ──

export function getPaginationParams(request: NextRequest): {
  page: number;
  limit: number;
  offset: number;
} {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10))
  );
  return { page, limit, offset: (page - 1) * limit };
}
