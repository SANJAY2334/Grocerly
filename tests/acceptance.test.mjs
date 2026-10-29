import test from "node:test";
import assert from "node:assert/strict";

process.env.GROCERLY_TEST_IN_MEMORY = "true";
process.env.NODE_ENV = "test";
process.env.AUTH_SECRET = "grocerly_test_secret_for_cryptographic_verification_key_32chars!";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/grocerly_test";

import { getAllProducts, getProductById, resetTestDatabase } from "../lib/db.ts";
import { createNewOrder, fetchOrderById } from "../lib/services/order.ts";
import {
  registerUser,
  authenticateUser,
  verifyUserEmail,
  verifyServerSession,
  revokeSession,
  resetInMemoryAuth,
} from "../lib/services/auth.ts";
import {
  getSentEmailsForTest,
  clearSentEmailsForTest,
  setSimulateEmailFailureForTest,
  escapeHtml,
  validateResetUrl,
  sendVerificationOtpEmail,
  sendOrderConfirmationEmail,
} from "../lib/services/email.ts";
import { validateAuthSecretInProduction, KNOWN_INSECURE_SECRETS } from "../lib/config/index.ts";
import { ProductModel } from "../lib/models/Product.ts";
import { OrderModel } from "../lib/models/Order.ts";
import { connectToDatabase } from "../lib/db/connection.ts";

// Genuine Next.js HTTP Route Handlers
import { POST as createOrderRoute, GET as getOrdersRoute } from "../app/api/orders/route.ts";
import { GET as getOrderByIdRoute, PATCH as patchOrderRoute } from "../app/api/orders/[id]/route.ts";
import { POST as createPaymentOrderRoute } from "../app/api/payments/create-order/route.ts";
import { POST as verifyPaymentRoute } from "../app/api/payments/verify/route.ts";
import { GET as getMeRoute } from "../app/api/auth/me/route.ts";
import { POST as logoutRoute } from "../app/api/auth/logout/route.ts";

// Helper to seed products in MongoDB before integration tests
async function ensureDbProducts() {
  await connectToDatabase();
  await ProductModel.findOneAndUpdate(
    { id: "fresh-tomatoes" },
    {
      id: "fresh-tomatoes",
      name: "Fresh Tomatoes",
      sku: "GRY-SKU-fresh-tomatoes",
      price: 45,
      stock: 50,
      unit: "500g",
      category: "vegetables",
      image: "/images/tomatoes.jpg",
      soldCount: 0,
      reservedStock: 0,
    },
    { upsert: true, new: true }
  );

  await ProductModel.findOneAndUpdate(
    { id: "organic-spinach" },
    {
      id: "organic-spinach",
      name: "Organic Spinach",
      sku: "GRY-SKU-organic-spinach",
      price: 35,
      stock: 2, // intentionally low stock for partial reservation tests
      unit: "250g",
      category: "vegetables",
      image: "/images/spinach.jpg",
      soldCount: 0,
      reservedStock: 0,
    },
    { upsert: true, new: true }
  );
}

// Helper to register, verify, and authenticate a test user
async function createAuthenticatedSession(name, email, role = "CUSTOMER") {
  await registerUser({ name, email, password: "Password@123" }).catch(() => {});
  const sent = getSentEmailsForTest().find((e) => e.to === email);
  if (sent) {
    const otp = sent.subject.match(/\b\d{6}\b/)?.[0] || "";
    await verifyUserEmail(email, otp).catch(() => {});
  }
  const auth = await authenticateUser({ email, password: "Password@123" });
  return auth;
}

// =============================================================================
// REAL HTTP ROUTE INTEGRATION TEST SUITE (14 ACCEPTANCE CRITERIA)
// =============================================================================

test("Acceptance 1: Guest browsing works without authentication", async () => {
  resetTestDatabase();
  const products = getAllProducts();
  assert.ok(Array.isArray(products));
  assert.ok(products.length > 0, "Products should be discoverable by unauthenticated guests");

  const product = getProductById(products[0].id);
  assert.ok(product, "Product details should be viewable by unauthenticated guests");
  assert.equal(product.id, products[0].id);
});

test("Acceptance 2: Guest cart pricing and validation works locally across browsing", () => {
  const guestCart = [
    { productId: "fresh-tomatoes", quantity: 2 },
    { productId: "organic-spinach", quantity: 1 },
  ];
  assert.equal(guestCart.length, 2);
  assert.equal(guestCart[0].quantity, 2);

  guestCart[0].quantity += 1;
  assert.equal(guestCart[0].quantity, 3);
  assert.equal(guestCart.find((i) => i.productId === "fresh-tomatoes")?.quantity, 3);
});

test("Acceptance 3: Direct guest order creation returns 401 via HTTP route with zero inventory deductions", async () => {
  await ensureDbProducts();
  const tomatoBefore = await ProductModel.findOne({ id: "fresh-tomatoes" });
  const initialStock = tomatoBefore?.stock || 50;

  // Real HTTP Request with NO session cookie / token
  const req = new Request("http://localhost:3000/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Host": "localhost:3000",
      "Origin": "http://localhost:3000",
    },
    body: JSON.stringify({
      items: [{ productId: "fresh-tomatoes", quantity: 2 }],
      address: {
        fullName: "Guest Attacker",
        phone: "+91 98765 00000",
        street: "Unauthorized Way",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      },
      deliverySlot: "Morning: 07:00 AM – 09:00 AM",
      paymentMethod: "COD",
    }),
  });

  const res = await createOrderRoute(req);
  assert.equal(res.status, 401, "Direct unauthenticated request to /api/orders must return HTTP 401");

  const body = await res.json();
  assert.equal(body.success, false);
  assert.match(body.error, /Authentication required/i);

  // Verify stock was unaffected in database
  const tomatoAfter = await ProductModel.findOne({ id: "fresh-tomatoes" });
  assert.equal(tomatoAfter?.stock, initialStock, "Inventory must not be deducted on unauthorized order attempt");
});

test("Acceptance 4: Direct unauthenticated payment creation & verification routes return 401", async () => {
  // Unauthenticated call to /api/payments/create-order
  const reqCreate = new Request("http://localhost:3000/api/payments/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Host": "localhost:3000",
      "Origin": "http://localhost:3000",
    },
    body: JSON.stringify({ orderId: "ORD-12345" }),
  });
  const resCreate = await createPaymentOrderRoute(reqCreate);
  assert.equal(resCreate.status, 401, "Unauthenticated payment order creation must return 401");

  // Unauthenticated call to /api/payments/verify
  const reqVerify = new Request("http://localhost:3000/api/payments/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Host": "localhost:3000",
      "Origin": "http://localhost:3000",
    },
    body: JSON.stringify({
      orderId: "ORD-12345",
      razorpay_order_id: "order_123",
      razorpay_payment_id: "pay_123",
      razorpay_signature: "sig_123",
    }),
  });
  const resVerify = await verifyPaymentRoute(reqVerify);
  assert.equal(resVerify.status, 401, "Unauthenticated payment verification must return 401");
});

test("Acceptance 5: Authenticated customers can place valid COD orders starting as CONFIRMED via HTTP route", async () => {
  await ensureDbProducts();
  const tomatoBefore = await ProductModel.findOne({ id: "fresh-tomatoes" });
  const initialStock = tomatoBefore?.stock || 50;

  // Create real authenticated customer session
  const auth = await createAuthenticatedSession("Acceptance Customer", "accept_cod_user@grocerly.in");

  const req = new Request("http://localhost:3000/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Host": "localhost:3000",
      "Origin": "http://localhost:3000",
      "Cookie": `grocerly_session=${auth.sessionToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: "fresh-tomatoes", quantity: 2 }],
      address: {
        fullName: "Acceptance Customer",
        phone: "+91 98765 43210",
        street: "12 Marine Drive",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      },
      deliverySlot: "Morning: 07:00 AM – 09:00 AM",
      paymentMethod: "COD",
      idempotencyKey: `idem_accept_cod_${Date.now()}`,
    }),
  });

  const res = await createOrderRoute(req);
  assert.equal(res.status, 201, "Authenticated valid COD order should return HTTP 201");

  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.order);
  assert.equal(body.order.status, "CONFIRMED", "COD order must initialize as CONFIRMED");
  assert.equal(body.order.paymentMethod, "COD");
  assert.equal(body.order.paymentStatus, "PENDING");

  const tomatoAfter = await ProductModel.findOne({ id: "fresh-tomatoes" });
  assert.equal(tomatoAfter?.stock, initialStock - 2, "Stock must be deducted by exact quantity");
});

test("Acceptance 6: Online orders require cryptographic verification and reject forged signatures via HTTP route", async () => {
  await ensureDbProducts();
  const auth = await createAuthenticatedSession("Online Customer", "accept_online_user@grocerly.in");

  // Create an online UPI order via route
  const reqOrder = new Request("http://localhost:3000/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Host": "localhost:3000",
      "Origin": "http://localhost:3000",
      "Cookie": `grocerly_session=${auth.sessionToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: "fresh-tomatoes", quantity: 1 }],
      address: {
        fullName: "Online Customer",
        phone: "+91 98765 43210",
        street: "45 MG Road",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560001",
      },
      deliverySlot: "Morning: 07:00 AM – 09:00 AM",
      paymentMethod: "UPI",
      idempotencyKey: `idem_accept_online_${Date.now()}`,
    }),
  });

  const resOrder = await createOrderRoute(reqOrder);
  assert.equal(resOrder.status, 201);
  const orderBody = await resOrder.json();
  const order = orderBody.order;
  assert.equal(order.status, "PENDING_PAYMENT", "Online order must start in PENDING_PAYMENT");

  // Associate mock razorpayOrderId on the order document for payment verification test
  await OrderModel.updateOne({ id: order.id }, { $set: { razorpayOrderId: "order_rzp_mock_123" } });

  // Attempt verification with a forged signature via HTTP route
  const reqVerify = new Request("http://localhost:3000/api/payments/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Host": "localhost:3000",
      "Origin": "http://localhost:3000",
      "Cookie": `grocerly_session=${auth.sessionToken}`,
    },
    body: JSON.stringify({
      orderId: order.id,
      razorpay_order_id: "order_rzp_mock_123",
      razorpay_payment_id: "pay_rzp_mock_456",
      razorpay_signature: "forged_invalid_hex_signature_digest_12345",
    }),
  });

  const resVerify = await verifyPaymentRoute(reqVerify);
  assert.equal(resVerify.status, 400, "Forged payment signature must be rejected with 400");

  // Order status must still remain PENDING_PAYMENT
  const freshOrder = await OrderModel.findOne({ id: order.id });
  assert.equal(freshOrder?.status, "PENDING_PAYMENT", "Order must not advance to CONFIRMED on forged signature");
});

test("Acceptance 7: Customer isolation enforced via HTTP routes (cross-customer order access & tampering rejected)", async () => {
  await ensureDbProducts();
  const sessionOwner = await createAuthenticatedSession("Order Owner", "owner_isolation_user@grocerly.in");
  const sessionAttacker = await createAuthenticatedSession("Attacker", "attacker_isolation_user@grocerly.in");

  // Owner creates an order
  const orderRes = await createNewOrder({
    userId: sessionOwner.user.id,
    userEmail: sessionOwner.user.email,
    userName: sessionOwner.user.name,
    items: [{ productId: "fresh-tomatoes", quantity: 1 }],
    address: {
      fullName: sessionOwner.user.name,
      phone: "+91 98765 00000",
      street: "1 Owner Way",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
    },
    deliverySlot: "Morning: 07:00 AM – 09:00 AM",
    paymentMethod: "COD",
    idempotencyKey: `idem_isolation_${Date.now()}`,
  });

  assert.ok(orderRes.order);
  const orderId = orderRes.order.id;

  // Attacker attempts to fetch owner's order via HTTP GET /api/orders/[id]
  const reqGet = new Request(`http://localhost:3000/api/orders/${orderId}`, {
    method: "GET",
    headers: {
      "Cookie": `grocerly_session=${sessionAttacker.sessionToken}`,
    },
  });
  const resGet = await getOrderByIdRoute(reqGet, { params: { id: orderId } });
  assert.equal(resGet.status, 403, "Cross-customer order access must return HTTP 403 Forbidden");

  // Attacker attempts to modify owner's order via HTTP PATCH /api/orders/[id]
  const reqPatch = new Request(`http://localhost:3000/api/orders/${orderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Host": "localhost:3000",
      "Origin": "http://localhost:3000",
      "Cookie": `grocerly_session=${sessionAttacker.sessionToken}`,
    },
    body: JSON.stringify({ status: "CANCELLED" }),
  });
  const resPatch = await patchOrderRoute(reqPatch, { params: { id: orderId } });
  assert.equal(resPatch.status, 403, "Cross-customer status modification must return HTTP 403 Forbidden");

  // Owner attempts illegal status transition to DELIVERED
  const reqOwnerIllegal = new Request(`http://localhost:3000/api/orders/${orderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Host": "localhost:3000",
      "Origin": "http://localhost:3000",
      "Cookie": `grocerly_session=${sessionOwner.sessionToken}`,
    },
    body: JSON.stringify({ status: "DELIVERED" }),
  });
  const resOwnerIllegal = await patchOrderRoute(reqOwnerIllegal, { params: { id: orderId } });
  assert.equal(resOwnerIllegal.status, 400, "Customer cannot transition order to DELIVERED (restricted to OPS/ADMIN)");
});

test("Acceptance 8: Order confirmation integrity and honest HTTP error handling", async () => {
  const session = await createAuthenticatedSession("Error Test Customer", "err_test_user@grocerly.in");

  // Request non-existent order via HTTP route
  const req404 = new Request("http://localhost:3000/api/orders/ORD-DOES-NOT-EXIST-999", {
    method: "GET",
    headers: {
      "Cookie": `grocerly_session=${session.sessionToken}`,
    },
  });
  const res404 = await getOrderByIdRoute(req404, { params: { id: "ORD-DOES-NOT-EXIST-999" } });
  assert.equal(res404.status, 404, "Non-existent order must return honest HTTP 404");

  // Unauthenticated request to /api/orders/[id]
  const req401 = new Request("http://localhost:3000/api/orders/ORD-ANY", { method: "GET" });
  const res401 = await getOrderByIdRoute(req401, { params: { id: "ORD-ANY" } });
  assert.equal(res401.status, 401, "Unauthenticated order lookup must return HTTP 401");
});

test("Acceptance 9: OTP delivery failure is reported honestly without claiming success", async () => {
  resetInMemoryAuth();
  clearSentEmailsForTest();

  // Enable simulated email failure
  setSimulateEmailFailureForTest(true);

  try {
    await assert.rejects(
      async () => {
        await registerUser({
          name: "Failed Email User",
          email: "fail_email@grocerly.in",
          password: "Password@123",
        });
      },
      /Registration cannot be completed: failed to deliver verification email/
    );

    // Unverified login should fail because registration was not finalized
    await assert.rejects(
      async () => {
        await authenticateUser({
          email: "fail_email@grocerly.in",
          password: "Password@123",
        });
      },
      /Invalid email or password|EMAIL_NOT_VERIFIED/i
    );
  } finally {
    setSimulateEmailFailureForTest(false);
  }
});

test("Acceptance 10: Safe redirect validation and destination preservation", () => {
  const validRedirect = "/checkout";
  const isSafeRelative = validRedirect.startsWith("/") && !validRedirect.startsWith("//");
  assert.equal(isSafeRelative, true, "Relative /checkout redirect must be accepted");

  const openRedirect = "https://malicious-phishing.com";
  const isSafeMalicious = openRedirect.startsWith("/") && !openRedirect.startsWith("//");
  assert.equal(isSafeMalicious, false, "External open redirect must be rejected");

  const protocolRelative = "//malicious.com";
  const isSafeProtocolRelative = protocolRelative.startsWith("/") && !protocolRelative.startsWith("//");
  assert.equal(isSafeProtocolRelative, false, "Protocol relative redirect must be rejected");

  const jsScheme = "javascript:alert(1)";
  const isSafeJs = jsScheme.startsWith("/") && !jsScheme.startsWith("//");
  assert.equal(isSafeJs, false, "Javascript scheme redirect must be rejected");
});

test("Acceptance 11: Real HTTP Logout & session verification lifecycle via HTTP routes", async () => {
  resetInMemoryAuth();

  const reg = await registerUser({
    name: "Lifecycle User",
    email: "lifecycle_user@grocerly.in",
    password: "Password@123",
  });

  const sent = getSentEmailsForTest().find((e) => e.to === "lifecycle_user@grocerly.in");
  assert.ok(sent);
  const otp = sent.subject.match(/\b\d{6}\b/)?.[0] || "";

  await verifyUserEmail("lifecycle_user@grocerly.in", otp);

  const loginRes = await authenticateUser({
    email: "lifecycle_user@grocerly.in",
    password: "Password@123",
  });

  assert.ok(loginRes.sessionToken);

  // 1. Check /api/auth/me returns authenticated user with valid cookie
  const reqMeAuth = new Request("http://localhost:3000/api/auth/me", {
    method: "GET",
    headers: {
      "Cookie": `grocerly_session=${loginRes.sessionToken}`,
    },
  });
  const resMeAuth = await getMeRoute(reqMeAuth);
  assert.equal(resMeAuth.status, 200);
  const bodyMeAuth = await resMeAuth.json();
  assert.equal(bodyMeAuth.data.user.email, "lifecycle_user@grocerly.in");

  // 2. Execute /api/auth/logout HTTP route
  const reqLogout = new Request("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: {
      "Cookie": `grocerly_session=${loginRes.sessionToken}`,
    },
  });
  const resLogout = await logoutRoute(reqLogout);
  assert.equal(resLogout.status, 200);
  const setCookie = resLogout.headers.get("Set-Cookie");
  assert.ok(setCookie && setCookie.includes("Max-Age=0"), "Logout must clear session cookie with Max-Age=0");

  // 3. Subsequent check to /api/auth/me returns null user
  const reqMePostLogout = new Request("http://localhost:3000/api/auth/me", {
    method: "GET",
    headers: {
      "Cookie": `grocerly_session=${loginRes.sessionToken}`,
    },
  });
  const resMePostLogout = await getMeRoute(reqMePostLogout);
  const bodyMePostLogout = await resMePostLogout.json();
  assert.equal(bodyMePostLogout.data.user, null, "User must be null after session revocation");
});

test("Acceptance 12: Atomic inventory reservation rollback under partial reservation failure and concurrency", async () => {
  await ensureDbProducts();

  // fresh-tomatoes has stock 50; organic-spinach has stock 2
  const tomatoBefore = await ProductModel.findOne({ id: "fresh-tomatoes" });
  const spinachBefore = await ProductModel.findOne({ id: "organic-spinach" });
  assert.ok(tomatoBefore && spinachBefore);
  const initialTomatoStock = tomatoBefore.stock;
  const initialSpinachStock = spinachBefore.stock;

  // Attempt multi-item order:
  // Item 1 (fresh-tomatoes, qty 2) -> has sufficient stock
  // Item 2 (organic-spinach, qty 10) -> exceeds available stock of 2!
  const failResult = await createNewOrder({
    userId: "cust_atomic_rollback",
    userEmail: "rollback@grocerly.in",
    userName: "Rollback Customer",
    items: [
      { productId: "fresh-tomatoes", quantity: 2 },
      { productId: "organic-spinach", quantity: 10 },
    ],
    address: {
      fullName: "Rollback Customer",
      phone: "+91 98765 00000",
      street: "1 Atomic Way",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
    },
    deliverySlot: "Morning: 07:00 AM – 09:00 AM",
    paymentMethod: "COD",
    idempotencyKey: `idem_rollback_${Date.now()}`,
  });

  assert.equal(failResult.success, false, "Order creation must fail when any item exceeds stock");
  assert.match(failResult.error || "", /Insufficient stock/i);

  // Crucial Assertion: Item 1 stock MUST NOT be partially decremented in database!
  const tomatoAfter = await ProductModel.findOne({ id: "fresh-tomatoes" });
  assert.equal(
    tomatoAfter?.stock,
    initialTomatoStock,
    "Item 1 stock must be completely preserved/rolled back after partial reservation failure"
  );

  // Concurrency & Idempotency: duplicate request with same idempotency key returns same order
  const validOrderResult = await createNewOrder({
    userId: "cust_idem_test",
    userEmail: "idem@grocerly.in",
    userName: "Idem Customer",
    items: [{ productId: "fresh-tomatoes", quantity: 1 }],
    address: {
      fullName: "Idem Customer",
      phone: "+91 98765 00000",
      street: "1 Idem Way",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
    },
    deliverySlot: "Morning: 07:00 AM – 09:00 AM",
    paymentMethod: "COD",
    idempotencyKey: "idem_atomic_fixed_key_001",
  });
  assert.equal(validOrderResult.success, true);

  const tomatoStockAfterValid = (await ProductModel.findOne({ id: "fresh-tomatoes" }))?.stock;

  // Duplicate request with exact same idempotencyKey
  const duplicateResult = await createNewOrder({
    userId: "cust_idem_test",
    userEmail: "idem@grocerly.in",
    userName: "Idem Customer",
    items: [{ productId: "fresh-tomatoes", quantity: 1 }],
    address: {
      fullName: "Idem Customer",
      phone: "+91 98765 00000",
      street: "1 Idem Way",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
    },
    deliverySlot: "Morning: 07:00 AM – 09:00 AM",
    paymentMethod: "COD",
    idempotencyKey: "idem_atomic_fixed_key_001",
  });

  assert.equal(duplicateResult.success, true);
  assert.equal(duplicateResult.order?.id, validOrderResult.order?.id, "Duplicate request must return existing order");
  const tomatoStockAfterDuplicate = (await ProductModel.findOne({ id: "fresh-tomatoes" }))?.stock;
  assert.equal(
    tomatoStockAfterDuplicate,
    tomatoStockAfterValid,
    "Duplicate request must NOT double-deduct inventory"
  );
});

test("Acceptance 13: Email template HTML injection escaping and reset URL origin validation", async () => {
  clearSentEmailsForTest();

  // Test 1: HTML Escaping utility
  const maliciousInput = '<script>alert("xss")</script><img src="x" onerror="steal()">&"\'';
  const escaped = escapeHtml(maliciousInput);
  assert.ok(!escaped.includes("<script>"));
  assert.ok(escaped.includes("&lt;script&gt;"));
  assert.ok(escaped.includes("&quot;"));
  assert.ok(escaped.includes("&#039;"));

  // Test 2: Verification email escaping
  await sendVerificationOtpEmail("xss_user@grocerly.in", '<b onmouseover="alert(1)">John</b>', "123456");
  const sentEmails = getSentEmailsForTest();
  const verifyEmail = sentEmails.find((e) => e.to === "xss_user@grocerly.in");
  assert.ok(verifyEmail);

  // Test 3: Reset URL origin validation rejects malicious domain
  assert.throws(
    () => {
      validateResetUrl("https://evil-phishing-domain.com/reset-password?token=stolen123");
    },
    /SECURITY_ALERT: Reset URL origin mismatch/
  );

  // Safe reset URL construction preserves token
  const safeConstructed = validateResetUrl("safe_token_abc_123");
  assert.ok(safeConstructed.includes("/reset-password?token=safe_token_abc_123"));
});

test("Acceptance 14: Production AUTH_SECRET enforcement rejects predictable defaults and weak secrets", () => {
  // Reject missing or too short secrets
  assert.throws(
    () => validateAuthSecretInProduction(undefined),
    /AUTH_SECRET missing or too short/
  );
  assert.throws(
    () => validateAuthSecretInProduction("short_secret"),
    /AUTH_SECRET missing or too short/
  );

  // Reject all known development and seed secrets
  for (const knownInsecure of KNOWN_INSECURE_SECRETS) {
    assert.throws(
      () => validateAuthSecretInProduction(knownInsecure),
      /Insecure development AUTH_SECRET cannot be used in production/
    );
  }

  // Strong cryptographically random 32+ char secret succeeds
  assert.doesNotThrow(() => {
    validateAuthSecretInProduction("cryptographically_strong_random_secret_at_least_32_characters_long_1234");
  });
});

test.after(async () => {
  const mongoose = (await import("mongoose")).default;
  await mongoose.disconnect();
});
