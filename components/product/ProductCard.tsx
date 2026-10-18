"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Heart, Plus, Check } from "lucide-react";
import { Product } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist } = useStore();
  const [isAdded, setIsAdded] = useState(false);
  const isWished = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) return;

    addToCart(product.id, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl border border-[rgba(22,60,41,0.08)] p-3 hover:shadow-md transition-all duration-200 select-none">
      {/* Top Image Container */}
      <div className="relative aspect-square w-full rounded-xl bg-[#F8F7F2]/60 overflow-hidden flex items-center justify-center p-3 mb-2.5">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
        />

        {/* Wishlist Heart Action (Top Right) */}
        <button
          onClick={handleWishlist}
          className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm border border-black/5 flex items-center justify-center text-ink-muted hover:text-red-500 transition-colors shadow-2xs"
          aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              isWished ? "fill-red-500 text-red-500" : "text-ink-muted hover:text-red-500"
            }`}
          />
        </button>
      </div>

      {/* Product Content */}
      <div className="flex flex-col flex-1 px-1">
        <Link href={`/product/${product.id}`} className="hover:text-forest transition-colors">
          <h3 className="font-heading font-bold text-sm text-[#1A1A1A] line-clamp-1 mb-1">
            {product.name}
          </h3>
        </Link>

        {/* Price Row: e.g. ₹40 / kg */}
        <div className="text-xs font-bold text-ink mb-1.5">
          <span>{formatCurrency(product.price)}</span>
          <span className="text-ink-muted font-normal"> / {product.unit}</span>
        </div>

        {/* Bottom Row: Rating on left, Dark Green "+" button on right */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-center text-xs font-bold text-ink">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
            <span>{product.rating}</span>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200 shadow-xs active:scale-90 ${
              isAdded
                ? "bg-[#C8E27A] text-[#163C29]"
                : "bg-[#163C29] text-white hover:bg-[#1f5238]"
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
