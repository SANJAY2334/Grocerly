import crypto from "crypto";
import { UserRole } from "./types";
import { config, KNOWN_INSECURE_SECRETS } from "./config";

export const SESSION_COOKIE_NAME = "grocerly_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Retrieves the cryptographic secret used for signing and verifying user session tokens.
 * In production mode, rejects missing, short (<32 chars), or known development secrets.
 * 
 * Session Invalidation and Secret Rotation:
 * Rotating AUTH_SECRET immediately invalidates all active user sessions across the cluster.
 * Any token signed with an old or invalid secret fails crypto.timingSafeEqual() verification
 * in verifySessionToken() and is rejected as null, requiring the client to re-authenticate.
 */
export function getAuthSecret(): string {
  const envSecret = process.env.AUTH_SECRET || config.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!envSecret || envSecret.length < 32) {
      throw new Error("CRITICAL: AUTH_SECRET environment variable (≥32 chars) is required in production.");
    }
    if (KNOWN_INSECURE_SECRETS.includes(envSecret)) {
      throw new Error("CRITICAL: Known development secret cannot be used as AUTH_SECRET in production.");
    }
    return envSecret;
  }
  return envSecret || "grocerly-local-dev-hmac-secret-key-2026-do-not-use-in-prod";
}

/**
 * Hash a plaintext password using scrypt with a 16-byte cryptographic random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derivedKey}`;
}

/**
 * Verify a plaintext password against a stored scrypt hash using timing-safe comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(":");
    if (parts.length !== 3 || parts[0] !== "scrypt") return false;
    const [, salt, originalHex] = parts;
    const derivedBuffer = crypto.scryptSync(password, salt, 64);
    const originalBuffer = Buffer.from(originalHex, "hex");
    if (derivedBuffer.length !== originalBuffer.length) return false;
    return crypto.timingSafeEqual(derivedBuffer, originalBuffer);
  } catch {
    return false;
  }
}

/**
 * Create an HMAC-SHA256 signed session token.
 */
export function signSessionToken(
  user: { id: string; email: string; name: string; role: UserRole },
  ttlMs: number = SESSION_DURATION_MS
): string {
  const now = Date.now();
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + ttlMs,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify an HMAC-SHA256 signed session token and check expiration.
 */
export function verifySessionToken(
  token: string | undefined | null,
  nowMs: number = Date.now()
): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSig] = parts;
  const expectedSig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encodedPayload)
    .digest("base64url");

  const providedBuf = Buffer.from(providedSig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (!decoded || typeof decoded.exp !== "number" || decoded.exp <= nowMs) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract session payload from a Request (via Cookie header or Authorization Bearer header).
 */
export function getSessionFromRequest(req: Request): SessionPayload | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    return verifySessionToken(token);
  }

  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const c of cookies) {
    if (c.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      const token = decodeURIComponent(c.slice(SESSION_COOKIE_NAME.length + 1));
      return verifySessionToken(token);
    }
  }

  return null;
}

/**
 * Enforce customer-level data isolation:
 * Returns true if the session belongs to the resource owner or has ADMIN/OPS privileges.
 */
export function canAccessCustomerResource(
  session: SessionPayload | null,
  resourceOwnerId: string | null | undefined
): boolean {
  if (!session) return false;
  if (session.role === "ADMIN" || session.role === "OPS") return true;
  if (!resourceOwnerId) return false;
  return session.userId === resourceOwnerId;
}

/**
 * Build secure Set-Cookie header value for session login/logout.
 */
export function buildSessionCookieHeader(token: string, maxAgeSeconds = 7 * 24 * 60 * 60): string {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isProd) {
    parts.push("Secure");
  }
  return parts.join("; ");
}
