import { NextResponse } from "next/server";
import { getSessionUser, requireAuth } from "@/lib/middleware";
import { UserModel } from "@/lib/models/User";
import { connectToDatabase } from "@/lib/db/connection";
import { validateDeliveryAddress } from "@/lib/validation";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return createSuccessResponse({ user: null });
    }

    await connectToDatabase();
    const dbAccount = await UserModel.findOne({ id: user.id }, { passwordHash: 0 }).lean();
    const enrichedUser = dbAccount
      ? {
          id: dbAccount.id,
          name: dbAccount.name,
          email: dbAccount.email,
          phone: dbAccount.phone,
          role: dbAccount.role,
          verified: dbAccount.verified,
          addresses: dbAccount.addresses || [],
          createdAt: dbAccount.createdAt instanceof Date ? dbAccount.createdAt.toISOString() : String(dbAccount.createdAt),
        }
      : user;

    return createSuccessResponse({ user: enrichedUser });
  } catch (err) {
    return createErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const addrCheck = validateDeliveryAddress(body.address || body);
    if (!addrCheck.valid || !addrCheck.data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: addrCheck.errors[0] || "Invalid address format.",
            details: addrCheck.errors,
          },
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const newAddress = {
      ...addrCheck.data,
      id: `addr_${Date.now()}`,
    };

    const updatedUser = await UserModel.findOneAndUpdate(
      { id: user.id },
      { $push: { addresses: newAddress } },
      { new: true, projection: { passwordHash: 0 } }
    ).lean();

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User account not found." } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
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
        address: newAddress,
      },
      { status: 201 }
    );
  } catch (err) {
    return createErrorResponse(err);
  }
}
