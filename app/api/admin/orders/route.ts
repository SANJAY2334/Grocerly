import { NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware";
import { fetchAdminOrders } from "@/lib/services/order";
import { OrderModel } from "@/lib/models/Order";
import { connectToDatabase } from "@/lib/db/connection";
import { logAuditEvent } from "@/lib/logging";
import { createErrorResponse, createSuccessResponse, ValidationError, NotFoundError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await requireRole(req, ["ADMIN", "OPS"]);

    const orders = await fetchAdminOrders();
    return createSuccessResponse({ orders });
  } catch (err) {
    return createErrorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireRole(req, ["ADMIN", "OPS"]);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    let orderId = searchParams.get("orderId");

    if (!orderId) {
      try {
        const body = await req.json();
        orderId = body?.orderId;
      } catch {
        // query param fallback
      }
    }

    if (!orderId) {
      throw new ValidationError("Order ID is required to remove from fulfillment ledger.");
    }

    const order = await OrderModel.findOne({ id: orderId });
    if (!order) {
      throw new NotFoundError(`Order #${orderId} was not found.`);
    }

    // Only DELIVERED and REFUNDED terminal orders can be archived from admin
    if (order.status !== "DELIVERED" && order.status !== "REFUNDED") {
      throw new ValidationError(
        `Cannot remove order with status "${order.status}". Only completed ("DELIVERED") or terminal ("REFUNDED") orders can be archived from the operations ledger.`
      );
    }

    // Mark as archived from admin operations view, keeping user order history completely intact
    await OrderModel.updateOne(
      { id: orderId },
      {
        $set: {
          archivedFromAdmin: true,
          deletedFromAdminAt: new Date(),
        },
      }
    );

    await logAuditEvent({
      eventType: "ORDER_ARCHIVED_BY_ADMIN",
      actorId: user.id,
      targetType: "Order",
      targetId: orderId,
      outcome: "SUCCESS",
      metadata: {
        orderId,
        previousStatus: order.status,
        customerUserId: order.userId,
      },
    });

    return createSuccessResponse({
      message: `Order #${orderId} has been removed from the operations ledger. It remains safely available in the customer's dashboard order history.`,
      orderId,
    });
  } catch (err) {
    return createErrorResponse(err);
  }
}
