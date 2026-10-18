import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/services/auth";
import { buildSessionCookieHeader } from "@/lib/auth";
import { applySecurityChecks, extractRequestId } from "@/lib/middleware";
import { getClientIp } from "@/lib/security";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function POST(req: Request) {
  const security = applySecurityChecks(req, "auth_login", 10, 60_000);
  if (!security.allowed && security.errorResponse) {
    return security.errorResponse;
  }

  try {
    const body = await req.json();
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await authenticateUser(body, { ip, userAgent });

    const response = createSuccessResponse({
      user: result.user,
      sessionId: result.sessionId,
    });

    response.headers.set("Set-Cookie", buildSessionCookieHeader(result.sessionToken));
    return response;
  } catch (err: unknown) {
    // If user's email is not verified, return 403 with code EMAIL_NOT_VERIFIED
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "EMAIL_NOT_VERIFIED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_NOT_VERIFIED",
            message: "Your email address is not yet verified. A fresh 6-digit verification code has been dispatched to your inbox.",
          },
          requestId: security.requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    return createErrorResponse(err, security.requestId);
  }
}
