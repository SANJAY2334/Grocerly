# Grocerly — Architecture Decision Records (ADRs)

**Document Identifier:** `DOC-ADR`  
**Current Version:** 2.0.0  
**Status:** Approved & Active  
**Last Reviewed:** October 18, 2026  

---

## Index of Architecture Decision Records

| ADR ID | Title | Status | Date |
| :--- | :--- | :--- | :--- |
| `ADR-001` | Selection of Next.js 14 App Router as Unified Full-Stack Platform | **ACCEPTED** | 2026-09-15 |
| `ADR-002` | Mongoose with MongoDB as Authoritative Data Persistence Layer | **ACCEPTED** | 2026-09-20 |
| `ADR-003` | Hybrid Bcrypt/Scrypt Hashing with HMAC-SHA256 Signed Sessions | **ACCEPTED** | 2026-10-01 |
| `ADR-004` | Cryptographic OTP Delivery via HMAC-SHA256 Digests (Zero Plaintext Persistence) | **ACCEPTED** | 2026-10-05 |
| `ADR-005` | Integer Paise Currency Model for Financial Accuracy | **ACCEPTED** | 2026-10-08 |
| `ADR-006` | Explicit Order Finite State Machine with Role-Based Transition Guards | **ACCEPTED** | 2026-10-10 |
| `ADR-007` | Honest Service Degradation (No Mock Fallbacks in Production/Development) | **ACCEPTED** | 2026-10-14 |
| `ADR-008` | Centralized Secret Redaction in Pino Structured Logging | **ACCEPTED** | 2026-10-16 |

---

## ADR-001: Selection of Next.js 14 App Router as Unified Full-Stack Platform

### Context
Grocerly requires a fast, SEO-friendly storefront with rich client interactions (3D produce dome, meal planner) coupled with secure, typed API route handlers for commerce and administrative operations. Maintaining separate frontend and backend repositories introduces deployment friction, contract synchronization overhead, and duplicate models.

### Decision
Adopt Next.js 14 (pinned to LTS security release `14.2.35`) using the App Router (`app/`) architecture with React 18 and TypeScript.
- Server Components render static pages, category grids, and layout headers.
- Route Handlers (`app/api/**/route.ts`) implement all RESTful APIs with native Web Request/Response objects.
- Client Components (`'use client'`) handle stateful interactions using Zustand, Three.js, and Framer Motion.

### Consequences
- **Positive**: Single codebase, shared TypeScript interfaces (`lib/types.ts`), zero build synchronization overhead, out-of-the-box static optimization, and standard HTTP route handlers.
- **Negative**: Pinned to Next.js 14 LTS line because upgrading to Next.js 15 requires React 19, which introduces breaking changes in `@react-three/fiber` and Framer Motion packages.

---

## ADR-002: Mongoose with MongoDB as Authoritative Data Persistence Layer

### Context
The grocery catalog contains semi-structured attributes: variable nutritional data, dietary tags, allergens, and dynamic order snapshots with varying line items. A flexible document model with strict schema enforcement is required.

### Decision
Standardize on MongoDB with Mongoose ODM (`v8.7.0`). Implement 10 typed Mongoose schemas in `lib/models/` with explicit compound, sparse, text, and TTL indexes. Manage connections through a cached global pool (`lib/db/connection.ts`) to avoid socket exhaustion.

### Consequences
- **Positive**: Schema validation at the application tier, document nesting (delivery addresses, line item snapshots, timeline history), automated TTL index expiration (sessions, OTPs, webhooks), and native MongoDB atomic operators (`$inc`, `$set`).
- **Negative**: Multi-document ACID transactions across replica sets require careful connection handling; atomic operations like `$inc` are preferred for single-collection stock reservations.

---

## ADR-003: Hybrid Bcrypt/Scrypt Hashing with HMAC-SHA256 Signed Sessions

### Context
User authentication must withstand brute-force attacks and credential stuffing while supporting fast session verification on high-throughput route handlers.

### Decision
1. **Password Storage**: Hash passwords with `bcryptjs` using 12 salt rounds on all new registrations and password updates. Support constant-time Scrypt verification (`crypto.scryptSync` with 16-byte random salt) for backward compatibility.
2. **Session Architecture**: Generate high-entropy session tokens, store their SHA-256 digests in MongoDB (`sessions` collection), and transmit signed tokens via `HttpOnly`, `SameSite=Lax`, `Secure` (production) cookies.

### Consequences
- **Positive**: High work factor protects against offline dictionary attacks; timing-safe comparisons prevent side-channel timing attacks; database compromise does not leak plaintext session tokens.
- **Negative**: Password hashing introduces computational latency (~200–300ms per registration/login), which is an intentional security trade-off.

---

## ADR-004: Cryptographic OTP Delivery via HMAC-SHA256 Digests (Zero Plaintext Persistence)

### Context
Email verification and password recovery use 6-digit numeric OTPs. If OTPs are stored in plaintext in the database, a database read leak grants attackers immediate account takeover capabilities.

### Decision
Generate OTPs using `crypto.randomInt(100000, 1000000)`. Compute an HMAC-SHA256 digest using the application `AUTH_SECRET`:
$$\text{otpHash} = \text{HMAC-SHA256}(\text{AUTH\_SECRET}, \text{"otp:"} + \text{code})$$
Store only `otpHash` in MongoDB. Transmit the plaintext OTP exclusively once via transactional email. Verification computes the HMAC of the candidate input and compares digests using `crypto.timingSafeEqual`. Enforce a 300-second TTL, 5-attempt threshold, and 60-second resend cooldown.

### Consequences
- **Positive**: Even with read-only database compromise, attackers cannot deduce active OTP codes; timing attacks are eliminated; replay attacks are blocked by atomic consumption (`consumedAt`).
- **Negative**: Lost emails require a resend request; staff cannot view OTPs to assist customers manually.

---

## ADR-005: Integer Paise Currency Model for Financial Accuracy

### Context
Standard IEEE 754 floating-point numbers in JavaScript introduce precision drift (e.g., `0.1 + 0.2 === 0.30000000000000004`). In e-commerce, fractional paise errors compound across line items, coupons, and GST taxes, causing invoice mismatches with payment gateways.

### Decision
All financial values (line totals, product discounts, coupon deductions, CGST, SGST, delivery fees, and final payable amounts) must be computed and persisted as integer paise:
```typescript
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
export function toRupees(paise: number): number {
  return Math.round(paise) / 100;
}
```
Only format to rupees at the presentation boundary via `formatCurrency()`.

### Consequences
- **Positive**: 100% mathematical precision; perfect parity with Razorpay API amounts; zero discrepancies between customer invoices, accounting ledgers, and database records.
- **Negative**: Developers must consistently convert between paise and rupees when handling user input.

---

## ADR-006: Explicit Order Finite State Machine with Role-Based Transition Guards

### Context
Order fulfillment passes through distinct operational stages. Without state machine enforcement, race conditions or unauthorized client requests could transition orders illegally (e.g. cancelling an already-delivered order, or self-confirming an unpaid order).

### Decision
Define a strict 9-state finite state machine in `lib/order-state-machine.ts`:
- Valid states: `PENDING_PAYMENT`, `CONFIRMED`, `PROCESSING`, `PACKED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `PAYMENT_FAILED`, `REFUNDED`.
- Enforce role-based transition guards (`canTransitionOrderStatus`):
  - `CUSTOMER` can only transition unfulfilled orders (`PENDING_PAYMENT`, `CONFIRMED`) to `CANCELLED`.
  - `OPS` and `ADMIN` can advance operational fulfillment states (`PROCESSING`, `PACKED`, `OUT_FOR_DELIVERY`, `DELIVERED`).
  - `REFUNDED` requires `ADMIN` or `SYSTEM` (webhook) authority.
  - Terminal states (`DELIVERED`, `CANCELLED`, `REFUNDED`) reject all further mutations.

### Consequences
- **Positive**: Predictable lifecycle, strict stock accounting (cancellation restores stock), tamper-resistant operational flow, and comprehensive timeline history.
- **Negative**: Customer order cancellation is strictly barred once warehouse picking begins (`PROCESSING`), requiring customer support intervention.

---

## ADR-007: Honest Service Degradation (No Mock Fallbacks in Production/Development)

### Context
Previous prototype iterations fell back to silent in-memory stores and fake success messages when database connections, SMTP credentials, or payment keys were missing. This masked critical infrastructure outages and created false assumptions about system health.

### Decision
Permanently eliminate silent fallbacks in production and development execution paths:
1. Missing `MONGODB_URI` or database disconnection returns HTTP 503 `DATABASE_UNAVAILABLE`.
2. Unconfigured SMTP credentials (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) throw explicit errors outside automated test suites, and `/api/health` reports `services.email.status: "unconfigured"`.
3. Unconfigured Razorpay credentials honestly inform the customer and direct them to Cash on Delivery (COD) without fabricating payment verification.
4. In-memory storage is strictly isolated to `process.env.NODE_ENV === "test" && process.env.GROCERLY_TEST_IN_MEMORY === "true"`.

### Consequences
- **Positive**: Zero hidden failures, transparent telemetry, honest user messaging, and rapid operational root cause analysis.
- **Negative**: Local development requires a running MongoDB instance and explicit credentials for full external integration testing.

---

## ADR-008: Centralized Secret Redaction in Pino Structured Logging

### Context
Application logs are routinely indexed by monitoring platforms (Datadog, CloudWatch, Logstash). Unsanitized log statements risk leaking user passwords, session tokens, OTP codes, credit card data, and API secrets.

### Decision
Implement centralized redaction in `lib/logging/index.ts` using Pino's native redaction pipeline and custom recursive filters:
- Redacted fields: `password`, `passwordHash`, `resetTokenHash`, `tokenHash`, `token`, `secret`, `otp`, `otpHash`, `signature`, `cookie`, `authorization`, `cardnumber`, `cvv`.
- Redacted values are replaced with `"[REDACTED]"`.

### Consequences
- **Positive**: Comprehensive protection against credential leakage in log aggregation systems; compliance with PCI-DSS and privacy regulations.
- **Negative**: Debugging production authentication errors requires inspecting sanitized audit records rather than raw token strings.
