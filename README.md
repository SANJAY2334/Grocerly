# 🥬 Grocerly — Production-Ready Grocery E-Commerce Platform

Grocerly is a full-stack, enterprise-grade online grocery marketplace built with Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Mongoose (MongoDB Atlas), Nodemailer, and Pino structured logging.

---

## 🚀 Key Features

- **Storefront & Experience**:
  - Interactive 3D produce showcase dome built with Three.js / React Three Fiber.
  - Curated organic categories, farm-fresh vegetable & fruit inventory with freshness meters.
  - Interactive smart meal planner with automatic pantry deduplication and recipe ingredient scaling.
  - Cart & Checkout drawer with real-time pincode serviceability checks.
  - Visual order tracking timeline with real-time cancellation support.

- **Authentication & Security Lifecycle**:
  - Strict account registration with live client password strength meter + server-side Zod validation.
  - Cryptographically secure 6-digit email OTP verification using HMAC-SHA256 digest storage (no plaintext OTPs saved).
  - Rate-limited verification attempts, 60s resend cooldown, and atomic single-use challenge consumption.
  - Unverified account gate preventing unauthenticated access to checkout or order placement.
  - Server-managed sessions backed by HttpOnly, Secure, SameSite cookies with automatic token rotation.
  - Anti-enumeration forgot password & single-use password reset workflow.
  - Centralized security audit trail (`AuditLog`) tracking all auth, order, and administrative events.
  - Zero credential leakage: central Pino logger redaction for passwords, tokens, hashes, and OTPs.

- **Order & Financial Engine**:
  - Integer-paise precision calculation preventing fractional currency rounding errors.
  - Delivery rules: Free delivery on orders ≥ ₹300, flat ₹40 fee otherwise.
  - Strict coupon validation supporting flat (`FRESH50`, `WELCOME100`) and percentage (`ORGANIC10`) discounts.
  - Indian GST breakdown with 5% split equally into CGST (2.5%) and SGST (2.5%).
  - Multi-document atomic database transactions with inventory reservation, concurrency protection, and idempotency key deduplication.
  - Honest payment gateway integration: Razorpay HMAC-SHA256 signature verification + webhook handler, with transparent fallback to Cash on Delivery (COD) when unconfigured.

- **Admin & Operations Portal**:
  - `/admin/products`: Product catalog manager with real-time stock adjustment.
  - `/admin/orders`: Order lifecycle transition console (PENDING → CONFIRMED → PACKED → OUT_FOR_DELIVERY → DELIVERED).
  - `/admin/users`: Customer management and verification status auditor.
  - `/admin/audit-logs`: Real-time audit log explorer with severity filtering.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 14.2.15 (App Router, Server Components & Route Handlers) |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons |
| **3D Graphics** | Three.js, React Three Fiber, React Three Drei |
| **State Management**| Zustand with local persistence |
| **Database & ODM** | MongoDB Atlas / Serverless MongoDB via Mongoose 8.x |
| **Validation** | Zod 3.x with strict input schemas |
| **Security & Auth** | Bcrypt (salt 12), Scrypt fallback, HMAC-SHA256 sessions, CSRF headers |
| **Email Service** | Nodemailer with responsive HTML templates & in-memory test queue |
| **Logging** | Pino with structured JSON output and central field redaction |
| **Testing** | Node.js native test runner (`node --test`), 37 passing unit/integration tests |

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js 18.18+ or 20.x
- MongoDB Atlas cluster or local MongoDB instance
- (Optional) SMTP credentials for live email delivery (defaults to simulated in-memory transporter)
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
AUTH_SECRET=your_super_secret_64_character_hex_key_here

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/grocerly?retryWrites=true&w=majority
MONGODB_DB_NAME=grocerly

# Email (SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_smtp_password
SMTP_FROM=Grocerly <noreply@grocerly.in>

# Payments (Razorpay)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
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

Default seeded credentials:
- **Admin**: `admin@grocerly.in` / `Admin@Grocerly2026!`
- **Ops**: `ops@grocerly.in` / `Ops@Grocerly2026!`

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the storefront.

---

## 🧪 Testing & Verification

Grocerly includes a comprehensive automated test suite covering all security, auth, OTP, pricing, state machine, and database workflows:

```bash
# Run all automated tests (37 passing tests)
npm test

# Run Next.js production build and type check (all 71 routes)
npm run build

# Start production server
npm run start
```

---

## 📚 Documentation

Detailed architectural and operational documentation is located in the `docs/` folder:
- [Architecture & Security Model](docs/architecture.md)
- [OpenAPI 3.1 Specification](docs/openapi.yaml)
- [Deployment Guide (Vercel & Atlas)](docs/deployment.md)
- [Operations Runbook & Incident Response](docs/operations-runbook.md)
- [Handover Report](docs/handover-report.md)

---

## 🔒 Security Best Practices
- **No Secret Leaks**: Passwords, OTP codes, reset tokens, and API secrets are never included in JSON responses or structured log fields.
- **Customer Isolation**: Non-admin users are strictly restricted to their own orders, carts, and profile records.
- **Fail-Safe Design**: When database or SMTP services are unconfigured in development/test, Grocerly gracefully operates in safe in-memory fallback mode while alerting operators via `/api/health`.

---

© 2026 Grocerly India. Built for farm-fresh grocery fulfillment.
