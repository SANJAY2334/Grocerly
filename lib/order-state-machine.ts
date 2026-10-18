import { OrderStatus, OrderTimelineEvent, UserRole } from "./types";

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "PAYMENT_FAILED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["PACKED", "CANCELLED", "REFUNDED"],
  PACKED: ["OUT_FOR_DELIVERY", "CANCELLED", "REFUNDED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["REFUNDED"],
  PAYMENT_FAILED: ["PENDING_PAYMENT", "CANCELLED"],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pending Payment",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing at Hub",
  PACKED: "Packed & Quality Checked",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  PAYMENT_FAILED: "Payment Failed",
  REFUNDED: "Refunded",
};

export const ORDER_STATUS_NOTES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Order created and awaiting payment verification.",
  CONFIRMED: "Order confirmed and inventory reserved at fulfillment center.",
  PROCESSING: "Order items are being picked and inspected for freshness.",
  PACKED: "Items sealed in temperature-controlled eco-packaging.",
  OUT_FOR_DELIVERY: "Order dispatched from fulfillment hub for scheduled slot.",
  DELIVERED: "Order delivered to customer address.",
  CANCELLED: "Order cancelled and reserved stock released back to inventory.",
  PAYMENT_FAILED: "Payment attempt failed or was declined by provider.",
  REFUNDED: "Refund processed to original payment method.",
};

export const ORDER_STATUS_DESCRIPTIONS = ORDER_STATUS_NOTES;

export function canTransitionOrderStatus(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
  actorRole: UserRole | "SYSTEM"
): { allowed: boolean; reason?: string } {
  if (fromStatus === toStatus) {
    return { allowed: false, reason: `Order is already in ${fromStatus} state.` };
  }

  const allowedNext = ORDER_TRANSITIONS[fromStatus] || [];
  if (!allowedNext.includes(toStatus)) {
    return {
      allowed: false,
      reason: `Invalid state transition from ${fromStatus} to ${toStatus}. Allowed transitions: ${
        allowedNext.length > 0 ? allowedNext.join(", ") : "none (terminal state)"
      }.`,
    };
  }

  // Role-based transition restrictions
  if (actorRole === "CUSTOMER") {
    if (toStatus !== "CANCELLED") {
      return {
        allowed: false,
        reason: "Customers are not authorized to advance or modify operational order states.",
      };
    }
    if (fromStatus !== "PENDING_PAYMENT" && fromStatus !== "CONFIRMED") {
      return {
        allowed: false,
        reason: `Orders in ${fromStatus} state can no longer be self-cancelled. Please contact customer support.`,
      };
    }
  }

  if (toStatus === "REFUNDED" && actorRole !== "ADMIN" && actorRole !== "SYSTEM") {
    return {
      allowed: false,
      reason: "Only administrators or verified payment webhooks can issue order refunds.",
    };
  }

  return { allowed: true };
}

export function createTimelineEvent(
  status: OrderStatus,
  actor: string,
  customNote?: string
): OrderTimelineEvent {
  return {
    status,
    timestamp: new Date().toISOString(),
    note: customNote || ORDER_STATUS_NOTES[status],
    actor,
  };
}
