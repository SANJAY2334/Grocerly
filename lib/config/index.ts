import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default("http://localhost:3000"),
  MONGODB_URI: z.string().optional().default("mongodb://localhost:27017/grocerly"),
  MONGODB_DB_NAME: z.string().default("grocerly"),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters long for cryptographic security.")
    .default("grocerly_super_secure_production_session_signing_secret_2026_dev_seed"),
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

function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.format();
    console.error("CRITICAL: Invalid environment configuration:", JSON.stringify(formatted, null, 2));
    if (process.env.NODE_ENV === "production") {
      throw new Error("Application startup aborted due to invalid environment variables.");
    }
  }
  return result.success ? result.data : (envSchema.parse({}) as EnvConfig);
}

export const config = loadConfig();
