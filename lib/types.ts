export type Category = "Vegetables" | "Fruits" | "Dairy" | "Staples" | "Snacks" | "Beverages";

export interface Nutrition {
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  fiber?: string;
}

export interface Product {
  id: string;
  sku?: string;
  name: string;
  slug: string;
  brand: string;
  category: Category;
  price: number; // Authoritative selling price in INR
  originalPrice?: number; // MRP in INR
  discount?: number; // Product discount in INR (originalPrice - price)
  rating: number;
  reviews: number;
  unit: string;
  packSize: number; // Numeric quantity per pack (e.g. 1000 for 1kg, 500 for 500g, 1 for 1 bunch)
  packUnit?: "g" | "ml" | "pc" | "bunch";
  image: string;
  description: string;
  stock: number; // Available unreserved stock
  reservedStock?: number;
  soldCount?: number;
  lowStockThreshold?: number;
  tags: string[];
  freshnessScore: number;
  origin?: string;
  organic?: boolean;
  allergens?: string[];
  dietaryTags?: Array<"Vegetarian" | "Vegan" | "Gluten-Free" | "Dairy-Free" | "Nut-Free">;
  nutrition: Nutrition;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  productId: string;
  substituteProductIds?: string[];
}

export interface Recipe {
  id: string;
  name: string;
  slug: string;
  prepTime: string;
  difficulty: "Easy" | "Medium" | "Hard";
  servings: number;
  diet: "Vegetarian" | "Non-Vegetarian" | "Vegan";
  allergens?: string[];
  image: string;
  description: string;
  caloriesPerServing: number;
  ingredients: RecipeIngredient[];
  steps: string[];
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface WishlistItem {
  productId: string;
  addedAt: number;
}

export interface DeliveryAddress {
  id?: string;
  label?: "Home" | "Work" | "Other";
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  instructions?: string;
}

export type DeliverySlot =
  | "Morning: 07:00 AM – 09:00 AM"
  | "Slot 1: 10:00 AM – 12:00 PM"
  | "Slot 2: 12:00 PM – 02:00 PM"
  | "Evening: 04:00 PM – 06:00 PM"
  | "Night: 07:00 PM – 09:00 PM";

export interface DeliverySlotConfig {
  id: string;
  label: DeliverySlot;
  capacity: number;
  bookedCount: number;
  active: boolean;
}

export interface ServiceableZone {
  pincode: string;
  city: string;
  state: string;
  areaName: string;
  estimatedWindow: string;
  serviceable: boolean;
}

export type PaymentMethod = "UPI" | "Card" | "CARD" | "COD" | "NETBANKING";

export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PROCESSING"
  | "PACKED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "PAYMENT_FAILED"
  | "REFUNDED";

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note: string;
  actor?: string;
  actorRole?: string;
}

export type TimelineEvent = OrderTimelineEvent;

export interface OrderItem {
  productId: string;
  sku?: string;
  name: string;
  brand: string;
  price?: number; // Snapshot unit selling price at order time (INR)
  unitPrice?: number; // Alias for price
  originalPrice?: number; // Snapshot unit MRP at order time (INR)
  quantity: number;
  lineTotal: number;
  unit: string;
  image: string;
  gstRate?: number;
}

export interface Order {
  id: string;
  userId?: string | null;
  customerEmail?: string;
  createdAt: string;
  timestamp: number;
  items: OrderItem[];
  mrpTotal: number;
  subtotal: number;
  productDiscount: number;
  couponCode?: string | null;
  couponDiscount: number;
  discount: number; // Total discount (productDiscount + couponDiscount)
  taxableAmount: number;
  gstAmount: number;
  deliveryFee: number;
  total: number;
  address: DeliveryAddress;
  deliverySlot: DeliverySlot | string;
  deliveryInstructions?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: OrderStatus;
  estimatedDelivery: string;
  timeline: OrderTimelineEvent[];
  idempotencyKey?: string;
  cancellationReason?: string;
  pricing?: any;
  statusHistory?: any[];
  paymentReference?: string;
  archivedFromAdmin?: boolean;
  deletedFromAdminAt?: string | Date;
}

export interface Coupon {
  code: string;
  description: string;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number; // INR if FLAT, percentage (1-100) if PERCENTAGE
  minOrderSubtotal: number; // Minimum itemSubtotal in INR
  maxDiscountAmount?: number; // Cap in INR for percentage coupons
  requiresOrganic?: boolean;
  expiresAt: string; // ISO timestamp
  usageLimit: number;
  usedCount: number;
  active: boolean;
}

export interface PricingLineItem {
  productId: string;
  sku: string;
  name: string;
  brand: string;
  unit: string;
  image: string;
  quantity: number;
  availableStock: number;
  unitMrp: number;
  unitPrice: number;
  lineMrpTotal: number;
  lineSubtotal: number;
  lineProductDiscount: number;
  inStock: boolean;
  stockError?: string;
}

export interface PricingBreakdown {
  currency: "INR";
  itemCount: number;
  mrpTotal: number;
  itemSubtotal: number;
  subtotal: number; // Convenient alias for itemSubtotal
  productDiscount: number;
  couponCode: string | null;
  couponDiscount: number;
  couponError: string | null;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  amountForFreeDelivery: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  gstAmount: number;
  finalPayable: number;
  totalSavings: number;
  lineItems: PricingLineItem[];
  hasStockIssues: boolean;
  stockWarnings: string[];
}

export type UserRole = "CUSTOMER" | "ADMIN" | "OPS";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  verified: boolean;
  createdAt: string;
  addresses: DeliveryAddress[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  actorRole: UserRole | "SYSTEM";
  action: string;
  targetType: "PRODUCT" | "INVENTORY" | "ORDER" | "COUPON" | "AUTH" | "PAYMENT";
  targetId: string;
  details: string;
}

export interface FilterState {
  search: string;
  category: "all" | Category;
  priceRange: number;
  rating: number | "all";
  inStockOnly: boolean;
  organicOnly?: boolean;
  onSaleOnly?: boolean;
  sortBy: "popularity" | "price-asc" | "price-desc" | "rating" | "freshness";
}

export interface ToastNotification {
  id: string;
  type: "success" | "cart" | "wishlist" | "info" | "coupon" | "error";
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}
