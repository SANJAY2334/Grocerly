# Grocerly — Product & Software Requirements Specification

**Document Identifier:** `DOC-REQ`  
**Current Version:** 2.0.0  
**Status:** Verified & Active  
**Last Reviewed:** October 18, 2026  

---

## 1. Product Purpose & Scope

Grocerly is a full-stack, farm-to-door online grocery marketplace engineered for freshness-focused consumers, health-conscious households, and local grocery operations teams. The platform combines a high-performance storefront with an interactive 3D produce showcase, smart meal planning with automated pantry deduplication, real-time inventory management, honest payment handling, and an administrative fulfillment console.

---

## 2. User Roles & Personas

| Role Identifier | Role Name | Description & Permissions |
| :--- | :--- | :--- |
| `CUSTOMER` | Registered Shopper | Authenticated customer who can manage delivery addresses, plan meals, assemble carts, redeem coupons, place orders, track delivery timelines, and cancel unfulfilled orders. |
| `OPS` | Fulfillment Operator | Warehouse and delivery personnel authorized to view global orders, inspect low-stock alerts, advance order fulfillment statuses, and adjust product inventory stock counts. |
| `ADMIN` | Store Administrator | Executive operator authorized for all `OPS` actions plus user account audits, security audit log inspection, product pricing modifications, and promotional coupon lifecycle control. |
| `SYSTEM` | Automated Daemon | Internal background actors including payment webhooks, automated stock reservation engines, and transactional email dispatchers. |

---

## 3. Functional Requirements

### 3.1 Storefront & Catalog Discovery (`REQ-CAT`)

- **REQ-CAT-001**: The system shall serve a catalog of grocery products with real-time stock levels, category classifications, organic badges, dietary tags, allergens, and nutritional profiles.
- **REQ-CAT-002**: The storefront shall support text search across product name, brand, description, and tags, with case-insensitive matching.
- **REQ-CAT-003**: The storefront shall support multi-parameter filtering by category, price bounds, minimum star rating, in-stock availability, organic certification, and promotional discounts.
- **REQ-CAT-004**: The catalog detail view shall render interactive 3D freshness indicators and high-resolution product imagery from verified sources (`images.unsplash.com`).
- **REQ-CAT-005**: If the MongoDB `products` collection is empty on startup, the system shall automatically seed initial catalog items (`PRODUCTS`) with reserved stock initialized to 0.

### 3.2 Smart Meal Planner & Pantry Deduplication (`REQ-MEAL`)

- **REQ-MEAL-001**: The system shall provide curated culinary recipes with ingredient lists mapped to catalog product identifiers.
- **REQ-MEAL-002**: When a user selects multiple recipes and specifies serving counts, the system shall scale ingredient requirements proportionally and aggregate identical ingredients into consolidated quantities.
- **REQ-MEAL-003**: The meal planner shall support a customer "pantry checklist"; any ingredient flagged as already present in the user's pantry shall be excluded from the purchase basket while calculating pantry savings.
- **REQ-MEAL-004**: If an ingredient exceeds available inventory, the system shall detect the shortfall and recommend verified catalog substitutes.
- **REQ-MEAL-005**: The user shall be able to transfer all unfulfilled meal plan ingredients directly into the shopping cart with a single action.

### 3.3 Shopping Cart & Pricing Engine (`REQ-CART`)

- **REQ-CART-001**: The cart shall validate item quantities against live available inventory (`stock - reservedStock`). Non-positive quantities, floating-point quantities, and overselling requests shall be rejected or capped.
- **REQ-CART-002**: All monetary calculations (item subtotal, discounts, GST, delivery fee, final payable) shall be computed server-side in integer paise to eliminate floating-point drift.
- **REQ-CART-003**: The system shall calculate Indian Goods & Services Tax (GST) at statutory 5%, divided equally into 2.5% CGST (Central GST) and 2.5% SGST (State GST).
- **REQ-CART-004**: Delivery fees shall be evaluated dynamically: free delivery for orders with item subtotal $\ge$ ₹300, and a flat ₹40 fee for orders below ₹300.
- **REQ-CART-005**: The coupon engine shall evaluate promo codes (`FRESH50`, `ORGANIC10`, `WELCOME100`) against expiration dates, usage limits, minimum spend requirements, and organic produce composition. Expired coupons (`EXPIRED20`) shall be strictly rejected.
- **REQ-CART-006**: Both authenticated users and guest sessions shall maintain persistent carts stored in MongoDB with automatic ownership reconciliation upon login.

### 3.4 Pincode Serviceability & Delivery Slots (`REQ-DEL`)

- **REQ-DEL-001**: The system shall validate Indian postal PIN codes (6 numeric digits, non-zero leading digit).
- **REQ-DEL-002**: The delivery checker shall support express hubs (Mumbai, Bengaluru, New Delhi) and regional metro prefixes (`400`, `560`, `110`, `600`, `500`, `700`, `411`).
- **REQ-DEL-003**: The platform shall provide 5 daily delivery time slots (Morning, Slot 1, Slot 2, Evening, Night) with capacity tracking.

### 3.5 Authentication & Account Security (`REQ-AUTH`)

- **REQ-AUTH-001**: Registration shall enforce RFC-compliant emails, client and server password strength validation (minimum 8 characters, requiring uppercase, lowercase, numbers, and special characters).
- **REQ-AUTH-002**: Passwords shall be hashed using Bcrypt with salt rounds 12 (or Scrypt with 16-byte random salt). Plaintext passwords must never be stored or logged.
- **REQ-AUTH-003**: Newly registered accounts shall be marked as `PENDING_VERIFICATION` with `verified: false`.
- **REQ-AUTH-004**: Login attempts by unverified accounts shall be rejected with HTTP 403 `EMAIL_NOT_VERIFIED`, triggering an automatic OTP challenge.
- **REQ-AUTH-005**: Email verification shall use cryptographically secure 6-digit numeric OTPs. Plaintext OTPs shall be transmitted exclusively via email; MongoDB shall store only HMAC-SHA256 digests.
- **REQ-AUTH-006**: OTP challenges shall expire after 300 seconds (5 minutes) and lock out after 5 consecutive failed attempts. A 60-second cooldown between resend requests shall be enforced.
- **REQ-AUTH-007**: Active sessions shall be issued as `HttpOnly`, `SameSite=Lax`, `Secure` (production) cookies backed by SHA-256 hashed session records in MongoDB.
- **REQ-AUTH-008**: Password recovery shall generate single-use cryptographic reset tokens with a 15-minute TTL. Anti-enumeration behavior shall be enforced: requests return identical generic success messages regardless of email existence.
- **REQ-AUTH-009**: Completing a password reset shall immediately invalidate all active sessions across all devices for that user account.

### 3.6 Checkout, Idempotency & Order Lifecycle (`REQ-ORD`)

- **REQ-ORD-001**: Orders shall require authenticated sessions, validated delivery addresses, selected delivery slots, and payment method selection (COD, UPI, CARD, NETBANKING).
- **REQ-ORD-002**: Order creation shall execute atomic inventory decrements (`$inc: { stock: -qty, soldCount: qty }`) with concurrency guards (`stock: { $gte: qty }`) to prevent overselling.
- **REQ-ORD-003**: Order submission shall support client-supplied idempotency keys (`idempotencyKey`). Duplicate submissions shall return the existing order without duplicate charges or double stock deductions.
- **REQ-ORD-004**: The system shall enforce a strict 9-state finite state machine:
  $$\text{PENDING\_PAYMENT} \longrightarrow \text{CONFIRMED} \longrightarrow \text{PROCESSING} \longrightarrow \text{PACKED} \longrightarrow \text{OUT\_FOR\_DELIVERY} \longrightarrow \text{DELIVERED}$$
  With branching transitions to `CANCELLED`, `PAYMENT_FAILED`, and `REFUNDED`.
- **REQ-ORD-005**: Customers shall be permitted to cancel orders only while in `PENDING_PAYMENT` or `CONFIRMED` states. Once in `PROCESSING` or beyond, self-cancellation is prohibited.
- **REQ-ORD-006**: Order cancellation shall atomically release reserved stock back into available product inventory.
- **REQ-ORD-007**: Strict customer data isolation shall be enforced: non-administrative users can only access their own order records.

### 3.7 Payment Gateway & Webhook Integrity (`REQ-PAY`)

- **REQ-PAY-001**: The platform shall integrate with Razorpay for online payments, generating server-side order receipts in INR paise.
- **REQ-PAY-002**: If Razorpay API credentials (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) are unconfigured, the system shall honestly inform the customer and fallback to Cash on Delivery (COD) rather than fabricating fake payments.
- **REQ-PAY-003**: Client payment callbacks shall be cryptographically verified using HMAC-SHA256 signatures over `razorpay_order_id|razorpay_payment_id` against `RAZORPAY_KEY_SECRET`.
- **REQ-PAY-004**: Payment webhooks shall verify `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET` and record processed event IDs in MongoDB (`processedwebhooks`) with 30-day TTL to guarantee idempotency.

### 3.8 Administration, Fulfillment & Auditing (`REQ-ADM`)

- **REQ-ADM-001**: The administration console (`/admin`) shall restrict access via server-side middleware to users with `ADMIN` or `OPS` roles.
- **REQ-ADM-002**: Inventory managers shall be able to update stock counts, inspect low-stock warnings, and toggle coupon promotions. Price modifications are restricted to `ADMIN`.
- **REQ-ADM-003**: Fulfillment operators shall be able to advance order statuses along the valid state machine with actor tracking and audit trail notes.
- **REQ-ADM-004**: All sensitive security events (registration, verification failures, login attempts, password resets, order creation, inventory changes) shall be logged to the MongoDB `auditlogs` collection.

---

## 4. Non-Functional Requirements

| ID | Category | Requirement Description | Verification Metric |
| :--- | :--- | :--- | :--- |
| `NFR-PERF-01` | Performance | Catalog and product detail API endpoints shall respond in under 200ms under standard local workloads. | `GET /api/products` latency |
| `NFR-SEC-01` | Security | Passwords, tokens, OTP hashes, and secrets shall never be returned in API responses or written in plaintext to application logs. | Pino central log redaction |
| `NFR-SEC-02` | Security | Mutation endpoints shall verify same-origin request headers to mitigate CSRF attacks. | `verifySameOrigin` checks |
| `NFR-SEC-03` | Security | Authentication endpoints shall enforce sliding-window rate limiting to prevent brute-force attacks. | 10 attempts per minute per IP |
| `NFR-REL-01` | Reliability | Order placement shall maintain transactional consistency and idempotency during concurrent checkouts. | Automated concurrency tests |
| `NFR-DAT-01` | Integrity | Database collections must enforce unique indexes on critical identifier fields (`email`, `sku`, `slug`, `tokenHash`, `idempotencyKey`). | MongoDB index verification |

---

## 5. Requirements Traceability Matrix

| Requirement | Module / Component | Data Model | Test Suite Verification |
| :--- | :--- | :--- | :--- |
| `REQ-CAT-001..005` | `lib/services/catalog.ts`, `app/api/products/` | `ProductModel`, `CategoryModel` | `tests/commerce.test.mjs` |
| `REQ-MEAL-001..005` | `lib/meal-planner.ts`, `components/home/SmartMealPlanner.tsx`| In-memory recipes & products | `tests/commerce.test.mjs` |
| `REQ-CART-001..006` | `lib/pricing.ts`, `lib/services/cart.ts` | `CartModel`, `CouponModel` | `tests/commerce.test.mjs` |
| `REQ-DEL-001..003` | `lib/delivery.ts`, `app/api/delivery/check/` | Static zone fixtures | `tests/commerce.test.mjs` |
| `REQ-AUTH-001..009` | `lib/services/auth.ts`, `lib/services/otp.ts` | `UserModel`, `OtpChallengeModel`, `SessionModel` | `tests/production-suite.test.mjs` |
| `REQ-ORD-001..007` | `lib/services/order.ts`, `lib/order-state-machine.ts` | `OrderModel`, `ProductModel` | `tests/commerce.test.mjs` |
| `REQ-PAY-001..004` | `lib/payments.ts`, `app/api/payments/` | `OrderModel`, `ProcessedWebhookModel` | `tests/commerce.test.mjs` |
| `REQ-ADM-001..004` | `lib/middleware/index.ts`, `app/api/admin/` | `AuditLogModel`, `UserModel` | `tests/production-suite.test.mjs` |
