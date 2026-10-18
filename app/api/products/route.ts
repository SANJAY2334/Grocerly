import { NextResponse } from "next/server";
import { ProductModel } from "@/lib/models/Product";
import { PRODUCTS } from "@/lib/products";
import { connectToDatabase } from "@/lib/db/connection";
import { sanitizeString } from "@/lib/validation";
import { createErrorResponse } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    // Ensure catalog products are initialized in MongoDB
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

    const url = new URL(req.url);
    const category = sanitizeString(url.searchParams.get("category") || "all", 40);
    const search = sanitizeString(url.searchParams.get("search") || "", 100).toLowerCase();
    const maxPrice = Number(url.searchParams.get("maxPrice") || 10000);
    const minRating = Number(url.searchParams.get("minRating") || 0);
    const inStockOnly = url.searchParams.get("inStockOnly") === "true";
    const organicOnly = url.searchParams.get("organicOnly") === "true";
    const onSaleOnly = url.searchParams.get("onSaleOnly") === "true";
    const sortBy = sanitizeString(url.searchParams.get("sortBy") || "popularity", 30);

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10) || 50));

    const query: Record<string, unknown> = {};
    if (category !== "all") {
      query.category = { $regex: new RegExp(`^${category}$`, "i") };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }
    if (Number.isFinite(maxPrice)) {
      query.price = { $lte: maxPrice };
    }
    if (Number.isFinite(minRating) && minRating > 0) {
      query.rating = { $gte: minRating };
    }
    if (inStockOnly) {
      query.stock = { $gt: 0 };
    }
    if (organicOnly) {
      query.organic = true;
    }
    if (onSaleOnly) {
      query.discount = { $gt: 0 };
    }

    const sortOption: Record<string, 1 | -1> = {};
    if (sortBy === "price-asc") sortOption.price = 1;
    else if (sortBy === "price-desc") sortOption.price = -1;
    else if (sortBy === "rating") sortOption.rating = -1;
    else if (sortBy === "freshness") sortOption.freshnessScore = -1;
    else sortOption.reviews = -1;

    const [items, total] = await Promise.all([
      ProductModel.find(query).sort(sortOption).skip((page - 1) * limit).limit(limit).lean(),
      ProductModel.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        products: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return createErrorResponse(err);
  }
}
