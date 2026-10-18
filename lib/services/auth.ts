import crypto from "crypto";
import bcrypt from "bcryptjs";
import { config } from "@/lib/config";
import { UserModel, IUser } from "@/lib/models/User";
import { SessionModel, ISession } from "@/lib/models/Session";
import { appLogger, logAuditEvent } from "@/lib/logging";
import { connectToDatabase } from "@/lib/db/connection";
import { createOtpChallenge, verifyAndConsumeOtp } from "./otp";
import {
  sendVerificationOtpEmail,
  sendPasswordResetEmail,
  sendPasswordChangeConfirmationEmail,
} from "./email";
import {
  RegisterSchema,
  LoginSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
} from "@/lib/validators";
import { UserRole } from "@/lib/types";
import { hashPassword as scryptHash, verifyPassword as scryptVerify } from "@/lib/auth";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  verified: boolean;
  createdAt: string;
}

const isTestInMemory = () =>
  process.env.NODE_ENV === "test" && process.env.GROCERLY_TEST_IN_MEMORY === "true";

interface TestUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  verified: boolean;
  status: string;
  passwordHash: string;
  resetTokenHash?: string;
  resetTokenExpires?: Date;
  createdAt: string;
}

interface TestSession {
  id: string;
  userId: string;
  tokenHash: string;
  role: string;
  expiresAt: Date;
  revokedAt?: Date;
}

const testUsers = new Map<string, TestUser>();
const testSessions = new Map<string, TestSession>();

/**
 * Hash a password using bcrypt (with backward-compatible scrypt verification).
 */
export async function secureHashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyUserPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith("scrypt:")) {
    return scryptVerify(password, hash);
  }
  return bcrypt.compare(password, hash);
}

export function toSafeUser(user: {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  verified: boolean;
  createdAt?: string | Date;
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    verified: Boolean(user.verified),
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : String(user.createdAt || new Date().toISOString()),
  };
}

/**
 * 1. User Registration (Persists unverified user in MongoDB)
 */
export async function registerUser(
  input: unknown,
  metadata?: { ip?: string; userAgent?: string }
): Promise<{ user: SafeUser; requiresVerification: boolean; challengeId?: string }> {
  const validated = RegisterSchema.parse(input);
  const normalizedEmail = validated.email.toLowerCase().trim();
  const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const passwordHash = await secureHashPassword(validated.password);

  if (isTestInMemory()) {
    if (testUsers.has(normalizedEmail)) {
      await logAuditEvent({
        eventType: "USER_REGISTRATION_FAILED",
        actorId: "ANONYMOUS",
        outcome: "FAILURE",
        metadata: { email: normalizedEmail, reason: "EMAIL_ALREADY_EXISTS" },
      });
      throw new Error("An account with this email address already exists.");
    }

    const testUser: TestUser = {
      id: userId,
      name: validated.name.trim(),
      email: normalizedEmail,
      phone: validated.phone?.trim(),
      role: "CUSTOMER",
      verified: false,
      status: "PENDING_VERIFICATION",
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    testUsers.set(normalizedEmail, testUser);
    testUsers.set(userId, testUser);

    const challenge = await createOtpChallenge({
      email: normalizedEmail,
      userId,
      purpose: "EMAIL_VERIFICATION",
    });

    await sendVerificationOtpEmail(normalizedEmail, validated.name, challenge.otp);

    await logAuditEvent({
      eventType: "USER_REGISTERED",
      actorId: userId,
      targetType: "User",
      targetId: userId,
      outcome: "SUCCESS",
      metadata: { email: normalizedEmail },
    });

    return {
      user: toSafeUser(testUser),
      requiresVerification: true,
      challengeId: challenge.challengeId,
    };
  }

  await connectToDatabase();

  const existingUser = await UserModel.findOne({ email: normalizedEmail });
  if (existingUser) {
    await logAuditEvent({
      eventType: "USER_REGISTRATION_FAILED",
      actorId: "ANONYMOUS",
      outcome: "FAILURE",
      metadata: { email: normalizedEmail, reason: "EMAIL_ALREADY_EXISTS" },
    });
    throw new Error("An account with this email address already exists.");
  }

  const dbUser = await UserModel.create({
    id: userId,
    name: validated.name.trim(),
    email: normalizedEmail,
    phone: validated.phone?.trim(),
    role: "CUSTOMER",
    verified: false,
    status: "PENDING_VERIFICATION",
    passwordHash,
    addresses: [],
  });

  let challengeId: string | undefined;
  try {
    const challenge = await createOtpChallenge({
      email: normalizedEmail,
      userId,
      purpose: "EMAIL_VERIFICATION",
    });
    challengeId = challenge.challengeId;
    await sendVerificationOtpEmail(normalizedEmail, validated.name, challenge.otp);
  } catch (emailErr) {
    appLogger.warn(
      { email: normalizedEmail, err: emailErr instanceof Error ? emailErr.message : String(emailErr) },
      "Verification email dispatch issue during registration."
    );
  }

  await logAuditEvent({
    eventType: "USER_REGISTERED",
    actorId: userId,
    targetType: "User",
    targetId: userId,
    outcome: "SUCCESS",
    metadata: { email: normalizedEmail },
  });

  return {
    user: toSafeUser(dbUser),
    requiresVerification: true,
    challengeId,
  };
}

/**
 * 2. Email Verification with OTP
 */
export async function verifyUserEmail(
  email: string,
  otp: string,
  metadata?: { ip?: string; userAgent?: string }
): Promise<{ success: boolean; user: SafeUser; sessionId: string; sessionToken: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  const verification = await verifyAndConsumeOtp(normalizedEmail, otp, "EMAIL_VERIFICATION");
  if (!verification.success) {
    await logAuditEvent({
      eventType: "EMAIL_VERIFICATION_FAILED",
      actorId: "ANONYMOUS",
      outcome: "FAILURE",
      metadata: { email: normalizedEmail, error: verification.error },
    });
    throw new Error(verification.error || "Email verification failed.");
  }

  if (isTestInMemory()) {
    const testUser = testUsers.get(normalizedEmail);
    if (!testUser) {
      throw new Error("User record not found for verification.");
    }
    testUser.verified = true;
    testUser.status = "ACTIVE";

    const session = await createSession(testUser.id, testUser.role, metadata);

    await logAuditEvent({
      eventType: "EMAIL_VERIFIED",
      actorId: testUser.id,
      targetType: "User",
      targetId: testUser.id,
      outcome: "SUCCESS",
      metadata: { email: normalizedEmail },
    });

    return {
      success: true,
      user: toSafeUser(testUser),
      sessionId: session.sessionId,
      sessionToken: session.sessionToken,
    };
  }

  await connectToDatabase();

  const dbUser = await UserModel.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        verified: true,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  if (!dbUser) {
    throw new Error("User record not found for verification.");
  }

  const session = await createSession(dbUser.id, dbUser.role, metadata);

  await logAuditEvent({
    eventType: "EMAIL_VERIFIED",
    actorId: dbUser.id,
    targetType: "User",
    targetId: dbUser.id,
    outcome: "SUCCESS",
    metadata: { email: normalizedEmail },
  });

  return {
    success: true,
    user: toSafeUser(dbUser),
    sessionId: session.sessionId,
    sessionToken: session.sessionToken,
  };
}

/**
 * 3. Authenticate User (Login)
 */
export async function authenticateUser(
  input: unknown,
  metadata?: { ip?: string; userAgent?: string }
): Promise<{ user: SafeUser; sessionId: string; sessionToken: string }> {
  const validated = LoginSchema.parse(input);
  const normalizedEmail = validated.email.toLowerCase().trim();

  if (isTestInMemory()) {
    const testUser = testUsers.get(normalizedEmail);
    if (!testUser) {
      await logAuditEvent({
        eventType: "AUTH_LOGIN_FAILED",
        actorId: "ANONYMOUS",
        outcome: "FAILURE",
        metadata: { email: normalizedEmail, reason: "USER_NOT_FOUND" },
      });
      throw new Error("Invalid email or password.");
    }

    const isPasswordValid = await verifyUserPassword(validated.password, testUser.passwordHash);
    if (!isPasswordValid) {
      await logAuditEvent({
        eventType: "AUTH_LOGIN_FAILED",
        actorId: testUser.id,
        outcome: "FAILURE",
        metadata: { email: normalizedEmail, reason: "INVALID_CREDENTIALS" },
      });
      throw new Error("Invalid email or password.");
    }

    if (!testUser.verified) {
      try {
        const challenge = await createOtpChallenge({
          email: normalizedEmail,
          userId: testUser.id,
          purpose: "EMAIL_VERIFICATION",
        });
        await sendVerificationOtpEmail(normalizedEmail, testUser.name, challenge.otp);
      } catch {
        // Cooldown in effect
      }

      const unverifiedErr = new Error("Please verify your email address to sign in. A new 6-digit code has been sent.");
      (unverifiedErr as unknown as { code: string }).code = "EMAIL_NOT_VERIFIED";
      throw unverifiedErr;
    }

    const session = await createSession(testUser.id, testUser.role, metadata);

    await logAuditEvent({
      eventType: "AUTH_LOGIN_SUCCESS",
      actorId: testUser.id,
      outcome: "SUCCESS",
      metadata: { sessionId: session.sessionId, email: normalizedEmail },
    });

    return {
      user: toSafeUser(testUser),
      sessionId: session.sessionId,
      sessionToken: session.sessionToken,
    };
  }

  await connectToDatabase();

  const dbUser = await UserModel.findOne({ email: normalizedEmail });

  if (!dbUser) {
    await logAuditEvent({
      eventType: "AUTH_LOGIN_FAILED",
      actorId: "ANONYMOUS",
      outcome: "FAILURE",
      metadata: { email: normalizedEmail, reason: "USER_NOT_FOUND" },
    });
    throw new Error("Invalid email or password.");
  }

  const isPasswordValid = await verifyUserPassword(validated.password, dbUser.passwordHash);
  if (!isPasswordValid) {
    await logAuditEvent({
      eventType: "AUTH_LOGIN_FAILED",
      actorId: dbUser.id,
      outcome: "FAILURE",
      metadata: { email: normalizedEmail, reason: "INVALID_CREDENTIALS" },
    });
    throw new Error("Invalid email or password.");
  }

  if (!dbUser.verified) {
    try {
      const challenge = await createOtpChallenge({
        email: normalizedEmail,
        userId: dbUser.id,
        purpose: "EMAIL_VERIFICATION",
      });
      await sendVerificationOtpEmail(normalizedEmail, dbUser.name, challenge.otp);
    } catch {
      // Cooldown in effect
    }

    const unverifiedErr = new Error("Please verify your email address to sign in. A new 6-digit code has been sent.");
    (unverifiedErr as unknown as { code: string }).code = "EMAIL_NOT_VERIFIED";
    throw unverifiedErr;
  }

  const session = await createSession(dbUser.id, dbUser.role, metadata);

  await logAuditEvent({
    eventType: "AUTH_LOGIN_SUCCESS",
    actorId: dbUser.id,
    outcome: "SUCCESS",
    metadata: { sessionId: session.sessionId, email: normalizedEmail },
  });

  return {
    user: toSafeUser(dbUser),
    sessionId: session.sessionId,
    sessionToken: session.sessionToken,
  };
}

/**
 * 4. Create Server Session
 */
export async function createSession(
  userId: string,
  role: string,
  metadata?: { ip?: string; userAgent?: string }
): Promise<{ sessionId: string; sessionToken: string; expiresAt: Date }> {
  const sessionId = `sess_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHmac("sha256", config.AUTH_SECRET).update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_SECONDS * 1000);

  if (isTestInMemory()) {
    testSessions.set(sessionId, {
      id: sessionId,
      userId,
      tokenHash,
      role,
      expiresAt,
    });

    return {
      sessionId,
      sessionToken: `${sessionId}.${rawToken}`,
      expiresAt,
    };
  }

  await connectToDatabase();

  await SessionModel.create({
    id: sessionId,
    userId,
    tokenHash,
    role,
    ipAddress: metadata?.ip,
    userAgent: metadata?.userAgent,
    expiresAt,
  });

  return {
    sessionId,
    sessionToken: `${sessionId}.${rawToken}`,
    expiresAt,
  };
}

/**
 * 5. Verify Server Session
 */
export async function verifyServerSession(
  sessionCookieValue: string | undefined | null
): Promise<{ user: SafeUser; sessionId: string } | null> {
  if (!sessionCookieValue || typeof sessionCookieValue !== "string") return null;

  const [sessionId, rawToken] = sessionCookieValue.split(".");
  if (!sessionId || !rawToken) return null;

  const expectedHash = crypto.createHmac("sha256", config.AUTH_SECRET).update(rawToken).digest("hex");

  if (isTestInMemory()) {
    const sess = testSessions.get(sessionId);
    if (sess && !sess.revokedAt && sess.expiresAt > new Date() && sess.tokenHash === expectedHash) {
      const user = testUsers.get(sess.userId);
      if (user) {
        return { user: toSafeUser(user), sessionId };
      }
    }
    return null;
  }

  await connectToDatabase();

  const dbSess = await SessionModel.findOne({
    id: sessionId,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });

  if (dbSess && dbSess.tokenHash === expectedHash) {
    const dbUser = await UserModel.findOne({ id: dbSess.userId });
    if (dbUser) {
      return { user: toSafeUser(dbUser), sessionId };
    }
  }

  return null;
}

/**
 * 6. Revoke a Session (Logout)
 */
export async function revokeSession(sessionId: string, userId?: string): Promise<boolean> {
  if (isTestInMemory()) {
    const sess = testSessions.get(sessionId);
    const revoked = Boolean(sess && (!userId || sess.userId === userId));
    if (revoked && sess) {
      sess.revokedAt = new Date();
    }
    if (!revoked) return false;
    await logAuditEvent({
      eventType: "AUTH_LOGOUT",
      actorId: userId || "ANONYMOUS",
      targetType: "Session",
      targetId: sessionId,
      outcome: "SUCCESS",
      metadata: {},
    });
    return true;
  }

  await connectToDatabase();

  const filter: Record<string, unknown> = { id: sessionId };
  if (userId) filter.userId = userId;

  const result = await SessionModel.updateOne(filter, { $set: { revokedAt: new Date() } });
  if (result.matchedCount !== 1) return false;

  await logAuditEvent({
    eventType: "AUTH_LOGOUT",
    actorId: userId || "ANONYMOUS",
    targetType: "Session",
    targetId: sessionId,
    outcome: "SUCCESS",
    metadata: {},
  });
  return true;
}

/**
 * 7. Password Recovery Request
 */
export async function requestPasswordReset(rawEmail: string): Promise<{ success: boolean }> {
  const normalizedEmail = String(rawEmail || "").toLowerCase().trim();
  if (!normalizedEmail) return { success: true };

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto.createHmac("sha256", config.AUTH_SECRET).update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + config.PASSWORD_RESET_TTL_SECONDS * 1000);

  if (isTestInMemory()) {
    const testUser = testUsers.get(normalizedEmail);
    if (testUser) {
      testUser.resetTokenHash = resetTokenHash;
      testUser.resetTokenExpires = expiresAt;

      await sendPasswordResetEmail(testUser.email, testUser.name, resetToken);

      await logAuditEvent({
        eventType: "PASSWORD_RESET_REQUESTED",
        actorId: testUser.id,
        outcome: "SUCCESS",
        metadata: { email: normalizedEmail },
      });
    }
    return { success: true };
  }

  await connectToDatabase();

  const dbUser = await UserModel.findOne({ email: normalizedEmail });

  if (dbUser) {
    await UserModel.updateOne(
      { id: dbUser.id },
      {
        $set: {
          resetTokenHash,
          resetTokenExpires: expiresAt,
        },
      }
    );

    await sendPasswordResetEmail(dbUser.email, dbUser.name, resetToken);

    await logAuditEvent({
      eventType: "PASSWORD_RESET_REQUESTED",
      actorId: dbUser.id,
      outcome: "SUCCESS",
      metadata: { email: normalizedEmail },
    });
  }

  return { success: true };
}

/**
 * 8. Complete Password Reset with Single-Use Token
 */
export async function resetPasswordWithToken(input: unknown): Promise<{ success: boolean }> {
  const validated = ResetPasswordSchema.parse(input);
  const expectedHash = crypto.createHmac("sha256", config.AUTH_SECRET).update(validated.token).digest("hex");

  if (isTestInMemory()) {
    const testUser = Array.from(testUsers.values()).find(
      (u) => u.resetTokenHash === expectedHash && u.resetTokenExpires && u.resetTokenExpires > new Date()
    );

    if (!testUser) {
      throw new Error("Invalid or expired password reset link. Please request a new one.");
    }

    testUser.passwordHash = await secureHashPassword(validated.newPassword);
    delete testUser.resetTokenHash;
    delete testUser.resetTokenExpires;

    for (const sess of testSessions.values()) {
      if (sess.userId === testUser.id) {
        sess.revokedAt = new Date();
      }
    }

    await sendPasswordChangeConfirmationEmail(testUser.email, testUser.name);

    await logAuditEvent({
      eventType: "PASSWORD_RESET_COMPLETED",
      actorId: testUser.id,
      outcome: "SUCCESS",
      metadata: { email: testUser.email },
    });

    return { success: true };
  }

  await connectToDatabase();

  const dbUser = await UserModel.findOne({
    resetTokenHash: expectedHash,
    resetTokenExpires: { $gt: new Date() },
  });

  if (!dbUser) {
    throw new Error("Invalid or expired password reset link. Please request a new one.");
  }

  const newHash = await secureHashPassword(validated.newPassword);

  await UserModel.updateOne(
    { id: dbUser.id },
    {
      $set: { passwordHash: newHash },
      $unset: { resetTokenHash: "", resetTokenExpires: "" },
    }
  );

  await SessionModel.updateMany({ userId: dbUser.id }, { $set: { revokedAt: new Date() } });

  await sendPasswordChangeConfirmationEmail(dbUser.email, dbUser.name);

  await logAuditEvent({
    eventType: "PASSWORD_RESET_COMPLETED",
    actorId: dbUser.id,
    outcome: "SUCCESS",
    metadata: { email: dbUser.email },
  });

  return { success: true };
}

/**
 * 9. Authenticated Password Change
 */
export async function changeUserPassword(userId: string, input: unknown): Promise<{ success: boolean }> {
  const validated = ChangePasswordSchema.parse(input);

  if (isTestInMemory()) {
    const testUser = testUsers.get(userId);
    if (!testUser) {
      throw new Error("User account not found.");
    }

    const matches = await verifyUserPassword(validated.currentPassword, testUser.passwordHash);
    if (!matches) {
      throw new Error("Incorrect current password.");
    }

    testUser.passwordHash = await secureHashPassword(validated.newPassword);
    for (const sess of testSessions.values()) {
      if (sess.userId === testUser.id) {
        sess.revokedAt = new Date();
      }
    }

    await sendPasswordChangeConfirmationEmail(testUser.email, testUser.name);
    return { success: true };
  }

  await connectToDatabase();

  const dbUser = await UserModel.findOne({ id: userId });
  if (!dbUser) {
    throw new Error("User account not found.");
  }

  const matches = await verifyUserPassword(validated.currentPassword, dbUser.passwordHash);
  if (!matches) {
    throw new Error("Incorrect current password.");
  }

  const newHash = await secureHashPassword(validated.newPassword);
  await UserModel.updateOne({ id: userId }, { $set: { passwordHash: newHash } });

  await SessionModel.updateMany({ userId }, { $set: { revokedAt: new Date() } });

  await sendPasswordChangeConfirmationEmail(dbUser.email, dbUser.name);

  await logAuditEvent({
    eventType: "PASSWORD_CHANGED",
    actorId: userId,
    outcome: "SUCCESS",
    metadata: { email: dbUser.email },
  });

  return { success: true };
}

/**
 * 10. List Active Sessions for User
 */
export async function getUserSessions(userId: string): Promise<Array<{ id: string; createdAt: string; ipAddress?: string; userAgent?: string; isCurrent?: boolean }>> {
  if (isTestInMemory()) {
    const sessions = Array.from(testSessions.values()).filter(
      (s) => s.userId === userId && !s.revokedAt && s.expiresAt > new Date()
    );
    return sessions.map((sess) => ({
      id: sess.id,
      createdAt: new Date().toISOString(),
      ipAddress: "127.0.0.1",
      userAgent: "Desktop Browser",
    }));
  }

  await connectToDatabase();

  const sessions = await SessionModel.find({
    userId,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  return sessions.map((sess) => ({
    id: sess.id,
    createdAt: sess.createdAt instanceof Date ? sess.createdAt.toISOString() : new Date(sess.createdAt).toISOString(),
    ipAddress: sess.ipAddress || "127.0.0.1",
    userAgent: sess.userAgent || "Desktop Browser",
  }));
}

export function resetInMemoryAuth(): void {
  testUsers.clear();
  testSessions.clear();
}
