# Grocerly — Security Architecture & STRIDE Threat Model

**Document Identifier:** `DOC-SEC`  
**Current Version:** 2.0.0  
**Status:** Verified & Active  
**Last Reviewed:** October 18, 2026  

---

## 1. Security Architecture Principles

Grocerly adheres to the following foundational DevSecOps and application security principles:
1. **Zero Credential Egress**: Secrets, passwords, OTP digests, and payment signatures are never logged or returned in client payloads.
2. **Defense in Depth**: Multiple security layers (Origin validation, sliding-window rate limiting, Zod schema validation, NoSQL sanitization, RBAC, and database constraints) protect every transaction.
3. **Fail-Closed Security**: Missing environment secrets, expired tokens, or invalid origins immediately reject requests with explicit HTTP 401/403/503 statuses.

---

## 2. STRIDE Threat Model & Mitigations

The STRIDE threat modeling framework evaluates threats across six vectors:

| STRIDE Threat Category | Potential Attack Vector | Grocerly Mitigation Implementation | Verification Status |
| :--- | :--- | :--- | :--- |
| **Spoofing** (Identity) | Session hijacking via stolen cookies or fabricated session IDs. | - Sessions use 32-byte crypto random tokens with SHA-256 database hashing.<br>- Cookies flagged `HttpOnly`, `SameSite=Lax`, `Secure`.<br>- Password reset immediately terminates all active sessions. | **PASS** (Tested in `tests/production-suite.test.mjs`) |
| **Tampering** (Data) | Modifying order pricing or coupon discounts in client transit. | - All pricing, GST, coupon, and delivery fees calculated server-side in integer paise.<br>- Client-submitted prices are completely ignored.<br>- Razorpay signatures verified via HMAC-SHA256. | **PASS** (Tested in `tests/commerce.test.mjs`) |
| **Repudiation** | Customer disputes placing an order or staff disputes changing inventory. | - Software-level append-only audit trail in `auditlogs` collection.<br>- Orders store complete purchase snapshots and timeline history with actor references. | **PASS** (Audit log tests passing) |
| **Information Disclosure** | User enumeration via forgot password; credential leakage in logs. | - Anti-enumeration: Forgot password returns identical response for all inputs.<br>- Central Pino logger redacts `password`, `token`, `otp`, `secret`, `cvv`.<br>- User responses serialized through `toSafeUser()`. | **PASS** (Redaction verified in tests) |
| **Denial of Service** | Brute-force login attempts or inventory hoarding via cart exhaustion. | - Sliding-window rate limiter (10–15 req/min on auth/order endpoints).<br>- Inventory reserved only at order placement, not cart addition.<br>- Stock overselling rejected atomically. | **PASS** (Rate limiting verified) |
| **Elevation of Privilege** | Customer calling administrative inventory or user endpoints. | - Route-level RBAC (`requireRole(["ADMIN", "OPS"])`).<br>- Customer access to `/api/admin/*` strictly rejected with HTTP 403.<br>- Order modification restricted by finite state machine. | **PASS** (RBAC verified in tests) |

---

## 3. Core Security Controls

### 3.1 CSRF Defense & Same-Origin Verification (`lib/security.ts`)
For all state-changing HTTP requests (`POST`, `PUT`, `PATCH`, `DELETE`):
```typescript
export function verifySameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return true; // Server-to-server or test harness
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
```
Cross-origin submissions from external malicious sites are rejected with HTTP 403 `FORBIDDEN`.

### 3.2 Sliding-Window Rate Limiting (`lib/security.ts`)
Protects critical mutation endpoints against brute-force, scraping, and credential stuffing:
- `/api/auth/register`: 10 requests / 60 seconds per IP
- `/api/auth/login`: 10 requests / 60 seconds per IP
- `/api/orders`: 15 requests / 60 seconds per IP
- `/api/payments/*`: 10 requests / 60 seconds per IP
When a threshold is breached, the server responds with HTTP 429 and a `Retry-After: <seconds>` header.

### 3.3 NoSQL Injection & Prototype Pollution Defense (`lib/validation.ts`)
To prevent MongoDB query selector injection (`$gt`, `$ne`, `$where`):
- `hasMaliciousKeys(obj)`: Recursively scans request payloads and rejects any object containing keys starting with `$` or `__proto__`.
- `sanitizeString(val, maxLength)`: Strips HTML tags, trims whitespace, and bounds string lengths.

### 3.4 HTTP Security Headers (`next.config.mjs`)
Every response includes hardened HTTP headers:
- `X-Content-Type-Options: nosniff` (Prevents MIME-type sniffing)
- `X-Frame-Options: SAMEORIGIN` (Mitigates clickjacking)
- `X-XSS-Protection: 1; mode=block` (Legacy browser XSS filter)
- `Referrer-Policy: strict-origin-when-cross-origin` (Protects query strings in referrer headers)
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)` (Disables unused browser hardware capabilities)

---

## 4. Upstream Dependency Security & CVE Analysis

Grocerly runs on **Next.js 14.2.35** (the final security-patched LTS release of Next.js 14). Upgrading to Next.js 15+ is currently deferred because it requires React 19, which breaks `@react-three/fiber` in this architecture.

### 4.1 Advisories Resolved in 14.2.35:
- `GHSA-7m27-7ghc-44w9`: DoS with Server Actions
- `GHSA-3h52-269p-cp9r`: Origin verification in dev server
- `GHSA-g5qg-72qw-gw5v` & `GHSA-xv57-4mr9-wg8v`: Image optimization cache key confusion and content injection
- `GHSA-4342-x723-ch2f`: Middleware redirect SSRF
- `GHSA-mwv6-3258-q52c` & `GHSA-5j59-xgg2-r9c4`: RSC DoS
- `GHSA-f82v-jwr5-mffw`: Middleware authorization bypass

### 4.2 Upstream Advisories & Mitigation Matrix:
| Advisory ID | Severity | Description | Grocerly Architectural Mitigation |
| :--- | :--- | :--- | :--- |
| **GHSA-p293-qw3h-jr36** | Critical | Windows-hosted Next.js unauthenticated RCE | Target production environments are Linux containers (Docker / Cloud Run / Kubernetes). Paths strictly bounded. |
| **GHSA-2xp9-vwfh-vxw4** | Critical | Image Optimization API with AVIF files | Grocerly does not accept user-uploaded AVIF files. Images originate from vetted public assets and static URLs. |
| **GHSA-m99w-x7hq-7vfj** | High | DoS in App Router using Server Actions | Backend exclusively uses Next.js Route Handlers (`app/api/**/route.ts`), not Server Actions. |
| **GHSA-89xv-2m56-2m9x** | High | SSRF in Server Actions on custom servers | Standard Next.js server (`next start`) is used; custom server wrapper is not present. |
| **GHSA-p9j2-gv94-2wf4** | High | SSRF in rewrites via attacker-controlled hostname | `next.config.mjs` contains no external dynamic rewrite rules. |
