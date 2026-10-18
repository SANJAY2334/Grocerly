import { NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware";
import { fetchAdminOrders } from "@/lib/services/order";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await requireRole(req, ["ADMIN", "OPS"]);

    const orders = await fetchAdminOrders();
    return createSuccessResponse({ orders });
  } catch (err) {
    return createErrorResponse(err);
  }
}
