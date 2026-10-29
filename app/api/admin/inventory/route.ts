import { NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware";
import { ProductModel } from "@/lib/models/Product";
import { OrderModel } from "@/lib/models/Order";
import { CouponModel } from "@/lib/models/Coupon";
import { connectToDatabase } from "@/lib/db/connection";
import { logAuditEvent } from "@/lib/logging";
import { sanitizeString, hasMaliciousKeys } from "@/lib/validation";
import {
  createErrorResponse,
  createSuccessResponse,
  ValidationError,
  ConflictError,
  NotFoundError,
  AuthorizationError,
} from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await requireRole(req, ["ADMIN", "OPS"]);
    await connectToDatabase();

    const [products, orders, coupons] = await Promise.all([
      ProductModel.find().sort({ createdAt: -1 }).lean(),
      OrderModel.find({ archivedFromAdmin: { $ne: true } }).sort({ createdAt: -1 }).lean(),
      CouponModel.find().sort({ createdAt: -1 }).lean(),
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

    const payload = {
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
    };

    return NextResponse.json({
      success: true,
      ...payload,
      data: payload,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return createErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(req, ["ADMIN", "OPS"]);
    await connectToDatabase();

    const body = await req.json();
    if (!body || typeof body !== "object" || hasMaliciousKeys(body)) {
      throw new ValidationError("Invalid request payload.");
    }

    // 1. CREATE NEW PRODUCT
    if (body.action === "CREATE_PRODUCT" || body.type === "PRODUCT") {
      const name = sanitizeString(body.name, 120);
      const category = sanitizeString(body.category || "Vegetables", 60);
      const unit = sanitizeString(body.unit || "1 kg", 30);
      const image = sanitizeString(body.image, 500);
      const brand = sanitizeString(body.brand || "Grocerly Fresh", 80);
      const description = sanitizeString(body.description || "", 500);
      const price = Number(body.price);
      const stock = Number(body.stock ?? 10);
      const originalPrice = body.originalPrice ? Number(body.originalPrice) : price;
      const organic = Boolean(body.organic);

      if (!name || name.trim().length < 2) {
        throw new ValidationError("Product name must be at least 2 characters long.");
      }
      if (!price || Number.isNaN(price) || price <= 0) {
        throw new ValidationError("Product price must be a positive number.");
      }
      if (Number.isNaN(stock) || stock < 0) {
        throw new ValidationError("Product stock must be a non-negative number.");
      }
      if (!image || !image.startsWith("http") && !image.startsWith("/")) {
        throw new ValidationError("A valid product image URL (http/https or relative path) is required.");
      }

      // Generate unique identifier and SKU
      const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const uniqueSuffix = Math.random().toString(36).substring(2, 7);
      const productId = `${slugBase}-${uniqueSuffix}`;
      const sku = `GRY-SKU-${productId.toUpperCase()}`;

      const createdProduct = await ProductModel.create({
        id: productId,
        sku,
        slug: productId,
        name: name.trim(),
        brand: brand.trim(),
        category,
        price,
        originalPrice,
        discount: Math.max(0, originalPrice - price),
        unit,
        packSize: 1,
        image: image.trim(),
        description: description.trim(),
        stock,
        reservedStock: 0,
        soldCount: 0,
        lowStockThreshold: 10,
        rating: 4.8,
        reviews: 0,
        tags: [category.toLowerCase()],
        freshnessScore: 98,
        organic,
      });

      await logAuditEvent({
        eventType: "PRODUCT_CREATED",
        actorId: user.id,
        targetType: "Product",
        targetId: productId,
        outcome: "SUCCESS",
        metadata: {
          productId,
          name,
          category,
          price,
          stock,
          image,
        },
      });

      return createSuccessResponse({
        message: `Product "${name}" was created successfully.`,
        product: createdProduct,
      });
    }

    // 2. CREATE NEW COUPON / PROMOTION
    if (body.action === "CREATE_COUPON" || body.type === "COUPON") {
      if (user.role !== "ADMIN") {
        throw new AuthorizationError("Only administrators are permitted to create promotional coupons.");
      }

      const rawCode = sanitizeString(body.code, 30);
      const description = sanitizeString(body.description, 200);
      const discountType = body.discountType === "PERCENTAGE" ? "PERCENTAGE" : "FLAT";
      const discountValue = Number(body.discountValue);
      const minOrderSubtotal = Number(body.minOrderSubtotal ?? 0);
      const maxDiscountAmount = body.maxDiscountAmount ? Number(body.maxDiscountAmount) : undefined;
      const usageLimit = Number(body.usageLimit ?? 500);
      const expiresAt = body.expiresAt
        ? new Date(body.expiresAt).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (!rawCode || rawCode.trim().length < 3) {
        throw new ValidationError("Coupon code must be at least 3 characters.");
      }
      const code = rawCode.toUpperCase().replace(/[^A-Z0-9_-]/g, "");

      if (!description || description.trim().length < 3) {
        throw new ValidationError("Please provide a promotional description for this coupon.");
      }
      if (!discountValue || Number.isNaN(discountValue) || discountValue <= 0) {
        throw new ValidationError("Discount value must be a positive number.");
      }
      if (discountType === "PERCENTAGE" && discountValue > 100) {
        throw new ValidationError("Percentage discount cannot exceed 100%.");
      }

      // Check if code already exists
      const existing = await CouponModel.findOne({ code });
      if (existing) {
        throw new ConflictError(`Coupon code "${code}" already exists.`);
      }

      const createdCoupon = await CouponModel.create({
        code,
        description: description.trim(),
        discountType,
        discountValue,
        minOrderSubtotal,
        maxDiscountAmount,
        expiresAt,
        usageLimit,
        usedCount: 0,
        active: true,
      });

      await logAuditEvent({
        eventType: "COUPON_CREATED",
        actorId: user.id,
        targetType: "Coupon",
        targetId: code,
        outcome: "SUCCESS",
        metadata: {
          code,
          discountType,
          discountValue,
          minOrderSubtotal,
        },
      });

      return createSuccessResponse({
        message: `Promotion "${code}" created successfully.`,
        coupon: createdCoupon,
      });
    }

    throw new ValidationError("Unknown action in payload.");
  } catch (err) {
    return createErrorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireRole(req, ["ADMIN", "OPS"]);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const productId = searchParams.get("productId");
    const code = searchParams.get("code");

    // 1. DELETE PRODUCT
    if (productId || action === "DELETE_PRODUCT") {
      const targetId = sanitizeString(productId || "", 80);
      if (!targetId) {
        throw new ValidationError("Product ID is required for deletion.");
      }

      const deleted = await ProductModel.findOneAndDelete({ id: targetId });
      if (!deleted) {
        throw new NotFoundError(`Product "${targetId}" not found.`);
      }

      await logAuditEvent({
        eventType: "PRODUCT_DELETED",
        actorId: user.id,
        targetType: "Product",
        targetId: targetId,
        outcome: "SUCCESS",
        metadata: { productId: targetId, name: deleted.name },
      });

      return createSuccessResponse({
        message: `Product "${deleted.name}" (${targetId}) was deleted from inventory.`,
        productId: targetId,
      });
    }

    // 2. DELETE COUPON
    if (code || action === "DELETE_COUPON") {
      if (user.role !== "ADMIN") {
        throw new AuthorizationError("Only administrators are permitted to delete coupons.");
      }
      const targetCode = sanitizeString(code || "", 30).toUpperCase();
      if (!targetCode) {
        throw new ValidationError("Coupon code is required for deletion.");
      }

      const deleted = await CouponModel.findOneAndDelete({ code: targetCode });
      if (!deleted) {
        throw new NotFoundError(`Coupon "${targetCode}" not found.`);
      }

      await logAuditEvent({
        eventType: "COUPON_DELETED",
        actorId: user.id,
        targetType: "Coupon",
        targetId: targetCode,
        outcome: "SUCCESS",
        metadata: { code: targetCode },
      });

      return createSuccessResponse({
        message: `Coupon "${targetCode}" was deleted.`,
        code: targetCode,
      });
    }

    throw new ValidationError("No valid target specified for deletion.");
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
