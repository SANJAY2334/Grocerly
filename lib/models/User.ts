import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDeliveryAddress {
  id?: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
}

export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role: "CUSTOMER" | "ADMIN" | "OPS";
  verified: boolean;
  emailVerifiedAt?: Date;
  status: "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";
  addresses: IDeliveryAddress[];
  failedLoginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryAddressSchema = new Schema<IDeliveryAddress>(
  {
    id: { type: String, default: () => `addr_${Math.random().toString(36).substring(2, 9)}` },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["CUSTOMER", "ADMIN", "OPS"], default: "CUSTOMER", index: true },
    verified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION"],
      default: "PENDING_VERIFICATION",
      index: true,
    },
    addresses: { type: [DeliveryAddressSchema], default: [] },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user lookup & security
UserSchema.index({ email: 1, status: 1 });

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
