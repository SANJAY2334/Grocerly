"use client";

import React, { useState } from "react";
import { FilterState } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Star, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";

interface ProductFiltersProps {
  onClearAll?: () => void;
}

export function ProductFilters({ onClearAll }: ProductFiltersProps) {
  const { filters, setFilter, resetFilters } = useStore();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const handleClear = () => {
    resetFilters();
    if (onClearAll) onClearAll();
  };

  const activeFiltersCount =
    (filters.category !== "all" ? 1 : 0) +
    (filters.priceRange < 500 ? 1 : 0) +
    (filters.rating !== "all" ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.organicOnly ? 1 : 0) +
    (filters.onSaleOnly ? 1 : 0);

  return (
    <aside className="w-full lg:w-64 bg-white rounded-2xl border border-[rgba(22,60,41,0.08)] p-4 sm:p-5 shadow-xs shrink-0 select-none">
      {/* Mobile Accordion Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(22,60,41,0.08)]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-forest lg:hidden" />
          <h3 className="font-heading font-extrabold text-base text-ink">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-forest text-white text-[10px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleClear}
            className="text-xs font-semibold text-ink-muted hover:text-forest transition-colors"
          >
            Clear all
          </button>
          <button
            onClick={() => setMobileExpanded(!mobileExpanded)}
            className="lg:hidden text-ink-muted p-1 hover:text-forest"
            aria-label="Toggle Filters"
          >
            {mobileExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Filter Body (Visible always on lg, collapsible on mobile) */}
      <div className={`${mobileExpanded ? "block" : "hidden lg:block"} space-y-6 pt-4 lg:pt-5`}>
        {/* Price Range */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-ink">
            <span>Price Range</span>
            <span className="text-forest">₹0 - ₹{filters.priceRange}</span>
          </div>
          <input
            type="range"
            min="50"
            max="500"
            step="25"
            value={filters.priceRange}
            onChange={(e) => setFilter("priceRange", Number(e.target.value))}
            className="w-full h-1.5 bg-[#F8F7F2] rounded-lg appearance-none cursor-pointer accent-[#163C29]"
          />
          <div className="flex justify-between text-[10px] text-ink-subtle">
            <span>₹0</span>
            <span>₹250</span>
            <span>₹500</span>
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-2.5 pt-2 border-t border-[rgba(22,60,41,0.08)]">
          <span className="text-xs font-bold text-ink block">Rating</span>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const isSelected = filters.rating === stars;
              return (
                <label
                  key={stars}
                  onClick={() => setFilter("rating", isSelected ? "all" : stars)}
                  className="flex items-center gap-2.5 text-xs cursor-pointer group select-none py-0.5"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-[#163C29] bg-[#163C29]"
                        : "border-gray-300 bg-white group-hover:border-forest"
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < stars
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-200 text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Switches / Toggles */}
        <div className="space-y-3 pt-2 border-t border-[rgba(22,60,41,0.08)]">
          {/* In Stock Only */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink">In Stock Only</span>
            <button
              type="button"
              role="switch"
              aria-checked={filters.inStockOnly}
              onClick={() => setFilter("inStockOnly", !filters.inStockOnly)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                filters.inStockOnly ? "bg-[#163C29]" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  filters.inStockOnly ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Organic Only */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink">Organic Only</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!filters.organicOnly}
              onClick={() => setFilter("organicOnly", !filters.organicOnly)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                filters.organicOnly ? "bg-[#163C29]" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  filters.organicOnly ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* On Sale */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink">On Sale</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!filters.onSaleOnly}
              onClick={() => setFilter("onSaleOnly", !filters.onSaleOnly)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                filters.onSaleOnly ? "bg-[#163C29]" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  filters.onSaleOnly ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Sort By */}
        <div className="space-y-2 pt-2 border-t border-[rgba(22,60,41,0.08)]">
          <span className="text-xs font-bold text-ink block">Sort By</span>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilter("sortBy", e.target.value as FilterState["sortBy"])}
            className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-ink focus:outline-none focus:ring-1 focus:ring-forest cursor-pointer"
          >
            <option value="popularity">Popularity</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
            <option value="freshness">Freshness Score</option>
          </select>
        </div>
      </div>
    </aside>
  );
}
