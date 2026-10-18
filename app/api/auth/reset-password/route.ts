import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/services/auth";
import { applySecurityChecks } from "@/lib/middleware";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function POST(req: Request) {
  const security = applySecurityChecks(req, "auth_reset_password", 5, 60_000);
  if (!security.allowed && security.errorResponse) {
    return security.errorResponse;
  }

  try {
    const body = await req.json();
    await resetPasswordWithToken(body);

    return createSuccessResponse({
      message: "Your password has been successfully reset. You may now sign in with your new credentials.",
    });
  } catch (err) {
    return createErrorResponse(err, security.requestId);
  }
}
