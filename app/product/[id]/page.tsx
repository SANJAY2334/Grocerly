import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { PRODUCTS, getProductById, getProductsByCategory } from "@/lib/products";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductDetailsClient } from "./ProductDetailsClient";
import { formatCurrency } from "@/lib/utils";

interface Props {
  params: { id: string };
}

export async function generateStaticParams() {
  return PRODUCTS.map((product) => ({
    id: product.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProductById(params.id);
  if (!product) {
    return {
      title: "Product Not Found | Grocerly",
    };
  }

  return {
    title: `${product.name} (${product.unit}) — Buy Fresh | Grocerly`,
    description: product.description,
  };
}

export default function ProductDetailPage({ params }: Props) {
  const product = getProductById(params.id);
  if (!product) {
    notFound();
  }

  const relatedProducts = getProductsByCategory(product.category)
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  return (
    <div className="pt-24 sm:pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Back Link */}
      <div className="mb-4">
        <Link
          href="/shop"
          className="text-xs font-semibold text-ink-muted hover:text-forest transition-colors"
        >
          &larr; Back to Shop
        </Link>
      </div>

      {/* Main Product Presentation (Exact Middle-Center Screen) */}
      <ProductDetailsClient product={product} />

      {/* Related Products Rail */}
      {relatedProducts.length > 0 && (
        <section className="mt-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-forest">
                Complete Your Pantry
              </span>
              <h3 className="font-heading font-black text-xl text-ink tracking-tight mt-0.5">
                More in {product.category}
              </h3>
            </div>
            <Link
              href={`/shop?category=${product.category}`}
              className="text-xs font-bold text-forest hover:underline"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
