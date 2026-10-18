"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Star, Heart, ShoppingBag, ShieldCheck, Sparkles, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

export function QuickViewModal() {
  const { quickViewProduct, closeQuickView, addToCart, toggleWishlist, isInWishlist } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);

  useEffect(() => {
    setQuantity(1);
    setAddedAnimation(false);
  }, [quickViewProduct]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && quickViewProduct) {
        closeQuickView();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quickViewProduct, closeQuickView]);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const isWished = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product.id, quantity);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={closeQuickView}
        className="fixed inset-0 bg-ink/40 backdrop-blur-md transition-opacity animate-in fade-in"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-surface rounded-spatial-lg shadow-spatial-lg border border-border overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={closeQuickView}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-surface/80 hover:bg-surface border border-border flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
          aria-label="Close Quick View"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* Image Pane */}
          <div className="relative h-64 sm:h-full min-h-[280px] bg-surface-muted/40 p-6 flex items-center justify-center overflow-hidden border-b sm:border-b-0 sm:border-r border-border">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-contain p-4"
            />
            {product.discount && product.discount > 0 && (
              <div className="absolute top-4 left-4">
                <Badge variant="lime">Save {formatCurrency(product.discount)}</Badge>
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded-pill text-[11px] font-bold text-forest border border-border flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-lime-dark" />
              <span>{product.freshnessScore}% Freshness Index</span>
            </div>
          </div>

          {/* Details Pane */}
          <div className="p-6 sm:p-7 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-extrabold uppercase tracking-widest text-forest">
                  {product.brand}
                </span>
                <span className="text-xs text-ink-muted font-medium">
                  Pack: <strong>{product.unit}</strong>
                </span>
              </div>

              <h3 className="font-heading font-extrabold text-xl text-ink leading-tight mb-2">
                {product.name}
              </h3>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1 text-amber-500 text-xs font-bold bg-amber-50 px-2 py-0.5 rounded-spatial-sm border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{product.rating}</span>
                </div>
                <span className="text-xs text-ink-muted">({product.reviews} reviews)</span>
                {product.stock > 0 ? (
                  <span className="text-xs text-emerald-700 font-semibold ml-auto flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> In Stock
                  </span>
                ) : (
                  <span className="text-xs text-red-500 font-semibold ml-auto">Out of Stock</span>
                )}
              </div>

              <p className="text-xs text-ink-muted leading-relaxed line-clamp-3 mb-4">
                {product.description}
              </p>

              {/* Nutrition Mini Matrix */}
              {product.nutrition && (
                <div className="bg-surface-muted/50 p-2.5 rounded-spatial-sm border border-border mb-4 grid grid-cols-4 gap-1 text-center">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-ink-muted">Cal</span>
                    <span className="text-xs font-extrabold text-ink">{product.nutrition.calories}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-ink-muted">Prot</span>
                    <span className="text-xs font-extrabold text-ink">{product.nutrition.protein}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-ink-muted">Carb</span>
                    <span className="text-xs font-extrabold text-ink">{product.nutrition.carbs}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-ink-muted">Fat</span>
                    <span className="text-xs font-extrabold text-ink">{product.nutrition.fat}</span>
                  </div>
                </div>
              )}

              {/* Price Row */}
              <div className="flex items-baseline gap-2 pt-2 border-t border-border">
                <span className="text-2xl font-heading font-black text-forest">
                  {formatCurrency(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm text-ink-subtle line-through">
                    {formatCurrency(product.originalPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                {/* Quantity */}
                <div className="flex items-center bg-surface-muted border border-border rounded-spatial-sm px-2 py-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 flex items-center justify-center font-bold text-ink hover:text-forest"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-extrabold text-ink">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center font-bold text-ink hover:text-forest"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart */}
                <Button
                  onClick={handleAddToCart}
                  variant={addedAnimation ? "lime" : "primary"}
                  size="md"
                  className="flex-1"
                >
                  {addedAnimation ? (
                    <>
                      <Check className="w-4 h-4" /> Added to Basket
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" /> Add to Basket
                    </>
                  )}
                </Button>

                {/* Wishlist */}
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className={`w-11 h-11 rounded-spatial-sm border flex items-center justify-center transition-colors ${
                    isWished
                      ? "bg-red-50 border-red-200 text-red-500"
                      : "bg-surface border-border text-ink-muted hover:text-ink"
                  }`}
                  aria-label="Save for later"
                >
                  <Heart className={`w-5 h-5 ${isWished ? "fill-red-500 text-red-500" : ""}`} />
                </button>
              </div>

              <div className="text-center">
                <Link
                  href={`/product/${product.id}`}
                  onClick={closeQuickView}
                  className="text-xs font-bold text-forest hover:underline"
                >
                  View full product specifications & delivery times →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
