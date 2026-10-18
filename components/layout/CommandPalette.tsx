"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { PRODUCTS } from "@/lib/products";
import { RECIPES } from "@/lib/recipes";
import { formatCurrency } from "@/lib/utils";
import {
  Search,
  X,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  ArrowRight,
  Heart,
  LayoutDashboard,
  Check,
} from "lucide-react";

export function CommandPalette() {
  const router = useRouter();
  const {
    isCommandPaletteOpen,
    closeCommandPalette,
    toggleCommandPalette,
    addToCart,
  } = useStore();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Keyboard Listener for Cmd+K / Ctrl+K and /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
      } else if (
        e.key === "/" &&
        !isCommandPaletteOpen &&
        !(["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName))
      ) {
        e.preventDefault();
        toggleCommandPalette();
      } else if (e.key === "Escape" && isCommandPaletteOpen) {
        closeCommandPalette();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen, toggleCommandPalette, closeCommandPalette]);

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  // Filter products & recipes
  const cleanQuery = query.toLowerCase().trim();

  const matchingProducts = cleanQuery
    ? PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(cleanQuery) ||
          p.category.toLowerCase().includes(cleanQuery) ||
          p.brand.toLowerCase().includes(cleanQuery) ||
          p.tags.some((t) => t.toLowerCase().includes(cleanQuery))
      ).slice(0, 5)
    : PRODUCTS.slice(0, 4);

  const matchingRecipes = cleanQuery
    ? RECIPES.filter(
        (r) =>
          r.name.toLowerCase().includes(cleanQuery) ||
          r.diet.toLowerCase().includes(cleanQuery)
      ).slice(0, 3)
    : RECIPES.slice(0, 2);

  const quickLinks = [
    { label: "Shop Marketplace", href: "/shop", icon: ShoppingBag, desc: "Explore all 34+ fresh groceries" },
    { label: "Smart Meal Planner", href: "/recipes", icon: UtensilsCrossed, desc: "Portion calculator & recipes" },
    { label: "Customer Dashboard", href: "/dashboard", icon: LayoutDashboard, desc: "Order history & spend analytics" },
    { label: "Saved Wishlist", href: "/wishlist", icon: Heart, desc: "Your favorite pantry items" },
  ];

  const handleSelectLink = (href: string) => {
    closeCommandPalette();
    router.push(href);
  };

  const handleSelectProduct = (id: string) => {
    closeCommandPalette();
    router.push(`/product/${id}`);
  };

  const handleQuickAdd = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    addToCart(productId, 1);
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeCommandPalette}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-xl bg-white rounded-3xl border border-[rgba(22,60,41,0.12)] shadow-2xl overflow-hidden flex flex-col z-10 max-h-[80vh]"
        >
          {/* Header Search Input */}
          <div className="p-4 border-b border-[rgba(22,60,41,0.08)] flex items-center gap-3 bg-[#F8F7F2]/50">
            <Search className="w-5 h-5 text-[#163C29] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search groceries, recipes, or type a page..."
              className="w-full bg-transparent text-sm font-medium text-ink placeholder:text-ink-subtle focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1 rounded-full text-ink-muted hover:text-ink hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-ink-muted bg-white border border-border rounded-md shadow-2xs">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto p-3 space-y-4 divide-y divide-[rgba(22,60,41,0.06)]">
            {/* Quick Navigation Shortcuts */}
            {!cleanQuery && (
              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted px-2 block mb-2">
                  Quick Navigation
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {quickLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => handleSelectLink(item.href)}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-[#F8F7F2] text-left transition-colors group border border-transparent hover:border-[rgba(22,60,41,0.08)]"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#E5F3D6] text-[#163C29] flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ink group-hover:text-forest">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-ink-muted line-clamp-1">
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Products Section */}
            {matchingProducts.length > 0 && (
              <div className={!cleanQuery ? "pt-3" : ""}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted px-2 block mb-2">
                  Products ({matchingProducts.length})
                </span>
                <div className="space-y-1">
                  {matchingProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProduct(product.id)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F8F7F2] cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-white shrink-0 border border-black/5 p-1">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-contain p-0.5"
                          />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-ink group-hover:text-forest">
                            {product.name}
                          </h4>
                          <span className="text-[10px] text-ink-muted">
                            {product.brand} &bull; {product.category} &bull; {product.unit}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-xs text-[#163C29]">
                          {formatCurrency(product.price)}
                        </span>
                        <button
                          onClick={(e) => handleQuickAdd(e, product.id)}
                          className="px-2.5 py-1 rounded-full bg-[#163C29] hover:bg-[#1f5238] text-white text-[11px] font-bold shadow-2xs transition-all active:scale-95"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recipes Section */}
            {matchingRecipes.length > 0 && (
              <div className="pt-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted px-2 block mb-2">
                  Chef Recipes ({matchingRecipes.length})
                </span>
                <div className="space-y-1">
                  {matchingRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      onClick={() => handleSelectLink("/recipes")}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F8F7F2] cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-white shrink-0 border border-black/5">
                          <Image
                            src={recipe.image}
                            alt={recipe.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-ink group-hover:text-forest">
                            {recipe.name}
                          </h4>
                          <span className="text-[10px] text-ink-muted">
                            {recipe.prepTime} &bull; {recipe.difficulty} &bull; {recipe.servings} Servings
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-[#163C29] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Cook &rarr;
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {matchingProducts.length === 0 && matchingRecipes.length === 0 && (
              <div className="p-8 text-center">
                <Sparkles className="w-8 h-8 text-ink-subtle mx-auto mb-2" />
                <p className="text-xs text-ink-muted">
                  No products or recipes matched &ldquo;{query}&rdquo;.
                </p>
                <button
                  onClick={() => handleSelectLink("/shop")}
                  className="mt-3 text-xs font-bold text-[#163C29] underline"
                >
                  Browse all 34 groceries in the Catalog &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="p-3 bg-[#F8F7F2] border-t border-[rgba(22,60,41,0.06)] flex items-center justify-between text-[11px] text-ink-muted">
            <span className="flex items-center gap-1">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white border text-[10px]">Enter</kbd> to select
            </span>
            <span className="flex items-center gap-1">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white border text-[10px]">Esc</kbd> to exit
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
