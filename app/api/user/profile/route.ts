import { NextResponse } from "next/server";
import { requireAuth, applySecurityChecks } from "@/lib/middleware";
import { UpdateProfileSchema } from "@/lib/validators";
import { UserModel } from "@/lib/models/User";
import { connectToDatabase } from "@/lib/db/connection";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    await connectToDatabase();

    const storedUser = await UserModel.findOne({ id: user.id }, { passwordHash: 0 }).lean();
    if (!storedUser) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User account not found." } },
        { status: 404 }
      );
    }

    return createSuccessResponse({
      user: {
        id: storedUser.id,
        name: storedUser.name,
        email: storedUser.email,
        phone: storedUser.phone,
        role: storedUser.role,
        verified: storedUser.verified,
        addresses: storedUser.addresses || [],
        createdAt: storedUser.createdAt instanceof Date ? storedUser.createdAt.toISOString() : String(storedUser.createdAt),
      },
    });
  } catch (err) {
    return createErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  const security = applySecurityChecks(req, "user_profile_update", 10, 60_000);
  if (!security.allowed && security.errorResponse) {
    return security.errorResponse;
  }

  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const validated = UpdateProfileSchema.parse(body);

    await connectToDatabase();

    const updates: Record<string, unknown> = {};
    if (validated.name) updates.name = validated.name.trim();
    if (validated.phone !== undefined) updates.phone = validated.phone?.trim();

    const updatedUser = await UserModel.findOneAndUpdate(
      { id: user.id },
      { $set: updates },
      { new: true, projection: { passwordHash: 0 } }
    ).lean();

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User account not found." } },
        { status: 404 }
      );
    }

    return createSuccessResponse({
      message: "Profile updated successfully.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        verified: updatedUser.verified,
        addresses: updatedUser.addresses || [],
        createdAt: updatedUser.createdAt instanceof Date ? updatedUser.createdAt.toISOString() : String(updatedUser.createdAt),
      },
    });
  } catch (err) {
    return createErrorResponse(err, security.requestId);
  }
}
