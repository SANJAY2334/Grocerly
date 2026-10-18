import { CartModel } from "@/lib/models/Cart";
import { CartItem } from "@/lib/types";
import { getProductDetail } from "./catalog";
import { calculatePricingBreakdown } from "@/lib/pricing";
import { connectToDatabase } from "@/lib/db/connection";

export async function getCartForOwner(ownerId: string): Promise<{ items: CartItem[]; couponCode?: string }> {
  await connectToDatabase();

  const cart = await CartModel.findOne({
    $or: [{ userId: ownerId }, { guestSessionId: ownerId }],
  }).lean();

  if (cart) {
    return { items: cart.items || [], couponCode: cart.appliedCoupon };
  }

  return { items: [] };
}

export async function saveCartForOwner(
  ownerId: string,
  items: CartItem[],
  couponCode?: string,
  isUser = true
): Promise<void> {
  await connectToDatabase();

  const filter = isUser ? { userId: ownerId } : { guestSessionId: ownerId };
  const update = {
    ...(isUser ? { userId: ownerId } : { guestSessionId: ownerId }),
    items,
    appliedCoupon: couponCode,
  };

  await CartModel.findOneAndUpdate(filter, update, { upsert: true, new: true });
}

export async function clearCartForOwner(ownerId: string): Promise<void> {
  await connectToDatabase();
  await CartModel.deleteOne({
    $or: [{ userId: ownerId }, { guestSessionId: ownerId }],
  });
}

export async function validateAndCalculateCart(items: CartItem[], couponCode?: string) {
  const validatedItems: Array<{
    productId: string;
    product: Awaited<ReturnType<typeof getProductDetail>>;
    quantity: number;
    error?: string;
  }> = [];

  for (const item of items) {
    const product = await getProductDetail(item.productId);
    if (!product) {
      validatedItems.push({
        productId: item.productId,
        product: null,
        quantity: item.quantity,
        error: "Product no longer available in store.",
      });
      continue;
    }

    if (item.quantity <= 0) {
      validatedItems.push({
        productId: item.productId,
        product,
        quantity: item.quantity,
        error: "Quantity must be at least 1.",
      });
      continue;
    }

    if (product.stock < item.quantity) {
      validatedItems.push({
        productId: item.productId,
        product,
        quantity: item.quantity,
        error: `Only ${product.stock} pack(s) available in stock.`,
      });
      continue;
    }

    validatedItems.push({
      productId: item.productId,
      product,
      quantity: item.quantity,
    });
  }

  const validCartItems = validatedItems
    .filter((v) => !v.error && v.product)
    .map((v) => ({ productId: v.productId, quantity: v.quantity }));

  const breakdown = calculatePricingBreakdown(validCartItems, { couponCode });

  return {
    items: validatedItems,
    pricing: breakdown,
    hasErrors: validatedItems.some((v) => Boolean(v.error)),
  };
}
