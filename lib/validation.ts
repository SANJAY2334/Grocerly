import { CartItem, DeliveryAddress, PaymentMethod } from "./types";

/**
 * Strip dangerous HTML/script tags and trim whitespace.
 */
export function sanitizeString(input: unknown, maxLength = 250): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>?/gm, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Recursively inspect an object for NoSQL operator injection ($gt, $where, etc.) or prototype pollution.
 */
export function hasMaliciousKeys(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  if (Array.isArray(obj)) {
    return obj.some((item) => hasMaliciousKeys(item));
  }
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (
      key.startsWith("$") ||
      key === "__proto__" ||
      key === "constructor" ||
      key === "prototype" ||
      key.includes(".")
    ) {
      return true;
    }
    if (hasMaliciousKeys((obj as Record<string, unknown>)[key])) {
      return true;
    }
  }
  return false;
}

export function validateDeliveryAddress(
  raw: unknown
): { valid: boolean; data?: DeliveryAddress; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || hasMaliciousKeys(raw)) {
    return { valid: false, errors: ["Invalid address payload."] };
  }

  const obj = raw as Record<string, unknown>;
  const fullName = sanitizeString(obj.fullName, 100);
  const phone = sanitizeString(obj.phone, 20);
  const street = sanitizeString(obj.street, 200);
  const city = sanitizeString(obj.city, 80);
  const state = sanitizeString(obj.state, 80);
  const pincode = sanitizeString(obj.pincode, 10);
  const instructions = obj.instructions ? sanitizeString(obj.instructions, 250) : undefined;

  if (fullName.length < 2) {
    errors.push("Recipient full name must be at least 2 characters.");
  }

  const cleanPhone = phone.replace(/[\s-]/g, "");
  if (!/^(?:\+91)?[6-9]\d{9}$/.test(cleanPhone)) {
    errors.push("Enter a valid 10-digit Indian mobile number.");
  }

  if (street.length < 5) {
    errors.push("Street address must be at least 5 characters.");
  }

  if (city.length < 2) {
    errors.push("City name is required.");
  }

  if (state.length < 2) {
    errors.push("State name is required.");
  }

  if (!/^[1-9][0-9]{5}$/.test(pincode)) {
    errors.push("Enter a valid 6-digit Indian PIN code.");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      fullName,
      phone,
      street,
      city,
      state,
      pincode,
      instructions,
    },
    errors: [],
  };
}

export function validateCartItemsPayload(
  rawItems: unknown
): { valid: boolean; items: CartItem[]; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { valid: false, items: [], errors: ["Cart cannot be empty."] };
  }

  if (rawItems.length > 100) {
    return { valid: false, items: [], errors: ["Cart exceeds maximum distinct item limit (100)."] };
  }

  const normalizedMap = new Map<string, number>();

  for (let i = 0; i < rawItems.length; i++) {
    const entry = rawItems[i];
    if (!entry || typeof entry !== "object" || hasMaliciousKeys(entry)) {
      errors.push(`Item at index ${i} is malformed.`);
      continue;
    }

    const rawId = (entry as Record<string, unknown>).productId;
    const rawQty = (entry as Record<string, unknown>).quantity;

    const productId = sanitizeString(rawId, 80);
    if (!productId || !/^[a-zA-Z0-9-_]+$/.test(productId)) {
      errors.push(`Invalid product identifier at index ${i}.`);
      continue;
    }

    if (typeof rawQty !== "number" || !Number.isInteger(rawQty) || rawQty <= 0 || rawQty > 999) {
      errors.push(`Quantity for "${productId}" must be a positive integer between 1 and 999.`);
      continue;
    }

    normalizedMap.set(productId, (normalizedMap.get(productId) || 0) + rawQty);
  }

  if (errors.length > 0) {
    return { valid: false, items: [], errors };
  }

  const items: CartItem[] = Array.from(normalizedMap.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));

  return { valid: true, items, errors: [] };
}

export interface ValidatedCheckoutPayload {
  items: CartItem[];
  address: DeliveryAddress;
  deliverySlot: string;
  paymentMethod: PaymentMethod;
  couponCode: string | null;
  deliveryInstructions?: string;
  idempotencyKey?: string;
}

export function validateCheckoutPayload(
  rawBody: unknown
): { valid: boolean; data?: ValidatedCheckoutPayload; errors: string[] } {
  if (!rawBody || typeof rawBody !== "object" || hasMaliciousKeys(rawBody)) {
    return { valid: false, errors: ["Invalid or potentially unsafe request payload."] };
  }

  const body = rawBody as Record<string, unknown>;
  const errors: string[] = [];

  const cartCheck = validateCartItemsPayload(body.items);
  if (!cartCheck.valid) {
    errors.push(...cartCheck.errors);
  }

  const addrCheck = validateDeliveryAddress(body.address);
  if (!addrCheck.valid) {
    errors.push(...addrCheck.errors);
  }

  const deliverySlot = sanitizeString(body.deliverySlot, 100);
  if (!deliverySlot) {
    errors.push("Delivery slot selection is required.");
  }

  const rawPaymentMethod = sanitizeString(body.paymentMethod, 20);
  const allowedMethods: PaymentMethod[] = ["UPI", "Card", "COD"];
  if (!allowedMethods.includes(rawPaymentMethod as PaymentMethod)) {
    errors.push("Payment method must be UPI, Card, or COD.");
  }

  const couponCode =
    typeof body.couponCode === "string" && body.couponCode.trim()
      ? sanitizeString(body.couponCode, 30).toUpperCase()
      : null;

  const deliveryInstructions =
    typeof body.deliveryInstructions === "string" && body.deliveryInstructions.trim()
      ? sanitizeString(body.deliveryInstructions, 250)
      : undefined;

  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
      ? sanitizeString(body.idempotencyKey, 80)
      : undefined;

  if (errors.length > 0 || !addrCheck.data) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      items: cartCheck.items,
      address: addrCheck.data,
      deliverySlot,
      paymentMethod: rawPaymentMethod as PaymentMethod,
      couponCode,
      deliveryInstructions,
      idempotencyKey,
    },
    errors: [],
  };
}

export function validateRegisterInput(raw: unknown): {
  valid: boolean;
  data?: { name: string; email: string; phone: string; password: string };
  errors: string[];
} {
  if (!raw || typeof raw !== "object" || hasMaliciousKeys(raw)) {
    return { valid: false, errors: ["Invalid registration payload."] };
  }

  const obj = raw as Record<string, unknown>;
  const name = sanitizeString(obj.name, 80);
  const email = sanitizeString(obj.email, 120).toLowerCase();
  const phone = sanitizeString(obj.phone, 20);
  const password = typeof obj.password === "string" ? obj.password : "";

  const errors: string[] = [];
  if (name.length < 2) errors.push("Full name must be at least 2 characters.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Enter a valid email address.");
  if (!/^(?:\+91[\s-]?)?[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ""))) {
    errors.push("Enter a valid 10-digit Indian phone number.");
  }
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, data: { name, email, phone, password }, errors: [] };
}
