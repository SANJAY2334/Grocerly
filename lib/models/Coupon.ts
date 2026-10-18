import mongoose, { Schema, Document, Model } from "mongoose";
import { Coupon as ICouponData } from "@/lib/types";

export interface ICouponDocument extends ICouponData, Document {
  id?: string;
}

const CouponSchema = new Schema<ICouponDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, required: true },
    discountType: { type: String, enum: ["FLAT", "PERCENTAGE"], required: true },
    discountValue: { type: Number, required: true, min: 1 },
    minOrderSubtotal: { type: Number, required: true, min: 0 },
    maxDiscountAmount: { type: Number },
    requiresOrganic: { type: Boolean, default: false },
    expiresAt: { type: String, required: true },
    usageLimit: { type: Number, default: 1000 },
    usedCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

export const CouponModel: Model<ICouponDocument> =
  mongoose.models.Coupon || mongoose.model<ICouponDocument>("Coupon", CouponSchema);
