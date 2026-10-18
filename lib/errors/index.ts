import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = "INTERNAL_SERVER_ERROR", details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request payload", details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required", code = "UNAUTHENTICATED") {
    super(message, 401, code);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action", code = "FORBIDDEN") {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Requested resource not found", code = "NOT_FOUND") {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists or state conflict occurred", code = "CONFLICT") {
    super(message, 409, code);
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfterSeconds: number;
  constructor(message = "Too many requests. Please slow down.", retryAfterSeconds = 60) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", { retryAfterSeconds });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Database service error", details?: unknown) {
    super(message, 500, "DATABASE_ERROR", details);
  }
}

export interface ErrorResponsePayload {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
  timestamp: string;
}

export function createErrorResponse(
  error: unknown,
  requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
): NextResponse<ErrorResponsePayload> {
  const timestamp = new Date().toISOString();

  if (error instanceof ZodError) {
    const formattedErrors = error.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: formattedErrors[0]?.message || "Validation failed",
          details: formattedErrors,
        },
        requestId,
        timestamp,
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    const headers: Record<string, string> = {};
    if (error instanceof RateLimitError) {
      headers["Retry-After"] = String(error.retryAfterSeconds);
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        requestId,
        timestamp,
      },
      { status: error.statusCode, headers }
    );
  }

  const errMessage = error instanceof Error ? error.message : "An unexpected server error occurred";

  // Check for common Mongoose/MongoDB duplicate key error E11000
  if (typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "A record with this unique identifier or email already exists.",
        },
        requestId,
        timestamp,
      },
      { status: 409 }
    );
  }

  // Never leak internal stack traces or connection strings in production
  const safeMessage =
    process.env.NODE_ENV === "production" ? "An internal server error occurred." : errMessage;

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: safeMessage,
      },
      requestId,
      timestamp,
    },
    { status: 500 }
  );
}

export function createSuccessResponse<T>(
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
  headers?: Record<string, string>
): NextResponse<{ success: true; data: T; meta?: Record<string, unknown>; timestamp: string }> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode, headers }
  );
}
