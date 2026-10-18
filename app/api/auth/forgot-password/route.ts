import { NextResponse } from "next/server";
import { ForgotPasswordSchema } from "@/lib/validators";
import { requestPasswordReset } from "@/lib/services/auth";
import { applySecurityChecks } from "@/lib/middleware";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function POST(req: Request) {
  const security = applySecurityChecks(req, "auth_forgot_password", 5, 60_000);
  if (!security.allowed && security.errorResponse) {
    return security.errorResponse;
  }

  try {
    const body = await req.json();
    const validated = ForgotPasswordSchema.parse(body);

    await requestPasswordReset(validated.email);

    // Anti-enumeration: Always return 200 with standard response
    return createSuccessResponse({
      message: "If an account matches that email address, a password reset link has been dispatched.",
    });
  } catch (err) {
    return createErrorResponse(err, security.requestId);
  }
}
