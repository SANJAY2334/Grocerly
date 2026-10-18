import { NextResponse } from "next/server";
import { registerUser } from "@/lib/services/auth";
import { applySecurityChecks } from "@/lib/middleware";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function POST(req: Request) {
  const security = applySecurityChecks(req, "auth_register", 10, 60_000);
  if (!security.allowed && security.errorResponse) {
    return security.errorResponse;
  }

  try {
    const body = await req.json();
    const result = await registerUser(body);

    return createSuccessResponse(
      {
        message: "Registration successful. Please verify your email with the 6-digit code sent to your inbox.",
        user: result.user,
        requiresVerification: result.requiresVerification,
      },
      201
    );
  } catch (err) {
    return createErrorResponse(err, security.requestId);
  }
}
