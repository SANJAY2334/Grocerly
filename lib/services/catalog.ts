import { ProductModel } from "@/lib/models/Product";
import { PRODUCTS } from "@/lib/products";
import { Product } from "@/lib/types";
import { connectToDatabase } from "@/lib/db/connection";

let seededInitialProducts = false;

async function ensureProductsSeeded(): Promise<void> {
  if (seededInitialProducts) return;
  try {
    const count = await ProductModel.countDocuments();
    if (count === 0) {
      for (const p of PRODUCTS) {
        await ProductModel.findOneAndUpdate(
          { id: p.id },
          {
            ...p,
            sku: p.sku || `GRY-SKU-${p.id}`,
            reservedStock: 0,
            soldCount: p.soldCount || 0,
          },
          { upsert: true }
        );
      }
    }
    seededInitialProducts = true;
  } catch {
    // If seeding check fails, continue
  }
}

export async function getCatalogProducts(filters?: {
  category?: string;
  search?: string;
  sort?: string;
}): Promise<Product[]> {
  await connectToDatabase();
  await ensureProductsSeeded();

  const query: Record<string, unknown> = {};
  if (filters?.category && filters.category !== "All") {
    query.category = filters.category;
  }
  if (filters?.search && filters.search.trim()) {
    query.$or = [
      { name: { $regex: filters.search.trim(), $options: "i" } },
      { brand: { $regex: filters.search.trim(), $options: "i" } },
      { description: { $regex: filters.search.trim(), $options: "i" } },
    ];
  }

  const docs = await ProductModel.find(query).sort({ rating: -1 }).lean();
  return docs.map((d) => ({
    ...d,
    id: d.id,
  })) as unknown as Product[];
}

export async function getProductDetail(id: string): Promise<Product | null> {
  await connectToDatabase();
  await ensureProductsSeeded();

  const doc = await ProductModel.findOne({ id }).lean();
  if (doc) {
    return {
      ...doc,
      id: doc.id,
    } as unknown as Product;
  }
  return null;
}

export async function updateCatalogProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product | null> {
  await connectToDatabase();

  const doc = await ProductModel.findOneAndUpdate(
    { id },
    { $set: updates },
    { new: true }
  ).lean();

  if (doc) {
    return {
      ...doc,
      id: doc.id,
    } as unknown as Product;
  }
  return null;
}
