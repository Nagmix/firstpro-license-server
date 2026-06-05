import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { installation_id, record_count } = body;

    if (!installation_id || record_count === undefined) {
      return errorResponse("MISSING_REQUIRED_FIELDS");
    }

    // Upsert usage tracking
    const { error } = await supabase
      .from("usage_tracking")
      .upsert(
        {
          installation_id,
          record_count,
          last_updated: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "installation_id" }
      );

    if (error) {
      console.error("[usage/increment] DB error:", error);
      return errorResponse("DATABASE_ERROR", 500);
    }

    // Check if free user exceeding limit
    const freeLimit = parseInt(process.env.FREE_RECORD_LIMIT || "500", 10);
    const limitExceeded = record_count > freeLimit;

    return successResponse({
      synced: true,
      limit_exceeded: limitExceeded,
      free_limit: freeLimit,
    });
  } catch (err: any) {
    console.error("[usage/increment] Error:", err);
    return errorResponse(err.message || "INTERNAL_ERROR", 500);
  }
}
