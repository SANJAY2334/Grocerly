import { z } from "zod";

export const KNOWN_INSECURE_SECRETS = [
  "grocerly_super_secure_production_session_signing_secret_2026_dev_seed",
  "grocerly-local-dev-hmac-secret-key-2026-do-not-use-in-prod",
  "grocerly_test_secret_for_cryptographic_verification_key_32chars!",
  "change-me-to-a-secure-random-secret-key-32-chars",
  "dev-insecure-secret-key-must-be-at-least-32-characters-long",
  "12345678901234567890123456789012",
  "secretsecretsecretsecretsecret32",
];

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default("http://localhost:3000"),
  MONGODB_URI: z.string().optional().default("mongodb://localhost:27017/grocerly"),
  MONGODB_DB_NAME: z.string().default("grocerly"),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters long for cryptographic security."),
  SESSION_TTL_SECONDS: z.coerce.number().default(7 * 24 * 60 * 60), // 7 days
  OTP_TTL_SECONDS: z.coerce.number().default(300), // 5 minutes
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60),
  PASSWORD_RESET_TTL_SECONDS: z.coerce.number().default(900), // 15 minutes
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z
    .string()
    .optional()
    .transform((val) => val || process.env.MAIL_FROM || process.env.EMAIL_FROM || "Grocerly <noreply@grocerly.in>"),
  SMTP_SECURE: z
    .string()
    .default("false")
    .transform((val) => val === "true" || val === "1"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  GROCERLY_TEST_IN_MEMORY: z
    .string()
    .default("false")
    .transform((val) => val === "true" || val === "1"),
  RATE_LIMIT_MAX: z.coerce.number().default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateAuthSecretInProduction(secret: string | undefined): void {
  if (!secret || secret.length < 32) {
    throw new Error("Application startup aborted: AUTH_SECRET missing or too short (minimum 32 characters required in production).");
  }
  if (KNOWN_INSECURE_SECRETS.includes(secret)) {
    throw new Error("Application startup aborted: Insecure development AUTH_SECRET cannot be used in production.");
  }
}

function loadConfig(): EnvConfig {
  const isProd = process.env.NODE_ENV === "production";
  const rawSecret = process.env.AUTH_SECRET;

  if (isProd) {
    validateAuthSecretInProduction(rawSecret);
  }

  const effectiveAuthSecret = rawSecret || "grocerly-local-dev-hmac-secret-key-2026-do-not-use-in-prod";
  if (!isProd && !rawSecret) {
    console.warn("[SECURITY NOTICE] Using development AUTH_SECRET fallback. Configure a 32+ character AUTH_SECRET in production.");
  }

  const parseInput = {
    ...process.env,
    AUTH_SECRET: effectiveAuthSecret,
  };

  const result = envSchema.safeParse(parseInput);
  if (!result.success) {
    const formatted = result.error.format();
    console.error("CRITICAL: Invalid environment configuration:", JSON.stringify(formatted, null, 2));
    if (isProd) {
      throw new Error("Application startup aborted due to invalid environment variables.");
    }
  }

  return result.success ? result.data : (envSchema.parse({ AUTH_SECRET: effectiveAuthSecret }) as EnvConfig);
}

export const config = loadConfig();
