import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { OrderModel } from "@/lib/models/Order";
import { updateOrderStatus } from "@/lib/services/order";
import { verifyRazorpayPaymentSignature } from "@/lib/payments";
import { hasMaliciousKeys, sanitizeString } from "@/lib/validation";
import { logger } from "@/lib/security";
import { applySecurityChecks, requireAuth } from "@/lib/middleware";

export async function POST(req: Request) {
  const security = applySecurityChecks(req, "payment_verify", 10, 60_000);
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
    const razorpayOrderId = sanitizeString(body.razorpay_order_id, 80);
    const razorpayPaymentId = sanitizeString(body.razorpay_payment_id, 80);
    const razorpaySignature = sanitizeString(body.razorpay_signature, 200);

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Missing required payment verification parameters." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const order = await OrderModel.findOne({ id: orderId });
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (order.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json({ error: "Payment order does not belong to this checkout." }, { status: 400 });
    }

    // Idempotency check if already verified
    if (order.status === "CONFIRMED" && order.razorpayPaymentId === razorpayPaymentId) {
      return NextResponse.json({ order, verified: true, duplicate: true }, { status: 200 });
    }

    const isValidSig = verifyRazorpayPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValidSig) {
      logger.warn("INVALID_PAYMENT_SIGNATURE", { orderId, razorpayOrderId, razorpayPaymentId });
      return NextResponse.json(
        { error: "Cryptographic payment signature verification failed." },
        { status: 400 }
      );
    }

    const tx = await updateOrderStatus(
      order.id,
      "CONFIRMED",
      `Online payment verified (Payment ID: ${razorpayPaymentId}).`,
      "SYSTEM",
      "razorpay-verifier",
      order.customerEmail,
      order.address?.fullName,
      {
        paymentStatus: "PAID",
        razorpayPaymentId,
      }
    );

    if (!tx.success || !tx.order) {
      return NextResponse.json(
        { error: tx.error || "Could not transition order state." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { order: tx.order, verified: true, duplicate: false },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment verification failed." },
      { status: 500 }
    );
  }
}
