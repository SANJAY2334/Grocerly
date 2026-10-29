# Grocerly — Operations Runbook & Incident Response

> **Note**: For the comprehensive incident classification matrix and step-by-step diagnostic playbooks, see [Troubleshooting & Incident Response Playbooks](troubleshooting-and-incident-response.md).

---

## 1. Monitoring & Health Checks

### Endpoint Diagnostics
- `GET /api/health`:
  - `status`: `"healthy"` or `"unhealthy"`
  - `services.database.status`: `"connected"`
  - `services.database.pingMs`: Response latency of MongoDB
  - `services.email.status`: `"ready"` (SMTP verified) or `"unconfigured"`
  - `system.heapUsedMB`: Node.js memory footprint
- `GET /api/ready`:
  - Returns HTTP 200 when ready to receive traffic.
  - Returns HTTP 503 if primary database is unreachable.

### Alerting Rules
- **Database Disconnected**: Alert P1 if `/api/ready` returns 503 for > 3 consecutive checks.
- **High Memory (> 85%)**: Alert P2 if Node heap exceeds 512MB in container environments.
- **Rate Limit Trigger Spikes**: Alert P3 if `/api/auth/login` or `/api/auth/register` returns > 50 HTTP 429s in a 5-minute window (brute-force or credential stuffing pattern).

---

## 2. Structured Logs & Audit Trail

All server output is structured JSON formatted with Pino:

```json
{
  "level": 30,
  "time": "2026-10-18T14:56:34.532Z",
  "env": "production",
  "service": "grocerly-backend",
  "audit": {
    "id": "audit_1792335394532_x4yb4",
    "timestamp": "2026-10-18T14:56:34.532Z",
    "eventType": "AUTH_LOGIN_SUCCESS",
    "actorId": "usr_17901842_a9f1",
    "ip": "203.0.113.195"
  },
  "msg": "AUDIT_EVENT: AUTH_LOGIN_SUCCESS [SUCCESS]"
}
```

### Central Redaction Policy
The logger centrally masks the following keys:
- `password`, `passwordHash`, `secret`, `token`, `otp`, `otpHash`, `signature`, `cookie`, `cardnumber`, `cvv`.

### Security Audit Inspection
Store administrators can inspect audit records live in `/admin/audit-logs` or query the `auditlogs` collection:
- `USER_REGISTERED`
- `EMAIL_VERIFICATION_FAILED`
- `EMAIL_VERIFIED`
- `AUTH_LOGIN_SUCCESS` / `AUTH_LOGIN_FAILED`
- `PASSWORD_RESET_REQUESTED` / `PASSWORD_RESET_COMPLETED`
- `ORDER_CREATED` / `ORDER_STATUS_UPDATED`

---

## 3. Incident Response Playbooks

### Playbook A: High Volume of Login Failures
1. Inspect audit logs for common IP addresses or targeted email accounts.
2. Confirm sliding-window rate limiting is triggering HTTP 429 responses.
3. If attack persists from dedicated IP subnets, block at cloud firewall / CDN layer (Cloudflare / AWS WAF).

### Playbook B: Email Delivery Outage (SMTP Failure)
1. Query `GET /api/health` to inspect `services.email.status`.
2. Check SMTP provider balance, API key expiration, or bounce rates.
3. Update `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` in environment variables and restart server.

### Playbook C: Rollback Procedure
1. Identify previous stable commit hash or container image tag.
2. Ensure database schema migrations are backwards-compatible (all models maintain additive schemas).
3. Deploy prior image:
   ```bash
   git checkout <stable-tag>
   npm ci
   npm run build
   pm2 restart grocerly
   ```
4. Verify `/api/health` reports status `healthy`.
