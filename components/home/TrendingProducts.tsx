import React from "react";
import Link from "next/link";
import { getFeaturedProducts } from "@/lib/products";
import { ProductCard } from "@/components/product/ProductCard";
import { ArrowRight, Sparkles } from "lucide-react";

export function TrendingProducts() {
  const featured = getFeaturedProducts();

  return (
    <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-forest mb-1">
            <Sparkles className="w-3.5 h-3.5 text-lime-dark" />
            <span>Farm Fresh Arrivals</span>
          </div>
          <h2 className="font-heading font-black text-2xl sm:text-3xl text-ink tracking-tight">
            Trending in your neighborhood.
          </h2>
        </div>

        <Link
          href="/shop"
          className="text-xs font-bold text-forest hover:text-forest-light flex items-center gap-1 group"
        >
          <span>Explore all 34 catalog products</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {featured.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
