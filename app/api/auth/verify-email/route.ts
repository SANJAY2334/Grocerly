import { NextResponse } from "next/server";
import { verifyUserEmail } from "@/lib/services/auth";
import { buildSessionCookieHeader } from "@/lib/auth";
import { VerifyEmailSchema } from "@/lib/validators";
import { applySecurityChecks } from "@/lib/middleware";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function POST(req: Request) {
  const security = applySecurityChecks(req, "auth_verify_email", 15, 60_000);
  if (!security.allowed && security.errorResponse) {
    return security.errorResponse;
  }

  try {
    const body = await req.json();
    const validated = VerifyEmailSchema.parse(body);

    const result = await verifyUserEmail(validated.email, validated.otp);

    const response = createSuccessResponse({
      message: "Email successfully verified! Welcome to Grocerly.",
      user: result.user,
    });

    response.headers.set("Set-Cookie", buildSessionCookieHeader(result.sessionToken));
    return response;
  } catch (err) {
    return createErrorResponse(err, security.requestId);
  }
}
