import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProcessedWebhook extends Document {
  eventId: string;
  eventType: string;
  processedAt: Date;
}

const ProcessedWebhookSchema = new Schema<IProcessedWebhook>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true },
    processedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }, // 30-day retention
  },
  { timestamps: true }
);

export const ProcessedWebhookModel: Model<IProcessedWebhook> =
  mongoose.models.ProcessedWebhook ||
  mongoose.model<IProcessedWebhook>("ProcessedWebhook", ProcessedWebhookSchema);
