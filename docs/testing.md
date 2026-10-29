# Grocerly — Automated Testing Strategy & Verification Guide

**Document Identifier:** `DOC-TEST`  
**Current Version:** 2.0.0  
**Status:** Verified & Active  
**Last Reviewed:** October 18, 2026  

---

## 1. Testing Philosophy & Strategy

Grocerly employs an automated testing strategy based on Node.js's native test runner (`node:test` and `node:assert/strict`) executed via `tsx`. This eliminates heavyweight test runner dependencies (Jest/Mocha), guarantees fast execution, and matches production runtime characteristics.

### Test Execution Command
```bash
npm test
```
*Executes:* `tsx --test tests/commerce.test.mjs tests/production-suite.test.mjs tests/acceptance.test.mjs`

### Verification Summary
- **Total Test Files**: 3 (`tests/commerce.test.mjs`, `tests/production-suite.test.mjs`, `tests/acceptance.test.mjs`)
- **Total Tests**: **53**
- **Unit / Domain Tests**: **39** (`tests/commerce.test.mjs`, `tests/production-suite.test.mjs`)
- **Genuine HTTP Route Integration Tests**: **14** (`tests/acceptance.test.mjs`)
- **Passing Tests**: **53** (100% pass rate)
- **Failing Tests**: 0
- **Duration**: ~5.6 seconds (including Bcrypt iterations, database queries, and route executions)

---

## 2. Test Suite Breakdown

### 2.1 Suite 1: Commerce & Pricing Engine (`tests/commerce.test.mjs`)
Covers financial accuracy, order state transitions, meal planner scaling, and cryptographic validations.

| # | Test Title | Module Tested | Verified Behavior |
| :---: | :--- | :--- | :--- |
| 1 | `Pricing Engine: converts rupees to paise and back with exact precision` | `lib/pricing.ts` | Eliminates floating-point drift across currency conversions. |
| 2 | `Pricing Engine: validateQuantity enforces integer, positive, and stock rules` | `lib/pricing.ts` | Rejects non-numeric, negative, and excessive quantities. |
| 3 | `Pricing Engine: free delivery threshold is applied correctly at >= 300 INR` | `lib/pricing.ts` | Applies free delivery at ₹300, flat ₹40 fee below. |
| 4 | `Pricing Engine: coupon validation for FRESH50, ORGANIC10, WELCOME100 and EXPIRED20` | `lib/pricing.ts` | Enforces minimum subtotal, percentage discounts, and rejects expired promos. |
| 5 | `Pricing Engine: 5% GST calculation is split equally between CGST and SGST` | `lib/pricing.ts` | Splits statutory 5% GST equally (2.5% CGST / 2.5% SGST). |
| 6 | `Order State Machine: valid operational fulfillment workflow` | `lib/order-state-machine.ts`| Traverses valid 6-stage delivery progression. |
| 7 | `Order State Machine: customer role cannot advance operations or access unauthorized transitions` | `lib/order-state-machine.ts`| Restricts customer role to cancelling unfulfilled orders only. |
| 8 | `Order State Machine: terminal states prevent invalid transitions` | `lib/order-state-machine.ts`| Rejects mutations from `DELIVERED`, `CANCELLED`, and `REFUNDED`. |
| 9 | `Authentication: scrypt password hashing and constant-time verification` | `lib/auth.ts` | Verifies Scrypt hashing and `timingSafeEqual`. |
| 10 | `Authentication: HMAC-SHA256 session token generation and tamper resistance` | `lib/auth.ts` | Detects token tampering and expired timestamps. |
| 11 | `Authentication: strict customer data isolation enforcement` | `lib/auth.ts` | Prevents cross-customer order or profile access. |
| 12 | `Payments: Razorpay signature verification and HMAC validation` | `lib/payments.ts` | Cryptographically verifies payment signatures. |
| 13 | `Payments: Razorpay webhook signature verification` | `lib/payments.ts` | Verifies `X-Razorpay-Signature` against webhook secret. |
| 14 | `Payments: getRazorpayConfigStatus honestly reports unconfigured state when keys missing`| `lib/payments.ts` | Ensures no mock transactions when credentials are absent. |
| 15 | `Meal Planner: scales ingredients and consolidates duplicates across recipes` | `lib/meal-planner.ts` | Proportionally scales recipes and merges identical ingredients. |
| 16 | `Meal Planner: pantry items are excluded from total buy cost` | `lib/meal-planner.ts` | Subtracts pantry items from total shopping expenditure. |
| 17 | `Meal Planner: substitute product recommendation` | `lib/meal-planner.ts` | Identifies available product substitutes for depleted items. |
| 18 | `Database: atomic order creation with inventory reservation and stock safety` | `lib/services/order.ts`| Atomically reserves stock; prevents overselling. |
| 19 | `Database: idempotency key prevents duplicate orders and double deductions` | `lib/services/order.ts`| Re-serves existing order upon duplicate `idempotencyKey`. |
| 20 | `Database: order cancellation releases reserved stock back to available stock` | `lib/services/order.ts`| Restores product stock upon order cancellation. |
| 21 | `Validation: sanitization strips HTML tags and controls` | `lib/validation.ts` | Strips XSS script tags and bounded string lengths. |
| 22 | `Validation: blocks MongoDB query injection operators and prototype pollution` | `lib/validation.ts` | Detects and blocks `$gt`, `$ne`, `__proto__`. |
| 23 | `Validation: PIN code serviceability check accepts serviceable metro zones and rejects invalid` | `lib/delivery.ts` | Accepts valid 6-digit metro PINs; rejects invalid codes. |

---

### 2.2 Suite 2: Security & Production Hardening (`tests/production-suite.test.mjs`)
Covers Zod request validation, cryptographic OTP delivery, Bcrypt auth lifecycle, log redaction, and diagnostics.

| # | Test Title | Module Tested | Verified Behavior |
| :---: | :--- | :--- | :--- |
| 24 | `Validators: RegisterSchema enforces valid name, normalized email, and strong password` | `lib/validators/index.ts`| Enforces password complexity and normalized email. |
| 25 | `Validators: VerifyEmailSchema enforces exact 6 numeric digits` | `lib/validators/index.ts`| Rejects non-6-digit or non-numeric OTPs. |
| 26 | `Validators: CheckoutPayloadSchema validates items array and minimum 8-char idempotency key` | `lib/validators/index.ts`| Enforces address schema, item list, and idempotency key. |
| 27 | `OTP Service: generates 6-digit random code and HMAC-SHA256 digest` | `lib/services/otp.ts` | Generates uniform 6-digit code and HMAC digest. |
| 28 | `OTP Service: challenge lifecycle, attempt throttling, and atomic consumption` | `lib/services/otp.ts` | Increments failed attempts; single-use consumption. |
| 29 | `OTP Service: enforces exact TTL expiry (300s / 5 minutes)` | `lib/services/otp.ts` | Confirms expiration after 300 seconds; rejects at 301 seconds. |
| 30 | `OTP Service: enforces maximum 5 attempt lock` | `lib/services/otp.ts` | Permanently locks challenge upon 5th failure. |
| 31 | `OTP Service: resend cooldown enforces wait period` | `lib/services/otp.ts` | Enforces 60-second cooldown between resend requests. |
| 32 | `Auth Service: bcrypt password hashing and constant-time verification` | `lib/services/auth.ts` | Verifies Bcrypt salt 12 hashing and verification. |
| 33 | `Auth Service: registration creates unverified user and dispatches OTP` | `lib/services/auth.ts` | Creates user in `PENDING_VERIFICATION` and emails OTP. |
| 34 | `Auth Service: unverified user login is blocked and issues code EMAIL_NOT_VERIFIED` | `lib/services/auth.ts` | Rejects unverified login with HTTP 403. |
| 35 | `Auth Service: email verification activates user and enables login & session creation` | `lib/services/auth.ts` | Activates account; mints HttpOnly session cookie. |
| 36 | `Auth Service: password reset request generates single-use token and invalidates prior sessions` | `lib/services/auth.ts` | Anti-enumeration reset; invalidates prior sessions on reset. |
| 37 | `Logging & Audit: central redaction strips sensitive credentials` | `lib/logging/index.ts` | Redacts passwords, tokens, OTPs, card numbers. |
| 38 | `Logging & Audit: logAuditEvent records events into audit trail` | `lib/logging/index.ts` | Records structured events in `auditlogs` collection. |
| 39 | `Health Diagnostics: email and database reporting safely` | `lib/services/email.ts` | Returns diagnostic status without exposing credentials. |

### 2.3 Suite 3: Real HTTP Route Integration & Acceptance (`tests/acceptance.test.mjs`)
Exercises live Next.js route handlers with simulated `Request` objects, cookie session verification, atomic inventory compensation rollback, and security constraints:

| # | Test Title | Module / Route Tested | Verified Behavior |
| :---: | :--- | :--- | :--- |
| 40 | `Acceptance 1: Guest browsing works without authentication` | `lib/db.ts` | Product catalog remains browsable by guests. |
| 41 | `Acceptance 2: Guest cart pricing and validation works locally` | `lib/pricing.ts` | Basket math and totals compute accurately prior to login. |
| 42 | `Acceptance 3: Direct guest order creation returns 401 via HTTP route with zero inventory deductions` | `app/api/orders/route.ts` | Unauthenticated order requests return HTTP 401; zero DB stock changes. |
| 43 | `Acceptance 4: Direct unauthenticated payment creation & verification routes return 401` | `app/api/payments/` | Rejects unauthenticated requests to payment endpoints with HTTP 401. |
| 44 | `Acceptance 5: Authenticated customers can place valid COD orders starting as CONFIRMED via HTTP route` | `app/api/orders/route.ts` | Real session places COD order, returns 201 Created, deducts stock. |
| 45 | `Acceptance 6: Online orders require cryptographic verification and reject forged signatures via HTTP route` | `app/api/payments/verify/` | Forged Razorpay signature returns 400; order remains PENDING_PAYMENT. |
| 46 | `Acceptance 7: Customer isolation enforced via HTTP routes (cross-customer order access & tampering rejected)` | `app/api/orders/[id]/route.ts` | Cross-customer access and unauthorized status mutations return HTTP 403 Forbidden. |
| 47 | `Acceptance 8: Order confirmation integrity and honest HTTP error handling` | `app/api/orders/[id]/route.ts` | Non-existent orders return 404; unauthenticated return 401. |
| 48 | `Acceptance 9: OTP delivery failure is reported honestly without claiming success` | `lib/services/auth.ts` | Simulated email delivery failure halts registration without creating ghost accounts. |
| 49 | `Acceptance 10: Safe redirect validation and destination preservation` | `lib/validation.ts` | Permits safe relative redirects (`/checkout`); rejects external & protocol-relative phishing URLs. |
| 50 | `Acceptance 11: Real HTTP Logout & session verification lifecycle via HTTP routes` | `app/api/auth/` | Validates session via `/api/auth/me`, invalidates via `/api/auth/logout`, clears session cookie. |
| 51 | `Acceptance 12: Atomic inventory reservation rollback under partial reservation failure and concurrency` | `lib/services/order.ts` | Multi-item order with one failing item cleanly rolls back all reserved items; idempotency deduplication verified. |
| 52 | `Acceptance 13: Email template HTML injection escaping and reset URL origin validation` | `lib/services/email.ts` | HTML characters in customer names/items are escaped; malicious reset URL origins are rejected. |
| 53 | `Acceptance 14: Production AUTH_SECRET enforcement rejects predictable defaults and weak secrets` | `lib/config/index.ts` | Rejects missing, short (<32 chars), or known development secrets in production mode. |

---

## 3. Additional Test Scripts

### 3.1 Database Backup & Restore Test (`scripts/test-backup-restore.mjs`)
Verifies non-destructive snapshot export of all 9 active collections and 100% sterile restore to an isolated verification database (`grocerly_test_restore_verify`):
```bash
node scripts/test-backup-restore.mjs
```

### 3.2 End-to-End Live HTTP Integration Test (`scripts/test-e2e-live.js`)
Tests live HTTP routes against an active server instance on port 3001:
```bash
node scripts/test-e2e-live.js
```
Verifies live HTTP registration $\to$ 403 unverified gate $\to$ OTP verification $\to$ login cookie $\to$ `/api/auth/me` session recovery $\to$ order placement.
