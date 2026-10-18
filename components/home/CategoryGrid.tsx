import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Category } from "@/lib/types";

interface CategoryCardItem {
  title: string;
  category: Category;
  count: number;
  image: string;
  badge: string;
}

const CATEGORIES_DATA: CategoryCardItem[] = [
  {
    title: "Fresh Vegetables",
    category: "Vegetables",
    count: 7,
    image: "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=400&q=80",
    badge: "Morning Harvest",
  },
  {
    title: "Seasonal Fruits",
    category: "Fruits",
    count: 5,
    image: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=400&q=80",
    badge: "100% Sweetness",
  },
  {
    title: "Farm Dairy & Paneer",
    category: "Dairy",
    count: 6,
    image: "https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&w=400&q=80",
    badge: "Pure Cow Milk",
  },
  {
    title: "Grains & Flours",
    category: "Staples",
    count: 8,
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80",
    badge: "Stone Ground",
  },
  {
    title: "Breakfast & Snacks",
    category: "Snacks",
    count: 4,
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80",
    badge: "Clean Label",
  },
  {
    title: "Cold Beverages & Tea",
    category: "Beverages",
    count: 4,
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80",
    badge: "Refreshing",
  },
];

export function CategoryGrid() {
  return (
    <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-forest">
            Aisles & Departments
          </span>
          <h2 className="font-heading font-black text-2xl sm:text-3xl text-ink tracking-tight mt-1">
            Curated marketplace categories.
          </h2>
        </div>
        <Link
          href="/shop"
          className="text-xs font-bold text-forest hover:text-forest-light flex items-center gap-1 group"
        >
          <span>View all groceries</span>
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {CATEGORIES_DATA.map((cat) => (
          <Link
            key={cat.title}
            href={`/shop?category=${cat.category}`}
            className="group relative flex flex-col bg-surface rounded-spatial border border-border overflow-hidden p-4 spatial-card select-none"
          >
            {/* Category Image */}
            <div className="relative aspect-square w-full rounded-spatial-sm overflow-hidden bg-surface-muted mb-3">
              <Image
                src={cat.image}
                alt={cat.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest/30 to-transparent" />
            </div>

            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-forest uppercase tracking-wider mb-0.5">
                {cat.badge}
              </span>
              <h4 className="font-heading font-bold text-xs sm:text-sm text-ink group-hover:text-forest transition-colors line-clamp-1">
                {cat.title}
              </h4>
              <span className="text-[11px] text-ink-muted mt-0.5">
                {cat.count} Products
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
