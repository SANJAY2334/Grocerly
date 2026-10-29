# 🥬 Grocerly — Production-Grade Grocery E-Commerce Platform

Grocerly is a full-stack, enterprise-grade online grocery marketplace built with Next.js 14 (App Router, pinned to `14.2.15`), React 18, TypeScript, Tailwind CSS, Framer Motion, Mongoose (MongoDB), Nodemailer, and Pino structured logging.

---

## 🚀 Key Features

- **Storefront & Experience**:
  - Interactive 3D produce showcase dome built with Three.js / React Three Fiber (with static WebGL fallback).
  - Curated organic categories, farm-fresh vegetable & fruit inventory with freshness meters.
  - Interactive smart meal planner with automatic pantry deduplication, ingredient scaling, and shortfall substitute recommendations.
  - Cart & Checkout drawer with real-time pincode serviceability checks and delivery slot selection.
  - Visual order tracking timeline with real-time cancellation support.

- **Authentication & Security Lifecycle**:
  - Strict account registration with live client password strength meter + server-side Zod validation.
  - Cryptographically secure 6-digit email OTP verification using HMAC-SHA256 digest storage (zero plaintext OTPs saved).
  - Rate-limited verification attempts (5 max), 60s resend cooldown, and atomic single-use challenge consumption.
  - Unverified account gate preventing unauthenticated access to checkout or order placement (HTTP 403 `EMAIL_NOT_VERIFIED`).
  - Server-managed sessions backed by HttpOnly, Secure, SameSite cookies with SHA-256 database hashing.
  - Anti-enumeration forgot password flow & single-use password reset workflow.
  - Centralized security audit trail (`AuditLog`) tracking all auth, order, and administrative events.
  - Zero credential leakage: central Pino logger redaction for passwords, tokens, hashes, and OTPs.

- **Order & Financial Engine**:
  - Integer-paise precision calculation preventing fractional currency rounding errors.
  - Delivery rules: Free delivery on orders $\ge$ ₹300, flat ₹40 fee otherwise.
  - Strict coupon validation supporting flat (`FRESH50`, `WELCOME100`) and percentage (`ORGANIC10`) discounts.
  - Indian GST breakdown with 5% split equally into CGST (2.5%) and SGST (2.5%).
  - Atomic database transactions with inventory reservation, concurrency protection, and idempotency key deduplication.
  - Honest payment gateway integration: Razorpay HMAC-SHA256 signature verification + webhook handler, with transparent fallback to Cash on Delivery (COD) when unconfigured.

- **Admin & Operations Portal**:
  - `/admin/products`: Product catalog manager with real-time stock and price adjustment.
  - `/admin/orders`: Order lifecycle transition console (`CONFIRMED` $\to$ `PROCESSING` $\to$ `PACKED` $\to$ `OUT_FOR_DELIVERY` $\to$ `DELIVERED`).
  - `/admin/users`: Customer management and verification status auditor.
  - `/admin/audit-logs`: Real-time audit log explorer with severity filtering.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 14.2.15 (App Router, Server Components & Route Handlers) |
| **Frontend** | React 18.3.1, TypeScript 5.6.3, Tailwind CSS, Framer Motion, Lucide Icons |
| **3D Graphics** | Three.js, React Three Fiber, React Three Drei |
| **State Management**| Zustand 5.0 with local persistence |
| **Database & ODM** | MongoDB (Local or Atlas) via Mongoose 8.7.0 (10 collections) |
| **Validation** | Zod 4.6.7 with strict input schemas |
| **Security & Auth** | Bcrypt (salt 12), Scrypt fallback, HMAC-SHA256 sessions, CSRF headers |
| **Email Service** | Nodemailer with responsive HTML templates & in-memory test queue |
| **Logging** | Pino 10.4.0 with structured JSON output and central field redaction |
| **Testing** | Node.js native test runner (`node:test`), 53 passing automated tests |

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js 18.18+ or 20.x LTS
- MongoDB instance (Local on `mongodb://127.0.0.1:27017` or MongoDB Atlas cluster)
- (Optional) SMTP credentials for live email delivery
- (Optional) Razorpay test API keys for online payments

### 2. Environment Configuration
Copy the template to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your variables:
```ini
# Application
NODE_ENV=development
APP_URL=http://localhost:3000

# Secret for HMAC session cookies & OTP hashes (min 32 chars in production)
# Generate via: openssl rand -hex 32
AUTH_SECRET=replace_with_cryptographically_strong_random_secret_32_chars

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/grocerly
MONGODB_DB_NAME=grocerly

# Staff Passwords (Optional; if omitted, seed.ts generates secure random passwords logged to console)
INITIAL_ADMIN_PASSWORD=replace_with_secure_admin_password
INITIAL_OPS_PASSWORD=replace_with_secure_ops_password

# Email (SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_smtp_password
SMTP_FROM=Grocerly <noreply@grocerly.in>

# Payments (Razorpay)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Seed the Database
Populate initial categories, products, coupons, and staff accounts:
```bash
npm run seed
```

*Note: If `INITIAL_ADMIN_PASSWORD` is not set, the script generates a secure random 16-byte hex password and logs it to the terminal.*

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the storefront.

---

## 🧪 Testing & Verification

Grocerly includes a comprehensive automated test suite covering all security, auth, OTP, pricing, state machine, and database workflows:

```bash
# Run all automated tests (53 passing tests: 39 unit/domain + 14 HTTP route integration tests)
npm test

# Run TypeScript type check (0 errors)
npx tsc --noEmit

# Run Next.js production build and static compilation (all 71 routes)
npm run build

# Start production server
npm run start
```

---

## 📚 Production Documentation System

Comprehensive, verified production documentation is organized in the [`docs/`](docs/) directory:

- [Documentation Index](docs/README.md)
- [Product & Software Requirements Specification](docs/requirements.md)
- [System Architecture & Components](docs/architecture.md)
- [Architecture Decision Records (ADRs)](docs/architecture-decision-records.md)
- [Data Flows & Sequence Diagrams](docs/data-flow-and-sequences.md)
- [REST API Endpoint Reference](docs/api-reference.md)
- [OpenAPI 3.1 Specification](docs/openapi.yaml)
- [Database Schema & Migration Guide](docs/database.md)
- [Authentication & Authorization Guide](docs/authentication-and-authorization.md)
- [Security Architecture & STRIDE Threat Model](docs/security-and-threat-model.md)
- [Testing Strategy & Test Suite Details](docs/testing.md)
- [Local Development Guide](docs/local-development.md)
- [Production Deployment & CI/CD](docs/deployment-and-cicd.md)
- [Observability, Logging & Alerting](docs/observability.md)
- [Disaster Recovery, Backup & Rollback](docs/disaster-recovery.md)
- [Troubleshooting & Incident Playbooks](docs/troubleshooting-and-incident-response.md)
- [User & Administrator Guide](docs/user-and-admin-guide.md)
- [Contributing Standards & Release Changelog](docs/contributing-and-release.md)
- [Technical Debt, Limitations & Roadmap](docs/technical-debt-and-roadmap.md)
