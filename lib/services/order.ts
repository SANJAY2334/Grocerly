import crypto from "crypto";
import { OrderModel } from "@/lib/models/Order";
import { ProductModel } from "@/lib/models/Product";
import { Order, OrderStatus, UserRole, PaymentMethod, PaymentStatus } from "@/lib/types";
import { canTransitionOrderStatus } from "@/lib/order-state-machine";
import { calculatePricingBreakdown } from "@/lib/pricing";
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from "./email";
import { logAuditEvent } from "@/lib/logging";
import { connectToDatabase } from "@/lib/db/connection";

export async function createNewOrder(params: {
  userId: string;
  userEmail?: string;
  userName?: string;
  items: Array<{ productId: string; quantity: number }>;
  address: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  deliverySlot: string;
  paymentMethod: PaymentMethod | any;
  couponCode?: string;
  idempotencyKey?: string;
}): Promise<{ success: boolean; order?: Order; error?: string }> {
  await connectToDatabase();

  // 1. Idempotency Check: prevent duplicate orders
  if (params.idempotencyKey) {
    const existing = await OrderModel.findOne({ idempotencyKey: params.idempotencyKey }).lean();
    if (existing) {
      return { success: true, order: existing as unknown as Order };
    }
  }

  // 2. Validate Items and Check Stock in ProductModel
  const validProducts = [];
  for (const item of params.items) {
    const product = await ProductModel.findOne({ id: item.productId });
    if (!product) {
      return { success: false, error: `Product "${item.productId}" is not available.` };
    }
    if (product.stock < item.quantity) {
      return {
        success: false,
        error: `Insufficient stock for "${product.name}". Only ${product.stock} unit(s) remaining.`,
      };
    }
    validProducts.push({ product, quantity: item.quantity });
  }

  // 3. Atomically reserve/decrement stock in ProductModel
  for (const { product, quantity } of validProducts) {
    const updated = await ProductModel.findOneAndUpdate(
      { id: product.id, stock: { $gte: quantity } },
      { $inc: { stock: -quantity, soldCount: quantity } },
      { new: true }
    );
    if (!updated) {
      // Rollback previous items if race condition occurred
      return {
        success: false,
        error: `Stock for "${product.name}" was just reserved by another customer. Please refresh cart.`,
      };
    }
  }

  // 4. Authoritative Pricing Calculation
  const pricing = calculatePricingBreakdown(
    params.items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
    { couponCode: params.couponCode }
  );

  const orderId = `ORD-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const nowIso = new Date().toISOString();

  // 5. Construct Order Items with snapshot details
  const orderItems = pricing.lineItems.map((li) => ({
    productId: li.productId,
    sku: li.sku,
    name: li.name,
    brand: li.brand,
    price: li.unitPrice,
    unitPrice: li.unitPrice,
    originalPrice: li.unitMrp,
    quantity: li.quantity,
    lineTotal: li.lineSubtotal,
    unit: li.unit,
    image: li.image,
    gstRate: 5,
  }));

  const isCod = params.paymentMethod === "COD";
  const initialStatus: OrderStatus = isCod ? "CONFIRMED" : "PENDING_PAYMENT";

  const orderDoc = await OrderModel.create({
    id: orderId,
    userId: params.userId,
    customerEmail: params.userEmail,
    idempotencyKey: params.idempotencyKey,
    items: orderItems,
    address: params.address,
    deliverySlot: params.deliverySlot,
    paymentMethod: params.paymentMethod,
    paymentStatus: isCod ? "PENDING" : "PENDING",
    status: initialStatus,
    pricing: {
      itemSubtotal: pricing.itemSubtotal,
      couponCode: params.couponCode,
      discountAmount: pricing.couponDiscount + pricing.productDiscount,
      deliveryFee: pricing.deliveryFee,
      gstAmount: pricing.gstAmount,
      cgstAmount: pricing.cgstAmount,
      sgstAmount: pricing.sgstAmount,
      finalPayable: pricing.finalPayable,
      savingsAmount: pricing.totalSavings,
    },
    mrpTotal: pricing.mrpTotal,
    subtotal: pricing.itemSubtotal,
    productDiscount: pricing.productDiscount,
    couponCode: params.couponCode,
    couponDiscount: pricing.couponDiscount,
    discount: pricing.couponDiscount + pricing.productDiscount,
    taxableAmount: pricing.taxableAmount,
    gstAmount: pricing.gstAmount,
    deliveryFee: pricing.deliveryFee,
    total: pricing.finalPayable,
    estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    timeline: [
      {
        status: initialStatus,
        timestamp: nowIso,
        note: isCod
          ? "Order confirmed and queued for fulfillment."
          : "Order created and awaiting payment verification.",
        actor: params.userName || "Customer",
        actorRole: "CUSTOMER",
      },
    ],
  });

  const order = orderDoc.toObject() as unknown as Order;

  // 6. Audit Log
  await logAuditEvent({
    eventType: "ORDER_CREATED",
    actorId: params.userId,
    targetType: "Order",
    targetId: order.id,
    outcome: "SUCCESS",
    metadata: {
      finalPayable: order.total,
      itemCount: order.items.length,
      paymentMethod: order.paymentMethod,
      initialStatus: order.status,
    },
  });

  // 7. Send confirmation email (immediate for COD, online payments send on verification)
  if (params.userEmail && isCod) {
    sendOrderConfirmationEmail(params.userEmail, params.userName || params.address.fullName, order).catch(() => {});
  }

  return { success: true, order };
}

export async function fetchOrderById(
  orderId: string,
  requestingUser: { id: string; role: UserRole }
): Promise<Order | null> {
  await connectToDatabase();

  const doc = await OrderModel.findOne({ id: orderId }).lean();
  if (!doc) return null;

  const order = doc as unknown as Order;

  // Strict customer isolation check
  if (requestingUser.role === "CUSTOMER" && order.userId && order.userId !== requestingUser.id) {
    throw new Error("FORBIDDEN: You do not have permission to view this order.");
  }

  return order;
}

export async function fetchUserOrders(userId: string): Promise<Order[]> {
  await connectToDatabase();

  const docs = await OrderModel.find({ userId }).sort({ createdAt: -1 }).lean();
  return docs as unknown as Order[];
}

export async function fetchAdminOrders(): Promise<Order[]> {
  await connectToDatabase();

  const docs = await OrderModel.find().sort({ createdAt: -1 }).lean();
  return docs as unknown as Order[];
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note: string,
  actorRole: UserRole | "SYSTEM",
  actorId: string,
  userEmail?: string,
  userName?: string,
  extra?: { paymentStatus?: PaymentStatus; razorpayPaymentId?: string }
): Promise<{ success: boolean; order?: Order; error?: string }> {
  await connectToDatabase();

  const order = await OrderModel.findOne({ id: orderId });
  if (!order) {
    return { success: false, error: "Order not found." };
  }

  const transitionCheck = canTransitionOrderStatus(order.status, newStatus, actorRole);
  if (!transitionCheck.allowed) {
    return {
      success: false,
      error: transitionCheck.reason || `Invalid transition: cannot advance order from "${order.status}" to "${newStatus}".`,
    };
  }

  const previousStatus = order.status;

  // If order is cancelled, restore reserved stock back to available stock
  if (newStatus === "CANCELLED" && previousStatus !== "CANCELLED") {
    for (const item of order.items) {
      await ProductModel.updateOne(
        { id: item.productId },
        { $inc: { stock: item.quantity, soldCount: -item.quantity } }
      );
    }
  }

  order.status = newStatus;
  if (extra?.paymentStatus) {
    order.paymentStatus = extra.paymentStatus;
  }
  if (extra?.razorpayPaymentId) {
    order.razorpayPaymentId = extra.razorpayPaymentId;
  }

  order.timeline.push({
    status: newStatus,
    timestamp: new Date().toISOString(),
    note,
    actor: actorId,
    actorRole,
  });

  await order.save();

  const updatedOrder = order.toObject() as unknown as Order;

  await logAuditEvent({
    eventType: "ORDER_STATUS_UPDATED",
    actorId,
    targetType: "Order",
    targetId: orderId,
    outcome: "SUCCESS",
    metadata: { previousStatus, newStatus, note },
  });

  if (userEmail) {
    sendOrderStatusUpdateEmail(userEmail, userName || "Customer", updatedOrder, newStatus).catch(() => {});
  }

  return { success: true, order: updatedOrder };
}
