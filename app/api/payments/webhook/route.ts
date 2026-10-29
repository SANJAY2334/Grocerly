import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import { OrderModel } from "@/lib/models/Order";
import { ProcessedWebhookModel } from "@/lib/models/ProcessedWebhook";
import { updateOrderStatus } from "@/lib/services/order";
import { verifyRazorpayWebhookSignature } from "@/lib/payments";
import { sanitizeString } from "@/lib/validation";
import { logger } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-razorpay-signature");
    const eventIdHeader = req.headers.get("x-razorpay-event-id");

    if (!verifyRazorpayWebhookSignature(rawBody, signatureHeader)) {
      logger.warn("WEBHOOK_SIGNATURE_INVALID");
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      id?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            notes?: { grocerlyOrderId?: string };
          };
        };
      };
    };

    const eventId = sanitizeString(eventIdHeader || payload.id || "", 100);
    if (!eventId) {
      return NextResponse.json({ error: "Missing webhook event ID." }, { status: 400 });
    }

    await connectToDatabase();

    const eventType = payload.event || "unknown";

    // Atomic idempotency claim: Insert ProcessedWebhookModel record first.
    // Unique index on eventId guarantees that concurrent duplicate webhooks are rejected
    // immediately with E11000, preventing race conditions and double-processing.
    try {
      await ProcessedWebhookModel.create({
        eventId,
        eventType,
      });
    } catch (err: any) {
      if (err?.code === 11000 || String(err?.message).includes("E11000")) {
        return NextResponse.json(
          { processed: true, duplicate: true, eventId },
          { status: 200 }
        );
      }
      throw err;
    }

    const paymentEntity = payload.payload?.payment?.entity;
    const requestedOrderId = paymentEntity?.notes?.grocerlyOrderId;
    const rzpOrderId = paymentEntity?.order_id;

    // Resolve order from database
    const order = requestedOrderId
      ? await OrderModel.findOne({ id: requestedOrderId })
      : rzpOrderId
      ? await OrderModel.findOne({ razorpayOrderId: rzpOrderId })
      : null;

    if (order) {
      if (eventType === "payment.captured") {
        await updateOrderStatus(
          order.id,
          "CONFIRMED",
          `Webhook payment.captured (${paymentEntity?.id || "verified"})`,
          "SYSTEM",
          "razorpay-webhook",
          order.customerEmail,
          order.address?.fullName,
          {
            paymentStatus: "PAID",
            razorpayPaymentId: paymentEntity?.id,
          }
        );
      } else if (eventType === "payment.failed") {
        await updateOrderStatus(
          order.id,
          "PAYMENT_FAILED",
          "Webhook payment.failed: Payment declined or timed out. Reserved stock released.",
          "SYSTEM",
          "razorpay-webhook",
          order.customerEmail,
          order.address?.fullName,
          {
            paymentStatus: "FAILED",
          }
        );
      } else if (eventType === "refund.processed") {
        await updateOrderStatus(
          order.id,
          "REFUNDED",
          "Webhook refund.processed completed.",
          "SYSTEM",
          "razorpay-webhook",
          order.customerEmail,
          order.address?.fullName,
          {
            paymentStatus: "REFUNDED",
          }
        );
      }
    }

    return NextResponse.json(
      { processed: true, duplicate: false, eventId },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook processing error." },
      { status: 500 }
    );
  }
}
