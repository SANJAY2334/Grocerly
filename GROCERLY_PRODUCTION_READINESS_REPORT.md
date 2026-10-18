# GROCERLY PRODUCTION READINESS REPORT
**Audit & Remediation Date:** October 18, 2026  
**Audited Target:** Grocerly Grocery E-Commerce Platform (Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, MongoDB/Mongoose)  
**Report Version:** 2.1.0-PROD-AUDIT-FOLLOWUP  
**Authoritative Location:** Repository Root (`GROCERLY_PRODUCTION_READINESS_REPORT.md`)

---

## EXECUTIVE SUMMARY

Grocerly has undergone a comprehensive full-stack engineering audit, vulnerability remediation, live end-to-end integration verification, database backup/restore testing, and operational hardening. All artificial mock data, fake authentication bypasses, simulated OTP loops, and hardcoded administrative credentials have been permanently eliminated from the codebase.

The application architecture is pinned to **Next.js 14.2.35** (the latest upstream security-patched release of Next.js 14), **React 18.3.1**, and **Mongoose 8.7.0**. The database layer operates against live MongoDB with atomic stock management, cryptographic idempotency deduplication, distributed session management via SHA-256 digests, structured log credential redaction, and an append-only audit trail schema.

### Release Recommendation Verdict:
**READY FOR STAGING ONLY**  
*(Deployment to live public production is blocked pending provisioning of live SMTP transactional email credentials and Razorpay merchant credentials. All core local workflows, offline commerce, and Cash on Delivery checkout are 100% operational).*

---

## 1. COMPREHENSIVE STATUS MATRIX

| Area | Sub-Area / Requirement | Status | Verification Evidence / Mechanism |
| :--- | :--- | :--- | :--- |
| **Architecture** | Next.js 14 App Router / React 18 | **PASS** | Upgraded and pinned to `next@14.2.35`, 71/71 static/dynamic routes compiled cleanly |
| | Type Safety (`tsc --noEmit`) | **PASS** | 0 TypeScript errors across entire application |
| | Code Quality (`next lint`) | **PASS** | 0 ESLint errors (3 non-blocking `<img>` LCP warnings) |
| **Environment Config** | Sender Configuration Canonicalization | **PASS** | `SMTP_FROM` is the canonical variable with automatic fallback to `EMAIL_FROM` |
| | OTP Expiry Alignment | **PASS** | Canonical TTL is 300s (5 minutes) across config schema, DB records, and tests |
| **Authentication** | Registration & Validation | **PASS** | Validates email, password strength, creates user as `PENDING_VERIFICATION` |
| | Email OTP Generation & Storage | **PASS** | Cryptographic 6-digit random code, SHA-256 hashed challenge in MongoDB |
| | Unverified Login Prevention | **PASS** | Returns HTTP 403 `EMAIL_NOT_VERIFIED`, prevents session creation |
| | Email OTP Verification | **PASS** | Atomic consumption with 300s expiry and 5-attempt limit |
| | Session Issuance & Cookie Security | **PASS** | `HttpOnly`, `Secure` (prod), `SameSite=Lax`, SHA-256 hashed in MongoDB |
| | Session Restoration (`/api/auth/me`) | **PASS** | Verified via live HTTP cookie request, returns active authenticated user |
| | Logout & Session Invalidation | **PASS** | Deletes DB session record and clears browser cookie |
| | Password Reset Lifecycle | **PASS** | Single-use crypto reset token, invalidates prior sessions on reset |
| | Role-Based Access Control (RBAC) | **PASS** | Customer access to `/api/admin/*` strictly rejected with HTTP 403 |
| **Commerce** | Product Catalog & Static Generation | **PASS** | 16 products, 6 categories loaded from MongoDB, SSG generated |
| | Search, Filter & Dynamic Detail | **PASS** | Full text search, category filters, and dynamic slug lookups |
| | Cart Validation & Persistence | **PASS** | Server-side price recalculation, stock cap validation, DB persistence |
| | Coupon Engine | **PASS** | Atomic validation for `FRESH50`, `ORGANIC10`, `WELCOME100`, `EXPIRED20` |
| | GST & Delivery Fee Calculation | **PASS** | 5% GST split (2.5% CGST / 2.5% SGST), free delivery over ₹300 |
| | Cash on Delivery (COD) Checkout | **PASS** | Verified live via `/api/orders`, creates confirmed order, isolates data |
| | Atomic Inventory Reservation | **PASS** | MongoDB session transactions prevent overselling on concurrent checkout |
| | Idempotency Key Deduplication | **PASS** | Rejects or re-serves duplicate order submissions without double-charging |
| | Customer Data Isolation | **PASS** | Customer cannot view another customer's orders (HTTP 401/403 enforced) |
| **Integrations** | MongoDB Connectivity | **PASS** | Verified on `127.0.0.1:27017/grocerly`, indexes created and verified |
| | Database Backup & Restore | **PASS** | Tested snapshot export of 9 collections (180 docs) and 100% sterile restore |
| | Operational Logging & Redaction | **PASS** | Structured JSON logging with automatic credential and card redaction |
| | Audit Trail | **PASS** | Written to MongoDB `auditlogs` collection (software-level append-only) |
| | Transactional Email Delivery (SMTP)| **BLOCKED** | Missing `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`. Safely rejected outside test fixtures |
| | Online Payments (Razorpay) | **BLOCKED** | Missing `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`. Online payments safely disabled |

---

## 2. ENVIRONMENT CONFIGURATION & TTL DISCREPANCY RESOLUTION

### Sender Variable Canonicalization:
- **Canonical Variable:** `SMTP_FROM`
- **Fallback Variable:** `EMAIL_FROM`
- **Implementation:** In `lib/config/index.ts`, `SMTP_FROM` parses with priority:
  ```typescript
  SMTP_FROM: z.string().optional().transform((val) => val || process.env.EMAIL_FROM || "Grocerly <noreply@grocerly.in>")
  ```
- **Documentation Updated:** `docs/deployment.md`, `.env.example`, and `README.md` all document `SMTP_FROM` as the primary configuration variable.

### OTP TTL Realignment:
- **Prior Claim in Report:** 10 minutes.
- **Actual Runtime & Database Configuration:** **300 seconds (5 minutes)**.
- **Verification Evidence:**
  1. `lib/config/index.ts`: `OTP_TTL_SECONDS: z.coerce.number().default(300)`
  2. `lib/services/otp.ts`: `new Date(nowMs + config.OTP_TTL_SECONDS * 1000)`
  3. `tests/production-suite.test.mjs`: Added explicit test confirming exact expiry at 300 seconds (attempt at 301 seconds fails with "expired").
  4. Attempt Lockout: Confirmed 5-attempt threshold locks the challenge and rejects subsequent attempts.

---

## 3. DEPENDENCY SECURITY & AUDIT FINDINGS

An audit using `npm audit` was conducted and detailed in `audit-full.json`.

### Engine Upgrade to Next.js 14.2.35:
- To minimize exposure without introducing the breaking changes of Next.js 15/16 (which break React 18 App Router rendering in this codebase), Next.js was upgraded from `14.2.15` to **`14.2.35`** (the final security-patched release in the Next.js 14 LTS line).
- **Advisories Resolved by 14.2.35:**
  - `GHSA-7m27-7ghc-44w9` (DoS with Server Actions < 14.2.21)
  - `GHSA-3h52-269p-cp9r` (Origin verification in dev server < 14.2.30)
  - `GHSA-g5qg-72qw-gw5v` (Image optimization cache key confusion < 14.2.31)
  - `GHSA-4342-x723-ch2f` (Middleware redirect SSRF < 14.2.32)
  - `GHSA-xv57-4mr9-wg8v` (Image optimization content injection < 14.2.31)
  - `GHSA-qpjv-v59x-3qc4` (Race condition cache poisoning < 14.2.24)
  - `GHSA-mwv6-3258-q52c` & `GHSA-5j59-xgg2-r9c4` (RSC DoS < 14.2.35)
  - `GHSA-f82v-jwr5-mffw` (Middleware authorization bypass < 14.2.25)

### Remaining Upstream Vulnerabilities (Next.js 14 & PostCSS):
The remaining advisories require Next.js >= 15.5.24 or Next.js 16 (which requires React 19).

| Advisory ID | Package | Severity | Title | Applicability & Mitigation in Grocerly |
| :--- | :--- | :--- | :--- | :--- |
| **GHSA-p293-qw3h-jr36** | `next` | Critical | Unauthenticated RCE on Windows-hosted servers | **Mitigated:** Target production deployment environment is Linux containers (Docker / Cloud Run / Kubernetes). On Windows dev servers, paths are restricted. |
| **GHSA-2xp9-vwfh-vxw4** | `next` | Critical | Unauthenticated RCE in Image Optimization API with AVIF files | **Mitigated:** Grocerly does not accept user-uploaded AVIF files for server-side optimization. Images are served from vetted public static assets. |
| **GHSA-m99w-x7hq-7vfj** | `next` | High | DoS in App Router using Server Actions | **Mitigated:** Grocerly backend uses standard Next.js Route Handlers (`app/api/**/route.ts`), not experimental server actions for public mutations. |
| **GHSA-89xv-2m56-2m9x** | `next` | High | SSRF in Server Actions on custom servers | **Mitigated:** Standard Next.js server runner (`next start`) is utilized; custom server wrapper is not used. |
| **GHSA-p9j2-gv94-2wf4** | `next` | High | SSRF in rewrites via attacker-controlled hostname | **Mitigated:** `next.config.mjs` contains no external dynamic rewrite rules. |
| **GHSA-c4j6-fc7j-m34r** | `next` | High | SSRF in WebSocket upgrades | **Mitigated:** No WebSocket upgrade endpoints exist in Grocerly. |
| **GHSA-36qx-fr4f-26g5** | `next` | High | Middleware bypass in Pages Router using i18n | **Mitigated:** Grocerly exclusively utilizes Next.js App Router without Pages Router i18n routing. |
| **GHSA-6g55-p6wh-862q** | `postcss` | High | Arbitrary file read via sourceMappingURL | **Mitigated:** Build-time tool only; CSS is compiled during CI/CD build step before deployment. |

---

## 4. DATABASE INTEGRITY, AUDIT TAMPER-RESISTANCE & BACKUP/RESTORE

### Database Isolation & Index Verification:
- **Local / Test Database:** `mongodb://127.0.0.1:27017/grocerly`
- **Unique Indexes Enforced:**
  - `users.email` (Unique)
  - `products.sku` & `products.slug` (Unique)
  - `orders.idempotencyKey` (Unique)
  - `sessions.tokenHash` (Unique)
  - `otpchallenges.id` (Unique)
  - `coupons.code` (Unique)

### Backup & Restore Verification Test:
Executed automated snapshot export and isolated target database restore (`scripts/test-backup-restore.mjs`):
- **Command:** `node scripts/test-backup-restore.mjs`
- **Source Database:** `grocerly`
- **Target Verification Database:** `grocerly_test_restore_verify`
- **Collections Tested:** 9 (`auditlogs`, `categories`, `otpchallenges`, `products`, `sessions`, `orders`, `users`, `processedwebhooks`, `coupons`)
- **Total Exported Documents:** 180
- **Total Restored Documents:** 180 (100% matched across all collections)
- **Result:** **PASS**. Zero data loss or corruption during export/restore lifecycle.

### Audit Log Tamper-Resistance Clarification:
- **Current State:** The audit trail is stored in the MongoDB `auditlogs` collection with append-only application logic (no update/delete routes exist in the API).
- **Tamper-Resistance Assessment:** While application users and operations staff cannot modify or delete audit records via the API, the records are stored in standard MongoDB collections. Therefore, **they are not cryptographically immutable or tamper-proof against a database administrator with direct write access**.
- **Production Recommendation:** For enterprise compliance (SOC 2 / PCI-DSS), stream audit log events to write-once-read-many (WORM) storage or cloud log sinks (AWS CloudWatch, Google Cloud Logging, or Datadog) with append-only retention locks.

---

## 5. HONEST EXTERNAL BLOCKERS & REMAINING GAPS

The following two external dependencies remain unconfigured due to missing third-party provider credentials:

### 1. Transactional Email Provider (SMTP) — STATUS: BLOCKED
- **Impact:** Live OTP emails, password reset links, and order confirmation emails cannot be dispatched to physical user inboxes.
- **Code Safeguard:** The application does **NOT** simulate fake success. Outside test fixtures, attempts to send email return explicit configuration errors, and health checks accurately report `email: "unconfigured"`.
- **Action Required for Production:** Populate the following variables in `.env.local` or container secret manager:
  ```env
  SMTP_HOST=smtp.sendgrid.net (or smtp.postmarkapp.com / smtp.gmail.com)
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=apikey
  SMTP_PASS=your-real-smtp-password
  SMTP_FROM=Grocerly <noreply@grocerly.in>
  ```

### 2. Online Payment Gateway (Razorpay) — STATUS: BLOCKED
- **Impact:** Online card/UPI/netbanking payments cannot be initialized or verified.
- **Code Safeguard:** The application honestly marks Razorpay as unconfigured (`isConfigured: false`). The checkout flow gracefully informs the customer and restricts checkout to Cash on Delivery (COD).
- **Action Required for Production:** Populate the following variables:
  ```env
  RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
  RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
  RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
  NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
  ```

---

## 6. PRIORITIZED DEFECT & RISK REGISTER

| Priority | Issue / Risk | Status | Detail / Action |
| :--- | :--- | :--- | :--- |
| **P0** | Live SMTP Credentials Missing | **BLOCKED** | Registration OTPs and password reset emails cannot reach physical inboxes until SMTP credentials are provided. |
| **P0** | Live Razorpay Credentials Missing | **BLOCKED** | Online card/UPI payments cannot be processed until merchant keys are provided. COD is active. |
| **P1** | Upstream Next.js Platform CVEs | **MITIGATED / TRACKED** | Patched to `14.2.35`. Residual CVEs require Next 15/16 (breaking React 18 App Router). Deploy on Linux containers without public AVIF upload. |
| **P1** | Audit Trail Database Immutability | **DOCUMENTED** | Audit logs are append-only at the application layer, but not cryptographically immutable in MongoDB. Stream to cloud log sink for production compliance. |
| **P2** | Static `<img>` tags in Admin Views | **NON-BLOCKING** | 3 non-blocking ESLint warnings for image optimization on admin product/order screens. |
| **P3** | Mongoose Deprecation Warning | **NON-BLOCKING** | Notice regarding `returnDocument: 'after'` on findOneAndUpdate in older service call sites. |

---

## 7. AUTOMATED VERIFICATION RESULTS

### A. TypeScript Compilation (`npx tsc --noEmit`)
```text
Exit code: 0
Errors: 0
```

### B. ESLint Static Analysis (`npx next lint`)
```text
Exit code: 0
Errors: 0
Warnings: 3 (Non-blocking Next.js <img> LCP warnings in admin and order views)
```

### C. Production Build on Next.js 14.2.35 (`npm run build`)
```text
Exit code: 0
Compiled: 71 / 71 static and dynamic routes
Build Output:
  ○ / (Static)
  ○ /admin, /admin/products, /admin/orders, /admin/users, /admin/audit-logs
  ○ /cart, /checkout, /confirmation, /dashboard, /shop, /recipes
  ● /product/[id] (SSG - 16 products prerendered)
  ƒ /api/auth/*, /api/orders/*, /api/products/*, /api/ready, /api/health
```

### D. Automated Unit & Integration Suite (`npm test`)
```text
Test Suites: 2 passed, 2 total
Tests:       39 passed, 39 total
Duration:    4.978 seconds
Coverage Highlights:
  - Pricing Engine: Quantity, GST 5% CGST/SGST split, delivery fee logic, coupons
  - Order State Machine: Valid operational workflow, customer role transition isolation
  - Authentication: scrypt/bcrypt hashing, HMAC-SHA256 session issuance & tamper resistance
  - Payments: Razorpay signature verification, webhook signature verification
  - Database: Atomic inventory reservation, idempotency deduplication, stock release
  - OTP Engine: Exact 300s TTL verification, 5-attempt threshold lockout, resend cooldown
  - Validation: Sanitization, MongoDB query injection protection, PIN code validation
  - Logging & Audit: Sensitive credential redaction, audit log persistence
```

### E. Live End-to-End API & Database Suite (`node scripts/test-e2e-live.js`)
```text
Target: http://127.0.0.1:3001 against live MongoDB

1. Registration for e2e_customer: 201 Created (status: PENDING_VERIFICATION)
2. Login attempt before verification: 403 Forbidden (Blocked as expected)
3. Email verification with OTP challenge: Activated in MongoDB
4. Sign-in on activated account: 200 OK + Set-Cookie issued (HttpOnly session)
5. Session restoration via /api/auth/me: 200 OK (role: CUSTOMER)
6. RBAC customer isolation:
   - GET /api/admin/users: 403 Forbidden (Blocked)
   - GET /api/admin/orders: 403 Forbidden (Blocked)
7. Order placement (Cash on Delivery): 201 Created (Order ORD-886098-1E75, Status: CONFIRMED)
8. Customer order isolation:
   - Own order fetch: 200 OK
   - Unauthorized order fetch: 401 Unauthorized (Blocked)
9. Logout & session invalidation: 200 OK
   - /api/auth/me after logout: null (Session destroyed)

VERDICT: ALL LIVE E2E INTEGRATION & SECURITY TESTS PASSED (100%)
```

---

## 8. PRODUCTION DEPLOYMENT & HANDOVER CHECKLIST

Prior to promoting Grocerly to public production traffic:

1. [ ] **Environment Configuration**: Set `NODE_ENV=production` and `APP_URL=https://your-domain.com`.
2. [ ] **Session Secrets**: Generate a 64-character random hex string for `AUTH_SECRET`.
3. [ ] **Database Connection**: Configure `MONGODB_URI` with a production MongoDB Atlas replica set URI with TLS enabled.
4. [ ] **Email Dispatch**: Add production SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) to enable live OTP delivery.
5. [ ] **Payment Gateway**: Add live Razorpay credentials (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) and register webhook endpoint `https://your-domain.com/api/payments/webhook`.
6. [ ] **Reverse Proxy / SSL**: Terminate SSL at NGINX / Cloudflare with TLS 1.3, forwarding `X-Forwarded-For` and `X-Forwarded-Proto`.
7. [ ] **Process Supervision**: Run via Linux container (Docker) or systemd / PM2 (`npm run start`).
8. [ ] **Audit Sinking**: Configure remote cloud log sink (Datadog / CloudWatch / GCP Logging) for tamper-evident audit storage.
9. [ ] **Health Monitoring**: Configure synthetic uptime checks targeting `/api/health` and `/api/ready`.
