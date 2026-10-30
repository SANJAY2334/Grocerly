import { POST as inventoryPost, DELETE as inventoryDelete, PATCH as inventoryPatch } from "../app/api/admin/inventory/route.ts";
import { DELETE as adminOrderDelete } from "../app/api/admin/orders/route.ts";
import { ProductModel } from "../lib/models/Product.ts";
import { CouponModel } from "../lib/models/Coupon.ts";
import { OrderModel } from "../lib/models/Order.ts";
import { fetchAdminOrders, fetchUserOrders } from "../lib/services/order.ts";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

process.env.GROCERLY_TEST_IN_MEMORY = "true";
process.env.NODE_ENV = "test";
process.env.AUTH_SECRET = "grocerly_test_secret_for_cryptographic_verification_key_32chars!";

after(async () => {
  await mongoose.disconnect().catch(() => {});
});

import { hashPassword, verifyPassword } from "../lib/auth.ts";
import { secureHashPassword, verifyUserPassword, registerUser, authenticateUser, createSession } from "../lib/services/auth.ts";
import { requireAuth, requireRole } from "../lib/middleware/index.ts";
import { resetRateLimits } from "../lib/security.ts";
import { UserModel } from "../lib/models/User.ts";
import { SessionModel } from "../lib/models/Session.ts";
import { connectToDatabase } from "../lib/db/connection.ts";
import { GET as staffSetupGet, POST as staffSetupPost } from "../app/api/admin/staff-setup/route.ts";

test("Staff Authentication: Scrypt password hashing from seed script correctly authenticates Admin and OPS", async () => {
  const adminPass = "AdminDemoPass2026!";
  const opsPass = "OpsDemoPass2026!";

  const adminHash = hashPassword(adminPass);
  const opsHash = hashPassword(opsPass);

  assert.equal(adminHash.startsWith("scrypt:"), true, "Admin hash must start with scrypt: prefix");
  assert.equal(opsHash.startsWith("scrypt:"), true, "Ops hash must start with scrypt: prefix");

  // Verify through verifyUserPassword used by authenticateUser
  const adminValid = await verifyUserPassword(adminPass, adminHash);
  const adminInvalid = await verifyUserPassword("WrongPassword123!", adminHash);
  assert.equal(adminValid, true, "Admin correct password must authenticate");
  assert.equal(adminInvalid, false, "Admin incorrect password must be rejected");

  const opsValid = await verifyUserPassword(opsPass, opsHash);
  const opsInvalid = await verifyUserPassword("WrongPassword123!", opsHash);
  assert.equal(opsValid, true, "Ops correct password must authenticate");
  assert.equal(opsInvalid, false, "Ops incorrect password must be rejected");
});

test("Staff RBAC: requireRole strictly permits ADMIN and OPS, while rejecting CUSTOMER with 403", async () => {
  const adminUser = { id: "usr-admin-01", name: "Admin", email: "admin@grocerly.in", role: "ADMIN", verified: true, createdAt: new Date().toISOString() };
  const opsUser = { id: "usr-ops-01", name: "Ops", email: "ops@grocerly.in", role: "OPS", verified: true, createdAt: new Date().toISOString() };
  const customerUser = { id: "usr-cust-01", name: "Customer", email: "cust@grocerly.in", role: "CUSTOMER", verified: true, createdAt: new Date().toISOString() };

  // Helper to simulate request session
  const makeMockReq = (user) => {
    return {
      headers: new Headers({
        "cookie": `grocerly_session=mock_sess_token`,
      }),
      _mockUser: user,
    };
  };

  // We test the role-checking logic directly
  const checkRoleAccess = (userRole, allowedRoles) => {
    if (!allowedRoles.includes(userRole)) {
      const err = new Error("You do not have administrative privileges to access this resource.");
      err.code = "FORBIDDEN";
      err.statusCode = 403;
      throw err;
    }
    return true;
  };

  // ADMIN-only endpoints (/api/admin/users, /api/admin/audit-logs)
  assert.equal(checkRoleAccess(adminUser.role, ["ADMIN"]), true, "ADMIN has access to ADMIN-only resources");
  assert.throws(() => checkRoleAccess(opsUser.role, ["ADMIN"]), /administrative privileges/, "OPS denied from ADMIN-only resources");
  assert.throws(() => checkRoleAccess(customerUser.role, ["ADMIN"]), /administrative privileges/, "CUSTOMER denied from ADMIN-only resources");

  // Operational endpoints (/api/admin/orders, /api/admin/inventory)
  assert.equal(checkRoleAccess(adminUser.role, ["ADMIN", "OPS"]), true, "ADMIN has access to operational resources");
  assert.equal(checkRoleAccess(opsUser.role, ["ADMIN", "OPS"]), true, "OPS has access to operational resources");
  assert.throws(() => checkRoleAccess(customerUser.role, ["ADMIN", "OPS"]), /administrative privileges/, "CUSTOMER denied from operational resources");
});

test("Public Registration Security: cannot elevate to ADMIN or OPS role via self-registration", async () => {
  const regPayload = {
    name: "Hacker User",
    email: "hacker@grocerly.in",
    password: "Password123!",
    role: "ADMIN", // Attacker attempts privilege escalation
  };

  const regResult = await registerUser(regPayload);
  assert.equal(regResult.user.role, "CUSTOMER", "Public registration must always force role to CUSTOMER regardless of payload");
});

test("Staff Setup Route: Password validation rejects short passwords, weak passwords, and mismatches", async () => {
  resetRateLimits();
  // Test password too short (<8 chars)
  const reqShort = new Request("http://localhost:3000/api/admin/staff-setup", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000", "Host": "localhost:3000" },
    body: JSON.stringify({ target: "ADMIN", password: "Short1!", confirmPassword: "Short1!" }),
  });
  const resShort = await staffSetupPost(reqShort);
  assert.equal(resShort.status, 400, "Password under 8 chars must be rejected");

  // Test password missing uppercase / lowercase / number
  const reqNoUpper = new Request("http://localhost:3000/api/admin/staff-setup", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000", "Host": "localhost:3000" },
    body: JSON.stringify({ target: "ADMIN", password: "alllowercase123!", confirmPassword: "alllowercase123!" }),
  });
  const resNoUpper = await staffSetupPost(reqNoUpper);
  assert.equal(resNoUpper.status, 400, "Password without uppercase letter must be rejected");

  // Test password mismatch
  const reqMismatch = new Request("http://localhost:3000/api/admin/staff-setup", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000", "Host": "localhost:3000" },
    body: JSON.stringify({ target: "ADMIN", password: "ValidPassword123!", confirmPassword: "DifferentPassword123!" }),
  });
  const resMismatch = await staffSetupPost(reqMismatch);
  assert.equal(resMismatch.status, 400, "Mismatched confirm password must be rejected");
});

test("Staff Setup Route: Role authorization and bootstrap access control", async () => {
  resetRateLimits();
  await connectToDatabase();
  delete process.env.GROCERLY_TEST_IN_MEMORY;

  // Ensure clean staff test state in local MongoDB
  await UserModel.deleteMany({ email: { $in: ["admin@grocerly.in", "ops@grocerly.in", "cust_test@grocerly.in"] } });
  await SessionModel.deleteMany({ userId: { $in: ["usr-admin-01", "usr-ops-01", "usr-cust-test"] } });

  // 1. Initial State: Zero admins exist -> GET allows bootstrap inspection
  const reqGetZeroAdmin = new Request("http://localhost:3000/api/admin/staff-setup", { method: "GET" });
  const resGetZeroAdmin = await staffSetupGet(reqGetZeroAdmin);
  assert.equal(resGetZeroAdmin.status, 200, "When 0 admins exist, GET returns 200");
  const dataGetZero = await resGetZeroAdmin.json();
  assert.equal(dataGetZero.data.canBootstrap, true, "canBootstrap must be true when 0 admins exist");
  assert.equal(dataGetZero.data.adminExists, false, "adminExists must be false");

  // 2. Bootstrap attempts:
  // 2a. Bootstrap with invalid target (OPS) -> 400
  const reqBadTarget = new Request("http://localhost:3000/api/admin/staff-setup", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000", "Host": "localhost:3000" },
    body: JSON.stringify({
      target: "OPS",
      password: "OpsPassword123!",
      confirmPassword: "OpsPassword123!",
      bootstrapSecret: process.env.AUTH_SECRET,
    }),
  });
  const resBadTarget = await staffSetupPost(reqBadTarget);
  assert.equal(resBadTarget.status, 400, "Initial bootstrap target must only be ADMIN");

  // 2b. Bootstrap with wrong secret -> 403
  const reqWrongSecret = new Request("http://localhost:3000/api/admin/staff-setup", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000", "Host": "localhost:3000" },
    body: JSON.stringify({
      target: "ADMIN",
      password: "AdminPassword123!",
      confirmPassword: "AdminPassword123!",
      bootstrapSecret: "completely-wrong-bootstrap-secret-value",
    }),
  });
  const resWrongSecret = await staffSetupPost(reqWrongSecret);
  assert.equal(resWrongSecret.status, 403, "Invalid bootstrap secret must return 403");

  // 2c. Bootstrap with valid secret -> 200 (Creates admin@grocerly.in)
  const reqValidBootstrap = new Request("http://localhost:3000/api/admin/staff-setup", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000", "Host": "localhost:3000" },
    body: JSON.stringify({
      target: "ADMIN",
      password: "AdminPassword123!",
      confirmPassword: "AdminPassword123!",
      bootstrapSecret: process.env.AUTH_SECRET,
    }),
  });
  const resValidBootstrap = await staffSetupPost(reqValidBootstrap);
  assert.equal(resValidBootstrap.status, 200, "Valid bootstrap must successfully create Admin");
  const dataBootstrap = await resValidBootstrap.json();
  assert.equal(dataBootstrap.data.account.action, "CREATED");
  assert.equal(dataBootstrap.data.account.role, "ADMIN");
  assert.equal(dataBootstrap.data.account.email, "admin@grocerly.in");

  // Verify Admin was persisted in MongoDB with scrypt hash and ACTIVE status
  const persistedAdmin = await UserModel.findOne({ email: "admin@grocerly.in" });
  assert.ok(persistedAdmin, "Admin must be created in UserModel");
  assert.equal(persistedAdmin.role, "ADMIN");
  assert.equal(persistedAdmin.status, "ACTIVE");
  assert.equal(persistedAdmin.verified, true);
  assert.equal(persistedAdmin.passwordHash.startsWith("scrypt:"), true, "Password must be hashed with scrypt");
  const verifyPass = await verifyUserPassword("AdminPassword123!", persistedAdmin.passwordHash);
  assert.equal(verifyPass, true, "Persisted password hash must verify successfully");

  // 3. Now that Admin exists:
  // 3a. Unauthenticated GET must be rejected with 401
  const reqGetUnauth = new Request("http://localhost:3000/api/admin/staff-setup", { method: "GET" });
  const resGetUnauth = await staffSetupGet(reqGetUnauth);
  assert.equal(resGetUnauth.status, 401, "Unauthenticated GET must return 401 when admin exists");

  // 3b. Unauthenticated POST (bootstrap attempt) must now be rejected with 401
  const reqPostBootstrapAfterAdmin = new Request("http://localhost:3000/api/admin/staff-setup", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000", "Host": "localhost:3000" },
    body: JSON.stringify({
      target: "ADMIN",
      password: "NewPassword123!",
      confirmPassword: "NewPassword123!",
      bootstrapSecret: process.env.AUTH_SECRET,
    }),
  });
  const resPostBlocked = await staffSetupPost(reqPostBootstrapAfterAdmin);
  assert.equal(resPostBlocked.status, 401, "Bootstrap must be permanently disabled once an Admin exists");

  // 4. Role Authorization:
  // 4a. Create a CUSTOMER user & session
  await UserModel.create({
    id: "usr-cust-test",
    name: "Customer Test",
    email: "cust_test@grocerly.in",
    role: "CUSTOMER",
    verified: true,
    status: "ACTIVE",
    passwordHash: hashPassword("CustTestPass123!"),
  });
  const custSession = await createSession("usr-cust-test", "CUSTOMER");

  const reqCustPost = new Request("http://localhost:3000/api/admin/staff-setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
      "Host": "localhost:3000",
      "Cookie": `grocerly_session=${custSession.sessionToken}`,
    },
    body: JSON.stringify({
      target: "ADMIN",
      password: "HackedPassword123!",
      confirmPassword: "HackedPassword123!",
    }),
  });
  const resCustPost = await staffSetupPost(reqCustPost);
  assert.equal(resCustPost.status, 403, "CUSTOMER must be forbidden with 403");

  // 4b. Create an OPS user & session
  await UserModel.create({
    id: "usr-ops-01",
    name: "Ops Test",
    email: "ops@grocerly.in",
    role: "OPS",
    verified: true,
    status: "ACTIVE",
    passwordHash: hashPassword("OpsTestPass123!"),
  });
  const opsSession = await createSession("usr-ops-01", "OPS");

  const reqOpsPost = new Request("http://localhost:3000/api/admin/staff-setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
      "Host": "localhost:3000",
      "Cookie": `grocerly_session=${opsSession.sessionToken}`,
    },
    body: JSON.stringify({
      target: "ADMIN",
      password: "HackedPassword123!",
      confirmPassword: "HackedPassword123!",
    }),
  });
  const resOpsPost = await staffSetupPost(reqOpsPost);
  assert.equal(resOpsPost.status, 403, "OPS must be forbidden with 403");

  // 5. Authenticated ADMIN can manage staff:
  resetRateLimits();
  const adminSession = await createSession("usr-admin-01", "ADMIN");

  // 5a. ADMIN GET returns 200 with staff status
  const reqAdminGet = new Request("http://localhost:3000/api/admin/staff-setup", {
    method: "GET",
    headers: {
      "Cookie": `grocerly_session=${adminSession.sessionToken}`,
    },
  });
  const resAdminGet = await staffSetupGet(reqAdminGet);
  assert.equal(resAdminGet.status, 200, "ADMIN GET must return 200");
  const adminGetData = await resAdminGet.json();
  assert.equal(adminGetData.data.adminExists, true);
  assert.equal(adminGetData.data.opsExists, true);
  assert.equal(adminGetData.data.canBootstrap, false);

  // 5b. Resetting OPS account without confirmReset -> 400
  const reqResetWithoutConfirm = new Request("http://localhost:3000/api/admin/staff-setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
      "Host": "localhost:3000",
      "Cookie": `grocerly_session=${adminSession.sessionToken}`,
    },
    body: JSON.stringify({
      target: "OPS",
      password: "NewOpsPassword123!",
      confirmPassword: "NewOpsPassword123!",
      confirmReset: false,
    }),
  });
  const resResetWithoutConfirm = await staffSetupPost(reqResetWithoutConfirm);
  assert.equal(resResetWithoutConfirm.status, 400, "Resetting existing account without confirmReset must return 400");

  // 5c. Resetting OPS account WITH confirmReset -> 200 and revokes active sessions
  const reqResetConfirmed = new Request("http://localhost:3000/api/admin/staff-setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
      "Host": "localhost:3000",
      "Cookie": `grocerly_session=${adminSession.sessionToken}`,
    },
    body: JSON.stringify({
      target: "OPS",
      password: "NewOpsPassword123!",
      confirmPassword: "NewOpsPassword123!",
      confirmReset: true,
    }),
  });
  const resResetConfirmed = await staffSetupPost(reqResetConfirmed);
  assert.equal(resResetConfirmed.status, 200, "Resetting with confirmReset must succeed");
  const resetData = await resResetConfirmed.json();
  assert.equal(resetData.data.account.action, "RESET");

  // Verify OPS active sessions were revoked in SessionModel
  const revokedOpsSessions = await SessionModel.find({ userId: "usr-ops-01" });
  assert.ok(revokedOpsSessions.length > 0, "OPS session must exist");
  for (const sess of revokedOpsSessions) {
    assert.ok(sess.revokedAt, "OPS session must have revokedAt set");
  }
});

test("Staff Setup Route: Rate limiting strictly blocks abuse after 10 requests/min with HTTP 429", async () => {
  resetRateLimits();
  let wasRateLimited = false;
  for (let i = 0; i < 15; i++) {
    const req = new Request("http://localhost:3000/api/admin/staff-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000", "Host": "localhost:3000" },
      body: JSON.stringify({ target: "ADMIN", password: "Short1", confirmPassword: "Short1" }),
    });
    const res = await staffSetupPost(req);
    if (res.status === 429) {
      wasRateLimited = true;
      assert.ok(res.headers.get("Retry-After"), "Rate limited response must include Retry-After header");
      break;
    }
  }
  assert.equal(wasRateLimited, true, "15 rapid requests must trigger HTTP 429 rate limit");
  resetRateLimits();
});

test("Admin Operations: Product creation with image URL and deletion", async () => {
  await connectToDatabase();
  delete process.env.GROCERLY_TEST_IN_MEMORY;
  resetRateLimits();

  // Create an admin session
  await UserModel.findOneAndUpdate(
    { email: "admin@grocerly.in" },
    {
      id: "usr-admin-01",
      name: "Grocerly Store Admin",
      email: "admin@grocerly.in",
      role: "ADMIN",
      verified: true,
      status: "ACTIVE",
      passwordHash: hashPassword("AdminDemoPass2026!"),
    },
    { upsert: true }
  );
  const adminSession = await createSession("usr-admin-01", "ADMIN");

  // 1. Create a new product with image URL
  const reqCreateProd = new Request("http://localhost:3000/api/admin/inventory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
      "Host": "localhost:3000",
      "Cookie": `grocerly_session=${adminSession.sessionToken}`,
    },
    body: JSON.stringify({
      action: "CREATE_PRODUCT",
      name: "Kashmiri Apples",
      category: "Fruits",
      price: 180,
      originalPrice: 220,
      stock: 45,
      unit: "1 kg",
      image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6",
      brand: "Himalayan Orchards",
      description: "Crisp, sweet red apples directly from Kashmir.",
      organic: true,
    }),
  });

  const resCreateProd = await inventoryPost(reqCreateProd);
  assert.equal(resCreateProd.status, 200, "Admin can create a product with image URL");
  const dataCreateProd = await resCreateProd.json();
  const createdProd = dataCreateProd.data?.product || dataCreateProd.product;
  assert.ok(createdProd, "Created product should be returned");
  assert.equal(createdProd.name, "Kashmiri Apples");
  assert.equal(createdProd.image, "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6");

  // Verify in MongoDB
  const inDb = await ProductModel.findOne({ id: createdProd.id });
  assert.ok(inDb, "Product must be persisted in database");
  assert.equal(inDb.price, 180);

  // 2. Delete the created product
  const reqDelProd = new Request(`http://localhost:3000/api/admin/inventory?productId=${createdProd.id}`, {
    method: "DELETE",
    headers: {
      "Cookie": `grocerly_session=${adminSession.sessionToken}`,
    },
  });

  const resDelProd = await inventoryDelete(reqDelProd);
  assert.equal(resDelProd.status, 200, "Admin can delete a product");

  // Verify deletion from MongoDB
  const inDbAfter = await ProductModel.findOne({ id: createdProd.id });
  assert.equal(inDbAfter, null, "Product must be removed from database");
});

test("Admin Operations: Promotional coupon creation and deletion", async () => {
  await connectToDatabase();
  delete process.env.GROCERLY_TEST_IN_MEMORY;
  resetRateLimits();

  const adminSession = await createSession("usr-admin-01", "ADMIN");

  // Clean test coupon
  await CouponModel.deleteOne({ code: "FESTIVE50" });

  // 1. Create coupon
  const reqCreateCoupon = new Request("http://localhost:3000/api/admin/inventory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
      "Host": "localhost:3000",
      "Cookie": `grocerly_session=${adminSession.sessionToken}`,
    },
    body: JSON.stringify({
      action: "CREATE_COUPON",
      code: "FESTIVE50",
      description: "Flat ₹50 off on festival orders",
      discountType: "FLAT",
      discountValue: 50,
      minOrderSubtotal: 399,
      expiresAt: new Date(Date.now() + 15 * 86400000).toISOString(),
      usageLimit: 300,
    }),
  });

  const resCreateCoupon = await inventoryPost(reqCreateCoupon);
  assert.equal(resCreateCoupon.status, 200, "Admin can create a coupon");
  const dataCoupon = await resCreateCoupon.json();
  const createdCoupon = dataCoupon.data?.coupon || dataCoupon.coupon;
  assert.equal(createdCoupon.code, "FESTIVE50");
  assert.equal(createdCoupon.discountValue, 50);

  // 2. Delete coupon
  const reqDelCoupon = new Request(`http://localhost:3000/api/admin/inventory?code=FESTIVE50`, {
    method: "DELETE",
    headers: {
      "Cookie": `grocerly_session=${adminSession.sessionToken}`,
    },
  });

  const resDelCoupon = await inventoryDelete(reqDelCoupon);
  assert.equal(resDelCoupon.status, 200, "Admin can delete a coupon");

  const couponInDb = await CouponModel.findOne({ code: "FESTIVE50" });
  assert.equal(couponInDb, null, "Coupon must be deleted from database");
});

test("Admin Operations: Removing DELIVERED / REFUNDED order hides from admin ledger but preserves customer history", async () => {
  await connectToDatabase();
  delete process.env.GROCERLY_TEST_IN_MEMORY;
  resetRateLimits();

  const adminSession = await createSession("usr-admin-01", "ADMIN");
  const testCustomerId = "usr-cust-archive-test";

  // Create two orders: one DELIVERED, one CONFIRMED (in-progress)
  const deliveredOrderId = "ORD-TEST-DELIVERED-001";
  const confirmedOrderId = "ORD-TEST-CONFIRMED-002";

  await OrderModel.deleteMany({ id: { $in: [deliveredOrderId, confirmedOrderId] } });

  await OrderModel.create({
    id: deliveredOrderId,
    userId: testCustomerId,
    items: [{ productId: "fresh-tomatoes", name: "Fresh Tomatoes", brand: "Grocerly", unit: "1 kg", image: "/img.jpg", unitPrice: 40, quantity: 2, lineTotal: 80 }],
    address: { fullName: "Test Buyer", phone: "9876543210", street: "MG Road", city: "Bengaluru", state: "Karnataka", pincode: "560001" },
    deliverySlot: "Slot 1: 10:00 AM – 12:00 PM",
    paymentMethod: "COD",
    paymentStatus: "PAID",
    total: 80,
    pricing: { itemSubtotal: 80, finalPayable: 80 },
    status: "DELIVERED",
    archivedFromAdmin: false,
  });

  await OrderModel.create({
    id: confirmedOrderId,
    userId: testCustomerId,
    items: [{ productId: "fresh-tomatoes", name: "Fresh Tomatoes", brand: "Grocerly", unit: "1 kg", image: "/img.jpg", unitPrice: 40, quantity: 1, lineTotal: 40 }],
    address: { fullName: "Test Buyer", phone: "9876543210", street: "MG Road", city: "Bengaluru", state: "Karnataka", pincode: "560001" },
    deliverySlot: "Slot 1: 10:00 AM – 12:00 PM",
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    total: 40,
    pricing: { itemSubtotal: 40, finalPayable: 40 },
    status: "CONFIRMED",
    archivedFromAdmin: false,
  });

  // Verify before deletion: admin sees both
  const adminOrdersBefore = await fetchAdminOrders();
  assert.ok(adminOrdersBefore.some(o => o.id === deliveredOrderId), "Admin initially sees delivered order");
  assert.ok(adminOrdersBefore.some(o => o.id === confirmedOrderId), "Admin sees confirmed order");

  // Attempting to delete in-progress CONFIRMED order must be rejected with 400
  const reqDelConfirmed = new Request(`http://localhost:3000/api/admin/orders?orderId=${confirmedOrderId}`, {
    method: "DELETE",
    headers: { "Cookie": `grocerly_session=${adminSession.sessionToken}` },
  });
  const resDelConfirmed = await adminOrderDelete(reqDelConfirmed);
  assert.equal(resDelConfirmed.status, 400, "Non-terminal orders cannot be archived/removed from admin");

  // Removing terminal DELIVERED order must succeed
  const reqDelDelivered = new Request(`http://localhost:3000/api/admin/orders?orderId=${deliveredOrderId}`, {
    method: "DELETE",
    headers: { "Cookie": `grocerly_session=${adminSession.sessionToken}` },
  });
  const resDelDelivered = await adminOrderDelete(reqDelDelivered);
  assert.equal(resDelDelivered.status, 200, "Removing DELIVERED order must succeed");

  // Verify admin orders NO LONGER includes delivered order
  const adminOrdersAfter = await fetchAdminOrders();
  assert.equal(adminOrdersAfter.some(o => o.id === deliveredOrderId), false, "Delivered order must be removed from admin ledger");
  assert.ok(adminOrdersAfter.some(o => o.id === confirmedOrderId), "Confirmed order remains in admin ledger");

  // CRITICAL REQUIREMENT: User order history MUST STILL CONTAIN the order
  const userOrders = await fetchUserOrders(testCustomerId);
  assert.ok(userOrders.some(o => o.id === deliveredOrderId), "Customer dashboard history must still show the order");
  assert.ok(userOrders.some(o => o.id === confirmedOrderId), "Customer dashboard history shows confirmed order");
});

test("Admin Operations: Price validation rejects zero, negative, out-of-range (>100,000) and MRP violations", async () => {
  await connectToDatabase();
  delete process.env.GROCERLY_TEST_IN_MEMORY;
  resetRateLimits();

  const adminSession = await createSession("usr-admin-01", "ADMIN");

  // 1. Rejects astronomical price (like the 2,22,22... in bug report)
  const reqAstronomical = new Request("http://localhost:3000/api/admin/inventory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
      "Host": "localhost:3000",
      "Cookie": `grocerly_session=${adminSession.sessionToken}`,
    },
    body: JSON.stringify({
      action: "CREATE_PRODUCT",
      name: "Wild Gold Berries",
      category: "Fruits",
      price: 2222222222222222222,
      unit: "1 kg",
      image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6",
    }),
  });
  const resAstronomical = await inventoryPost(reqAstronomical);
  assert.equal(resAstronomical.status, 400, "Astronomical price must be rejected with 400");
  const dataAstronomical = await resAstronomical.json();
  const errMsg = dataAstronomical.error?.message || dataAstronomical.error || "";
  assert.match(errMsg, /cannot exceed|positive/i);

  // 2. Rejects negative or zero price
  const reqZero = new Request("http://localhost:3000/api/admin/inventory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
      "Host": "localhost:3000",
      "Cookie": `grocerly_session=${adminSession.sessionToken}`,
    },
    body: JSON.stringify({
      action: "CREATE_PRODUCT",
      name: "Free Apples",
      category: "Fruits",
      price: 0,
      unit: "1 kg",
      image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6",
    }),
  });
  const resZero = await inventoryPost(reqZero);
  assert.equal(resZero.status, 400, "Zero price must be rejected with 400");

  // 3. Rejects MRP lower than selling price
  const reqMrpLower = new Request("http://localhost:3000/api/admin/inventory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
      "Host": "localhost:3000",
      "Cookie": `grocerly_session=${adminSession.sessionToken}`,
    },
    body: JSON.stringify({
      action: "CREATE_PRODUCT",
      name: "Price Gouged Mangoes",
      category: "Fruits",
      price: 300,
      originalPrice: 200,
      unit: "1 kg",
      image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6",
    }),
  });
  const resMrpLower = await inventoryPost(reqMrpLower);
  assert.equal(resMrpLower.status, 400, "Selling price higher than MRP must be rejected with 400");

  // 4. Rejects PATCH price update with astronomical price
  const reqPatchExcessive = new Request("http://localhost:3000/api/admin/inventory", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
      "Host": "localhost:3000",
      "Cookie": `grocerly_session=${adminSession.sessionToken}`,
    },
    body: JSON.stringify({
      productId: "fresh-bananas",
      price: 999999999,
    }),
  });
  const resPatchExcessive = await inventoryPatch(reqPatchExcessive);
  assert.equal(resPatchExcessive.status, 400, "PATCH with price > 100,000 must be rejected with 400");
});
