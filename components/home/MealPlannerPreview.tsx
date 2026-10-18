"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight, ShoppingBag, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export function MealPlannerPreview() {
  const { addToCart, openCartDrawer } = useStore();
  const [added, setAdded] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart("amul-fresh-paneer", 1);
    addToCart("fresh-tomatoes", 1);
    addToCart("red-onions", 1);
    addToCart("amul-fresh-cream", 1);
    addToCart("amul-butter", 1);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openCartDrawer();
    }, 500);
  };

  return (
    <section className="py-14 sm:py-18 bg-[#F8F7F2]">
      <div className="w-[min(100%-48px,1440px)] mx-auto px-2 sm:px-4">
        <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-10 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Heading & Description */}
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#163C29]/10 text-[#163C29] text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#7DA024]" />
                <span>Smart Recipe Intelligence</span>
              </div>
              <h2 className="font-heading font-black text-3xl sm:text-4xl text-ink tracking-tight">
                What are you cooking?
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed max-w-md font-normal">
                Type what you crave in plain language or pick a chef recipe. We scale the ingredients and calculate your grocery basket with exact quantities.
              </p>

              {/* Natural Language Prompt Preview */}
              <div className="bg-[#F8F7F2] p-3 rounded-2xl border border-[rgba(22,60,41,0.06)] flex items-center justify-between gap-3 text-xs text-ink-muted">
                <span className="truncate italic font-medium">
                  &ldquo;I want paneer butter masala for 4 people&rdquo;
                </span>
                <span className="text-[11px] font-bold text-forest shrink-0">
                  Auto-calculated
                </span>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/recipes"
                  className="px-6 py-3 rounded-full bg-[#163C29] hover:bg-[#1f5238] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2"
                >
                  Explore All Recipes <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={handleQuickAdd}
                  className="px-5 py-3 rounded-full bg-white hover:bg-[#F8F7F2] text-ink border border-[rgba(22,60,41,0.12)] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4 text-[#7DA024]" /> Added Basket (₹386)
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 text-forest" /> Quick Add Basket
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Featured Recipe Compact Card */}
            <div className="lg:col-span-6">
              <Link
                href="/recipes"
                className="group block bg-[#F8F7F2]/60 rounded-2xl p-4 sm:p-5 border border-[rgba(22,60,41,0.08)] hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Dish Image */}
                  <div className="relative aspect-4/3 w-full sm:w-48 rounded-xl overflow-hidden bg-white shrink-0 border border-[rgba(22,60,41,0.06)] shadow-xs">
                    <Image
                      src="https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80"
                      alt="Paneer Butter Masala"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Recipe Details */}
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-forest uppercase tracking-wider">
                          Featured Recipe
                        </span>
                        <h3 className="font-heading font-extrabold text-lg text-ink group-hover:text-forest transition-colors">
                          Paneer Butter Masala
                        </h3>
                        <span className="text-xs text-ink-muted block mt-0.5">
                          4 servings &bull; 8 ingredients
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-heading font-black text-xl text-forest block">
                          ₹386
                        </span>
                        <span className="text-[10px] text-ink-muted block">
                          Basket total
                        </span>
                      </div>
                    </div>

                    {/* Mini Ingredients Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold text-ink border border-black/5">🧀 Paneer 200g</span>
                      <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold text-ink border border-black/5">🍅 Tomatoes 4 pcs</span>
                      <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold text-ink border border-black/5">🧅 Onions 2 pcs</span>
                      <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold text-ink border border-black/5">🥛 Cream 100ml</span>
                    </div>

                    <div className="pt-2 text-right">
                      <span className="inline-flex items-center text-xs font-bold text-forest group-hover:underline">
                        Build My Basket &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
