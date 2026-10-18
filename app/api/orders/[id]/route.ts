import { NextResponse } from "next/server";
import { requireAuth, applySecurityChecks } from "@/lib/middleware";
import { fetchOrderById, updateOrderStatus } from "@/lib/services/order";
import { OrderStatus } from "@/lib/types";
import { hasMaliciousKeys, sanitizeString } from "@/lib/validation";
import { createErrorResponse } from "@/lib/errors";

export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await requireAuth(req);
    const orderId = sanitizeString(context.params.id, 60);

    const order = await fetchOrderById(orderId, session);

    if (!order) {
      return NextResponse.json(
        { error: `Order "${orderId}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("FORBIDDEN")) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view another customer's order." },
        { status: 403 }
      );
    }
    return createErrorResponse(err);
  }
}

export async function PATCH(
  req: Request,
  context: { params: { id: string } }
) {
  const security = applySecurityChecks(req, "order_status_update", 15, 60_000);
  if (!security.allowed && security.errorResponse) {
    return security.errorResponse;
  }

  try {
    const session = await requireAuth(req);
    const orderId = sanitizeString(context.params.id, 60);

    const order = await fetchOrderById(orderId, session);

    if (!order) {
      return NextResponse.json(
        { error: `Order "${orderId}" not found.` },
        { status: 404 }
      );
    }

    const body = await req.json();
    if (!body || typeof body !== "object" || hasMaliciousKeys(body)) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const toStatus = sanitizeString(body.status, 40) as OrderStatus;
    const note = body.note ? sanitizeString(body.note, 250) : "Status updated by user/operator.";

    const actorRole = session.role;
    const actorId = session.id;

    const result = await updateOrderStatus(
      orderId,
      toStatus,
      note,
      actorRole,
      actorId,
      session.email,
      session.name
    );

    if (!result.success || !result.order) {
      return NextResponse.json(
        { error: result.error || "Status transition rejected." },
        { status: 400 }
      );
    }

    return NextResponse.json({ order: result.order }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("FORBIDDEN")) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to modify this order." },
        { status: 403 }
      );
    }
    return createErrorResponse(err);
  }
}
