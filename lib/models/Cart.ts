import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICartItem {
  productId: string;
  quantity: number;
}

export interface ICart extends Document {
  userId?: string;
  guestSessionId?: string;
  items: ICartItem[];
  appliedCoupon?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const CartSchema = new Schema<ICart>(
  {
    userId: { type: String, index: true },
    guestSessionId: { type: String, index: true },
    items: { type: [CartItemSchema], default: [] },
    appliedCoupon: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

CartSchema.index({ userId: 1 });
CartSchema.index({ guestSessionId: 1 });

export const CartModel: Model<ICart> =
  mongoose.models.Cart || mongoose.model<ICart>("Cart", CartSchema);
