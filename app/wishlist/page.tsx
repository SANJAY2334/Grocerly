"use client";

import React from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { PRODUCTS } from "@/lib/products";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";
import { Heart, ShoppingBag, ArrowRight, Trash2 } from "lucide-react";

export default function WishlistPage() {
  const { wishlist, moveAllWishlistToCart, clearWishlist } = useStore();

  const savedProducts = PRODUCTS.filter((p) => wishlist.includes(p.id));

  if (savedProducts.length === 0) {
    return (
      <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-surface rounded-spatial-lg border border-border p-12 sm:p-16 text-center max-w-xl mx-auto shadow-spatial flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-6">
            <Heart className="w-10 h-10 fill-red-400 text-red-500" />
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-ink mb-2">
            Your wishlist is empty
          </h1>
          <p className="text-sm text-ink-muted leading-relaxed mb-8 max-w-sm">
            Save your favorite ingredients, snacks, and fruits to order whenever you&apos;re ready to cook.
          </p>
          <Link href="/shop">
            <Button variant="primary" size="lg">
              Browse Grocery Aisles
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading font-black text-3xl sm:text-4xl text-ink tracking-tight">
            Saved for Later
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            {savedProducts.length} items saved in your personal pantry list
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={clearWishlist}
            className="text-xs font-semibold text-ink-muted hover:text-red-500 flex items-center gap-1.5 px-3 py-2 rounded-spatial-sm hover:bg-surface-muted transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Clear All
          </button>
          <Button
            onClick={moveAllWishlistToCart}
            variant="lime"
            size="md"
            className="shadow-xs"
          >
            <ShoppingBag className="w-4 h-4" /> Move All to Basket
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {savedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
