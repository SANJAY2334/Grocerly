import crypto from "crypto";
import { config } from "@/lib/config";
import { OtpChallengeModel } from "@/lib/models/OtpChallenge";
import { connectToDatabase } from "@/lib/db/connection";
import { appLogger } from "@/lib/logging";

export type OtpPurpose = "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "SENSITIVE_CHANGE";

export interface CreateChallengeOptions {
  email: string;
  userId?: string;
  purpose: OtpPurpose;
}

const isTestInMemory = () =>
  process.env.NODE_ENV === "test" && process.env.GROCERLY_TEST_IN_MEMORY === "true";

interface InMemChallenge {
  id: string;
  userId?: string;
  email: string;
  purpose: OtpPurpose;
  otp: string;
  otpHash: string;
  createdAt: number;
  expiresAt: number;
  failedAttempts: number;
  maxAttempts: number;
  resendCooldownUntil: number;
  consumedAt?: number;
}

const testOtpChallenges = new Map<string, InMemChallenge>();

/**
 * Generate cryptographically secure 6-digit random numeric OTP.
 */
export function generateRandomOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Compute cryptographic HMAC-SHA256 digest of an OTP.
 */
export function hashOtp(otp: string): string {
  return crypto
    .createHmac("sha256", config.AUTH_SECRET)
    .update(`otp:${otp}`)
    .digest("hex");
}

/**
 * Verify OTP hash using constant-time comparison to prevent timing attacks.
 */
export function verifyOtpHash(providedOtp: string, expectedHash: string): boolean {
  try {
    const providedHash = hashOtp(providedOtp);
    const bufA = Buffer.from(providedHash, "hex");
    const bufB = Buffer.from(expectedHash, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Create a new OTP challenge, invalidating any existing active challenge for recipient & purpose.
 */
export async function createOtpChallenge(
  options: CreateChallengeOptions,
  nowMs = Date.now()
): Promise<{ otp: string; expiresAt: Date; challengeId: string }> {
  const normalizedEmail = options.email.toLowerCase().trim();
  const otp = generateRandomOtp();
  const hashed = hashOtp(otp);
  const challengeId = `otp_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const expiresAt = new Date(nowMs + config.OTP_TTL_SECONDS * 1000);
  const cooldownUntil = new Date(nowMs + config.OTP_RESEND_COOLDOWN_SECONDS * 1000);

  if (isTestInMemory()) {
    const existing = Array.from(testOtpChallenges.values())
      .filter((c) => c.email === normalizedEmail && c.purpose === options.purpose && !c.consumedAt)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (existing && existing.resendCooldownUntil > nowMs) {
      const retryAfter = Math.ceil((existing.resendCooldownUntil - nowMs) / 1000);
      throw new Error(`Please wait ${retryAfter} seconds before requesting a new code.`);
    }

    testOtpChallenges.set(challengeId, {
      id: challengeId,
      userId: options.userId,
      email: normalizedEmail,
      purpose: options.purpose,
      otp,
      otpHash: hashed,
      createdAt: nowMs,
      expiresAt: expiresAt.getTime(),
      failedAttempts: 0,
      maxAttempts: config.OTP_MAX_ATTEMPTS,
      resendCooldownUntil: cooldownUntil.getTime(),
    });

    return { otp, expiresAt, challengeId };
  }

  await connectToDatabase();

  const recentChallenge = await OtpChallengeModel.findOne({
    email: normalizedEmail,
    purpose: options.purpose,
    consumedAt: { $exists: false },
  }).sort({ createdAt: -1 });

  if (recentChallenge && recentChallenge.resendCooldownUntil && recentChallenge.resendCooldownUntil.getTime() > nowMs) {
    const retryAfter = Math.ceil((recentChallenge.resendCooldownUntil.getTime() - nowMs) / 1000);
    throw new Error(`Please wait ${retryAfter} seconds before requesting a new code.`);
  }

  await OtpChallengeModel.updateMany(
    { email: normalizedEmail, purpose: options.purpose, consumedAt: { $exists: false } },
    { $set: { consumedAt: new Date(nowMs) } }
  );

  await OtpChallengeModel.create({
    id: challengeId,
    userId: options.userId,
    email: normalizedEmail,
    purpose: options.purpose,
    otpHash: hashed,
    expiresAt,
    failedAttempts: 0,
    maxAttempts: config.OTP_MAX_ATTEMPTS,
    resendCooldownUntil: cooldownUntil,
  });

  appLogger.info(
    { email: normalizedEmail, purpose: options.purpose, challengeId },
    "OTP_CHALLENGE_CREATED"
  );

  return {
    otp,
    expiresAt,
    challengeId,
  };
}

/**
 * Verify OTP against stored hash and atomically consume it.
 */
export async function verifyAndConsumeOtp(
  email: string,
  providedOtp: string,
  purpose: OtpPurpose,
  nowMs = Date.now()
): Promise<{ success: boolean; error?: string; userId?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  if (isTestInMemory()) {
    const challenge = Array.from(testOtpChallenges.values())
      .filter((c) => c.email === normalizedEmail && c.purpose === purpose)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!challenge) {
      return { success: false, error: "Verification code is invalid or has expired." };
    }

    if (challenge.consumedAt) {
      return { success: false, error: "Verification code has already been used. Please request a new one." };
    }

    if (nowMs > challenge.expiresAt) {
      return { success: false, error: "Verification code is invalid or has expired." };
    }

    if (challenge.failedAttempts >= challenge.maxAttempts) {
      return { success: false, error: "Maximum attempts exceeded. Please request a new code." };
    }

    const isValid = verifyOtpHash(providedOtp, challenge.otpHash);
    if (!isValid) {
      challenge.failedAttempts += 1;
      const remaining = Math.max(0, challenge.maxAttempts - challenge.failedAttempts);
      return {
        success: false,
        error: remaining > 0
          ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
          : "Maximum attempts exceeded. Please request a new code.",
      };
    }

    challenge.consumedAt = nowMs;
    return { success: true, userId: challenge.userId };
  }

  await connectToDatabase();

  const challenge = await OtpChallengeModel.findOne({
    email: normalizedEmail,
    purpose,
  }).sort({ createdAt: -1 });

  if (!challenge) {
    return { success: false, error: "Verification code is invalid or has expired." };
  }

  if (challenge.consumedAt) {
    return { success: false, error: "Verification code has already been used. Please request a new one." };
  }

  if (new Date(nowMs) > challenge.expiresAt) {
    return { success: false, error: "Verification code is invalid or has expired." };
  }

  if (challenge.failedAttempts >= challenge.maxAttempts) {
    return { success: false, error: "Maximum attempts exceeded. Please request a new code." };
  }

  const isValid = verifyOtpHash(providedOtp, challenge.otpHash);
  if (!isValid) {
    await OtpChallengeModel.updateOne({ _id: challenge._id }, { $inc: { failedAttempts: 1 } });
    const remaining = Math.max(0, challenge.maxAttempts - (challenge.failedAttempts + 1));
    return {
      success: false,
      error: remaining > 0
        ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
        : "Maximum attempts exceeded. Please request a new code.",
    };
  }

  const consumed = await OtpChallengeModel.findOneAndUpdate(
    { _id: challenge._id, consumedAt: { $exists: false } },
    { $set: { consumedAt: new Date(nowMs) } },
    { returnDocument: "after" }
  );

  if (!consumed) {
    return { success: false, error: "Verification code has already been used. Please request a new one." };
  }

  return { success: true, userId: challenge.userId };
}

export function clearInMemoryOtpStore(): void {
  testOtpChallenges.clear();
}
