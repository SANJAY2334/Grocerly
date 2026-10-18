/**
 * MongoDB Atlas / Mongoose Schema Blueprint & Index Definitions for Grocerly.
 *
 * When deploying with a live MongoDB Atlas cluster (MONGODB_URI configured in .env),
 * these collection schemas and compound indexes define the canonical document structure.
 * In local development and CI environments without an external MongoDB instance,
 * `lib/db.ts` provides an identical transactional repository with atomic file persistence.
 */

export const MONGODB_COLLECTIONS = {
  PRODUCTS: "products",
  CATEGORIES: "categories",
  USERS: "users",
  ADDRESSES: "addresses",
  ORDERS: "orders",
  STOCK_RESERVATIONS: "stock_reservations",
  COUPONS: "coupons",
  PAYMENTS: "payments",
  DELIVERY_SLOTS: "delivery_slots",
  AUDIT_LOGS: "audit_logs",
} as const;

export const MONGODB_INDEX_DEFINITIONS = {
  products: [
    { key: { id: 1 }, unique: true },
    { key: { sku: 1 }, unique: true },
    { key: { slug: 1 }, unique: true },
    { key: { category: 1, stock: -1 } },
    { key: { name: "text", brand: "text", description: "text" } },
  ],
  users: [
    { key: { id: 1 }, unique: true },
    { key: { email: 1 }, unique: true },
    { key: { role: 1 } },
  ],
  orders: [
    { key: { id: 1 }, unique: true },
    { key: { idempotencyKey: 1 }, unique: true, sparse: true },
    { key: { userId: 1, timestamp: -1 } },
    { key: { status: 1, timestamp: -1 } },
  ],
  stock_reservations: [
    { key: { orderId: 1 }, unique: true },
    { key: { status: 1, expiresAt: 1 } },
  ],
  coupons: [
    { key: { code: 1 }, unique: true },
    { key: { active: 1, expiresAt: 1 } },
  ],
  audit_logs: [
    { key: { timestamp: -1 } },
    { key: { actorId: 1, timestamp: -1 } },
    { key: { targetType: 1, targetId: 1 } },
  ],
} as const;
