import { HeroSection } from "@/components/home/HeroSection";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { TrendingProducts } from "@/components/home/TrendingProducts";
import { MealPlannerPreview } from "@/components/home/MealPlannerPreview";
import { SustainabilityBanner } from "@/components/home/SustainabilityBanner";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* 1. Full-scale Hero with 3D Freshness Orbit & Floating Live Freshness Index */}
      <HeroSection />

      {/* 2. Curated Marketplace Categories */}
      <CategoryGrid />

      {/* 3. Trending Neighborhood Groceries */}
      <TrendingProducts />

      {/* 4. Compact Smart Meal Planner Preview */}
      <MealPlannerPreview />

      {/* 5. Sustainability & Smart Basket Intelligence */}
      <SustainabilityBanner />
    </div>
  );
}
