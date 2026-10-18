import { CartItem, Coupon, PricingBreakdown, PricingLineItem, Product } from "./types";
import { PRODUCTS } from "./products";

export const FREE_DELIVERY_THRESHOLD_INR = 300;
export const STANDARD_DELIVERY_FEE_INR = 40;
export const GST_RATE_PERCENT = 5;

export const DEFAULT_COUPONS: Coupon[] = [
  {
    code: "FRESH50",
    description: "Flat ₹50 off on fresh grocery orders of ₹200 or more",
    discountType: "FLAT",
    discountValue: 50,
    minOrderSubtotal: 200,
    expiresAt: "2027-12-31T23:59:59.000Z",
    usageLimit: 10000,
    usedCount: 142,
    active: true,
  },
  {
    code: "ORGANIC10",
    description: "10% off (up to ₹100) on orders ≥ ₹250 with organic produce",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minOrderSubtotal: 250,
    maxDiscountAmount: 100,
    requiresOrganic: true,
    expiresAt: "2027-12-31T23:59:59.000Z",
    usageLimit: 5000,
    usedCount: 84,
    active: true,
  },
  {
    code: "WELCOME100",
    description: "Flat ₹100 off on orders of ₹500 or more",
    discountType: "FLAT",
    discountValue: 100,
    minOrderSubtotal: 500,
    expiresAt: "2027-12-31T23:59:59.000Z",
    usageLimit: 5000,
    usedCount: 310,
    active: true,
  },
  {
    code: "EXPIRED20",
    description: "Expired seasonal promotion (₹20 off)",
    discountType: "FLAT",
    discountValue: 20,
    minOrderSubtotal: 100,
    expiresAt: "2024-01-01T00:00:00.000Z",
    usageLimit: 1000,
    usedCount: 1000,
    active: true,
  },
];

/**
 * Convert INR rupees to integer paise safely.
 */
export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Convert integer paise back to INR rupees (rounded to nearest rupee or 2 decimals).
 */
export function toRupees(paise: number): number {
  if (!Number.isFinite(paise)) return 0;
  return Math.round(paise) / 100;
}

/**
 * Validate a single cart quantity against stock rules.
 */
export function validateQuantity(
  quantity: unknown,
  availableStock: number
): { valid: boolean; normalizedQuantity: number; error?: string } {
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
    return { valid: false, normalizedQuantity: 0, error: "Quantity must be a valid number." };
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {
      valid: false,
      normalizedQuantity: Math.max(1, Math.floor(quantity)),
      error: "Quantity must be a positive whole number.",
    };
  }
  if (availableStock <= 0) {
    return {
      valid: false,
      normalizedQuantity: 0,
      error: "Product is currently out of stock.",
    };
  }
  if (quantity > availableStock) {
    return {
      valid: false,
      normalizedQuantity: availableStock,
      error: `Only ${availableStock} unit(s) available in stock.`,
    };
  }
  return { valid: true, normalizedQuantity: quantity };
}

/**
 * Validate a coupon code against current cart subtotal, organic eligibility, expiry, and usage limits.
 */
export function validateCoupon(
  rawCode: string | null | undefined,
  itemSubtotalPaise: number,
  hasOrganicItem: boolean,
  couponsCatalogue: Coupon[] = DEFAULT_COUPONS,
  nowTimestamp: number = Date.now()
): { valid: boolean; coupon: Coupon | null; discountPaise: number; error: string | null } {
  if (!rawCode || !rawCode.trim()) {
    return { valid: false, coupon: null, discountPaise: 0, error: null };
  }

  const normalizedCode = rawCode.trim().toUpperCase();
  const coupon = couponsCatalogue.find((c) => c.code.toUpperCase() === normalizedCode);

  if (!coupon || !coupon.active) {
    return {
      valid: false,
      coupon: null,
      discountPaise: 0,
      error: `Invalid coupon code "${normalizedCode}". Try FRESH50, ORGANIC10, or WELCOME100.`,
    };
  }

  const expiryTime = new Date(coupon.expiresAt).getTime();
  if (Number.isNaN(expiryTime) || expiryTime <= nowTimestamp) {
    return {
      valid: false,
      coupon: null,
      discountPaise: 0,
      error: `Coupon "${normalizedCode}" has expired.`,
    };
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    return {
      valid: false,
      coupon: null,
      discountPaise: 0,
      error: `Coupon "${normalizedCode}" has reached its maximum usage limit.`,
    };
  }

  if (itemSubtotalPaise <= 0) {
    return {
      valid: false,
      coupon: null,
      discountPaise: 0,
      error: "Add items to your cart before applying a coupon.",
    };
  }

  const minSubtotalPaise = toPaise(coupon.minOrderSubtotal);
  if (itemSubtotalPaise < minSubtotalPaise) {
    const shortfallRupees = Math.ceil(toRupees(minSubtotalPaise - itemSubtotalPaise));
    return {
      valid: false,
      coupon: null,
      discountPaise: 0,
      error: `Coupon "${normalizedCode}" requires a minimum item subtotal of ₹${coupon.minOrderSubtotal}. Add ₹${shortfallRupees} more to qualify.`,
    };
  }

  if (coupon.requiresOrganic && !hasOrganicItem) {
    return {
      valid: false,
      coupon: null,
      discountPaise: 0,
      error: `Coupon "${normalizedCode}" requires at least one Organic product in your basket.`,
    };
  }

  let discountPaise = 0;
  if (coupon.discountType === "FLAT") {
    discountPaise = toPaise(coupon.discountValue);
  } else if (coupon.discountType === "PERCENTAGE") {
    discountPaise = Math.round((itemSubtotalPaise * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount !== undefined) {
      discountPaise = Math.min(discountPaise, toPaise(coupon.maxDiscountAmount));
    }
  }

  // Discount cannot exceed item subtotal
  discountPaise = Math.min(discountPaise, itemSubtotalPaise);

  return {
    valid: true,
    coupon,
    discountPaise,
    error: null,
  };
}

export interface CalculatePricingOptions {
  productsCatalogue?: Product[];
  couponsCatalogue?: Coupon[];
  couponCode?: string | null;
  nowTimestamp?: number;
}

/**
 * Single Authoritative Pricing Engine.
 * Recalculates all line items, product-level discounts, coupon eligibility,
 * delivery fees, GST breakdown, and final payable amount from authoritative catalogue data.
 */
export function calculatePricingBreakdown(
  cartItems: CartItem[],
  options: CalculatePricingOptions = {}
): PricingBreakdown {
  const productsCatalogue = options.productsCatalogue || PRODUCTS;
  const couponsCatalogue = options.couponsCatalogue || DEFAULT_COUPONS;
  const nowTimestamp = options.nowTimestamp ?? Date.now();

  const lineItems: PricingLineItem[] = [];
  const stockWarnings: string[] = [];
  let hasStockIssues = false;

  let mrpTotalPaise = 0;
  let itemSubtotalPaise = 0;
  let productDiscountPaise = 0;
  let itemCount = 0;
  let hasOrganicItem = false;

  for (const rawItem of cartItems) {
    if (!rawItem || typeof rawItem.productId !== "string") {
      hasStockIssues = true;
      stockWarnings.push("Invalid cart item reference detected.");
      continue;
    }

    const product = productsCatalogue.find((p) => p.id === rawItem.productId);
    if (!product) {
      hasStockIssues = true;
      stockWarnings.push(`Product "${rawItem.productId}" is no longer available in our catalogue.`);
      lineItems.push({
        productId: rawItem.productId,
        sku: `UNKNOWN-${rawItem.productId}`,
        name: `Unavailable Item (${rawItem.productId})`,
        brand: "Grocerly",
        unit: "unit",
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
        quantity: rawItem.quantity,
        availableStock: 0,
        unitMrp: 0,
        unitPrice: 0,
        lineMrpTotal: 0,
        lineSubtotal: 0,
        lineProductDiscount: 0,
        inStock: false,
        stockError: "This product is no longer in the catalogue. Please remove it from your cart.",
      });
      continue;
    }

    const qtyCheck = validateQuantity(rawItem.quantity, product.stock);
    if (!qtyCheck.valid) {
      hasStockIssues = true;
      stockWarnings.push(`${product.name}: ${qtyCheck.error}`);
    }

    const effectiveQty = Number.isInteger(rawItem.quantity) && rawItem.quantity > 0 ? rawItem.quantity : 0;
    const unitPricePaise = toPaise(product.price);
    const unitMrpPaise = toPaise(
      product.originalPrice && product.originalPrice > product.price
        ? product.originalPrice
        : product.price
    );

    const lineSubtotalPaise = unitPricePaise * effectiveQty;
    const lineMrpPaise = unitMrpPaise * effectiveQty;
    const lineDiscountPaise = Math.max(0, lineMrpPaise - lineSubtotalPaise);

    if (effectiveQty > 0 && product.stock > 0) {
      mrpTotalPaise += lineMrpPaise;
      itemSubtotalPaise += lineSubtotalPaise;
      productDiscountPaise += lineDiscountPaise;
      itemCount += effectiveQty;
      if (product.organic) {
        hasOrganicItem = true;
      }
    }

    lineItems.push({
      productId: product.id,
      sku: product.sku || `GRY-${product.id.toUpperCase()}`,
      name: product.name,
      brand: product.brand,
      unit: product.unit,
      image: product.image,
      quantity: rawItem.quantity,
      availableStock: product.stock,
      unitMrp: toRupees(unitMrpPaise),
      unitPrice: toRupees(unitPricePaise),
      lineMrpTotal: toRupees(lineMrpPaise),
      lineSubtotal: toRupees(lineSubtotalPaise),
      lineProductDiscount: toRupees(lineDiscountPaise),
      inStock: qtyCheck.valid,
      stockError: qtyCheck.error,
    });
  }

  // Coupon validation
  const couponResult = validateCoupon(
    options.couponCode,
    itemSubtotalPaise,
    hasOrganicItem,
    couponsCatalogue,
    nowTimestamp
  );

  const couponDiscountPaise = couponResult.discountPaise;
  const taxableAmountPaise = Math.max(0, itemSubtotalPaise - couponDiscountPaise);

  // Delivery fee calculation: Free for orders with itemSubtotal >= ₹300
  const freeThresholdPaise = toPaise(FREE_DELIVERY_THRESHOLD_INR);
  const deliveryFeePaise =
    itemSubtotalPaise === 0 || itemSubtotalPaise >= freeThresholdPaise
      ? 0
      : toPaise(STANDARD_DELIVERY_FEE_INR);

  const amountForFreeDeliveryPaise =
    itemSubtotalPaise === 0 ? freeThresholdPaise : Math.max(0, freeThresholdPaise - itemSubtotalPaise);

  // GST calculation (5% inclusive/itemized breakdown on taxable amount, split equally into CGST 2.5% & SGST 2.5%)
  const totalGstPaise = Math.round((taxableAmountPaise * GST_RATE_PERCENT) / (100 + GST_RATE_PERCENT));
  const cgstPaise = Math.floor(totalGstPaise / 2);
  const sgstPaise = totalGstPaise - cgstPaise;

  const finalPayablePaise = Math.max(0, taxableAmountPaise + deliveryFeePaise);
  const totalSavingsPaise = productDiscountPaise + couponDiscountPaise;

  return {
    currency: "INR",
    itemCount,
    mrpTotal: toRupees(mrpTotalPaise),
    itemSubtotal: toRupees(itemSubtotalPaise),
    subtotal: toRupees(itemSubtotalPaise),
    productDiscount: toRupees(productDiscountPaise),
    couponCode: couponResult.coupon ? couponResult.coupon.code : null,
    couponDiscount: toRupees(couponDiscountPaise),
    couponError: couponResult.error,
    deliveryFee: toRupees(deliveryFeePaise),
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD_INR,
    amountForFreeDelivery: toRupees(amountForFreeDeliveryPaise),
    taxableAmount: toRupees(taxableAmountPaise),
    cgstAmount: toRupees(cgstPaise),
    sgstAmount: toRupees(sgstPaise),
    gstAmount: toRupees(totalGstPaise),
    finalPayable: toRupees(finalPayablePaise),
    totalSavings: toRupees(totalSavingsPaise),
    lineItems,
    hasStockIssues,
    stockWarnings,
  };
}
