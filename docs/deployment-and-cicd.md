# Grocerly — Production Deployment & CI/CD Specification

**Document Identifier:** `DOC-DEP`  
**Current Version:** 2.0.0  
**Status:** Verified & Active  
**Last Reviewed:** October 18, 2026  

---

## 1. Production Architecture Overview

In production, Grocerly is deployed as a containerized Node.js application or managed Next.js service connected to a MongoDB Atlas cluster, transactional SMTP relay, and Razorpay payment gateway.

```mermaid
flowchart LR
    subgraph Traffic ["Inbound Traffic"]
        CDN["Edge CDN / Cloudflare\n(DDoS & TLS Termination)"]
    end

    subgraph AppCluster ["Production Compute (Docker / Cloud Run / K8s)"]
        Container["Grocerly Application Container\n(Node.js 20 LTS + Next.js 14.2.15)"]
    end

    subgraph DataPlane ["External Managed Services"]
        MongoAtlas[("MongoDB Atlas M10+\n(Replica Set, Automated Backups)")]
        SMTPRelay["Transactional SMTP\n(SendGrid / SES / Postmark)"]
        RazorpayGateway["Razorpay Gateway\n(Live Payments & Webhooks)"]
    end

    CDN -->|HTTPS / Port 443| Container
    Container -->|Mongoose Pool| MongoAtlas
    Container -->|TLS Port 587| SMTPRelay
    Container -->|HTTPS API| RazorpayGateway
```

---

## 2. Production Environment Configuration

All production secrets must be provisioned via environment variable injection or a cloud secret manager (AWS Secrets Manager, GCP Secret Manager, Vault).

| Variable Name | Required | Example Production Value | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Enforces production optimizations, secure cookies, strict error handling. |
| `PORT` | Yes | `3000` | HTTP listening port. |
| `APP_URL` | Yes | `https://grocerly.in` | Canonical public origin (used for CSRF validation and email links). |
| `MONGODB_URI` | Yes | `mongodb+srv://app_user:pwd@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority` | Atlas connection string with write concern. |
| `MONGODB_DB_NAME` | Yes | `grocerly` | Authoritative database name. |
| `AUTH_SECRET` | Yes | `64_char_crypto_random_hex_string_here_1234567890abcdef` | Master secret for HMAC-SHA256 session and OTP signing. |
| `SMTP_HOST` | Yes | `smtp.sendgrid.net` | Transactional email provider host. |
| `SMTP_PORT` | Yes | `587` | Standard TLS submission port. |
| `SMTP_USER` | Yes | `apikey` | SMTP username. |
| `SMTP_PASS` | Yes | `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxx` | SMTP API key or password. |
| `SMTP_FROM` | Yes | `"Grocerly <noreply@grocerly.in>"` | Canonical sender address. |
| `RAZORPAY_KEY_ID` | Optional | `rzp_live_xxxxxxxxxxxx` | Live Razorpay merchant key ID. |
| `RAZORPAY_KEY_SECRET` | Optional | `live_secret_key_here` | Live Razorpay merchant secret key. |
| `RAZORPAY_WEBHOOK_SECRET`| Optional | `whsec_xxxxxxxxxxxxxxxxxxxx` | Webhook verification secret. |
| `GROCERLY_TEST_IN_MEMORY`| Yes | `false` | Must be `false` in production. |

---

## 3. Containerization (Dockerfile)

A production-ready multi-stage Dockerfile optimized for Next.js standalone execution:

```dockerfile
# ------------------------------------------------------------------------------
# Stage 1: Dependency Installation
# ------------------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ------------------------------------------------------------------------------
# Stage 2: Production Build
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Minimal Production Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000

# Create unprivileged application user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package.json ./package.json

# Copy compiled Next.js output and dependencies
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "run", "start"]
```

---

## 4. Continuous Integration & Deployment (CI/CD) Pipeline

A standard production CI/CD workflow consists of five automated pipeline stages:

```mermaid
flowchart LR
    Lint["1. Lint & Format\n(next lint)"] --> TypeCheck["2. Type Check\n(tsc --noEmit)"]
    TypeCheck --> Test["3. Automated Tests\n(npm test / 53 tests)"]
    Test --> Build["4. Production Build\n(npm run build)"]
    Build --> Deploy["5. Zero-Downtime Deploy\n(Rolling Container Update)"]
```

### Stage Execution Matrix
1. **Linting**:
   ```bash
   npx eslint . --max-warnings 5
   ```
2. **Type Check**:
   ```bash
   npx tsc --noEmit
   ```
3. **Automated Unit & Integration Tests**:
   ```bash
   npm test
   ```
4. **Compile Production Bundle**:
   ```bash
   npm run build
   ```
5. **Database Migration / Seed (Initial Setup Only)**:
   ```bash
   npx tsx scripts/seed.ts
   ```
6. **Container Rollout & Health Check**:
   - Verify `GET /api/ready` returns HTTP 200 before routing live user traffic to newly spawned containers.

---

## 5. Health Probes for Orchestrators

- **Liveness Probe**: `GET /api/health`
  - Verifies Node.js process responsiveness and subsystem telemetry.
  - Recommended interval: 30 seconds.
- **Readiness Probe**: `GET /api/ready`
  - Verifies that MongoDB connection is active and responsive.
  - If database is unreachable, returns HTTP 503 to prevent the orchestrator from sending client traffic to the instance.
