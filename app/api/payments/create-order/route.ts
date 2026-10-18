import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { OrderModel } from "@/lib/models/Order";
import { createRazorpayServerOrder } from "@/lib/payments";
import { toPaise } from "@/lib/pricing";
import { hasMaliciousKeys, sanitizeString } from "@/lib/validation";
import { applySecurityChecks, requireAuth } from "@/lib/middleware";

export async function POST(req: Request) {
  const security = applySecurityChecks(req, "payment_create_order", 10, 60_000);
  if (!security.allowed && security.errorResponse) {
    return security.errorResponse;
  }

  try {
    const user = await requireAuth(req);
    const body = await req.json();
    if (!body || typeof body !== "object" || hasMaliciousKeys(body)) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const orderId = sanitizeString(body.orderId, 60);
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    await connectToDatabase();
    const order = await OrderModel.findOne({ id: orderId });
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (order.status !== "PENDING_PAYMENT" && order.status !== "PAYMENT_FAILED") {
      return NextResponse.json(
        { error: `Order is already in ${order.status} state and cannot initiate a new payment.` },
        { status: 409 }
      );
    }

    const payableAmount = order.total || order.pricing?.finalPayable || 0;
    const amountPaise = toPaise(payableAmount);
    const rzpResult = await createRazorpayServerOrder(order.id, amountPaise);

    if (!rzpResult.success || !rzpResult.razorpayOrderId) {
      return NextResponse.json(
        {
          error: rzpResult.errorMessage || "Payment provider unavailable.",
          errorCode: rzpResult.errorCode || "PAYMENT_PROVIDER_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    order.razorpayOrderId = rzpResult.razorpayOrderId;
    await order.save();

    return NextResponse.json(
      {
        orderId: order.id,
        razorpayOrderId: rzpResult.razorpayOrderId,
        amountPaise: rzpResult.amountPaise,
        currency: "INR",
        keyId: rzpResult.keyId,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create payment order." },
      { status: 503 }
    );
  }
}
