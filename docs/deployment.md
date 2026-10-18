# Grocerly — Production Deployment & Configuration Guide

This guide details the procedure for deploying Grocerly to production environments using Vercel, Node.js standalone, Docker, or Kubernetes with MongoDB Atlas and transactional SMTP.

---

## 1. Prerequisites

- **Node.js**: v20.x LTS or higher
- **Package Manager**: `npm` v10+
- **Database**: MongoDB Atlas M0/M10+ cluster or compatible MongoDB 6.0+ instance
- **Email Provider**: SMTP service (Amazon SES, SendGrid, Postmark, or Resend)
- **Domain & SSL**: Valid domain with HTTPS / TLS termination

---

## 2. Environment Variables Configuration

Create a `.env` file in the root directory (based on `.env.example`):

```bash
# Application Environment
NODE_ENV=production
PORT=3000
APP_URL=https://grocerly.in

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.grocerly.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=grocerly

# Cryptographic Session & Token Signing Secret (min 32 characters)
AUTH_SECRET=generate_a_64_character_crypto_random_secret_string_here_abc12345

# Verification & Challenge Settings
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
SESSION_TTL_SECONDS=604800

# Transactional Email (SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_production_sendgrid_api_key
SMTP_FROM="Grocerly Fresh <orders@grocerly.in>"
SMTP_SECURE=false

# Payment Gateway (Razorpay)
# Leave empty if testing in honest COD/unconfigured mode
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Persistence Mode (must be false in production)
GROCERLY_TEST_IN_MEMORY=false
```

---

## 3. Database Initialization & Seeding

Run the seed script to create initial compound indexes, catalog products, categories, coupons, and staff credentials:

```bash
npx tsx scripts/seed.ts
```

This ensures:
- Unique indexes on `users.email`, `products.sku`, `products.slug`, `orders.idempotencyKey`.
- Default store admin account: `admin@grocerly.in` (password: `Admin@1234`)
- Fulfillment operations account: `ops@grocerly.in` (password: `Ops@12345`)
- Full catalog of organic vegetables, fruits, dairy, and staples populated into `products` collection.

---

## 4. Building & Running in Production

### Standalone Node.js:

```bash
# 1. Install production dependencies
npm ci

# 2. Compile optimized production build
npm run build

# 3. Start production server
npm start
```

### Health & Readiness Probes:
- **Liveness Probe**: `GET /api/health` — Returns 200 with database, email, and memory telemetry.
- **Readiness Probe**: `GET /api/ready` — Returns 200 when MongoDB is connected and ready to accept traffic.
