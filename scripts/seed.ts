import crypto from "crypto";
import mongoose from "mongoose";
import { config } from "../lib/config";
import { ProductModel } from "../lib/models/Product";
import { CategoryModel } from "../lib/models/Category";
import { UserModel } from "../lib/models/User";
import { SessionModel } from "../lib/models/Session";
import { CouponModel } from "../lib/models/Coupon";
import { PRODUCTS, CATEGORIES } from "../lib/products";
import { DEFAULT_COUPONS } from "../lib/pricing";
import { hashPassword } from "../lib/auth";

async function seed() {
  const uri = process.env.MONGODB_URI || config.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI provided. Skipping seed.");
    process.exit(1);
  }

  const maskedUri = uri.replace(/\/\/(.*):(.*)@/, "//***:***@");
  console.log("Connecting to MongoDB:", maskedUri);
  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || config.MONGODB_DB_NAME || "grocerly",
  });

  console.log("Seeding Categories...");
  for (const cat of CATEGORIES) {
    await CategoryModel.findOneAndUpdate(
      { id: cat.id },
      {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        description: cat.description,
        itemCount: cat.itemCount,
      },
      { upsert: true }
    );
  }

  console.log(`Seeding ${PRODUCTS.length} Products...`);
  for (const p of PRODUCTS) {
    await ProductModel.findOneAndUpdate(
      { id: p.id },
      {
        ...p,
        sku: p.sku || `GRY-SKU-${p.id}`,
        reservedStock: 0,
        soldCount: p.soldCount || 0,
      },
      { upsert: true }
    );
  }

  console.log("Checking Admin & Ops Staff Accounts...");
  
  // Password length validation for staff accounts
  if (process.env.INITIAL_ADMIN_PASSWORD && process.env.INITIAL_ADMIN_PASSWORD.length < 8) {
    throw new Error("INITIAL_ADMIN_PASSWORD must be at least 8 characters long.");
  }
  if (process.env.INITIAL_OPS_PASSWORD && process.env.INITIAL_OPS_PASSWORD.length < 8) {
    throw new Error("INITIAL_OPS_PASSWORD must be at least 8 characters long.");
  }

  // Provision or safely update staff accounts
  const shouldResetStaff =
    process.env.RESET_STAFF_PASSWORDS === "true" || process.env.RESET_STAFF_PASSWORDS === "1";

  const existingAdmin = await UserModel.findOne({ email: "admin@grocerly.in" });
  if (!existingAdmin) {
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(16).toString("hex") + "!Aa1";
    const adminHash = hashPassword(adminPassword);
    await UserModel.create({
      id: "usr-admin-01",
      name: "Grocerly Store Admin",
      email: "admin@grocerly.in",
      role: "ADMIN",
      verified: true,
      status: "ACTIVE",
      passwordHash: adminHash,
      addresses: [],
    });
    console.log("Provisioned new admin account (admin@grocerly.in).");
    if (!process.env.INITIAL_ADMIN_PASSWORD) {
      console.log(`[SECURITY NOTICE] Generated temporary admin password: ${adminPassword}`);
      console.log("[SECURITY NOTICE] Please change this password immediately via /settings/security upon first login.");
    }
  } else if (shouldResetStaff && process.env.INITIAL_ADMIN_PASSWORD) {
    const adminHash = hashPassword(process.env.INITIAL_ADMIN_PASSWORD);
    await UserModel.updateOne(
      { email: "admin@grocerly.in" },
      { $set: { passwordHash: adminHash, verified: true, status: "ACTIVE", role: "ADMIN" } }
    );
    await SessionModel.updateMany({ userId: existingAdmin.id }, { $set: { revokedAt: new Date() } });
    console.log("Updated password for existing admin account (admin@grocerly.in) using INITIAL_ADMIN_PASSWORD.");
  } else {
    console.log("Admin account already exists. (Pass RESET_STAFF_PASSWORDS=true with INITIAL_ADMIN_PASSWORD to update credentials).");
  }

  const existingOps = await UserModel.findOne({ email: "ops@grocerly.in" });
  if (!existingOps) {
    const opsPassword = process.env.INITIAL_OPS_PASSWORD || crypto.randomBytes(16).toString("hex") + "!Aa1";
    const opsHash = hashPassword(opsPassword);
    await UserModel.create({
      id: "usr-ops-01",
      name: "Fulfillment Operations",
      email: "ops@grocerly.in",
      role: "OPS",
      verified: true,
      status: "ACTIVE",
      passwordHash: opsHash,
      addresses: [],
    });
    console.log("Provisioned new ops account (ops@grocerly.in).");
    if (!process.env.INITIAL_OPS_PASSWORD) {
      console.log(`[SECURITY NOTICE] Generated temporary ops password: ${opsPassword}`);
      console.log("[SECURITY NOTICE] Please change this password immediately via /settings/security upon first login.");
    }
  } else if (shouldResetStaff && process.env.INITIAL_OPS_PASSWORD) {
    const opsHash = hashPassword(process.env.INITIAL_OPS_PASSWORD);
    await UserModel.updateOne(
      { email: "ops@grocerly.in" },
      { $set: { passwordHash: opsHash, verified: true, status: "ACTIVE", role: "OPS" } }
    );
    await SessionModel.updateMany({ userId: existingOps.id }, { $set: { revokedAt: new Date() } });
    console.log("Updated password for existing ops account (ops@grocerly.in) using INITIAL_OPS_PASSWORD.");
  } else {
    console.log("Ops account already exists. (Pass RESET_STAFF_PASSWORDS=true with INITIAL_OPS_PASSWORD to update credentials).");
  }

  console.log("Seeding Coupons...");
  for (const c of DEFAULT_COUPONS) {
    await CouponModel.findOneAndUpdate(
      { code: c.code.toUpperCase() },
      {
        ...c,
        code: c.code.toUpperCase(),
      },
      { upsert: true }
    );
  }

  console.log("Seed completed successfully!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
