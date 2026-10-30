import mongoose, { Schema, Document, Model } from "mongoose";
import { Product as IProductData } from "@/lib/types";

export interface IProductDocument extends Omit<IProductData, "id">, Document {
  id: string;
}

const NutritionSchema = new Schema(
  {
    calories: { type: Number, default: 0 },
    protein: { type: String, default: "0g" },
    carbs: { type: String, default: "0g" },
    fat: { type: String, default: "0g" },
    fiber: { type: String },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProductDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    sku: { type: String, unique: true, sparse: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    price: {
      type: Number,
      required: true,
      min: [0.5, "Price must be at least ₹0.50"],
      max: [100000, "Price cannot exceed ₹1,00,000"],
    },
    originalPrice: {
      type: Number,
      min: [0.5, "Original price must be at least ₹0.50"],
      max: [100000, "Original price cannot exceed ₹1,00,000"],
    },
    discount: { type: Number, default: 0 },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
    unit: { type: String, required: true },
    packSize: { type: Number, default: 1 },
    packUnit: { type: String },
    image: { type: String, required: true },
    description: { type: String, default: "" },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    tags: { type: [String], default: [] },
    freshnessScore: { type: Number, default: 95 },
    origin: { type: String },
    organic: { type: Boolean, default: false },
    allergens: { type: [String], default: [] },
    dietaryTags: { type: [String], default: [] },
    nutrition: { type: NutritionSchema, default: () => ({}) },
  },
  {
    timestamps: true,
  }
);

ProductSchema.index({ category: 1, stock: -1 });
ProductSchema.index({ name: "text", brand: "text", description: "text" });

export const ProductModel: Model<IProductDocument> =
  mongoose.models.Product || mongoose.model<IProductDocument>("Product", ProductSchema);
