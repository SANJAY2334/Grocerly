import React from "react";
import { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ProductGridProps {
  products: Product[];
  emptyMessage?: string;
  onResetFilters?: () => void;
}

export function ProductGrid({
  products,
  emptyMessage = "No groceries found matching your search and filter criteria.",
  onResetFilters,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="w-full bg-surface rounded-spatial-lg border border-border p-12 text-center flex flex-col items-center justify-center my-8 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center text-forest mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h3 className="font-heading font-bold text-lg text-ink mb-1">No products match your criteria</h3>
        <p className="text-xs sm:text-sm text-ink-muted max-w-md mb-6">{emptyMessage}</p>
        {onResetFilters && (
          <Button onClick={onResetFilters} variant="primary" size="md">
            Reset Filters & Search
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
