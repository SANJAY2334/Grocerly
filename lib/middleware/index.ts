import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, verifySameOrigin } from "@/lib/security";
import { verifyServerSession, SafeUser } from "@/lib/services/auth";
import { AuthenticationError, AuthorizationError, RateLimitError, createErrorResponse } from "@/lib/errors";
import { UserRole } from "@/lib/types";

export interface AuthenticatedContext {
  user: SafeUser;
  sessionId?: string;
  requestId: string;
}

export function extractRequestId(req: Request): string {
  return req.headers.get("x-request-id") || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Validate CSRF (Origin header) and apply rate limiting.
 */
export function applySecurityChecks(
  req: Request,
  rateLimitKeyPrefix = "general",
  maxAttempts = 30,
  windowMs = 60_000
): { allowed: boolean; errorResponse?: NextResponse; requestId: string } {
  const requestId = extractRequestId(req);

  if (!verifySameOrigin(req)) {
    return {
      allowed: false,
      errorResponse: NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Cross-origin request forbidden." }, requestId },
        { status: 403 }
      ),
      requestId,
    };
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(`${rateLimitKeyPrefix}:${ip}`, maxAttempts, windowMs);
  if (!rl.allowed) {
    return {
      allowed: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again shortly." },
          requestId,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      ),
      requestId,
    };
  }

  return { allowed: true, requestId };
}

/**
 * Resolve session from either HttpOnly cookie or legacy HMAC token.
 */
export async function getSessionUser(req: Request): Promise<SafeUser | null> {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/grocerly_session=([^;]+)/);
  if (match && match[1]) {
    const rawVal = decodeURIComponent(match[1]);
    const sessionRes = await verifyServerSession(rawVal);
    if (sessionRes) {
      return sessionRes.user;
    }
  }

  // Check Authorization Bearer header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const sessionRes = await verifyServerSession(token);
    if (sessionRes) {
      return sessionRes.user;
    }
  }

  return null;
}

/**
 * Require valid authenticated user session.
 */
export async function requireAuth(req: Request): Promise<SafeUser> {
  const user = await getSessionUser(req);
  if (!user) {
    throw new AuthenticationError("Authentication required. Please sign in to continue.");
  }
  return user;
}

/**
 * Require specific user role(s).
 */
export async function requireRole(req: Request, allowedRoles: UserRole[]): Promise<SafeUser> {
  const user = await requireAuth(req);
  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError("You do not have administrative privileges to access this resource.");
  }
  return user;
}
