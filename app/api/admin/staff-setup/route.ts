import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { applySecurityChecks, getSessionUser } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/db/connection";
import { UserModel } from "@/lib/models/User";
import { SessionModel } from "@/lib/models/Session";
import { hashPassword, getAuthSecret } from "@/lib/auth";
import { config } from "@/lib/config";
import { logAuditEvent } from "@/lib/logging";
import {
  createErrorResponse,
  createSuccessResponse,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/errors";

const StaffSetupSchema = z.object({
  target: z.enum(["ADMIN", "OPS"]),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number."
    ),
  confirmPassword: z.string(),
  confirmReset: z.boolean().optional(),
  bootstrapSecret: z.string().optional(),
});

/**
 * GET /api/admin/staff-setup
 * Returns the existing status of admin@grocerly.in and ops@grocerly.in.
 * Access is restricted to authenticated ADMIN users, OR unauthenticated users
 * ONLY when zero Administrator accounts exist in the database (bootstrap mode).
 */
export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const sessionUser = await getSessionUser(req);
    const adminUser = await UserModel.findOne({ role: "ADMIN" }).lean();
    const opsUser = await UserModel.findOne({ role: "OPS" }).lean();

    const adminExists = Boolean(adminUser);
    const opsExists = Boolean(opsUser);

    // If an Admin exists, user MUST be authenticated as ADMIN
    if (adminExists) {
      if (!sessionUser) {
        throw new AuthenticationError("Authentication required. Please sign in as an Administrator.");
      }
      if (sessionUser.role !== "ADMIN") {
        throw new AuthorizationError("You do not have administrative privileges to access this resource.");
      }

      return createSuccessResponse({
        adminExists,
        opsExists,
        adminEmail: "admin@grocerly.in",
        opsEmail: "ops@grocerly.in",
        canBootstrap: false,
        currentUserRole: sessionUser.role,
      });
    }

    // Zero Admin accounts exist: allow bootstrap inspection
    return createSuccessResponse({
      adminExists: false,
      opsExists,
      adminEmail: "admin@grocerly.in",
      opsEmail: "ops@grocerly.in",
      canBootstrap: true,
      currentUserRole: sessionUser?.role || null,
    });
  } catch (err) {
    return createErrorResponse(err);
  }
}

/**
 * POST /api/admin/staff-setup
 * Creates or resets the fixed staff accounts (admin@grocerly.in or ops@grocerly.in).
 * Never accepts arbitrary roles, user IDs, or email addresses from the client.
 */
export async function POST(req: Request) {
  const security = applySecurityChecks(req, "admin_staff_setup", 10, 60_000);
  if (!security.allowed && security.errorResponse) {
    return security.errorResponse;
  }

  try {
    const body = await req.json();
    const validated = StaffSetupSchema.parse(body);

    if (validated.password !== validated.confirmPassword) {
      throw new ValidationError("Passwords do not match.");
    }

    await connectToDatabase();

    const sessionUser = await getSessionUser(req);
    const adminCount = await UserModel.countDocuments({ role: "ADMIN" });

    // Enforce Authorization:
    // 1. If an Admin session is present, they must have ADMIN role.
    if (sessionUser) {
      if (sessionUser.role !== "ADMIN") {
        throw new AuthorizationError(
          "Forbidden: Only authenticated administrators can provision or reset staff accounts."
        );
      }
    } else {
      // 2. If unauthenticated, bootstrap is ONLY permitted if zero Admin accounts exist in the database
      if (adminCount > 0) {
        throw new AuthenticationError(
          "Authentication required: An Administrator account already exists. Please sign in to manage staff accounts."
        );
      }

      // Bootstrap target must be ADMIN
      if (validated.target !== "ADMIN") {
        throw new ValidationError("Initial bootstrap can only be used to create the Administrator account.");
      }

      // Validate bootstrap deployment secret
      const expectedSecret =
        process.env.STAFF_SETUP_SECRET ||
        process.env.AUTH_SECRET ||
        config.AUTH_SECRET ||
        getAuthSecret();

      const providedSecret = validated.bootstrapSecret || "";
      if (!providedSecret || !expectedSecret) {
        throw new AuthorizationError("Invalid or missing deployment bootstrap secret.");
      }

      const provBuf = Buffer.from(providedSecret, "utf8");
      const expBuf = Buffer.from(expectedSecret, "utf8");
      if (provBuf.length !== expBuf.length || !crypto.timingSafeEqual(provBuf, expBuf)) {
        await logAuditEvent({
          eventType: "STAFF_BOOTSTRAP_FAILED",
          actorId: "ANONYMOUS",
          outcome: "FAILURE",
          metadata: { reason: "INVALID_BOOTSTRAP_SECRET" },
        });
        throw new AuthorizationError("Invalid deployment bootstrap secret.");
      }
    }

    // Fixed server-side staff configuration
    const targetConfig =
      validated.target === "ADMIN"
        ? {
            id: "usr-admin-01",
            name: "Grocerly Store Admin",
            email: "admin@grocerly.in",
            role: "ADMIN" as const,
          }
        : {
            id: "usr-ops-01",
            name: "Fulfillment Operations",
            email: "ops@grocerly.in",
            role: "OPS" as const,
          };

    const existingUser = await UserModel.findOne({ email: targetConfig.email });
    const passwordHash = hashPassword(validated.password);

    if (existingUser) {
      if (!validated.confirmReset) {
        throw new ValidationError(
          `The ${targetConfig.role} account (${targetConfig.email}) already exists. Please check 'Confirm Password Reset' to proceed.`
        );
      }

      await UserModel.updateOne(
        { email: targetConfig.email },
        {
          $set: {
            passwordHash,
            role: targetConfig.role,
            verified: true,
            status: "ACTIVE",
          },
        }
      );

      // Invalidate all active sessions for this staff member across all devices
      await SessionModel.updateMany({ userId: existingUser.id }, { $set: { revokedAt: new Date() } });

      await logAuditEvent({
        eventType: "STAFF_PASSWORD_RESET",
        actorId: sessionUser ? sessionUser.id : "BOOTSTRAP_SECRET",
        targetType: "User",
        targetId: existingUser.id,
        outcome: "SUCCESS",
        metadata: { targetRole: targetConfig.role, email: targetConfig.email },
      });

      return createSuccessResponse({
        message: `Successfully reset password for ${targetConfig.role} (${targetConfig.email}). All existing active sessions were revoked.`,
        account: {
          email: targetConfig.email,
          role: targetConfig.role,
          status: "ACTIVE",
          action: "RESET",
        },
      });
    }

    // Create new staff account
    const createdUser = await UserModel.create({
      id: targetConfig.id,
      name: targetConfig.name,
      email: targetConfig.email,
      role: targetConfig.role,
      verified: true,
      status: "ACTIVE",
      passwordHash,
      addresses: [],
    });

    await logAuditEvent({
      eventType: "STAFF_ACCOUNT_PROVISIONED",
      actorId: sessionUser ? sessionUser.id : "BOOTSTRAP_SECRET",
      targetType: "User",
      targetId: createdUser.id,
      outcome: "SUCCESS",
      metadata: { targetRole: targetConfig.role, email: targetConfig.email },
    });

    return createSuccessResponse({
      message: `Successfully provisioned ${targetConfig.role} account (${targetConfig.email}).`,
      account: {
        email: targetConfig.email,
        role: targetConfig.role,
        status: "ACTIVE",
        action: "CREATED",
      },
    });
  } catch (err) {
    return createErrorResponse(err, security.requestId);
  }
}
