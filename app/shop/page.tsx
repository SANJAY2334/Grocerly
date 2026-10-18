"use client";

import React, { Suspense, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PRODUCTS } from "@/lib/products";
import { useStore } from "@/lib/store";
import { ProductFilters } from "@/components/product/ProductFilters";
import { ProductCard } from "@/components/product/ProductCard";
import { Category } from "@/lib/types";

const CATEGORY_TABS: { label: string; value: "all" | Category }[] = [
  { label: "All", value: "all" },
  { label: "Vegetables", value: "Vegetables" },
  { label: "Fruits", value: "Fruits" },
  { label: "Dairy", value: "Dairy" },
  { label: "Staples", value: "Staples" },
  { label: "Snacks", value: "Snacks" },
  { label: "Beverages", value: "Beverages" },
];

function ShopContent() {
  const searchParams = useSearchParams();
  const { filters, setFilter, resetFilters } = useStore();

  const urlCategory = searchParams.get("category");
  const urlSearch = searchParams.get("search");

  useEffect(() => {
    if (urlCategory) {
      setFilter("category", urlCategory as Category);
    }
    if (urlSearch) {
      setFilter("search", urlSearch);
    }
  }, [urlCategory, urlSearch, setFilter]);

  // Compute filtered & sorted list
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      // Category filter
      if (
        filters.category !== "all" &&
        product.category.toLowerCase() !== filters.category.toLowerCase()
      ) {
        return false;
      }

      // Search query filter
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesBrand = product.brand.toLowerCase().includes(q);
        const matchesCategory = product.category.toLowerCase().includes(q);
        const matchesTags = product.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesBrand && !matchesCategory && !matchesTags) {
          return false;
        }
      }

      // Max price filter
      if (product.price > filters.priceRange) {
        return false;
      }

      // Rating filter
      if (filters.rating !== "all" && product.rating < filters.rating) {
        return false;
      }

      // In stock filter
      if (filters.inStockOnly && product.stock <= 0) {
        return false;
      }

      // Organic filter
      if (filters.organicOnly && !product.organic) {
        return false;
      }

      // On sale filter
      if (filters.onSaleOnly && (!product.discount || product.discount <= 0)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === "price-asc") return a.price - b.price;
      if (filters.sortBy === "price-desc") return b.price - a.price;
      if (filters.sortBy === "rating") return b.rating - a.rating;
      if (filters.sortBy === "freshness") return b.freshnessScore - a.freshnessScore;
      // Default: popularity
      return b.reviews * b.rating - a.reviews * a.rating;
    });
  }, [filters]);

  return (
    <div className="pt-24 sm:pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top Breadcrumb / Back Link */}
      <div className="mb-2">
        <Link
          href="/shop"
          onClick={() => resetFilters()}
          className="text-xs font-semibold text-ink-muted hover:text-forest transition-colors"
        >
          &larr; Back to Shop
        </Link>
      </div>

      {/* Title & Subtitle */}
      <div className="mb-5">
        <h1 className="font-heading font-black text-3xl sm:text-4xl text-ink tracking-tight">
          Shop Fresh
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted mt-1">
          Handpicked groceries for a healthier, happier you.
        </p>
      </div>

      {/* Category Filter Pills (Exact from Middle-Left Screenshot) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-6">
        {CATEGORY_TABS.map((cat) => {
          const isActive = filters.category === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setFilter("category", cat.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? "bg-[#163C29] text-white border-[#163C29] shadow-xs"
                  : "bg-white text-ink-muted hover:text-ink border-[rgba(22,60,41,0.08)] hover:bg-[#F8F7F2]"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Main Two-Column Layout: Sidebar Filters + 3-Column Product Grid */}
      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* Left Sidebar Filters */}
        <ProductFilters onClearAll={() => resetFilters()} />

        {/* Right Product Grid */}
        <div className="flex-1 w-full">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[rgba(22,60,41,0.08)] p-12 text-center">
              <h3 className="font-heading font-bold text-base text-ink mb-1">
                No matching groceries found
              </h3>
              <p className="text-xs text-ink-muted mb-4">
                Try loosening your filters or price range to explore more items.
              </p>
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-full bg-[#163C29] text-white text-xs font-bold"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="pt-32 text-center text-xs text-ink-muted">Loading Fresh Aisles...</div>}>
      <ShopContent />
    </Suspense>
  );
}
