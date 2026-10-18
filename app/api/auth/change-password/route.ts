import { NextResponse } from "next/server";
import { changeUserPassword } from "@/lib/services/auth";
import { requireAuth, applySecurityChecks } from "@/lib/middleware";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function POST(req: Request) {
  const security = applySecurityChecks(req, "auth_change_password", 5, 60_000);
  if (!security.allowed && security.errorResponse) {
    return security.errorResponse;
  }

  try {
    const user = await requireAuth(req);
    const body = await req.json();

    await changeUserPassword(user.id, body);

    return createSuccessResponse({
      message: "Your password has been changed successfully. Other sessions have been revoked.",
    });
  } catch (err) {
    return createErrorResponse(err, security.requestId);
  }
}
