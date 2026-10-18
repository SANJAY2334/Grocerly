import { NextResponse } from "next/server";
import { getSessionUser, requireAuth } from "@/lib/middleware";
import { createNewOrder, fetchUserOrders, fetchAdminOrders } from "@/lib/services/order";
import { validateCheckoutPayload } from "@/lib/validation";
import { checkRateLimit, getClientIp, logger, verifySameOrigin } from "@/lib/security";
import { createErrorResponse } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required to view order history." },
        { status: 401 }
      );
    }

    if (session.role === "ADMIN" || session.role === "OPS") {
      const orders = await fetchAdminOrders();
      return NextResponse.json({ success: true, orders }, { status: 200 });
    }

    // Strict customer-level data isolation
    const orders = await fetchUserOrders(session.id);
    return NextResponse.json({ success: true, orders }, { status: 200 });
  } catch (err) {
    return createErrorResponse(err);
  }
}

export async function POST(req: Request) {
  if (!verifySameOrigin(req)) {
    return NextResponse.json({ success: false, error: "Cross-origin request forbidden." }, { status: 403 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`order-create:${ip}`, 15, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many order attempts. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required to place an order." },
        { status: 401 }
      );
    }
    const body = await req.json();

    const validation = validateCheckoutPayload(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          success: false,
          error: validation.errors[0] || "Invalid checkout details.",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const tx = await createNewOrder({
      userId: session.id,
      userEmail: session.email,
      userName: session.name,
      items: validation.data.items,
      address: validation.data.address,
      deliverySlot: validation.data.deliverySlot,
      paymentMethod: validation.data.paymentMethod,
      couponCode: validation.data.couponCode || undefined,
      idempotencyKey: validation.data.idempotencyKey,
    });

    if (!tx.success || !tx.order) {
      return NextResponse.json(
        { success: false, error: tx.error || "Order placement failed." },
        { status: 400 }
      );
    }

    logger.info("ORDER_CREATED", {
      orderId: tx.order.id,
      userId: tx.order.userId,
      total: tx.order.total,
      paymentMethod: tx.order.paymentMethod,
      status: tx.order.status,
    });

    return NextResponse.json(
      {
        success: true,
        order: tx.order,
      },
      { status: 201 }
    );
  } catch (err) {
    return createErrorResponse(err);
  }
}
