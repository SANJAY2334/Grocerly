"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Plus, Minus, Trash2, ArrowRight, ShoppingBag, Truck } from "lucide-react";
import { useStore } from "@/lib/store";
import { PRODUCTS } from "@/lib/products";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

export function CartDrawer() {
  const {
    isCartDrawerOpen,
    closeCartDrawer,
    cart,
    catalogue,
    updateQuantity,
    removeFromCart,
    getPricingBreakdown,
  } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCartDrawerOpen) {
        closeCartDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCartDrawerOpen, closeCartDrawer]);

  // Lock body scroll when open
  useEffect(() => {
    if (isCartDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isCartDrawerOpen]);

  if (!isCartDrawerOpen) return null;

  const pricing = getPricingBreakdown();
  const {
    itemSubtotal: subtotal,
    productDiscount,
    couponCode,
    couponDiscount,
    deliveryFee,
    finalPayable: total,
    itemCount,
    freeDeliveryThreshold,
    amountForFreeDelivery: remainingForFreeDelivery,
  } = pricing;
  const progressPercent = Math.min((subtotal / freeDeliveryThreshold) * 100, 100);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeCartDrawer}
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm transition-opacity animate-in fade-in"
      />

      {/* Slide-out Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface shadow-spatial-lg border-l border-border flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-forest" />
              <h3 className="font-heading font-extrabold text-lg text-ink">
                YOUR BASKET ({itemCount})
              </h3>
            </div>
            <button
              onClick={closeCartDrawer}
              className="w-9 h-9 rounded-full hover:bg-surface-muted flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Delivery Progress Banner */}
          <div className="bg-surface-muted/60 p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-forest">
              <Truck className="w-4 h-4" />
              {subtotal >= freeDeliveryThreshold ? (
                <span className="text-emerald-700 font-bold">You have unlocked FREE Delivery!</span>
              ) : (
                <span>
                  Add <strong>{formatCurrency(remainingForFreeDelivery)}</strong> more for FREE delivery
                </span>
              )}
            </div>
            <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-forest h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-muted">
                <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center text-forest mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="font-heading font-bold text-base text-ink mb-1">Your cart is empty</h4>
                <p className="text-xs text-ink-muted max-w-xs mb-6">
                  Browse our market for farm-fresh vegetables, seasonal fruits, and kitchen staples.
                </p>
                <Button onClick={closeCartDrawer} variant="primary" size="md">
                  Explore Marketplace
                </Button>
              </div>
            ) : (
              cart.map((item) => {
                const product = catalogue.find((p) => p.id === item.productId);
                if (!product) return null;

                return (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3.5 p-3 rounded-spatial-sm bg-surface-elevated border border-border/70 group"
                  >
                    {/* Product Thumbnail */}
                    <div className="relative w-16 h-16 rounded-spatial-sm overflow-hidden bg-surface shrink-0 border border-border/40">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                        {product.brand}
                      </span>
                      <h4 className="font-heading font-bold text-xs sm:text-sm text-ink truncate">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-extrabold text-forest">
                          {formatCurrency(product.price * item.quantity)}
                        </span>
                        <span className="text-[11px] text-ink-muted">
                          ({formatCurrency(product.price)} / {product.unit})
                        </span>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center bg-surface border border-border rounded-pill px-1.5 py-0.5 shadow-2xs">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-5 h-5 flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-ink">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= product.stock}
                          className="w-5 h-5 flex items-center justify-center text-ink-muted hover:text-ink disabled:opacity-40 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Totals & Checkout Button */}
          {cart.length > 0 && (
            <div className="p-5 sm:p-6 border-t border-border bg-surface-elevated/80 flex flex-col gap-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-ink-muted">
                  <span>Item Subtotal</span>
                  <span className="font-semibold text-ink">{formatCurrency(subtotal)}</span>
                </div>
                {productDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>MRP Savings</span>
                    <span className="font-semibold">-{formatCurrency(productDiscount)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Coupon ({couponCode})</span>
                    <span>-{formatCurrency(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-ink-muted">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-ink">
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-700 uppercase font-bold">FREE</span>
                    ) : (
                      formatCurrency(deliveryFee)
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-border/80 flex justify-between text-sm font-extrabold text-ink">
                  <span>Total Payable</span>
                  <span className="text-base text-forest">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <Link href="/cart" onClick={closeCartDrawer} className="w-full">
                  <Button variant="secondary" size="md" className="w-full">
                    View Cart
                  </Button>
                </Link>
                <Link href="/checkout" onClick={closeCartDrawer} className="w-full">
                  <Button variant="lime" size="md" className="w-full">
                    Checkout <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
