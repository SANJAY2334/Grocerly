import { NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware";
import { UserModel } from "@/lib/models/User";
import { connectToDatabase } from "@/lib/db/connection";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await requireRole(req, ["ADMIN"]);
    await connectToDatabase();

    const dbUsers = await UserModel.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
    return createSuccessResponse({ users: dbUsers });
  } catch (err) {
    return createErrorResponse(err);
  }
}
