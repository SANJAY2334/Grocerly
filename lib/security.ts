const rateLimitBuckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Sliding-window rate limiter by composite key (e.g. IP + endpoint).
 */
export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000,
  nowMs = Date.now()
): RateLimitResult {
  const windowStart = nowMs - windowMs;
  const timestamps = (rateLimitBuckets.get(key) || []).filter((ts) => ts > windowStart);

  if (timestamps.length >= limit) {
    const oldestInWindow = timestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - nowMs) / 1000));
    rateLimitBuckets.set(key, timestamps);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  timestamps.push(nowMs);
  rateLimitBuckets.set(key, timestamps);

  return {
    allowed: true,
    remaining: Math.max(0, limit - timestamps.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimits(): void {
  rateLimitBuckets.clear();
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

/**
 * Verify Origin/Referer header on state-changing requests to mitigate CSRF.
 */
export function verifySameOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) {
    // Allow server-to-server or local test harness calls where Origin is omitted
    return true;
  }

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "secret",
  "token",
  "signature",
  "authorization",
  "razorpay_signature",
  "cardnumber",
  "cvv",
]);

function redactSensitive(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      clean[k] = "[REDACTED]";
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export const logger = {
  info(event: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "test") {
      console.info(
        JSON.stringify({
          level: "INFO",
          timestamp: new Date().toISOString(),
          event,
          ...redactSensitive(meta),
        })
      );
    }
  },
  warn(event: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        JSON.stringify({
          level: "WARN",
          timestamp: new Date().toISOString(),
          event,
          ...redactSensitive(meta),
        })
      );
    }
  },
  error(event: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "test") {
      console.error(
        JSON.stringify({
          level: "ERROR",
          timestamp: new Date().toISOString(),
          event,
          ...redactSensitive(meta),
        })
      );
    }
  },
};
