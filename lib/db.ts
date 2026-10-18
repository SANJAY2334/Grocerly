import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  AuditLogEntry,
  CartItem,
  Coupon,
  DeliveryAddress,
  DeliverySlotConfig,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  ServiceableZone,
  UserAccount,
  UserRole,
} from "./types";
import { PRODUCTS } from "./products";
import { calculatePricingBreakdown, DEFAULT_COUPONS } from "./pricing";
import { hashPassword, verifyPassword } from "./auth";
import { canTransitionOrderStatus, createTimelineEvent } from "./order-state-machine";
import { generateOrderId } from "./utils";

export interface StoredUser extends UserAccount {
  passwordHash: string;
}

export interface StockReservation {
  id: string;
  orderId: string;
  items: CartItem[];
  status: "ACTIVE" | "COMMITTED" | "RELEASED";
  createdAt: number;
  expiresAt: number;
}

export interface DatabaseSchema {
  products: Product[];
  coupons: Coupon[];
  users: StoredUser[];
  orders: Order[];
  reservations: StockReservation[];
  deliverySlots: DeliverySlotConfig[];
  serviceableZones: ServiceableZone[];
  processedWebhooks: string[];
  auditLogs: AuditLogEntry[];
}

const RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 minutes

const DEFAULT_DELIVERY_SLOTS: DeliverySlotConfig[] = [
  {
    id: "slot-morning",
    label: "Morning: 07:00 AM – 09:00 AM",
    capacity: 25,
    bookedCount: 4,
    active: true,
  },
  {
    id: "slot-1",
    label: "Slot 1: 10:00 AM – 12:00 PM",
    capacity: 30,
    bookedCount: 8,
    active: true,
  },
  {
    id: "slot-2",
    label: "Slot 2: 12:00 PM – 02:00 PM",
    capacity: 30,
    bookedCount: 5,
    active: true,
  },
  {
    id: "slot-evening",
    label: "Evening: 04:00 PM – 06:00 PM",
    capacity: 35,
    bookedCount: 11,
    active: true,
  },
  {
    id: "slot-night",
    label: "Night: 07:00 PM – 09:00 PM",
    capacity: 25,
    bookedCount: 6,
    active: true,
  },
];

const DEFAULT_SERVICEABLE_ZONES: ServiceableZone[] = [
  { pincode: "400001", city: "Mumbai", state: "Maharashtra", areaName: "Fort & Colaba Hub", estimatedWindow: "2–3 hours", serviceable: true },
  { pincode: "400050", city: "Mumbai", state: "Maharashtra", areaName: "Bandra West Organic Hub", estimatedWindow: "90 mins", serviceable: true },
  { pincode: "560001", city: "Bengaluru", state: "Karnataka", areaName: "MG Road & Central Hub", estimatedWindow: "90 mins", serviceable: true },
  { pincode: "560034", city: "Bengaluru", state: "Karnataka", areaName: "Koramangala Fresh Hub", estimatedWindow: "60 mins", serviceable: true },
  { pincode: "110001", city: "New Delhi", state: "Delhi", areaName: "Connaught Place Hub", estimatedWindow: "2 hours", serviceable: true },
  { pincode: "600001", city: "Chennai", state: "Tamil Nadu", areaName: "George Town Hub", estimatedWindow: "2 hours", serviceable: true },
  { pincode: "500001", city: "Hyderabad", state: "Telangana", areaName: "Banjara Hills Hub", estimatedWindow: "2 hours", serviceable: true },
  { pincode: "411001", city: "Pune", state: "Maharashtra", areaName: "Koregaon Park Hub", estimatedWindow: "90 mins", serviceable: true },
];

let simulatedDbDown = false;
let memoryDb: DatabaseSchema | null = null;

export function setDatabaseSimulatedDown(down: boolean): void {
  simulatedDbDown = down;
}

function assertDbAvailable(): void {
  if (simulatedDbDown) {
    throw new Error("DATABASE_UNAVAILABLE: Unable to connect to primary data store.");
  }
}

function createInitialDatabase(): DatabaseSchema {
  const initialProducts: Product[] = PRODUCTS.map((p, idx) => ({
    ...p,
    sku: p.sku || `GRY-SKU-${String(idx + 101).padStart(4, "0")}`,
    reservedStock: 0,
    soldCount: 0,
    lowStockThreshold: 10,
  }));

  const nowIso = new Date().toISOString();

  const initialUsers: StoredUser[] = [
    {
      id: "usr-admin-01",
      name: "Grocerly Store Admin",
      email: "admin@grocerly.in",
      phone: "+91 98200 00001",
      role: "ADMIN",
      verified: true,
      createdAt: nowIso,
      passwordHash: hashPassword("Admin@1234"),
      addresses: [],
    },
    {
      id: "usr-ops-01",
      name: "Fulfillment Operations",
      email: "ops@grocerly.in",
      phone: "+91 98200 00002",
      role: "OPS",
      verified: true,
      createdAt: nowIso,
      passwordHash: hashPassword("Ops@12345"),
      addresses: [],
    },
  ];

  return {
    products: initialProducts,
    coupons: DEFAULT_COUPONS.map((c) => ({ ...c })),
    users: initialUsers,
    orders: [],
    reservations: [],
    deliverySlots: DEFAULT_DELIVERY_SLOTS.map((s) => ({ ...s })),
    serviceableZones: DEFAULT_SERVICEABLE_ZONES.map((z) => ({ ...z })),
    processedWebhooks: [],
    auditLogs: [],
  };
}

function getDbFilePath(): string {
  return path.join(process.cwd(), ".data", "grocerly-db.json");
}

export function loadDatabase(): DatabaseSchema {
  assertDbAvailable();

  if (process.env.GROCERLY_TEST_IN_MEMORY === "true") {
    if (!memoryDb) {
      memoryDb = createInitialDatabase();
    }
    return memoryDb;
  }

  if (memoryDb) {
    return memoryDb;
  }

  const filePath = getDbFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as DatabaseSchema;
      if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.orders)) {
        memoryDb = parsed;
        return memoryDb;
      }
    }
  } catch {
    // Fallback to fresh initialization if file is corrupted
  }

  memoryDb = createInitialDatabase();
  saveDatabase(memoryDb);
  return memoryDb;
}

export function saveDatabase(db: DatabaseSchema): void {
  assertDbAvailable();
  memoryDb = db;

  if (process.env.GROCERLY_TEST_IN_MEMORY === "true") {
    return;
  }

  try {
    const filePath = getDbFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(tempPath, filePath);
  } catch {
    // Continue using in-memory copy if filesystem is read-only
  }
}

export function resetTestDatabase(): DatabaseSchema {
  simulatedDbDown = false;
  memoryDb = createInitialDatabase();
  return memoryDb;
}

/**
 * Release expired PENDING_PAYMENT stock reservations automatically.
 */
export function cleanupExpiredReservations(nowMs = Date.now()): void {
  const db = loadDatabase();
  let modified = false;

  for (const res of db.reservations) {
    if (res.status === "ACTIVE" && res.expiresAt <= nowMs) {
      res.status = "RELEASED";
      for (const item of res.items) {
        const product = db.products.find((p) => p.id === item.productId);
        if (product) {
          product.stock += item.quantity;
          product.reservedStock = Math.max(0, (product.reservedStock || 0) - item.quantity);
        }
      }
      modified = true;
    }
  }

  if (modified) {
    saveDatabase(db);
  }
}

/**
 * Validate whether a PIN code is serviceable by Grocerly fulfillment hubs.
 */
export function checkPincodeServiceability(pincode: string): {
  serviceable: boolean;
  zone?: ServiceableZone;
  message: string;
} {
  assertDbAvailable();
  const cleanPin = (pincode || "").trim();
  if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
    return {
      serviceable: false,
      message: "Enter a valid 6-digit Indian PIN code.",
    };
  }

  const db = loadDatabase();
  const exactMatch = db.serviceableZones.find((z) => z.pincode === cleanPin && z.serviceable);
  if (exactMatch) {
    return {
      serviceable: true,
      zone: exactMatch,
      message: `Delivering from ${exactMatch.areaName}, ${exactMatch.city} (Est. ${exactMatch.estimatedWindow}).`,
    };
  }

  // Also support metro prefixes: 400xxx (Mumbai), 560xxx (Bengaluru), 110xxx (Delhi), 600xxx (Chennai), 500xxx (Hyderabad), 411xxx (Pune)
  const metroPrefixMap: Record<string, { city: string; state: string; areaName: string }> = {
    "400": { city: "Mumbai", state: "Maharashtra", areaName: "Mumbai Metro Hub" },
    "560": { city: "Bengaluru", state: "Karnataka", areaName: "Bengaluru Metro Hub" },
    "110": { city: "New Delhi", state: "Delhi", areaName: "Delhi NCR Hub" },
    "600": { city: "Chennai", state: "Tamil Nadu", areaName: "Chennai Metro Hub" },
    "500": { city: "Hyderabad", state: "Telangana", areaName: "Hyderabad Metro Hub" },
    "411": { city: "Pune", state: "Maharashtra", areaName: "Pune Metro Hub" },
  };

  const prefix = cleanPin.slice(0, 3);
  if (metroPrefixMap[prefix]) {
    const meta = metroPrefixMap[prefix];
    const zone: ServiceableZone = {
      pincode: cleanPin,
      city: meta.city,
      state: meta.state,
      areaName: meta.areaName,
      estimatedWindow: "Same-day scheduled slot",
      serviceable: true,
    };
    return {
      serviceable: true,
      zone,
      message: `Delivering from ${zone.areaName}, ${zone.city} (${zone.estimatedWindow}).`,
    };
  }

  return {
    serviceable: false,
    message: `PIN code ${cleanPin} is currently outside our fresh-delivery service zones (Available in Mumbai 400xxx, Bengaluru 560xxx, Delhi 110xxx, Chennai 600xxx, Hyderabad 500xxx, Pune 411xxx).`,
  };
}

/**
 * Create a new customer account with hashed password.
 */
export function registerCustomerAccount(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): { success: boolean; user?: UserAccount; error?: string } {
  const db = loadDatabase();
  const normalizedEmail = input.email.trim().toLowerCase();

  if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return {
      success: false,
      error: "An account with this email address already exists.",
    };
  }

  const newUser: StoredUser = {
    id: `usr-${crypto.randomBytes(6).toString("hex")}`,
    name: input.name.trim(),
    email: normalizedEmail,
    phone: input.phone.trim(),
    role: "CUSTOMER",
    verified: true,
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(input.password),
    addresses: [],
  };

  db.users.push(newUser);
  saveDatabase(db);

  const { passwordHash: _omitted, ...safeUser } = newUser;
  return { success: true, user: safeUser };
}

/**
 * Authenticate a user by email and password.
 */
export function authenticateUserAccount(
  email: string,
  password: string
): { success: boolean; user?: UserAccount; error?: string } {
  const db = loadDatabase();
  const normalizedEmail = (email || "").trim().toLowerCase();
  const stored = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!stored || !verifyPassword(password, stored.passwordHash)) {
    return {
      success: false,
      error: "Invalid email or password.",
    };
  }

  const { passwordHash: _omitted, ...safeUser } = stored;
  return { success: true, user: safeUser };
}

export function getUserAccountById(userId: string): UserAccount | null {
  const db = loadDatabase();
  const stored = db.users.find((u) => u.id === userId);
  if (!stored) return null;
  const { passwordHash: _omitted, ...safeUser } = stored;
  return safeUser;
}

/**
 * Atomic Order Creation & Inventory Reservation Transaction.
 * - Deduplicates repeated requests by idempotencyKey.
 * - Validates PIN code serviceability and delivery slot capacity.
 * - Recalculates pricing on the server using authoritative DB prices.
 * - Atomically decrements available stock and creates a stock reservation.
 * - Persists immutable OrderItem snapshots (price, originalPrice, SKU, name).
 */
export function createOrderTransaction(params: {
  userId?: string | null;
  customerEmail?: string;
  items: CartItem[];
  address: DeliveryAddress;
  deliverySlot: string;
  paymentMethod: PaymentMethod;
  couponCode?: string | null;
  deliveryInstructions?: string;
  idempotencyKey?: string;
  nowMs?: number;
}): {
  success: boolean;
  order?: Order;
  duplicate?: boolean;
  statusCode: number;
  error?: string;
  details?: string[];
} {
  cleanupExpiredReservations(params.nowMs);
  const db = loadDatabase();

  // 1. Check idempotency key to prevent duplicate orders from double clicks or retries
  if (params.idempotencyKey) {
    const existingOrder = db.orders.find((o) => o.idempotencyKey === params.idempotencyKey);
    if (existingOrder) {
      return {
        success: true,
        order: existingOrder,
        duplicate: true,
        statusCode: 200,
      };
    }
  }

  // 2. Validate PIN code serviceability
  const pinCheck = checkPincodeServiceability(params.address.pincode);
  if (!pinCheck.serviceable) {
    return {
      success: false,
      statusCode: 422,
      error: pinCheck.message,
    };
  }

  // 3. Validate delivery slot capacity
  const slotObj = db.deliverySlots.find(
    (s) => s.label === params.deliverySlot || s.id === params.deliverySlot
  );
  if (slotObj) {
    if (!slotObj.active || slotObj.bookedCount >= slotObj.capacity) {
      return {
        success: false,
        statusCode: 409,
        error: `Delivery slot "${slotObj.label}" has reached full capacity. Please select another slot.`,
      };
    }
  }

  // 4. Authoritative server-side pricing & inventory check
  const pricing = calculatePricingBreakdown(params.items, {
    productsCatalogue: db.products,
    couponsCatalogue: db.coupons,
    couponCode: params.couponCode,
    nowTimestamp: params.nowMs,
  });

  if (pricing.itemCount === 0 || pricing.lineItems.length === 0) {
    return {
      success: false,
      statusCode: 400,
      error: "Cannot place an order with an empty cart.",
    };
  }

  if (pricing.hasStockIssues) {
    return {
      success: false,
      statusCode: 409,
      error: "One or more items in your basket exceed available inventory.",
      details: pricing.stockWarnings,
    };
  }

  if (params.couponCode && pricing.couponError) {
    return {
      success: false,
      statusCode: 422,
      error: pricing.couponError,
    };
  }

  // 5. Atomically reserve/deduct stock for all items
  for (const line of pricing.lineItems) {
    const dbProduct = db.products.find((p) => p.id === line.productId);
    if (!dbProduct || dbProduct.stock < line.quantity) {
      return {
        success: false,
        statusCode: 409,
        error: `Insufficient stock for ${line.name}. Available: ${dbProduct?.stock ?? 0}.`,
      };
    }
  }

  const orderId = generateOrderId();
  const isCod = params.paymentMethod === "COD";

  for (const line of pricing.lineItems) {
    const dbProduct = db.products.find((p) => p.id === line.productId)!;
    dbProduct.stock -= line.quantity;
    if (isCod) {
      dbProduct.soldCount = (dbProduct.soldCount || 0) + line.quantity;
    } else {
      dbProduct.reservedStock = (dbProduct.reservedStock || 0) + line.quantity;
    }
  }

  // Update coupon usage count if applied
  if (pricing.couponCode) {
    const dbCoupon = db.coupons.find((c) => c.code === pricing.couponCode);
    if (dbCoupon) {
      dbCoupon.usedCount += 1;
    }
  }

  // Update delivery slot booking count
  if (slotObj) {
    slotObj.bookedCount += 1;
  }

  const now = params.nowMs ?? Date.now();
  const initialStatus: OrderStatus = isCod ? "CONFIRMED" : "PENDING_PAYMENT";

  // Create reservation record
  db.reservations.push({
    id: `res-${crypto.randomBytes(4).toString("hex")}`,
    orderId,
    items: pricing.lineItems.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    status: isCod ? "COMMITTED" : "ACTIVE",
    createdAt: now,
    expiresAt: now + RESERVATION_TTL_MS,
  });

  // Historical snapshot of order items
  const orderItems: OrderItem[] = pricing.lineItems.map((line) => ({
    productId: line.productId,
    sku: line.sku,
    name: line.name,
    brand: line.brand,
    price: line.unitPrice,
    originalPrice: line.unitMrp,
    quantity: line.quantity,
    lineTotal: line.lineSubtotal,
    unit: line.unit,
    image: line.image,
  }));

  const newOrder: Order = {
    id: orderId,
    userId: params.userId || null,
    customerEmail: params.customerEmail,
    createdAt: new Date(now).toISOString(),
    timestamp: now,
    items: orderItems,
    mrpTotal: pricing.mrpTotal,
    subtotal: pricing.itemSubtotal,
    productDiscount: pricing.productDiscount,
    couponCode: pricing.couponCode,
    couponDiscount: pricing.couponDiscount,
    discount: pricing.totalSavings,
    taxableAmount: pricing.taxableAmount,
    gstAmount: pricing.gstAmount,
    deliveryFee: pricing.deliveryFee,
    total: pricing.finalPayable,
    address: {
      ...params.address,
      instructions: params.deliveryInstructions || params.address.instructions,
    },
    deliverySlot: slotObj ? slotObj.label : params.deliverySlot,
    deliveryInstructions: params.deliveryInstructions,
    paymentMethod: params.paymentMethod,
    paymentStatus: isCod ? "PENDING" : "PENDING",
    status: initialStatus,
    estimatedDelivery: slotObj ? slotObj.label : params.deliverySlot,
    timeline: [
      createTimelineEvent(
        initialStatus,
        params.customerEmail || "Customer",
        isCod
          ? "Order confirmed with Cash on Delivery. Inventory allocated."
          : "Order created and inventory reserved for 15 minutes awaiting online payment."
      ),
    ],
    idempotencyKey: params.idempotencyKey,
  };

  db.orders.unshift(newOrder);
  saveDatabase(db);

  return {
    success: true,
    order: newOrder,
    duplicate: false,
    statusCode: 201,
  };
}

/**
 * Transition an order's state using the validated Order State Machine.
 * Automatically commits or releases inventory reservations when appropriate.
 */
export function transitionOrderStatus(
  paramsOrId:
    | {
        orderId: string;
        toStatus: OrderStatus;
        actorId?: string;
        actorEmail?: string;
        actorRole?: UserRole | "SYSTEM";
        note?: string;
        razorpayPaymentId?: string;
      }
    | string,
  posToStatus?: OrderStatus,
  posNote?: string,
  posActorRole?: UserRole | "SYSTEM"
): { success: boolean; order?: Order; statusCode: number; error?: string } {
  const params =
    typeof paramsOrId === "string"
      ? {
          orderId: paramsOrId,
          toStatus: posToStatus!,
          actorId: "actor-sys",
          actorEmail: "ops@grocerly.in",
          actorRole: posActorRole || ("SYSTEM" as const),
          note: posNote,
          razorpayPaymentId: undefined,
        }
      : {
          ...paramsOrId,
          actorId: paramsOrId.actorId || "actor-sys",
          actorEmail: paramsOrId.actorEmail || "ops@grocerly.in",
          actorRole: paramsOrId.actorRole || ("SYSTEM" as const),
        };

  const db = loadDatabase();
  const order = db.orders.find((o) => o.id === params.orderId);

  if (!order) {
    return {
      success: false,
      statusCode: 404,
      error: `Order "${params.orderId}" not found.`,
    };
  }

  const check = canTransitionOrderStatus(order.status, params.toStatus, params.actorRole);
  if (!check.allowed) {
    return {
      success: false,
      statusCode: 403,
      error: check.reason || "Order status transition not permitted.",
    };
  }

  const reservation = db.reservations.find((r) => r.orderId === order.id);

  // Handle inventory release on CANCELLED or PAYMENT_FAILED
  if (params.toStatus === "CANCELLED" || params.toStatus === "PAYMENT_FAILED") {
    if (reservation && reservation.status !== "RELEASED") {
      for (const item of order.items) {
        const product = db.products.find((p) => p.id === item.productId);
        if (product) {
          product.stock += item.quantity;
          if (reservation.status === "ACTIVE") {
            product.reservedStock = Math.max(0, (product.reservedStock || 0) - item.quantity);
          } else if (reservation.status === "COMMITTED") {
            product.soldCount = Math.max(0, (product.soldCount || 0) - item.quantity);
          }
        }
      }
      reservation.status = "RELEASED";
    }
    if (params.toStatus === "PAYMENT_FAILED") {
      order.paymentStatus = "FAILED";
    } else if (params.toStatus === "CANCELLED") {
      order.paymentStatus = order.paymentStatus === "CAPTURED" ? "REFUNDED" : "CANCELLED";
      order.cancellationReason = params.note || "Cancelled by request";
    }
  }

  // Handle inventory commit when PENDING_PAYMENT -> CONFIRMED
  if (order.status === "PENDING_PAYMENT" && params.toStatus === "CONFIRMED") {
    if (reservation && reservation.status === "ACTIVE") {
      for (const item of order.items) {
        const product = db.products.find((p) => p.id === item.productId);
        if (product) {
          product.reservedStock = Math.max(0, (product.reservedStock || 0) - item.quantity);
          product.soldCount = (product.soldCount || 0) + item.quantity;
        }
      }
      reservation.status = "COMMITTED";
    }
    order.paymentStatus = "CAPTURED";
    if (params.razorpayPaymentId) {
      order.razorpayPaymentId = params.razorpayPaymentId;
    }
  }

  if (params.toStatus === "DELIVERED" && order.paymentMethod === "COD") {
    order.paymentStatus = "CAPTURED";
  }

  if (params.toStatus === "REFUNDED") {
    order.paymentStatus = "REFUNDED";
  }

  order.status = params.toStatus;
  order.timeline.push(createTimelineEvent(params.toStatus, params.actorEmail, params.note));

  db.auditLogs.unshift({
    id: `aud-${crypto.randomBytes(4).toString("hex")}`,
    timestamp: new Date().toISOString(),
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    action: `ORDER_STATUS_${params.toStatus}`,
    targetType: "ORDER",
    targetId: order.id,
    details: params.note || `Transitioned order status to ${params.toStatus}`,
  });

  saveDatabase(db);
  return { success: true, order, statusCode: 200 };
}

/**
 * Admin operation: Update product price, MRP, or inventory stock with audit logging.
 */
export function adminUpdateProduct(params: {
  productId: string;
  price?: number;
  originalPrice?: number;
  stock?: number;
  actorId: string;
  actorEmail: string;
  actorRole: UserRole;
}): { success: boolean; product?: Product; error?: string } {
  const db = loadDatabase();
  const product = db.products.find((p) => p.id === params.productId);
  if (!product) {
    return { success: false, error: `Product "${params.productId}" not found.` };
  }

  const changes: string[] = [];

  if (params.price !== undefined) {
    if (!Number.isFinite(params.price) || params.price <= 0) {
      return { success: false, error: "Price must be a positive number." };
    }
    changes.push(`price ₹${product.price} -> ₹${params.price}`);
    product.price = Math.round(params.price);
  }

  if (params.originalPrice !== undefined) {
    if (!Number.isFinite(params.originalPrice) || params.originalPrice < product.price) {
      return { success: false, error: "Original MRP must be greater than or equal to selling price." };
    }
    changes.push(`MRP ₹${product.originalPrice} -> ₹${params.originalPrice}`);
    product.originalPrice = Math.round(params.originalPrice);
  }

  product.discount =
    product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice - product.price
      : 0;

  if (params.stock !== undefined) {
    if (!Number.isInteger(params.stock) || params.stock < 0) {
      return { success: false, error: "Stock must be a non-negative integer." };
    }
    changes.push(`stock ${product.stock} -> ${params.stock}`);
    product.stock = params.stock;
  }

  db.auditLogs.unshift({
    id: `aud-${crypto.randomBytes(4).toString("hex")}`,
    timestamp: new Date().toISOString(),
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    action: "UPDATE_PRODUCT_INVENTORY",
    targetType: "PRODUCT",
    targetId: product.id,
    details: `Updated ${product.name}: ${changes.join(", ")}`,
  });

  saveDatabase(db);
  return { success: true, product };
}

export function getAllProducts(): Product[] {
  const db = loadDatabase();
  return [...db.products];
}

export function getProductById(id: string): Product | null {
  const db = loadDatabase();
  return db.products.find((p) => p.id === id) || null;
}

export function getAllOrders(): Order[] {
  const db = loadDatabase();
  return [...db.orders];
}

export function getOrderById(id: string): Order | null {
  const db = loadDatabase();
  return db.orders.find((o) => o.id === id) || null;
}

export function getCoupons(): Coupon[] {
  const db = loadDatabase();
  return [...db.coupons];
}

export const validatePinCodeServiceability = checkPincodeServiceability;
export const updateProductStock = adminUpdateProduct;
