import { NextResponse } from "next/server";
import { getUserSessions } from "@/lib/services/auth";
import { requireAuth } from "@/lib/middleware";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const sessions = await getUserSessions(user.id);

    return createSuccessResponse({ sessions });
  } catch (err) {
    return createErrorResponse(err);
  }
}
