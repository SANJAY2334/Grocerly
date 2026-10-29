# Grocerly — Local Development & Environment Setup Guide

**Document Identifier:** `DOC-DEV`  
**Current Version:** 2.0.0  
**Status:** Verified & Active  
**Last Reviewed:** October 18, 2026  

---

## 1. Prerequisites

Before setting up Grocerly, ensure your development machine has the following installed:
- **Node.js**: `v20.x` LTS (or `>=18.18.0`)
- **Package Manager**: `npm` v10+
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or MongoDB Atlas connection URI
- **Git**: Installed and configured

---

## 2. Environment Configuration

1. Clone the repository and enter the project directory:
   ```bash
   git clone <repo-url> grocerly
   cd grocerly
   ```

2. Copy the template environment configuration:
   ```bash
   cp .env.example .env.local
   ```

3. Configure variables in `.env.local`:

```ini
# ==============================================================================
# Grocerly Local Development Environment Configuration
# ==============================================================================

NODE_ENV=development
PORT=3000

# Base URL (for origin checks and email links)
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# MongoDB Connection
# Must point to an active MongoDB instance (Local or Atlas)
MONGODB_URI=mongodb://127.0.0.1:27017/grocerly
MONGODB_DB_NAME=grocerly

# Cryptographic Session & Token Signing Secret (min 32 characters)
AUTH_SECRET=grocerly_super_secure_production_session_signing_secret_2026_dev_seed

# Challenge & Session Lifespans
SESSION_TTL_SECONDS=604800
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
PASSWORD_RESET_TTL_SECONDS=900

# Optional Initial Staff Passwords (used during seed.ts if provisioning fresh accounts)
INITIAL_ADMIN_PASSWORD=Admin@Grocerly2026!
INITIAL_OPS_PASSWORD=Ops@Grocerly2026!

# Transactional Email (Nodemailer SMTP)
# Leave empty for development; emails log to the server console safely
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Grocerly <noreply@grocerly.in>"
SMTP_SECURE=false

# Payment Gateway (Razorpay)
# Leave empty for development; platform will operate in Cash on Delivery (COD) mode
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Persistence Mode (Must be false in development; true only in automated test harness)
GROCERLY_TEST_IN_MEMORY=false

# Rate Limiting
RATE_LIMIT_MAX=20
RATE_LIMIT_WINDOW_MS=60000
```

---

## 3. Dependency Installation

Install all required production and development dependencies:
```bash
npm install
```

---

## 4. Database Seeding

Populate the database with initial categories, products, coupons, and administrative staff accounts:
```bash
npm run seed
```

### Seeding Logic Details:
- The seed script (`scripts/seed.ts`) checks if staff accounts exist. If `admin@grocerly.in` is absent, it reads `INITIAL_ADMIN_PASSWORD` from your environment. If unset, it generates a secure random 16-byte hex password and prints it to the terminal.
- Populates 6 grocery categories (`Vegetables`, `Fruits`, `Dairy`, `Bakery`, `Beverages`, `Snacks`).
- Populates 16 organic grocery products with stock levels, nutritional information, and image URLs.
- Populates active coupons (`FRESH50`, `ORGANIC10`, `WELCOME100`).

---

## 5. Starting the Development Server

Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Development Scripts Reference

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Next.js development server with hot module replacement (HMR). |
| `npm test` | Runs the full 39-test automated test suite using `tsx --test`. |
| `npm run build` | Compiles optimized production bundle and runs static route generation. |
| `npm run start` | Launches compiled production server. |
| `npm run seed` | Seeds database categories, products, coupons, and staff accounts. |
| `npx tsc --noEmit`| Runs TypeScript compiler type-check across all files (0 errors expected). |

---

## 7. Common Local Setup Troubleshooting

- **Error `503 DATABASE_UNAVAILABLE`**: Ensure MongoDB is running locally (`mongod` service or Docker container `docker run -d -p 27017:27017 mongo:6.0`).
- **Cannot log in after registering**: New customer accounts are in `PENDING_VERIFICATION` state. In local mode without SMTP configured, retrieve the generated OTP from your development server console or check the `otpchallenges` collection in MongoDB.
- **Port Conflict (`EADDRINUSE: 3000`)**: Set `PORT=3001` in `.env.local` or run `npm run dev -- -p 3001`.
