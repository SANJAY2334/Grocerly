import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/middleware";
import { SyncCartSchema } from "@/lib/validators";
import { getCartForOwner, saveCartForOwner, validateAndCalculateCart } from "@/lib/services/cart";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser(req);
    const guestId = req.headers.get("x-guest-id") || "guest_default";
    const ownerId = user ? user.id : guestId;

    const cart = await getCartForOwner(ownerId);
    const validated = await validateAndCalculateCart(cart.items, cart.couponCode);

    return createSuccessResponse({
      items: validated.items,
      pricing: validated.pricing,
      couponCode: cart.couponCode,
    });
  } catch (err) {
    return createErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser(req);
    const guestId = req.headers.get("x-guest-id") || "guest_default";
    const ownerId = user ? user.id : guestId;

    const body = await req.json();
    const validatedBody = SyncCartSchema.parse(body);

    const calculation = await validateAndCalculateCart(validatedBody.items, validatedBody.couponCode);
    const validItems = calculation.items
      .filter((i) => !i.error)
      .map((i) => ({ productId: i.productId, quantity: i.quantity }));

    await saveCartForOwner(ownerId, validItems, validatedBody.couponCode, Boolean(user));

    return createSuccessResponse({
      items: calculation.items,
      pricing: calculation.pricing,
      hasErrors: calculation.hasErrors,
    });
  } catch (err) {
    return createErrorResponse(err);
  }
}
