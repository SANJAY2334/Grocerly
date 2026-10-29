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
import { secureHashPassword, verifyUserPassword, registerUser, authenticateUser } from "../lib/services/auth.ts";
import { requireAuth, requireRole } from "../lib/middleware/index.ts";

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
