import { NextResponse } from "next/server";
import { ProductModel } from "@/lib/models/Product";
import { CouponModel } from "@/lib/models/Coupon";
import { connectToDatabase } from "@/lib/db/connection";
import { calculatePricingBreakdown, DEFAULT_COUPONS } from "@/lib/pricing";
import { PRODUCTS } from "@/lib/products";
import { hasMaliciousKeys, sanitizeString } from "@/lib/validation";
import { createErrorResponse } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    if (!body || typeof body !== "object" || hasMaliciousKeys(body)) {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const couponCode =
      typeof body.couponCode === "string" && body.couponCode.trim()
        ? sanitizeString(body.couponCode, 30).toUpperCase()
        : null;

    const sanitizedItems = rawItems
      .filter((it: unknown) => it && typeof it === "object")
      .map((it: Record<string, unknown>) => ({
        productId: sanitizeString(it.productId, 80),
        quantity: typeof it.quantity === "number" ? it.quantity : 0,
      }));

    // Fetch live products and coupons from MongoDB
    const [dbProducts, dbCoupons] = await Promise.all([
      ProductModel.find().lean(),
      CouponModel.find({ active: true }).lean(),
    ]);

    const productsList = dbProducts.length > 0 ? (dbProducts as any) : PRODUCTS;
    const couponsList = dbCoupons.length > 0 ? (dbCoupons as any) : DEFAULT_COUPONS;

    const pricing = calculatePricingBreakdown(sanitizedItems, {
      productsCatalogue: productsList,
      couponsCatalogue: couponsList,
      couponCode,
    });

    return NextResponse.json(
      {
        pricing,
        availableCoupons: couponsList
          .filter((c: any) => c.active && new Date(c.expiresAt).getTime() > Date.now())
          .map((c: any) => ({
            code: c.code,
            description: c.description,
            minOrderSubtotal: c.minOrderSubtotal,
          })),
      },
      { status: 200 }
    );
  } catch (err) {
    return createErrorResponse(err);
  }
}
