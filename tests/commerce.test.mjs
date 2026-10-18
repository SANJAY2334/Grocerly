import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// Configure in-memory database testing environment before importing database models
process.env.GROCERLY_TEST_IN_MEMORY = "true";
process.env.SESSION_SECRET = "test_super_secure_secret_signing_key_2026_dev_seed_123456789";

import {
  toPaise,
  toRupees,
  validateQuantity,
  validateCoupon,
  calculatePricingBreakdown,
  FREE_DELIVERY_THRESHOLD_INR,
  STANDARD_DELIVERY_FEE_INR,
  GST_RATE_PERCENT,
} from "../lib/pricing.ts";

import {
  ORDER_TRANSITIONS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_NOTES,
  canTransitionOrderStatus,
  createTimelineEvent,
} from "../lib/order-state-machine.ts";

import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  canAccessCustomerResource,
} from "../lib/auth.ts";

import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  getRazorpayConfigStatus,
} from "../lib/payments.ts";

import {
  sanitizeString,
  hasMaliciousKeys,
  validateDeliveryAddress,
  validateCheckoutPayload,
} from "../lib/validation.ts";

import {
  calculateMealPlan,
  findSubstituteProducts,
} from "../lib/meal-planner.ts";

import {
  resetTestDatabase,
  getAllProducts,
  getProductById,
  updateProductStock,
  createOrderTransaction,
  transitionOrderStatus,
  getOrderById,
  getCoupons,
  validatePinCodeServiceability,
  setDatabaseSimulatedDown,
} from "../lib/db.ts";

// =============================================================================
// SUITE 1: AUTHORITATIVE PRICING ENGINE & INTEGER PAISE ARITHMETIC
// =============================================================================

test("Pricing Engine: paise-accurate integer conversions eliminate float drift", () => {
  assert.equal(toPaise(19.99), 1999);
  assert.equal(toPaise(40), 4000);
  assert.equal(toPaise(0), 0);
  assert.equal(toRupees(1999), 19.99);
  assert.equal(toRupees(4000), 40);
  assert.equal(toRupees(0), 0);
});

test("Pricing Engine: quantity validation enforces positive integers and stock caps", () => {
  assert.deepEqual(validateQuantity(1, 10), { valid: true, normalizedQuantity: 1 });
  assert.deepEqual(validateQuantity(5, 5), { valid: true, normalizedQuantity: 5 });

  // Non-integers
  assert.equal(validateQuantity(1.5, 10).valid, false);
  assert.match(validateQuantity(1.5, 10).error || "", /whole number|integer/i);

  // Zero & Negatives
  assert.equal(validateQuantity(0, 10).valid, false);
  assert.equal(validateQuantity(-3, 10).valid, false);

  // Exceeding stock
  assert.equal(validateQuantity(15, 10).valid, false);
  assert.match(validateQuantity(15, 10).error || "", /available in stock|exceeds/i);
});

test("Pricing Engine: delivery fee rule enforces free delivery ≥ ₹300, else ₹40", () => {
  // Empty cart -> ₹0 fee
  const emptyCalc = calculatePricingBreakdown([]);
  assert.equal(emptyCalc.itemSubtotal, 0);
  assert.equal(emptyCalc.deliveryFee, 0);
  assert.equal(emptyCalc.finalPayable, 0);

  // Subtotal < ₹300 (e.g. 2 x ₹40 = ₹80) -> ₹40 fee
  const sub300 = calculatePricingBreakdown([
    { productId: "fresh-tomatoes", quantity: 2 },
  ]);
  assert.equal(sub300.itemSubtotal, 80);
  assert.equal(sub300.deliveryFee, STANDARD_DELIVERY_FEE_INR); // 40
  assert.equal(sub300.finalPayable, 120);

  // Subtotal exactly ₹300 -> ₹0 fee
  const at300 = calculatePricingBreakdown([
    { productId: "amul-milk", quantity: 5 }, // 5 x ₹60 = ₹300
  ]);
  assert.equal(at300.itemSubtotal, 300);
  assert.equal(at300.deliveryFee, 0);
  assert.equal(at300.finalPayable, 300);

  // Subtotal > ₹300 -> ₹0 fee
  const over300 = calculatePricingBreakdown([
    { productId: "amul-milk", quantity: 10 }, // 10 x ₹60 = ₹600
  ]);
  assert.equal(over300.itemSubtotal, 600);
  assert.equal(over300.deliveryFee, 0);
  assert.equal(over300.finalPayable, 600);
});

test("Pricing Engine: coupon validation for FRESH50, ORGANIC10, WELCOME100 and EXPIRED20", () => {
  // FRESH50: ₹50 flat discount, requires min subtotal ₹200
  const freshValid = validateCoupon("FRESH50", toPaise(250), false);
  assert.equal(freshValid.valid, true);
  assert.equal(freshValid.discountPaise, toPaise(50));

  const freshBelowMin = validateCoupon("FRESH50", toPaise(150), false);
  assert.equal(freshBelowMin.valid, false);
  assert.match(freshBelowMin.error || "", /minimum item subtotal/i);

  // ORGANIC10: 10% discount up to ₹100, requires min subtotal ₹250 and organic items
  const organicValid = validateCoupon("ORGANIC10", toPaise(300), true);
  assert.equal(organicValid.valid, true);
  assert.equal(organicValid.discountPaise, toPaise(30)); // 10% of 300 = 30

  const organicNoItems = validateCoupon("ORGANIC10", toPaise(300), false);
  assert.equal(organicNoItems.valid, false);
  assert.match(organicNoItems.error || "", /Organic/i);

  // WELCOME100: ₹100 flat discount, requires min subtotal ₹500
  const welcomeValid = validateCoupon("WELCOME100", toPaise(600), false);
  assert.equal(welcomeValid.valid, true);
  assert.equal(welcomeValid.discountPaise, toPaise(100));

  // EXPIRED20: Expired promo code
  const expiredCheck = validateCoupon("EXPIRED20", toPaise(500), false);
  assert.equal(expiredCheck.valid, false);
  assert.match(expiredCheck.error || "", /expired/i);

  // Non-existent coupon
  const fakeCheck = validateCoupon("FAKE_CODE", toPaise(500), false);
  assert.equal(fakeCheck.valid, false);
  assert.match(fakeCheck.error || "", /Invalid coupon/i);
});

test("Pricing Engine: 5% GST calculation is split equally between CGST and SGST", () => {
  const breakdown = calculatePricingBreakdown([
    { productId: "fresh-tomatoes", quantity: 5 }, // 5 x 40 = 200
    { productId: "organic-spinach", quantity: 4 }, // 4 x 30 = 120
  ]);
  // Total subtotal = 320 >= 300 (free delivery)
  assert.equal(breakdown.itemSubtotal, 320);
  assert.equal(breakdown.deliveryFee, 0);

  // GST rate = 5% inclusive
  // totalGst = round(32000 * 5 / 105) = round(1523.8) = 1524 paise = 15.24 INR
  assert.equal(breakdown.gstAmount, toRupees(1524));
  assert.equal(breakdown.cgstAmount + breakdown.sgstAmount, breakdown.gstAmount);
  // CGST and SGST are within 1 paisa of each other
  assert.ok(Math.abs(breakdown.cgstAmount - breakdown.sgstAmount) <= 0.01);
});

// =============================================================================
// SUITE 2: ORDER STATE MACHINE & ROLE-BASED TRANSITIONS
// =============================================================================

test("Order State Machine: valid operational fulfillment workflow", () => {
  // PENDING_PAYMENT -> CONFIRMED -> PROCESSING -> PACKED -> OUT_FOR_DELIVERY -> DELIVERED
  assert.equal(canTransitionOrderStatus("PENDING_PAYMENT", "CONFIRMED", "OPS").allowed, true);
  assert.equal(canTransitionOrderStatus("CONFIRMED", "PROCESSING", "OPS").allowed, true);
  assert.equal(canTransitionOrderStatus("PROCESSING", "PACKED", "OPS").allowed, true);
  assert.equal(canTransitionOrderStatus("PACKED", "OUT_FOR_DELIVERY", "OPS").allowed, true);
  assert.equal(canTransitionOrderStatus("OUT_FOR_DELIVERY", "DELIVERED", "OPS").allowed, true);
});

test("Order State Machine: customer role cannot advance operations or access unauthorized transitions", () => {
  // Customer cannot transition order to PROCESSING, PACKED, or DELIVERED
  assert.equal(canTransitionOrderStatus("CONFIRMED", "PROCESSING", "CUSTOMER").allowed, false);
  assert.equal(canTransitionOrderStatus("PACKED", "DELIVERED", "CUSTOMER").allowed, false);

  // Customer CAN transition their own PENDING_PAYMENT or CONFIRMED order to CANCELLED
  assert.equal(canTransitionOrderStatus("PENDING_PAYMENT", "CANCELLED", "CUSTOMER").allowed, true);
  assert.equal(canTransitionOrderStatus("CONFIRMED", "CANCELLED", "CUSTOMER").allowed, true);

  // Customer CANNOT cancel once order is PACKED or OUT_FOR_DELIVERY
  assert.equal(canTransitionOrderStatus("PACKED", "CANCELLED", "CUSTOMER").allowed, false);
  assert.equal(canTransitionOrderStatus("OUT_FOR_DELIVERY", "CANCELLED", "CUSTOMER").allowed, false);
});

test("Order State Machine: terminal states prevent invalid transitions", () => {
  // DELIVERED can only transition to REFUNDED, never backwards to PROCESSING
  assert.equal(canTransitionOrderStatus("DELIVERED", "PROCESSING", "ADMIN").allowed, false);
  assert.equal(canTransitionOrderStatus("DELIVERED", "REFUNDED", "ADMIN").allowed, true);

  // REFUNDED is an absolute terminal state (empty transitions list)
  assert.equal(canTransitionOrderStatus("REFUNDED", "CONFIRMED", "ADMIN").allowed, false);
  assert.equal(canTransitionOrderStatus("REFUNDED", "DELIVERED", "ADMIN").allowed, false);
});

// =============================================================================
// SUITE 3: AUTHENTICATION, PASSWORD SECURITY & SESSION ISOLATION
// =============================================================================

test("Authentication: scrypt password hashing and constant-time verification", () => {
  const password = "SecurePassword@2026!";
  const hash = hashPassword(password);

  assert.ok(hash.startsWith("scrypt:"));
  assert.equal(verifyPassword(password, hash), true);
  assert.equal(verifyPassword("WrongPassword123", hash), false);
  assert.equal(verifyPassword("", hash), false);
});

test("Authentication: HMAC-SHA256 session token generation and tamper resistance", () => {
  const token = signSessionToken({
    id: "usr-cust-01",
    email: "cust@example.com",
    name: "Customer",
    role: "CUSTOMER",
  });
  assert.ok(typeof token === "string");
  assert.ok(token.includes("."));

  const verified = verifySessionToken(token);
  assert.ok(verified !== null);
  assert.equal(verified?.userId, "usr-cust-01");
  assert.equal(verified?.email, "cust@example.com");
  assert.equal(verified?.role, "CUSTOMER");

  // Tampered payload
  const tamperedToken = token.slice(0, -6) + "xxxxxx";
  assert.equal(verifySessionToken(tamperedToken), null);
});

test("Authentication: strict customer data isolation enforcement", () => {
  const customerA = {
    userId: "cust-1",
    email: "a@domain.com",
    name: "Customer A",
    role: "CUSTOMER",
    iat: Date.now(),
    exp: Date.now() + 10000,
  };
  const customerB = {
    userId: "cust-2",
    email: "b@domain.com",
    name: "Customer B",
    role: "CUSTOMER",
    iat: Date.now(),
    exp: Date.now() + 10000,
  };
  const staffAdmin = {
    userId: "admin-1",
    email: "admin@grocerly.in",
    name: "Admin",
    role: "ADMIN",
    iat: Date.now(),
    exp: Date.now() + 10000,
  };
  const staffOps = {
    userId: "ops-1",
    email: "ops@grocerly.in",
    name: "Ops",
    role: "OPS",
    iat: Date.now(),
    exp: Date.now() + 10000,
  };

  // Customer A can access their own data
  assert.equal(canAccessCustomerResource(customerA, "cust-1"), true);
  // Customer A CANNOT access Customer B's data
  assert.equal(canAccessCustomerResource(customerA, "cust-2"), false);

  // Staff (ADMIN & OPS) can access for fulfillment and customer support
  assert.equal(canAccessCustomerResource(staffAdmin, "cust-1"), true);
  assert.equal(canAccessCustomerResource(staffOps, "cust-2"), true);
});

// =============================================================================
// SUITE 4: PAYMENT SIGNATURE VERIFICATION & HONEST GATEWAY STATUS
// =============================================================================

test("Payments: Razorpay signature verification and HMAC validation", () => {
  const keySecret = "rzp_test_secret_12345";
  const orderId = "order_test_123";
  const paymentId = "pay_test_456";

  // Compute expected signature
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  assert.equal(
    verifyRazorpayPaymentSignature(orderId, paymentId, expectedSignature, keySecret),
    true
  );

  // Fake or tampered signature
  assert.equal(
    verifyRazorpayPaymentSignature(orderId, paymentId, "fake_signature_hash", keySecret),
    false
  );
});

test("Payments: Razorpay webhook signature verification", () => {
  const webhookSecret = "wh_secret_xyz";
  const payload = JSON.stringify({ event: "payment.captured", paymentId: "pay_999" });

  const validSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  assert.equal(verifyRazorpayWebhookSignature(payload, validSignature, webhookSecret), true);
  assert.equal(verifyRazorpayWebhookSignature(payload, "invalid_wh_sig", webhookSecret), false);
});

test("Payments: getRazorpayConfigStatus honestly reports unconfigured state when keys missing", () => {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;

  const status = getRazorpayConfigStatus();
  assert.equal(status.configured, false);
});

// =============================================================================
// SUITE 5: MEAL PLANNER, CONSOLIDATION, PANTRY & SUBSTITUTIONS
// =============================================================================

test("Meal Planner: scales ingredients and consolidates duplicates across recipes", () => {
  const result = calculateMealPlan([
    { recipeId: "paneer-butter-masala", servings: 4 },
    { recipeId: "dal-tadka", servings: 4 },
  ]);

  assert.ok(result.ingredients.length > 0);
  assert.ok(result.totalBasketCost > 0);

  // Tomatoes and Onions are shared in both recipes — verify consolidation
  const tomatoItem = result.ingredients.find((i) => i.productId === "fresh-tomatoes");
  assert.ok(tomatoItem, "Tomatoes should be in consolidated plan");
  assert.ok(
    tomatoItem.sourceRecipes.length >= 2,
    "Tomatoes should be consolidated across multiple recipes"
  );
});

test("Meal Planner: pantry items are excluded from total buy cost", () => {
  // Without pantry exclusions
  const baseResult = calculateMealPlan([
    { recipeId: "paneer-butter-masala", servings: 4 },
  ]);

  // With Paneer marked as in pantry (recipe uses "amul-fresh-paneer")
  const pantryResult = calculateMealPlan(
    [{ recipeId: "paneer-butter-masala", servings: 4 }],
    { pantryProductIds: ["amul-fresh-paneer"] }
  );

  const paneerItem = pantryResult.ingredients.find((i) => i.productId === "amul-fresh-paneer");
  assert.ok(paneerItem);
  assert.equal(paneerItem.inPantry, true);
  assert.equal(paneerItem.lineCost, 0);

  // Total basket cost must decrease by paneer cost
  assert.ok(pantryResult.totalBasketCost < baseResult.totalBasketCost);
  assert.ok(pantryResult.pantrySavings > 0);
});

test("Meal Planner: substitute product recommendation", () => {
  const tomatoProd = getProductById("fresh-tomatoes");
  const substitutes = findSubstituteProducts(tomatoProd, "tomatoes");
  assert.ok(substitutes.length > 0);
  // Primary product itself must never be in its own substitutes list
  assert.ok(!substitutes.some((s) => s.id === "fresh-tomatoes"));
});

// =============================================================================
// SUITE 6: PERSISTENT DATABASE ENGINE, STOCK RESERVATION & IDEMPOTENCY
// =============================================================================

test("Database: atomic order creation with inventory reservation and stock safety", () => {
  resetTestDatabase();

  const tomatoBefore = getProductById("fresh-tomatoes");
  assert.ok(tomatoBefore);
  const initialStock = tomatoBefore.stock;
  const initialReserved = tomatoBefore.reservedStock;

  // Online payment (UPI) tests the ACTIVE reservation and reservedStock increment
  const orderResult = createOrderTransaction({
    items: [{ productId: "fresh-tomatoes", quantity: 3 }],
    address: {
      fullName: "Priya Sharma",
      phone: "+91 98765 43210",
      street: "Flat 204, Green Palms",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
    },
    deliverySlot: "Morning: 07:00 AM – 09:00 AM",
    paymentMethod: "UPI",
    idempotencyKey: "test_idem_001",
  });

  assert.equal(orderResult.success, true);
  assert.ok(orderResult.order);

  const tomatoAfter = getProductById("fresh-tomatoes");
  assert.equal(tomatoAfter?.stock, initialStock - 3);
  assert.equal(tomatoAfter?.reservedStock, initialReserved + 3);

  // Verify order is retrievable
  const savedOrder = getOrderById(orderResult.order.id);
  assert.ok(savedOrder);
  assert.equal(savedOrder?.status, "PENDING_PAYMENT");
});

test("Database: idempotency key prevents duplicate orders and double deductions", () => {
  resetTestDatabase();

  const tomatoBefore = getProductById("fresh-tomatoes");
  const stockStart = tomatoBefore?.stock || 0;

  const payload = {
    items: [{ productId: "fresh-tomatoes", quantity: 2 }],
    address: {
      fullName: "Aarav Mehta",
      phone: "+91 98765 11111",
      street: "12 Marine Drive",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
    },
    deliverySlot: "Slot 1: 10:00 AM – 12:00 PM",
    paymentMethod: "COD",
    idempotencyKey: "unique_session_key_999",
  };

  // First call creates the order
  const firstRes = createOrderTransaction(payload);
  assert.equal(firstRes.success, true);

  // Second call with same idempotency key returns the existing order without deducting stock again
  const secondRes = createOrderTransaction(payload);
  assert.equal(secondRes.success, true);
  assert.equal(secondRes.order?.id, firstRes.order?.id);

  const tomatoAfter = getProductById("fresh-tomatoes");
  // Stock deducted once (2 units), not twice (4 units)
  assert.equal(tomatoAfter?.stock, stockStart - 2);
});

test("Database: order cancellation releases reserved stock back to available stock", () => {
  resetTestDatabase();

  const orderResult = createOrderTransaction({
    items: [{ productId: "organic-spinach", quantity: 4 }],
    address: {
      fullName: "Ananya Roy",
      phone: "+91 98765 22222",
      street: "Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
    },
    deliverySlot: "Slot 2: 12:00 PM – 02:00 PM",
    paymentMethod: "UPI",
    idempotencyKey: "test_cancel_flow",
  });

  assert.equal(orderResult.success, true);
  const spinachMid = getProductById("organic-spinach");
  const reservedMid = spinachMid?.reservedStock || 0;
  const stockMid = spinachMid?.stock || 0;

  // Transition to CANCELLED
  const cancelResult = transitionOrderStatus(
    orderResult.order.id,
    "CANCELLED",
    "Customer cancelled order",
    "CUSTOMER"
  );

  assert.equal(cancelResult.success, true);
  const spinachAfter = getProductById("organic-spinach");
  // Reserved stock decremented by 4 and available stock restored by 4
  assert.equal(spinachAfter?.reservedStock, reservedMid - 4);
  assert.equal(spinachAfter?.stock, stockMid + 4);
});

// =============================================================================
// SUITE 7: INPUT VALIDATION, INJECTION PROTECTION & PIN CODE SERVICEABILITY
// =============================================================================

test("Validation: sanitization strips HTML tags and controls", () => {
  assert.equal(
    sanitizeString("<p>Fresh <b>Tomatoes</b></p>"),
    "Fresh Tomatoes"
  );
  const cleaned = sanitizeString('<script>alert("xss")</script>');
  assert.ok(!cleaned.includes("<") && !cleaned.includes(">"));
});

test("Validation: blocks MongoDB query injection operators and prototype pollution", () => {
  assert.equal(hasMaliciousKeys({ name: "Tomatoes", price: 40 }), false);
  assert.equal(hasMaliciousKeys({ $gt: 0 }), true);
  assert.equal(hasMaliciousKeys({ user: { $where: "sleep(5000)" } }), true);
  assert.equal(hasMaliciousKeys(JSON.parse('{"__proto__": {"admin": true}}')), true);
  assert.equal(hasMaliciousKeys(JSON.parse('{"constructor": {"prototype": {}}}')), true);
});

test("Validation: PIN code serviceability check accepts serviceable metro zones and rejects invalid", () => {
  // Valid metro PINs
  assert.equal(validatePinCodeServiceability("400001").serviceable, true); // Mumbai
  assert.equal(validatePinCodeServiceability("560001").serviceable, true); // Bengaluru
  assert.equal(validatePinCodeServiceability("110001").serviceable, true); // Delhi

  // Unserviceable PIN (valid 6-digit but remote/uncovered)
  assert.equal(validatePinCodeServiceability("799001").serviceable, false);

  // Malformed PIN codes
  assert.equal(validatePinCodeServiceability("000000").serviceable, false);
  assert.equal(validatePinCodeServiceability("abcd").serviceable, false);
  assert.equal(validatePinCodeServiceability("").serviceable, false);
});
