import crypto from "crypto";
import mongoose from "mongoose";
import { config } from "../lib/config";
import { ProductModel } from "../lib/models/Product";
import { CategoryModel } from "../lib/models/Category";
import { UserModel } from "../lib/models/User";
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

  console.log("Connecting to MongoDB:", uri);
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
  
  // Only provision initial staff accounts if they do not already exist in the database
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
  } else {
    console.log("Admin account already exists. Preserving existing credentials and permissions.");
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
  } else {
    console.log("Ops account already exists. Preserving existing credentials and permissions.");
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
