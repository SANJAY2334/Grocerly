"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { Trash2, ShoppingBag, AlertTriangle, X } from "lucide-react";

export default function CartPage() {
  const {
    cart,
    appliedCouponCode,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyCouponCode,
    removeCouponCode,
    getPricingBreakdown,
    reconcileCartWithCatalogue,
    addToast,
  } = useStore();

  const [couponInput, setCouponInput] = useState(appliedCouponCode || "");
  const [couponFeedback, setCouponFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Sync latest authoritative product stock & prices from server
  useEffect(() => {
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.products) {
          const warnings = reconcileCartWithCatalogue(data.products);
          if (warnings.length > 0) {
            addToast({
              type: "info",
              title: "Basket Reconciled",
              message: warnings[0],
            });
          }
        }
      })
      .catch(() => {
        // Fallback to cached catalogue if offline
      });
  }, [reconcileCartWithCatalogue, addToast]);

  const pricing = getPricingBreakdown();
  const progressPercent = Math.min(
    100,
    Math.round((pricing.itemSubtotal / pricing.freeDeliveryThreshold) * 100)
  );

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) {
      setCouponFeedback({ type: "error", text: "Please enter a coupon code." });
      return;
    }

    const res = applyCouponCode(couponInput);
    if (res.valid) {
      setCouponFeedback({ type: "success", text: res.message });
      addToast({
        type: "coupon",
        title: "Coupon Applied!",
        message: res.message,
      });
    } else {
      setCouponFeedback({ type: "error", text: res.message });
      addToast({
        type: "info",
        title: "Coupon Not Eligible",
        message: res.message,
      });
    }
  };

  const handleRemoveCoupon = () => {
    removeCouponCode();
    setCouponInput("");
    setCouponFeedback(null);
  };

  if (cart.length === 0) {
    return (
      <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-12 max-w-md mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-full bg-[#F8F7F2] text-[#163C29] flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="font-heading font-black text-2xl text-ink mb-1">
            Your Cart is Empty
          </h1>
          <p className="text-xs text-ink-muted mb-6">
            Explore our fresh produce and chef recipes to fill your basket.
          </p>
          <Link
            href="/shop"
            className="inline-block px-6 py-2.5 rounded-full bg-[#163C29] hover:bg-[#1f5238] text-white text-xs font-bold transition-all"
          >
            Explore Groceries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 sm:pt-28 pb-20 max-w-xl mx-auto px-4 sm:px-6">
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-8 shadow-xs space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(22,60,41,0.08)]">
          <div>
            <h1 className="font-heading font-black text-2xl text-ink tracking-tight">
              Your Cart
            </h1>
            <span className="text-[11px] text-ink-muted">
              {pricing.itemCount} item(s) verified against live inventory
            </span>
          </div>
          <button
            onClick={clearCart}
            className="text-[11px] font-semibold text-ink-muted hover:text-red-500 transition-colors"
          >
            Clear all
          </button>
        </div>

        {/* Stock Warnings Banner */}
        {pricing.hasStockIssues && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Inventory Adjustment Needed</span>
            </div>
            {pricing.stockWarnings.map((w, idx) => (
              <p key={idx} className="text-[11px] pl-5">
                {w}
              </p>
            ))}
          </div>
        )}

        {/* Item Rows */}
        <div className="divide-y divide-[rgba(22,60,41,0.06)]">
          {pricing.lineItems.map((line) => (
            <div
              key={line.productId}
              className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
            >
              {/* Item Image + Details */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-14 h-14 rounded-xl bg-[#F8F7F2] p-1 overflow-hidden shrink-0 border border-[rgba(22,60,41,0.04)]">
                  <Image
                    src={line.image}
                    alt={line.name}
                    fill
                    className="object-contain p-1"
                  />
                </div>

                <div className="min-w-0">
                  <Link href={`/product/${line.productId}`} className="hover:text-forest">
                    <h4 className="font-heading font-bold text-sm text-ink truncate">
                      {line.name}
                    </h4>
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] font-bold text-ink">
                      {formatCurrency(line.unitPrice)} / {line.unit}
                    </span>
                    {line.unitMrp > line.unitPrice && (
                      <span className="text-[10px] text-ink-subtle line-through">
                        {formatCurrency(line.unitMrp)}
                      </span>
                    )}
                  </div>
                  {line.stockError && (
                    <span className="text-[10px] font-bold text-red-600 block mt-0.5">
                      {line.stockError}
                    </span>
                  )}
                </div>
              </div>

              {/* Stepper + Item Price + Trash Icon */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center bg-[#F8F7F2] rounded-full px-2.5 py-1 border border-[rgba(22,60,41,0.08)]">
                  <button
                    onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                    className="w-5 h-5 flex items-center justify-center font-bold text-ink hover:text-forest text-sm"
                    aria-label={`Decrease quantity of ${line.name}`}
                  >
                    -
                  </button>
                  <span className="w-6 text-center text-xs font-black text-ink">
                    {line.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                    disabled={line.quantity >= line.availableStock}
                    className="w-5 h-5 flex items-center justify-center font-bold text-ink hover:text-forest disabled:opacity-40 text-sm"
                    aria-label={`Increase quantity of ${line.name}`}
                  >
                    +
                  </button>
                </div>

                <span className="font-heading font-black text-sm text-ink w-14 text-right">
                  {formatCurrency(line.lineSubtotal)}
                </span>

                <button
                  onClick={() => removeFromCart(line.productId)}
                  className="text-ink-muted hover:text-red-500 transition-colors p-1"
                  aria-label={`Remove ${line.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Apply Coupon Block */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="cart-coupon-input" className="block text-xs font-bold text-ink">
              Apply Promotional Coupon
            </label>
            <span className="text-[10px] text-ink-muted">
              Available: <button type="button" onClick={() => setCouponInput("FRESH50")} className="font-bold text-forest hover:underline">FRESH50</button> (≥₹200) &bull;{" "}
              <button type="button" onClick={() => setCouponInput("ORGANIC10")} className="font-bold text-forest hover:underline">ORGANIC10</button> (≥₹250)
            </span>
          </div>
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <input
              id="cart-coupon-input"
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="Enter coupon code (e.g. FRESH50)"
              className="flex-1 bg-[#F8F7F2] px-3.5 py-2 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold uppercase text-ink focus:outline-none focus:ring-1 focus:ring-forest"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#163C29] hover:bg-[#1f5238] text-white text-xs font-bold transition-all shadow-xs"
            >
              Apply
            </button>
          </form>

          {pricing.couponCode && (
            <div className="mt-2 flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-[11px] text-emerald-800 font-bold">
              <span>
                &check; Coupon {pricing.couponCode} applied (-{formatCurrency(pricing.couponDiscount)})
              </span>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-emerald-700 hover:text-red-600 p-0.5"
                aria-label="Remove coupon"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!pricing.couponCode && (couponFeedback?.type === "error" || pricing.couponError) && (
            <p className="text-[11px] text-red-600 font-semibold mt-1.5">
              {couponFeedback?.text || pricing.couponError}
            </p>
          )}
        </div>

        {/* Authoritative Totals Breakdown */}
        <div className="pt-4 border-t border-[rgba(22,60,41,0.08)] space-y-2 text-xs">
          {pricing.productDiscount > 0 && (
            <div className="flex justify-between text-ink-muted">
              <span>MRP Total</span>
              <span className="line-through">{formatCurrency(pricing.mrpTotal)}</span>
            </div>
          )}

          <div className="flex justify-between text-ink-muted">
            <span>Item Subtotal</span>
            <span className="font-bold text-ink">{formatCurrency(pricing.itemSubtotal)}</span>
          </div>

          {pricing.productDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Product Savings (MRP Discount)</span>
              <span>- {formatCurrency(pricing.productDiscount)}</span>
            </div>
          )}

          {pricing.couponDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Coupon Discount ({pricing.couponCode})</span>
              <span>- {formatCurrency(pricing.couponDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between text-ink-muted">
            <span>Delivery Fee</span>
            {pricing.deliveryFee === 0 ? (
              <span className="text-emerald-700 font-bold">Free</span>
            ) : (
              <span className="font-bold text-ink">{formatCurrency(pricing.deliveryFee)}</span>
            )}
          </div>

          <div className="flex justify-between text-[11px] text-ink-muted">
            <span>Included GST (5%: CGST 2.5% + SGST 2.5%)</span>
            <span>{formatCurrency(pricing.gstAmount)}</span>
          </div>

          <div className="pt-3 border-t border-[rgba(22,60,41,0.08)] flex justify-between text-base font-extrabold text-ink">
            <span>Total Payable</span>
            <span className="font-heading font-black text-xl text-forest">
              {formatCurrency(pricing.finalPayable)}
            </span>
          </div>
        </div>

        {/* Free Delivery Progress */}
        <div className="pt-1">
          <p className="text-[11px] text-ink-muted font-semibold mb-1.5">
            {pricing.amountForFreeDelivery > 0
              ? `Add ${formatCurrency(pricing.amountForFreeDelivery)} more for FREE delivery (Orders ≥ ₹${pricing.freeDeliveryThreshold})!`
              : "You have unlocked FREE eco-delivery on this order!"}
          </p>
          <div className="w-full bg-[#F8F7F2] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#163C29] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Proceed to Checkout CTA Button */}
        {pricing.hasStockIssues ? (
          <button
            disabled
            className="block w-full py-3.5 px-6 rounded-2xl bg-gray-300 text-gray-600 text-center font-bold text-xs cursor-not-allowed"
          >
            Resolve Stock Issues to Proceed
          </button>
        ) : (
          <Link
            href="/checkout"
            className="block w-full py-3.5 px-6 rounded-2xl bg-[#163C29] hover:bg-[#1f5238] text-white text-center font-bold text-xs shadow-xs transition-all active:scale-[0.99]"
          >
            Proceed to Checkout ({formatCurrency(pricing.finalPayable)}) &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}
