import { NextResponse } from "next/server";
import { ResendOtpSchema } from "@/lib/validators";
import { createOtpChallenge } from "@/lib/services/otp";
import { sendVerificationOtpEmail } from "@/lib/services/email";
import { applySecurityChecks } from "@/lib/middleware";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function POST(req: Request) {
  const security = applySecurityChecks(req, "auth_resend_otp", 5, 60_000);
  if (!security.allowed && security.errorResponse) {
    return security.errorResponse;
  }

  try {
    const body = await req.json();
    const validated = ResendOtpSchema.parse(body);

    const challenge = await createOtpChallenge({
      email: validated.email,
      purpose: validated.purpose,
    });

    await sendVerificationOtpEmail(validated.email, "Customer", challenge.otp);

    return createSuccessResponse({
      message: "If an eligible unverified account exists, a new verification code has been dispatched to your email.",
    });
  } catch (err) {
    return createErrorResponse(err, security.requestId);
  }
}
