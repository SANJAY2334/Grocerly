# Grocerly — Contribution Standards, Changelog & Release Procedures

**Document Identifier:** `DOC-REL`  
**Current Version:** 2.0.0  
**Status:** Verified & Active  
**Last Reviewed:** October 18, 2026  

---

## 1. Contribution & Code Standards

### 1.1 Branching Strategy
- `main`: Production-ready code matching the current live release. Protected branch; direct pushes prohibited.
- `staging`: Integration branch for pre-production testing and staging verification.
- `feature/<name>` or `fix/<name>`: Short-lived developer branches branched from `staging` and merged via Pull Request.

### 1.2 Pull Request Criteria
Before submitting a PR for review, the author must ensure:
1. `npm test` passes with **39 / 39 tests passing** (0 failures).
2. `npx tsc --noEmit` passes with **0 TypeScript errors**.
3. `npm run build` compiles all 71 routes with exit code 0.
4. No sensitive secrets, credentials, or personal connection strings are committed.
5. All new business logic or database changes include accompanying tests in `tests/commerce.test.mjs` or `tests/production-suite.test.mjs`.

### 1.3 Code Formatting & Linting
- Follow standard TypeScript and React best practices.
- Use explicit type definitions (`lib/types.ts`) rather than `any`.
- Keep components modular and reusable under `components/`.

---

## 2. Release & Versioning Policy

Grocerly adheres to **Semantic Versioning (SemVer 2.0.0)** (`MAJOR.MINOR.PATCH`):
- `MAJOR`: Breaking architectural changes, database schema breaking migrations, or route removals.
- `MINOR`: New functional features (e.g., new payment provider, additional meal planning modes, new reporting consoles).
- `PATCH`: Backward-compatible bug fixes, security patches, or documentation updates.

### 2.1 Pre-Release Verification Checklist
Before tagging and deploying a production release:
- [ ] Verify `npm test` passes 100%.
- [ ] Verify `npx tsc --noEmit` returns exit code 0.
- [ ] Verify `npm run build` generates production bundle cleanly.
- [ ] Verify database backup and restore test (`node scripts/test-backup-restore.mjs`) passes with 100% restored count.
- [ ] Confirm environment configuration:
  - [ ] `NODE_ENV=production`
  - [ ] `AUTH_SECRET` $\ge$ 64 characters crypto-random hex string.
  - [ ] `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` active and verified.
  - [ ] `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` set to live keys if online payments enabled.
  - [ ] `GROCERLY_TEST_IN_MEMORY=false`.
- [ ] Verify `/api/health` reports status `"healthy"` and `/api/ready` returns HTTP 200.

---

## 3. Changelog

### Version 2.0.0 (October 18, 2026) — *Production Hardening & Verification*
- **Database**:
  - Pinned ODM to `mongoose@8.7.0`.
  - Implemented 10 persistent collections with compound, unique, text, and TTL indexes.
  - Added non-destructive database backup/restore verification test (`scripts/test-backup-restore.mjs`).
- **Security & Identity**:
  - Pinned Next.js to security-hardened `next@14.2.35` LTS.
  - Implemented Bcrypt salt 12 hashing with Scrypt fallback.
  - Added single-use 6-digit OTP verification with HMAC-SHA256 digests (zero plaintext storage).
  - Enforced 300s OTP expiration, 5-attempt lockout, and 60s resend cooldown.
  - Blocked unverified logins with HTTP 403 `EMAIL_NOT_VERIFIED`.
  - Added distributed session management using SHA-256 digests in MongoDB.
  - Added anti-enumeration password reset flow.
  - Added Pino structured JSON logging with central credential redaction.
- **Commerce & Financials**:
  - Implemented strict integer-paise calculations across all subtotal, discount, GST, and delivery calculations.
  - Implemented atomic inventory reservation with idempotency key deduplication.
  - Implemented 9-state finite state machine with role-based transition guards.
  - Added honest Razorpay gateway integration with transparent COD fallback.
- **Testing**:
  - Expanded automated test suite to 39 passing tests (100% pass rate).
  - Validated live E2E integration script (`scripts/test-e2e-live.js`).

### Version 1.0.0 (September 2026) — *Initial Release*
- Initial storefront with Next.js 14 App Router, Three.js 3D produce dome, and shopping cart.
