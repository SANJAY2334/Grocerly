import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOtpChallenge extends Document {
  id: string;
  userId?: string;
  email: string;
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "SENSITIVE_CHANGE";
  otpHash: string;
  expiresAt: Date;
  failedAttempts: number;
  maxAttempts: number;
  consumedAt?: Date;
  resendCooldownUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OtpChallengeSchema = new Schema<IOtpChallenge>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: {
      type: String,
      enum: ["EMAIL_VERIFICATION", "PASSWORD_RESET", "SENSITIVE_CHANGE"],
      default: "EMAIL_VERIFICATION",
      index: true,
    },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    failedAttempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    consumedAt: { type: Date },
    resendCooldownUntil: { type: Date },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically remove challenges 24 hours after expiration
OtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
// Compound index for active challenges
OtpChallengeSchema.index({ email: 1, purpose: 1, consumedAt: 1 });

export const OtpChallengeModel: Model<IOtpChallenge> =
  mongoose.models.OtpChallenge || mongoose.model<IOtpChallenge>("OtpChallenge", OtpChallengeSchema);
