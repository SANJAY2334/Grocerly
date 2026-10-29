# Grocerly — Troubleshooting & Incident Response Playbooks

**Document Identifier:** `DOC-TSHOOT`  
**Current Version:** 2.0.0  
**Status:** Verified & Active  
**Last Reviewed:** October 18, 2026  

---

## 1. Incident Classification & Severity Matrix

| Severity | Definition | Target Response | Target Resolution |
| :--- | :--- | :--- | :--- |
| **P1 — Blocker** | Total storefront outage, database down, checkout completely broken. | < 15 minutes | < 2 hours |
| **P2 — Major** | Degraded functionality: payment failures, email OTP outage, admin console inaccessible. | < 30 minutes | < 4 hours |
| **P3 — Moderate** | Single product display glitch, minor CSS error, non-blocking rate limit trigger. | < 2 hours | < 1 business day |
| **P4 — Minor** | Typo, copy inconsistency, minor telemetry warning. | < 1 business day | Next sprint |

---

## 2. Step-by-Step Incident Playbooks

### Playbook 1: Database Outage / `503 DATABASE_UNAVAILABLE`
- **Symptoms**: Customer requests return HTTP 503; `/api/ready` returns 503; server logs show `MongoDB connection error`.
- **Diagnostic Steps**:
  1. Inspect `/api/health` output for `services.database.error`.
  2. Test direct MongoDB network connectivity from the server:
     ```bash
     mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"
     ```
  3. Check IP Access List on MongoDB Atlas (ensure application egress NAT IP or `0.0.0.0/0` with VPC peering is allowed).
  4. Verify Atlas cluster disk space and connection count quotas.
- **Resolution**:
  - Whitelist server IP in Atlas Network Access.
  - If replica set primary stepped down, verify election completed.
  - Restart application containers to flush cached Mongoose connection pool:
    ```bash
    pm2 restart grocerly
    ```

---

### Playbook 2: Transactional Email / OTP Delivery Outage
- **Symptoms**: Customers report not receiving 6-digit verification codes; `/api/auth/register` succeeds but users cannot activate accounts; `/api/health` reports `services.email.status: "unconfigured"`.
- **Diagnostic Steps**:
  1. Check application environment variables:
     - Is `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` populated?
     - Is `SMTP_PORT` set to 587?
  2. Inspect structured logs for `EMAIL_DELIVERY_FAILURE` events.
  3. Verify SMTP credentials with provider CLI or curl:
     - Check SendGrid / SES API key balance and permissions.
     - Check if provider suspended the account due to spam complaints or unverified sender domain (`SMTP_FROM`).
- **Resolution**:
  - Update `SMTP_PASS` with a fresh API key in `.env.local` or cloud secret manager.
  - Ensure `SMTP_FROM` matches the verified domain identity on the email provider dashboard.
  - Restart application to re-initialize Nodemailer transporter.

---

### Playbook 3: Spike in Rate Limit Blocks / HTTP 429
- **Symptoms**: Legitimate shoppers receive HTTP 429 `Too many requests`; audit logs show high frequency of `RATE_LIMIT_EXCEEDED`.
- **Diagnostic Steps**:
  1. Query `/admin/audit-logs` or inspect structured logs:
     - Identify the offending IP address (`ip`) and targeted endpoint (`prefix`).
  2. Determine if the traffic originates from:
     - A single office NAT IP where many users share an egress IP.
     - A malicious scraping bot or credential stuffing attack.
- **Resolution**:
  - If benign multi-user NAT IP: Increase `RATE_LIMIT_MAX` in `.env.local` (e.g. from 20 to 60) and restart application.
  - If malicious attack: Block the offending IP or ASN at the Edge CDN / WAF layer (Cloudflare IP Access Rules) before traffic hits Next.js.

---

### Playbook 4: Concurrent Checkout Race Condition / Inventory Mismatch
- **Symptoms**: Customer checkout fails with `Stock for "<Product>" was just reserved by another customer. Please refresh cart.`
- **Diagnostic Steps**:
  1. Check `ProductModel` for the specific product ID:
     ```bash
     mongosh "$MONGODB_URI" --eval "db.products.findOne({id: 'prod-xxx'}, {stock: 1, reservedStock: 1})"
     ```
  2. Verify if stock reached zero concurrently.
- **Resolution**:
  - This is expected, safe behavior preventing overselling.
  - The customer's cart must be refreshed via `POST /api/cart/validate` to reflect current stock levels.
  - In the event an order was cancelled and stock was not restored due to an unhandled crash, operators can restore stock via `/admin/inventory` console.

---

### Playbook 5: Online Payment Verification Failures (Razorpay)
- **Symptoms**: Orders remain in `PENDING_PAYMENT` or fail with `Cryptographic payment signature verification failed`.
- **Diagnostic Steps**:
  1. Confirm `RAZORPAY_KEY_SECRET` matches the key ID configured in Razorpay merchant dashboard.
  2. Check if the payment was made in Test Mode using Live keys, or vice versa (`keyId.startsWith("rzp_live_")`).
  3. Verify server system clock is synchronized (NTP drift can cause webhook validation issues).
- **Resolution**:
  - Update `RAZORPAY_KEY_SECRET` to the exact key matching `RAZORPAY_KEY_ID`.
  - If a customer's payment was debited but verification failed, inspect Razorpay dashboard. Once confirmed, fulfillment staff can manually advance the order to `CONFIRMED` using the `/admin/orders` portal.
