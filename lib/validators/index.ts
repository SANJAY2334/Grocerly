import { z } from "zod";

export const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Full name must be at least 2 characters long."),
  email: z.string().trim().toLowerCase().email("Please provide a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(
      strongPasswordRegex,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number."
    ),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^[+]?[0-9\s-]{10,15}$/.test(val), {
      message: "Please enter a valid phone number.",
    }),
});

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const VerifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Verification OTP must be exactly 6 digits."),
});

export const ResendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  purpose: z
    .enum(["EMAIL_VERIFICATION", "PASSWORD_RESET", "SENSITIVE_CHANGE"])
    .default("EMAIL_VERIFICATION"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
});

export const ResetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Password reset token is required."),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(
      strongPasswordRegex,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number."
    ),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long.")
    .regex(
      strongPasswordRegex,
      "New password must contain at least one uppercase letter, one lowercase letter, and one number."
    ),
});

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^[+]?[0-9\s-]{10,15}$/.test(val), {
      message: "Please enter a valid phone number.",
    }),
});

export const AddressSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().trim().min(2, "Full name is required."),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9\s-]{10,15}$/, "Please enter a valid phone number."),
  street: z.string().trim().min(5, "Street address must be at least 5 characters."),
  city: z.string().trim().min(2, "City is required."),
  state: z.string().trim().min(2, "State is required."),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Pincode must be exactly 6 digits."),
  landmark: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
});

export const CartItemInputSchema = z.object({
  productId: z.string().min(1, "Product ID is required."),
  quantity: z.number().int("Quantity must be an integer.").positive("Quantity must be greater than zero."),
});

export const SyncCartSchema = z.object({
  items: z.array(CartItemInputSchema),
  couponCode: z.string().trim().optional(),
});

export const CheckoutPayloadSchema = z.object({
  items: z.array(CartItemInputSchema).min(1, "Cart must contain at least one item."),
  address: AddressSchema,
  deliverySlot: z.string().min(1, "Delivery slot selection is required."),
  paymentMethod: z.enum(["UPI", "CARD", "COD", "NETBANKING"]),
  couponCode: z.string().trim().optional(),
  idempotencyKey: z
    .string()
    .trim()
    .min(8, "Idempotency key must be at least 8 characters.")
    .max(128, "Idempotency key exceeds maximum length."),
});

export const OrderStatusTransitionSchema = z.object({
  status: z.enum([
    "PENDING_PAYMENT",
    "CONFIRMED",
    "PROCESSING",
    "PACKED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ]),
  note: z.string().trim().optional(),
});
