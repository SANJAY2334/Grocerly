import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  id: string;
  eventType: string;
  actorId: string;
  targetType?: string;
  targetId?: string;
  outcome: "SUCCESS" | "FAILURE" | "DENIED";
  requestId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    id: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    actorId: { type: String, required: true, index: true },
    targetType: { type: String, index: true },
    targetId: { type: String, index: true },
    outcome: { type: String, enum: ["SUCCESS", "FAILURE", "DENIED"], required: true },
    requestId: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
  }
);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ eventType: 1, timestamp: -1 });
AuditLogSchema.index({ actorId: 1, timestamp: -1 });

export const AuditLogModel: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
