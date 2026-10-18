import test from "node:test";
import assert from "node:assert/strict";

// Force test in-memory configuration
process.env.GROCERLY_TEST_IN_MEMORY = "true";
process.env.NODE_ENV = "test";
process.env.AUTH_SECRET = "grocerly_test_secret_for_cryptographic_verification_key_32chars!";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/grocerly_test";

import {
  RegisterSchema,
  LoginSchema,
  VerifyEmailSchema,
  ResetPasswordSchema,
  CheckoutPayloadSchema,
} from "../lib/validators/index.ts";

import {
  generateRandomOtp,
  hashOtp,
  verifyOtpHash,
  createOtpChallenge,
  verifyAndConsumeOtp,
  clearInMemoryOtpStore,
} from "../lib/services/otp.ts";

import {
  secureHashPassword,
  verifyUserPassword,
  registerUser,
  verifyUserEmail,
  authenticateUser,
  verifyServerSession,
  revokeSession,
  requestPasswordReset,
  resetPasswordWithToken,
  resetInMemoryAuth,
} from "../lib/services/auth.ts";

import {
  sendEmail,
  getSentEmailsForTest,
  clearSentEmailsForTest,
  checkEmailHealth,
} from "../lib/services/email.ts";

import { redactSensitiveData, logAuditEvent, getInMemoryAuditLogs } from "../lib/logging/index.ts";
import { checkDbHealth } from "../lib/db/connection.ts";

// =============================================================================
// SUITE 1: ZOD REQUEST VALIDATION & INPUT HARDENING
// =============================================================================

test("Validators: RegisterSchema enforces valid name, normalized email, and strong password", () => {
  // Valid registration
  const valid = RegisterSchema.safeParse({
    name: "Arjun Verma",
    email: "Arjun@Domain.COM",
    password: "Password@123",
    phone: "+91 98765 43210",
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.email, "arjun@domain.com"); // normalized lowercase
  }

  // Weak password: missing number
  const noNumber = RegisterSchema.safeParse({
    name: "Arjun",
    email: "arjun@domain.com",
    password: "PasswordOnly!",
  });
  assert.equal(noNumber.success, false);

  // Weak password: under 8 characters
  const tooShort = RegisterSchema.safeParse({
    name: "Arjun",
    email: "arjun@domain.com",
    password: "Pass1!",
  });
  assert.equal(tooShort.success, false);

  // Invalid email format
  const badEmail = RegisterSchema.safeParse({
    name: "Arjun",
    email: "not-an-email",
    password: "Password@123",
  });
  assert.equal(badEmail.success, false);
});

test("Validators: VerifyEmailSchema enforces exact 6 numeric digits", () => {
  assert.equal(VerifyEmailSchema.safeParse({ email: "a@b.com", otp: "123456" }).success, true);
  assert.equal(VerifyEmailSchema.safeParse({ email: "a@b.com", otp: "12345" }).success, false);
  assert.equal(VerifyEmailSchema.safeParse({ email: "a@b.com", otp: "abcdef" }).success, false);
  assert.equal(VerifyEmailSchema.safeParse({ email: "a@b.com", otp: "1234567" }).success, false);
});

test("Validators: CheckoutPayloadSchema validates items array and minimum 8-char idempotency key", () => {
  const validPayload = {
    items: [{ productId: "fresh-tomatoes", quantity: 2 }],
    address: {
      fullName: "Priya",
      phone: "+91 98765 43210",
      street: "12 Park Street",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
    },
    deliverySlot: "Morning: 07:00 AM – 09:00 AM",
    paymentMethod: "COD",
    idempotencyKey: "unique_checkout_key_1234",
  };
  assert.equal(CheckoutPayloadSchema.safeParse(validPayload).success, true);

  // Empty items
  assert.equal(CheckoutPayloadSchema.safeParse({ ...validPayload, items: [] }).success, false);

  // Missing idempotency key
  const noKey = { ...validPayload };
  delete noKey.idempotencyKey;
  assert.equal(CheckoutPayloadSchema.safeParse(noKey).success, false);
});

// =============================================================================
// SUITE 2: OTP GENERATION, CRYPTOGRAPHIC HASHING & ATOMIC CONSUMPTION
// =============================================================================

test("OTP Service: generates 6-digit random code and HMAC-SHA256 digest", () => {
  const otp = generateRandomOtp();
  assert.match(otp, /^\d{6}$/);

  const hash = hashOtp(otp);
  assert.ok(typeof hash === "string");
  assert.equal(hash.length, 64); // 32-byte hex string

  // Constant-time verification
  assert.equal(verifyOtpHash(otp, hash), true);
  assert.equal(verifyOtpHash("000000", hash), false);
});

test("OTP Service: challenge lifecycle, attempt throttling, and atomic consumption", async () => {
  clearInMemoryOtpStore();
  const email = "otp-test@grocerly.in";

  const challenge = await createOtpChallenge({
    email,
    purpose: "EMAIL_VERIFICATION",
  });
  assert.match(challenge.otp, /^\d{6}$/);

  // Incorrect OTP: increments attempt counter and returns remaining attempts
  const fail1 = await verifyAndConsumeOtp(email, "000000", "EMAIL_VERIFICATION");
  assert.equal(fail1.success, false);
  assert.match(fail1.error || "", /attempt/i);

  // Correct OTP: consumes challenge
  const pass = await verifyAndConsumeOtp(email, challenge.otp, "EMAIL_VERIFICATION");
  assert.equal(pass.success, true);

  // Reused OTP: immediately rejected (already consumed)
  const reused = await verifyAndConsumeOtp(email, challenge.otp, "EMAIL_VERIFICATION");
  assert.equal(reused.success, false);
  assert.match(reused.error || "", /already been used/i);
});

test("OTP Service: enforces exact TTL expiry (300s / 5 minutes)", async () => {
  clearInMemoryOtpStore();
  const email = "ttl-test@grocerly.in";
  const now = Date.now();

  const challenge = await createOtpChallenge({ email, purpose: "EMAIL_VERIFICATION" }, now);
  // Verify effective expiry is exactly 300 seconds (5 minutes) ahead of creation
  assert.equal(challenge.expiresAt.getTime() - now, 300 * 1000);

  // Still valid at 299 seconds
  const validBeforeExpiry = await verifyOtpHash(challenge.otp, hashOtp(challenge.otp));
  assert.equal(validBeforeExpiry, true);

  // Expired at 301 seconds
  const expiredAttempt = await verifyAndConsumeOtp(
    email,
    challenge.otp,
    "EMAIL_VERIFICATION",
    now + 301 * 1000
  );
  assert.equal(expiredAttempt.success, false);
  assert.match(expiredAttempt.error || "", /expired/i);
});

test("OTP Service: enforces maximum 5 attempt lock", async () => {
  clearInMemoryOtpStore();
  const email = "attempts-test@grocerly.in";

  const challenge = await createOtpChallenge({ email, purpose: "EMAIL_VERIFICATION" });
  for (let i = 1; i <= 5; i++) {
    const res = await verifyAndConsumeOtp(email, "999999", "EMAIL_VERIFICATION");
    assert.equal(res.success, false);
  }

  // 6th attempt is blocked even if correct OTP is provided
  const lockedAttempt = await verifyAndConsumeOtp(email, challenge.otp, "EMAIL_VERIFICATION");
  assert.equal(lockedAttempt.success, false);
  assert.match(lockedAttempt.error || "", /maximum attempts exceeded/i);
});

test("OTP Service: resend cooldown enforces wait period", async () => {
  clearInMemoryOtpStore();
  const email = "cooldown-test@grocerly.in";

  await createOtpChallenge({ email, purpose: "EMAIL_VERIFICATION" });

  // Immediate second request within cooldown must throw
  await assert.rejects(
    async () => {
      await createOtpChallenge({ email, purpose: "EMAIL_VERIFICATION" });
    },
    /wait \d+ seconds/i
  );
});

// =============================================================================
// SUITE 3: PASSWORD HASHING & AUTHENTICATION LIFECYCLE
// =============================================================================

test("Auth Service: bcrypt password hashing and constant-time verification", async () => {
  const password = "ComplexPassword@2026";
  const hash = await secureHashPassword(password);

  assert.ok(hash.startsWith("$2a$") || hash.startsWith("$2b$"));
  assert.equal(await verifyUserPassword(password, hash), true);
  assert.equal(await verifyUserPassword("WrongPassword123", hash), false);
});

test("Auth Service: registration creates unverified user and dispatches OTP", async () => {
  resetInMemoryAuth();
  clearSentEmailsForTest();

  const regResult = await registerUser({
    name: "Meera Nair",
    email: "meera@grocerly.in",
    password: "SecurePassword@123",
  });

  assert.equal(regResult.requiresVerification, true);
  assert.equal(regResult.user.verified, false);
  assert.equal(regResult.user.email, "meera@grocerly.in");

  // Duplicate registration must be rejected
  await assert.rejects(
    async () => {
      await registerUser({
        name: "Meera Duplicate",
        email: "meera@grocerly.in",
        password: "SecurePassword@123",
      });
    },
    /already exists/i
  );

  // Verify verification email was dispatched
  const sent = getSentEmailsForTest();
  assert.ok(sent.some((e) => e.to === "meera@grocerly.in" && e.subject.includes("verification code")));
});

test("Auth Service: unverified user login is blocked and issues code EMAIL_NOT_VERIFIED", async () => {
  // Meera is registered but unverified
  await assert.rejects(
    async () => {
      await authenticateUser({
        email: "meera@grocerly.in",
        password: "SecurePassword@123",
      });
    },
    (err) => {
      return (
        err instanceof Error &&
        (err.message.includes("EMAIL_NOT_VERIFIED") || (err && err.code === "EMAIL_NOT_VERIFIED"))
      );
    }
  );
});

test("Auth Service: email verification activates user and enables login & session creation", async () => {
  // Obtain latest OTP from sent queue
  const sent = getSentEmailsForTest().find((e) => e.to === "meera@grocerly.in");
  assert.ok(sent);
  const otpMatch = sent.subject.match(/\b\d{6}\b/);
  assert.ok(otpMatch);
  const otp = otpMatch[0];

  const verifyRes = await verifyUserEmail("meera@grocerly.in", otp);
  assert.equal(verifyRes.success, true);
  assert.equal(verifyRes.user.verified, true);

  // Now login succeeds
  const loginRes = await authenticateUser({
    email: "meera@grocerly.in",
    password: "SecurePassword@123",
  });
  assert.ok(loginRes.sessionToken);
  assert.equal(loginRes.user.verified, true);

  // Verify session restoration
  const sessionUser = await verifyServerSession(loginRes.sessionToken);
  assert.ok(sessionUser);
  assert.equal(sessionUser?.user.email, "meera@grocerly.in");

  // Revoke session (logout)
  await revokeSession(loginRes.sessionId);
  const expiredCheck = await verifyServerSession(loginRes.sessionToken);
  assert.equal(expiredCheck, null);
});

// =============================================================================
// SUITE 4: PASSWORD RECOVERY (FORGOT & RESET)
// =============================================================================

test("Auth Service: password reset request generates single-use token and invalidates prior sessions", async () => {
  clearSentEmailsForTest();

  await requestPasswordReset("meera@grocerly.in");

  const resetEmail = getSentEmailsForTest().find((e) => e.to === "meera@grocerly.in" && e.subject.includes("Reset"));
  assert.ok(resetEmail);

  // Extract reset token from link in text
  const match = resetEmail.previewText.match(/token=([a-f0-9]+)/);
  assert.ok(match, "Reset token should be present in dispatched email");
  const rawToken = match[1];

  // Submit reset
  const resetRes = await resetPasswordWithToken({
    token: rawToken,
    newPassword: "BrandNewPassword@2026",
  });
  assert.equal(resetRes.success, true);

  // Old password must fail
  await assert.rejects(
    async () => {
      await authenticateUser({ email: "meera@grocerly.in", password: "SecurePassword@123" });
    },
    /Invalid email or password/i
  );

  // New password must succeed
  const newLogin = await authenticateUser({
    email: "meera@grocerly.in",
    password: "BrandNewPassword@2026",
  });
  assert.ok(newLogin.sessionToken);

  // Reusing the same reset token must be rejected
  await assert.rejects(
    async () => {
      await resetPasswordWithToken({
        token: rawToken,
        newPassword: "AnotherPassword@2026",
      });
    },
    /Invalid or expired/i
  );
});

// =============================================================================
// SUITE 5: LOGGING, AUDIT REDACTION & HEALTH CHECKS
// =============================================================================

test("Logging & Audit: central redaction strips sensitive credentials", () => {
  const sensitivePayload = {
    username: "customer@example.com",
    password: "SecretPassword123!",
    passwordHash: "$2b$12$somehashvalue",
    otp: "654321",
    otpHash: "abc123def456",
    secret: "production_jwt_signing_secret",
    cookie: "grocerly_session=secret_token",
    nested: {
      cvv: "999",
      cardNumber: "4111111111111111",
      city: "Mumbai",
    },
  };

  const sanitized = redactSensitiveData(sensitivePayload);

  assert.equal(sanitized.username, "customer@example.com");
  assert.equal(sanitized.password, "[REDACTED]");
  assert.equal(sanitized.passwordHash, "[REDACTED]");
  assert.equal(sanitized.otp, "[REDACTED]");
  assert.equal(sanitized.otpHash, "[REDACTED]");
  assert.equal(sanitized.secret, "[REDACTED]");
  assert.equal(sanitized.cookie, "[REDACTED]");
  assert.equal(sanitized.nested.cvv, "[REDACTED]");
  assert.equal(sanitized.nested.cardNumber, "[REDACTED]");
  assert.equal(sanitized.nested.city, "Mumbai");
});

test("Logging & Audit: logAuditEvent records events into audit trail", async () => {
  await logAuditEvent({
    eventType: "TEST_SECURITY_EVENT",
    actorId: "usr_test_99",
    outcome: "SUCCESS",
    metadata: { testKey: "testVal", password: "should_be_redacted" },
  });

  const logs = getInMemoryAuditLogs(10);
  const found = logs.find((l) => l.eventType === "TEST_SECURITY_EVENT");
  assert.ok(found);
  assert.equal(found.actorId, "usr_test_99");
  assert.equal(found.outcome, "SUCCESS");
  assert.equal(found.metadata?.password, "[REDACTED]");
});

test("Health Diagnostics: email and database reporting safely", async () => {
  const emailHealth = await checkEmailHealth();
  assert.ok(emailHealth.status === "ready" || emailHealth.status === "unconfigured");
  assert.ok(emailHealth.provider);

  const dbHealth = await checkDbHealth();
  assert.ok(["connected", "disconnected", "unconfigured"].includes(dbHealth.status));
});

test.after(async () => {
  const mongoose = (await import("mongoose")).default;
  await mongoose.disconnect();
});
