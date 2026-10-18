import { NextResponse } from "next/server";
import { revokeSession } from "@/lib/services/auth";
import { requireAuth } from "@/lib/middleware";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const revoked = await revokeSession(params.id, user.id);
    if (!revoked) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Session not found." } },
        { status: 404 }
      );
    }

    return createSuccessResponse({ message: "Session revoked successfully." });
  } catch (err) {
    return createErrorResponse(err);
  }
}
