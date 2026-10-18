"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Heart, ShoppingBag, Check, Clock } from "lucide-react";
import { Product } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

interface ProductDetailsClientProps {
  product: Product;
}

export function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  const { addToCart, toggleWishlist, isInWishlist, openCartDrawer } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<"Nutrition" | "About" | "Reviews" | "Delivery">("Nutrition");

  // Gallery images: main product image + alternate angles
  const galleryImages = [
    product.image,
    "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=600&q=80",
  ];
  const [selectedImage, setSelectedImage] = useState(galleryImages[0]);

  const isWished = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product.id, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
    openCartDrawer();
  };

  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-8 shadow-xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Gallery with 4 Vertical Thumbnails + Main Image */}
        <div className="lg:col-span-6 flex gap-3 sm:gap-4">
          {/* 4 Vertical Thumbnails */}
          <div className="flex flex-col gap-2.5 shrink-0">
            {galleryImages.map((img, idx) => {
              const isSelected = selectedImage === img;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all p-1 bg-[#F8F7F2]/50 ${
                    isSelected
                      ? "border-[#163C29] shadow-xs"
                      : "border-transparent hover:border-gray-300 opacity-80 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} view ${idx + 1}`}
                    fill
                    className="object-contain p-1"
                  />
                </button>
              );
            })}
          </div>

          {/* Large Main Image */}
          <div className="relative aspect-square flex-1 rounded-2xl bg-[#F8F7F2]/60 overflow-hidden flex items-center justify-center p-6 border border-[rgba(22,60,41,0.04)]">
            <Image
              src={selectedImage}
              alt={product.name}
              fill
              priority
              className="object-contain p-4 transition-all duration-300"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Details, Price, Stepper, Status Checks, Tabs, Nutrition */}
        <div className="lg:col-span-6 flex flex-col justify-between h-full space-y-5">
          <div>
            {/* Top row: Title and Wishlist Heart */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-heading font-black text-2xl sm:text-3xl text-ink tracking-tight">
                  {product.name}
                </h1>
                <p className="text-xs font-medium text-ink-muted mt-0.5">
                  Farm fresh &bull; Locally sourced
                </p>
              </div>

              <button
                onClick={() => toggleWishlist(product.id)}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                  isWished
                    ? "bg-red-50 border-red-200 text-red-500 shadow-xs"
                    : "border-gray-200 text-ink-muted hover:text-red-500 hover:border-red-200 bg-white"
                }`}
                aria-label="Wishlist"
              >
                <Heart className={`w-4 h-4 ${isWished ? "fill-red-500 text-red-500" : ""}`} />
              </button>
            </div>

            {/* Rating row: ★★★★★ 4.8 (124 reviews) 🌿 */}
            <div className="flex items-center gap-1.5 mt-2.5 text-xs">
              <div className="flex items-center text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="font-bold text-ink ml-1">{product.rating}</span>
              <span className="text-ink-muted">({product.reviews} reviews)</span>
              <span className="text-forest text-sm ml-0.5">🌿</span>
            </div>

            {/* Price block: ₹40 / kg  ₹50  20% OFF */}
            <div className="flex items-baseline gap-2.5 mt-4">
              <span className="font-heading font-black text-2xl sm:text-3xl text-ink">
                {formatCurrency(product.price)}
              </span>
              <span className="text-xs font-semibold text-ink-muted">
                / {product.unit}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-sm text-ink-subtle line-through ml-1">
                  {formatCurrency(product.originalPrice)}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="bg-[#FFF4EC] text-[#E06738] font-bold text-[11px] px-2.5 py-0.5 rounded-full ml-1">
                  {discountPercent}% OFF
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-xs text-ink-muted leading-relaxed mt-3 max-w-lg">
              {product.description}
            </p>

            {/* Stepper + Add to Cart Row */}
            <div className="flex items-center gap-3.5 mt-5">
              {/* Stepper Pill [ - 1 + ] */}
              <div className="flex items-center bg-[#F8F7F2] rounded-full px-3 py-1.5 border border-[rgba(22,60,41,0.08)]">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-6 h-6 flex items-center justify-center font-bold text-ink hover:text-forest disabled:opacity-40 text-base"
                >
                  -
                </button>
                <span className="w-7 text-center text-xs font-black text-ink">{quantity}</span>
                <button
                  type="button"
                  disabled={quantity >= product.stock}
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-6 h-6 flex items-center justify-center font-bold text-ink hover:text-forest disabled:opacity-40 text-base"
                >
                  +
                </button>
              </div>

              {/* Add to Cart Pill Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="flex-1 max-w-xs rounded-full bg-[#163C29] hover:bg-[#1f5238] disabled:opacity-50 text-white py-2.5 px-6 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                {product.stock <= 0 ? (
                  "Out of Stock"
                ) : isAdded ? (
                  <>
                    <Check className="w-4 h-4 text-[#C8E27A]" /> Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" /> Add to Cart
                  </>
                )}
              </button>
            </div>

            {/* Status Check Badges */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-ink-muted mt-5 pt-4 border-t border-[rgba(22,60,41,0.08)]">
              {product.stock > 0 ? (
                <span className="flex items-center gap-1.5 text-forest font-semibold">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> In Stock ({product.stock} available)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-600 font-semibold">
                  Out of Stock
                </span>
              )}
              <span className="flex items-center gap-1.5 text-forest font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> Fresh Harvest
              </span>
              <span className="flex items-center gap-1.5 text-ink-muted font-medium">
                <Clock className="w-3.5 h-3.5 text-ink-muted" /> 1-2 days delivery
              </span>
            </div>
          </div>

          {/* Bottom Tabs: Nutrition, About, Reviews, Delivery */}
          <div className="pt-2">
            <div className="flex items-center gap-6 border-b border-[rgba(22,60,41,0.08)] text-xs font-bold text-ink-muted mb-4">
              {(["Nutrition", "About", "Reviews", "Delivery"] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2 transition-colors relative ${
                      isActive ? "text-[#163C29] font-black" : "hover:text-ink"
                    }`}
                  >
                    {tab}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#163C29] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Contents: 4 Nutrition Cards */}
            {activeTab === "Nutrition" && (
              <div>
                <div className="grid grid-cols-4 gap-2.5 text-center">
                  <div className="bg-[#F8F7F2] p-2.5 rounded-xl border border-[rgba(22,60,41,0.06)]">
                    <span className="font-heading font-black text-sm text-ink block">
                      {product.nutrition?.calories || 18}
                    </span>
                    <span className="text-[10px] text-ink-muted block mt-0.5">Calories</span>
                  </div>
                  <div className="bg-[#F8F7F2] p-2.5 rounded-xl border border-[rgba(22,60,41,0.06)]">
                    <span className="font-heading font-black text-sm text-ink block">
                      {product.nutrition?.protein || "0.9g"}
                    </span>
                    <span className="text-[10px] text-ink-muted block mt-0.5">Protein</span>
                  </div>
                  <div className="bg-[#F8F7F2] p-2.5 rounded-xl border border-[rgba(22,60,41,0.06)]">
                    <span className="font-heading font-black text-sm text-ink block">
                      {product.nutrition?.carbs || "3.9g"}
                    </span>
                    <span className="text-[10px] text-ink-muted block mt-0.5">Carbs</span>
                  </div>
                  <div className="bg-[#F8F7F2] p-2.5 rounded-xl border border-[rgba(22,60,41,0.06)]">
                    <span className="font-heading font-black text-sm text-ink block">
                      {product.nutrition?.fat || "0.2g"}
                    </span>
                    <span className="text-[10px] text-ink-muted block mt-0.5">Fat</span>
                  </div>
                </div>
                <p className="text-[10px] text-ink-subtle mt-2">
                  Nutritional values per 100g (approx)
                </p>
              </div>
            )}

            {activeTab === "About" && (
              <p className="text-xs text-ink-muted leading-relaxed">
                Grown with sustainable hydroponic practices, our produce is packed within hours of harvest to preserve maximum crunch, sweetness, and micronutrients.
              </p>
            )}

            {activeTab === "Reviews" && (
              <p className="text-xs text-ink-muted leading-relaxed">
                Rated 4.8/5 across 124 verified household orders. &ldquo;Super juicy, fresh aroma, and lasts long in the fridge!&rdquo;
              </p>
            )}

            {activeTab === "Delivery" && (
              <p className="text-xs text-ink-muted leading-relaxed">
                Delivered in temperature-controlled sustainable cardboard crates within 30-45 minutes of dispatch.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
