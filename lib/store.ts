import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  CartItem,
  FilterState,
  Order,
  PricingBreakdown,
  Product,
  ToastNotification,
  UserAccount,
} from "./types";
import { PRODUCTS } from "./products";
import { calculatePricingBreakdown, validateCoupon } from "./pricing";
import { formatCurrency } from "./utils";

interface StoreState {
  // Authoritative Catalogue Cache
  catalogue: Product[];
  setCatalogue: (products: Product[]) => void;
  reconcileCartWithCatalogue: (products?: Product[]) => string[];

  // Authenticated User Session
  user: UserAccount | null;
  setUser: (user: UserAccount | null) => void;

  // Cart & Coupon State
  cart: CartItem[];
  appliedCouponCode: string | null;
  addToCart: (productId: string, quantity?: number, showToast?: boolean) => boolean;
  updateQuantity: (productId: string, quantity: number) => boolean;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  applyCouponCode: (code: string) => { valid: boolean; message: string };
  removeCouponCode: () => void;
  getPricingBreakdown: () => PricingBreakdown;
  getCartTotals: () => {
    mrpTotal: number;
    subtotal: number;
    productDiscount: number;
    couponCode: string | null;
    couponDiscount: number;
    discount: number;
    deliveryFee: number;
    gstAmount: number;
    total: number;
    itemCount: number;
    freeDeliveryThreshold: number;
    amountForFreeDelivery: number;
  };

  // Pantry Checklist (for Meal Planner)
  pantryItems: string[];
  togglePantryItem: (productId: string) => void;
  isInPantry: (productId: string) => boolean;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  moveToCart: (productId: string) => void;
  moveAllWishlistToCart: () => void;
  clearWishlist: () => void;

  // Orders (Persisted from real server transactions)
  orders: Order[];
  currentOrder: Order | null;
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  setCurrentOrder: (order: Order | null) => void;
  updateOrderInStore: (order: Order) => void;

  // UI State
  quickViewProduct: Product | null;
  openQuickView: (product: Product) => void;
  closeQuickView: () => void;
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  toggleCartDrawer: () => void;

  // Command Palette
  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  // Toast Notification System
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, "id">) => void;
  removeToast: (id: string) => void;

  // Filters
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
}

const initialFilters: FilterState = {
  search: "",
  category: "all",
  priceRange: 500,
  rating: "all",
  inStockOnly: false,
  organicOnly: false,
  onSaleOnly: false,
  sortBy: "popularity",
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      catalogue: PRODUCTS,
      setCatalogue: (products: Product[]) => {
        set({ catalogue: products });
      },
      reconcileCartWithCatalogue: (latestProducts?: Product[]) => {
        const catalogue = latestProducts || get().catalogue;
        if (latestProducts) {
          set({ catalogue: latestProducts });
        }
        const warnings: string[] = [];
        const currentCart = get().cart;
        const reconciled: CartItem[] = [];

        for (const item of currentCart) {
          const prod = catalogue.find((p) => p.id === item.productId);
          if (!prod) {
            warnings.push(`"${item.productId}" is no longer available.`);
            continue;
          }
          if (prod.stock <= 0) {
            warnings.push(`${prod.name} is currently out of stock.`);
            reconciled.push({ productId: item.productId, quantity: item.quantity });
            continue;
          }
          const validQty = Math.max(1, Math.floor(item.quantity));
          if (validQty > prod.stock) {
            warnings.push(
              `${prod.name} quantity adjusted to ${prod.stock} (maximum available stock).`
            );
            reconciled.push({ productId: item.productId, quantity: prod.stock });
          } else {
            reconciled.push({ productId: item.productId, quantity: validQty });
          }
        }

        set({ cart: reconciled });
        return warnings;
      },

      user: null,
      setUser: (user) => set({ user }),

      // --- Cart (Starts empty — no fictitious checkout items) ---
      cart: [],
      appliedCouponCode: null,

      addToCart: (productId: string, quantity = 1, showToast = true) => {
        const catalogue = get().catalogue;
        const product = catalogue.find((p) => p.id === productId);

        if (!product) {
          if (showToast) {
            get().addToast({
              type: "error",
              title: "Product Unavailable",
              message: "This item could not be found in the active catalogue.",
            });
          }
          return false;
        }

        if (product.stock <= 0) {
          if (showToast) {
            get().addToast({
              type: "error",
              title: "Out of Stock",
              message: `${product.name} is currently out of stock.`,
            });
          }
          return false;
        }

        const intQty = Math.floor(Number(quantity));
        if (!Number.isFinite(intQty) || intQty <= 0) {
          return false;
        }

        const existing = get().cart.find((item) => item.productId === productId);
        const currentQty = existing ? existing.quantity : 0;
        const requestedTotal = currentQty + intQty;

        if (requestedTotal > product.stock) {
          const allowedToAdd = Math.max(0, product.stock - currentQty);
          if (allowedToAdd === 0) {
            if (showToast) {
              get().addToast({
                type: "info",
                title: "Stock Limit Reached",
                message: `Only ${product.stock} unit(s) of ${product.name} available in stock.`,
              });
            }
            return false;
          }

          set((state) => ({
            cart: state.cart.map((item) =>
              item.productId === productId ? { ...item, quantity: product.stock } : item
            ),
          }));

          if (showToast) {
            get().addToast({
              type: "info",
              title: "Capped at Available Stock",
              message: `Added ${allowedToAdd}x ${product.name} (max ${product.stock} in stock).`,
            });
          }
          return true;
        }

        set((state) => {
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.productId === productId ? { ...item, quantity: requestedTotal } : item
              ),
            };
          }
          return {
            cart: [...state.cart, { productId, quantity: intQty }],
          };
        });

        if (showToast) {
          get().addToast({
            type: "cart",
            title: "Added to Basket",
            message: `${intQty}x ${product.name} (${formatCurrency(product.price * intQty)})`,
            action: {
              label: "View Basket",
              onClick: () => get().openCartDrawer(),
            },
          });
        }
        return true;
      },

      updateQuantity: (productId: string, quantity: number) => {
        const intQty = Math.floor(Number(quantity));
        if (!Number.isFinite(intQty) || intQty <= 0) {
          get().removeFromCart(productId);
          return true;
        }

        const product = get().catalogue.find((p) => p.id === productId);
        if (!product) {
          get().removeFromCart(productId);
          return false;
        }

        if (intQty > product.stock) {
          set((state) => ({
            cart: state.cart.map((item) =>
              item.productId === productId
                ? { ...item, quantity: Math.max(1, product.stock) }
                : item
            ),
          }));
          get().addToast({
            type: "info",
            title: "Stock Limit Reached",
            message: `Only ${product.stock} unit(s) of ${product.name} available in stock.`,
          });
          return false;
        }

        set((state) => ({
          cart: state.cart.map((item) =>
            item.productId === productId ? { ...item, quantity: intQty } : item
          ),
        }));
        return true;
      },

      removeFromCart: (productId: string) => {
        const product = get().catalogue.find((p) => p.id === productId);
        set((state) => ({
          cart: state.cart.filter((item) => item.productId !== productId),
        }));
        if (product) {
          get().addToast({
            type: "info",
            title: "Removed from Basket",
            message: `${product.name} was removed.`,
          });
        }
      },

      clearCart: () => {
        set({ cart: [], appliedCouponCode: null });
      },

      applyCouponCode: (code: string) => {
        const clean = (code || "").trim().toUpperCase();
        const currentBreakdown = calculatePricingBreakdown(get().cart, {
          productsCatalogue: get().catalogue,
          couponCode: clean,
        });

        if (currentBreakdown.couponError) {
          set({ appliedCouponCode: null });
          return { valid: false, message: currentBreakdown.couponError };
        }

        set({ appliedCouponCode: currentBreakdown.couponCode });
        return {
          valid: true,
          message: `Coupon ${currentBreakdown.couponCode} applied! You saved ${formatCurrency(
            currentBreakdown.couponDiscount
          )}.`,
        };
      },

      removeCouponCode: () => {
        set({ appliedCouponCode: null });
      },

      getPricingBreakdown: () => {
        const { cart, catalogue, appliedCouponCode } = get();
        return calculatePricingBreakdown(cart, {
          productsCatalogue: catalogue,
          couponCode: appliedCouponCode,
        });
      },

      getCartTotals: () => {
        const b = get().getPricingBreakdown();
        return {
          mrpTotal: b.mrpTotal,
          subtotal: b.itemSubtotal,
          productDiscount: b.productDiscount,
          couponCode: b.couponCode,
          couponDiscount: b.couponDiscount,
          discount: b.totalSavings,
          deliveryFee: b.deliveryFee,
          gstAmount: b.gstAmount,
          total: b.finalPayable,
          itemCount: b.itemCount,
          freeDeliveryThreshold: b.freeDeliveryThreshold,
          amountForFreeDelivery: b.amountForFreeDelivery,
        };
      },

      // --- Pantry Checklist ---
      pantryItems: [],
      togglePantryItem: (productId: string) => {
        set((state) => {
          const exists = state.pantryItems.includes(productId);
          return {
            pantryItems: exists
              ? state.pantryItems.filter((id) => id !== productId)
              : [...state.pantryItems, productId],
          };
        });
      },
      isInPantry: (productId: string) => {
        return get().pantryItems.includes(productId);
      },

      // --- Wishlist ---
      wishlist: [],
      toggleWishlist: (productId: string) => {
        const product = get().catalogue.find((p) => p.id === productId);
        set((state) => {
          const exists = state.wishlist.includes(productId);
          if (exists) {
            if (product) {
              get().addToast({
                type: "wishlist",
                title: "Removed from Wishlist",
                message: `${product.name} removed from saved list.`,
              });
            }
            return { wishlist: state.wishlist.filter((id) => id !== productId) };
          }
          if (product) {
            get().addToast({
              type: "wishlist",
              title: "Added to Wishlist",
              message: `${product.name} saved to your wishlist.`,
            });
          }
          return { wishlist: [...state.wishlist, productId] };
        });
      },
      isInWishlist: (productId: string) => {
        return get().wishlist.includes(productId);
      },
      moveToCart: (productId: string) => {
        const added = get().addToCart(productId, 1);
        if (added) {
          set((state) => ({
            wishlist: state.wishlist.filter((id) => id !== productId),
          }));
        }
      },
      moveAllWishlistToCart: () => {
        const { wishlist } = get();
        let movedCount = 0;
        wishlist.forEach((id) => {
          if (get().addToCart(id, 1, false)) {
            movedCount++;
          }
        });
        set({ wishlist: [] });
        if (movedCount > 0) {
          get().addToast({
            type: "cart",
            title: "Wishlist Moved to Basket",
            message: `${movedCount} item(s) moved to your shopping basket.`,
            action: {
              label: "Open Cart",
              onClick: () => get().openCartDrawer(),
            },
          });
        }
      },
      clearWishlist: () => {
        set({ wishlist: [] });
      },

      // --- Orders (No fabricated default orders) ---
      orders: [],
      currentOrder: null,
      setOrders: (orders: Order[]) => set({ orders }),
      addOrder: (order: Order) => {
        set((state) => ({
          orders: [order, ...state.orders.filter((o) => o.id !== order.id)],
          currentOrder: order,
          cart: [],
          appliedCouponCode: null,
        }));
      },
      setCurrentOrder: (order: Order | null) => {
        set({ currentOrder: order });
      },
      updateOrderInStore: (order: Order) => {
        set((state) => ({
          orders: state.orders.map((o) => (o.id === order.id ? order : o)),
          currentOrder: state.currentOrder?.id === order.id ? order : state.currentOrder,
        }));
      },

      // --- UI State ---
      quickViewProduct: null,
      openQuickView: (product: Product) => set({ quickViewProduct: product }),
      closeQuickView: () => set({ quickViewProduct: null }),
      isCartDrawerOpen: false,
      openCartDrawer: () => set({ isCartDrawerOpen: true }),
      closeCartDrawer: () => set({ isCartDrawerOpen: false }),
      toggleCartDrawer: () =>
        set((state) => ({ isCartDrawerOpen: !state.isCartDrawerOpen })),

      // --- Command Palette ---
      isCommandPaletteOpen: false,
      openCommandPalette: () => set({ isCommandPaletteOpen: true }),
      closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
      toggleCommandPalette: () =>
        set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

      // --- Toasts ---
      toasts: [],
      addToast: (toast) => {
        const id = "toast-" + Math.random().toString(36).substring(2, 9);
        const newToast: ToastNotification = {
          ...toast,
          id,
          duration: toast.duration || 3500,
        };
        set((state) => ({
          toasts: [...state.toasts.slice(-4), newToast],
        }));

        setTimeout(() => {
          get().removeToast(id);
        }, newToast.duration);
      },
      removeToast: (id: string) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      // --- Filters ---
      filters: initialFilters,
      setFilter: (key, value) => {
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        }));
      },
      resetFilters: () => {
        set({ filters: initialFilters });
      },
    }),
    {
      name: "grocerly-production-store-v3",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cart: state.cart,
        appliedCouponCode: state.appliedCouponCode,
        pantryItems: state.pantryItems,
        wishlist: state.wishlist,
        orders: state.orders,
        currentOrder: state.currentOrder,
      }),
    }
  )
);
