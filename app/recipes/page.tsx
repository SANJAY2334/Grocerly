import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { SmartMealPlanner } from "@/components/home/SmartMealPlanner";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Smart Meal Planner & Chef Recipes | Grocerly",
  description: "Scale ingredients, match fresh grocery inventory, and calculate basket costs for chef-crafted recipes with Grocerly's Smart Meal Planner.",
};

export default function RecipesPage() {
  return (
    <div className="pt-24 sm:pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-forest transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
      </div>

      {/* Full Dedicated Meal Planner Experience */}
      <SmartMealPlanner />
    </div>
  );
}
