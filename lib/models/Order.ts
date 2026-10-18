import mongoose, { Schema, Document, Model } from "mongoose";
import { Order as IOrderData, OrderItem, OrderStatus, TimelineEvent } from "@/lib/types";

export interface IOrderDocument extends Omit<IOrderData, "id">, Document {
  id: string;
}

const OrderItemSchema = new Schema<OrderItem>(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    brand: { type: String, required: true },
    unit: { type: String, required: true },
    image: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
    gstRate: { type: Number, default: 5 },
  },
  { _id: false }
);

const TimelineEventSchema = new Schema<TimelineEvent>(
  {
    status: { type: String, required: true },
    timestamp: { type: String, required: true },
    note: { type: String, required: true },
    actor: { type: String },
    actorRole: { type: String },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrderDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    address: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      landmark: { type: String },
    },
    deliverySlot: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ["UPI", "CARD", "COD", "NETBANKING"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "AUTHORIZED", "CAPTURED", "FAILED", "CANCELLED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },
    paymentReference: { type: String },
    razorpayOrderId: { type: String, sparse: true, index: true },
    razorpayPaymentId: { type: String, sparse: true, index: true },
    customerEmail: { type: String },
    estimatedDelivery: { type: String },
    mrpTotal: { type: Number },
    subtotal: { type: Number },
    productDiscount: { type: Number, default: 0 },
    couponCode: { type: String },
    couponDiscount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    taxableAmount: { type: Number },
    gstAmount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number },
    pricing: {
      itemSubtotal: { type: Number, required: true },
      couponCode: { type: String },
      discountAmount: { type: Number, default: 0 },
      deliveryFee: { type: Number, default: 0 },
      gstAmount: { type: Number, default: 0 },
      cgstAmount: { type: Number, default: 0 },
      sgstAmount: { type: Number, default: 0 },
      finalPayable: { type: Number, required: true },
      savingsAmount: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "CONFIRMED",
        "PROCESSING",
        "PACKED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "PAYMENT_FAILED",
        "REFUNDED",
      ],
      default: "PENDING_PAYMENT",
      index: true,
    },
    timeline: { type: [TimelineEventSchema], default: [] },
    statusHistory: { type: [TimelineEventSchema], default: [] },
  },
  {
    timestamps: true,
    strict: false,
  }
);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

export const OrderModel: Model<IOrderDocument> =
  mongoose.models.Order || mongoose.model<IOrderDocument>("Order", OrderSchema);
