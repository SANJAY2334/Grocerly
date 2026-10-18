import { NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware";
import { ProductModel } from "@/lib/models/Product";
import { OrderModel } from "@/lib/models/Order";
import { CouponModel } from "@/lib/models/Coupon";
import { connectToDatabase } from "@/lib/db/connection";
import { logAuditEvent } from "@/lib/logging";
import { sanitizeString, hasMaliciousKeys } from "@/lib/validation";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await requireRole(req, ["ADMIN", "OPS"]);
    await connectToDatabase();

    const [products, orders, coupons] = await Promise.all([
      ProductModel.find().lean(),
      OrderModel.find().sort({ createdAt: -1 }).lean(),
      CouponModel.find().lean(),
    ]);

    const lowStockProducts = products.filter(
      (p) => p.stock <= (p.lowStockThreshold ?? 10)
    );

    const activeOrders = orders.filter(
      (o) => !["DELIVERED", "CANCELLED", "REFUNDED"].includes(o.status)
    );

    const totalRevenue = orders
      .filter((o) => !["CANCELLED", "REFUNDED"].includes(o.status))
      .reduce((acc, o) => acc + (o.total || 0), 0);

    return createSuccessResponse({
      products,
      lowStockProducts,
      orders,
      coupons,
      metrics: {
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
        totalOrders: orders.length,
        activeOrderCount: activeOrders.length,
        totalRevenue,
      },
    });
  } catch (err) {
    return createErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireRole(req, ["ADMIN", "OPS"]);
    await connectToDatabase();

    const body = await req.json();
    if (!body || typeof body !== "object" || hasMaliciousKeys(body)) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    // Toggle coupon
    if (body.action === "TOGGLE_COUPON") {
      if (user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only ADMIN users can modify promotional coupons." },
          { status: 403 }
        );
      }
      const code = sanitizeString(body.code, 30).toUpperCase();
      const coupon = await CouponModel.findOneAndUpdate(
        { code },
        { $set: { active: Boolean(body.active) } },
        { new: true }
      );
      if (!coupon) {
        return NextResponse.json({ error: `Coupon "${code}" not found.` }, { status: 404 });
      }

      await logAuditEvent({
        eventType: "COUPON_TOGGLED",
        actorId: user.id,
        targetType: "Coupon",
        targetId: code,
        outcome: "SUCCESS",
        metadata: { code, active: coupon.active },
      });

      return createSuccessResponse({ coupon });
    }

    // Product stock or price update
    const productId = sanitizeString(body.productId, 80);
    if (!productId) {
      return NextResponse.json({ error: "productId is required." }, { status: 400 });
    }

    if (body.price !== undefined && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only ADMIN users are permitted to change product pricing." },
        { status: 403 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (body.stock !== undefined) {
      const s = Number(body.stock);
      if (Number.isNaN(s) || s < 0) {
        return NextResponse.json({ error: "Stock must be a non-negative number." }, { status: 400 });
      }
      updates.stock = s;
    }
    if (body.price !== undefined) {
      const p = Number(body.price);
      if (Number.isNaN(p) || p <= 0) {
        return NextResponse.json({ error: "Price must be a positive number." }, { status: 400 });
      }
      updates.price = p;
    }
    if (body.originalPrice !== undefined) {
      const op = Number(body.originalPrice);
      if (!Number.isNaN(op) && op > 0) {
        updates.originalPrice = op;
      }
    }

    const updatedProduct = await ProductModel.findOneAndUpdate(
      { id: productId },
      { $set: updates },
      { new: true }
    );

    if (!updatedProduct) {
      return NextResponse.json({ error: `Product "${productId}" not found.` }, { status: 404 });
    }

    await logAuditEvent({
      eventType: "PRODUCT_UPDATED",
      actorId: user.id,
      targetType: "Product",
      targetId: productId,
      outcome: "SUCCESS",
      metadata: { productId, updates },
    });

    return createSuccessResponse({ product: updatedProduct });
  } catch (err) {
    return createErrorResponse(err);
  }
}
