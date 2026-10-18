import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICategory extends Document {
  id: string;
  name: string;
  icon: string;
  description: string;
  itemCount: number;
}

const CategorySchema = new Schema<ICategory>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, required: true },
    description: { type: String, default: "" },
    itemCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const CategoryModel: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);
