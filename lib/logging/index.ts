import pino from "pino";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "secret",
  "token",
  "refreshtoken",
  "sessiontoken",
  "otp",
  "otphash",
  "signature",
  "authorization",
  "razorpay_signature",
  "razorpay_key_secret",
  "cardnumber",
  "cvv",
  "cookie",
]);

export function redactSensitiveData<T>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item)) as unknown as T;
  }

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = "[REDACTED]";
    } else if (value && typeof value === "object") {
      clean[key] = redactSensitiveData(value);
    } else {
      clean[key] = value;
    }
  }

  return clean as T;
}

// Instantiate Pino logger with custom formatters & redaction paths
export const appLogger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  redact: {
    paths: [
      "password",
      "*.password",
      "passwordHash",
      "*.passwordHash",
      "otp",
      "*.otp",
      "otpHash",
      "*.otpHash",
      "secret",
      "*.secret",
      "token",
      "*.token",
      "authorization",
      "*.authorization",
      "cookie",
      "*.cookie",
    ],
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV || "development",
    service: "grocerly-backend",
  },
});

export interface AuditEventParams {
  eventType: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  outcome: "SUCCESS" | "FAILURE" | "DENIED";
  requestId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

// Test environment buffer for automated test inspection
const testAuditLogsBuffer: Array<AuditEventParams & { timestamp: string; id: string }> = [];

export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  const timestamp = new Date().toISOString();
  const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const sanitizedMeta = redactSensitiveData(params.metadata || {});

  const entry = {
    id,
    timestamp,
    eventType: params.eventType,
    actorId: params.actorId || "ANONYMOUS",
    targetType: params.targetType,
    targetId: params.targetId,
    outcome: params.outcome,
    requestId: params.requestId,
    ip: params.ip,
    userAgent: params.userAgent,
    metadata: sanitizedMeta,
  };

  // Structured log for ELK / CloudWatch / Datadog
  appLogger.info({ audit: entry }, `AUDIT_EVENT: ${params.eventType} [${params.outcome}]`);

  if (process.env.NODE_ENV === "test") {
    testAuditLogsBuffer.unshift(entry);
    if (testAuditLogsBuffer.length > 500) testAuditLogsBuffer.pop();
  }

  // Persist to MongoDB AuditLog model
  try {
    const { connectToDatabase } = await import("@/lib/db/connection");
    await connectToDatabase();
    const { AuditLogModel } = await import("@/lib/models/AuditLog");
    await AuditLogModel.create({
      ...entry,
      timestamp: new Date(timestamp),
    });
  } catch {
    // If database unavailable, structured stdout log already captured
  }
}

export function getInMemoryAuditLogs(limit = 100): Array<AuditEventParams & { timestamp: string; id: string }> {
  return testAuditLogsBuffer.slice(0, limit);
}

export async function fetchAuditLogs(limit = 100) {
  const { connectToDatabase } = await import("@/lib/db/connection");
  await connectToDatabase();
  const { AuditLogModel } = await import("@/lib/models/AuditLog");
  const docs = await AuditLogModel.find().sort({ timestamp: -1 }).limit(limit).lean();
  return docs;
}
