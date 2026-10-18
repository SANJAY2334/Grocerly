import { NextResponse } from "next/server";
import { getSessionUser, applySecurityChecks } from "@/lib/middleware";
import { buildSessionCookieHeader } from "@/lib/auth";
import { createSession } from "@/lib/services/auth";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function POST(req: Request) {
  const security = applySecurityChecks(req, "auth_refresh", 20, 60_000);
  if (!security.allowed && security.errorResponse) {
    return security.errorResponse;
  }

  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHENTICATED", message: "Active session required to refresh." } },
        { status: 401 }
      );
    }

    const session = await createSession(user.id, user.role, {
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    const response = createSuccessResponse({
      message: "Session refreshed successfully.",
      user,
    });
    response.headers.set("Set-Cookie", buildSessionCookieHeader(session.sessionToken));
    return response;
  } catch (err) {
    return createErrorResponse(err, security.requestId);
  }
}
