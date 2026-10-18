import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISession extends Document {
  id: string;
  userId: string;
  tokenHash: string;
  role: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    role: { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

SessionSchema.index({ userId: 1, revokedAt: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema);
