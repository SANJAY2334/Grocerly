import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function SustainabilityBanner() {
  return (
    <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-forest text-surface rounded-spatial-lg p-8 sm:p-12 shadow-spatial flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-lime/10 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 max-w-xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-lime/20 text-lime px-3 py-1 rounded-pill text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Basket Intelligence</span>
          </div>

          <h3 className="font-heading font-black text-2xl sm:text-3xl text-surface tracking-tight">
            You buy tomatoes & paneer frequently.
          </h3>

          <p className="text-xs sm:text-sm text-surface/80 leading-relaxed">
            Consolidating into weekly 2kg farm crates saves up to <strong>₹85 every month</strong> and reduces single-dispatch carbon footprints by 38%.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
          <Link href="/shop?category=Vegetables" className="w-full sm:w-auto">
            <Button variant="lime" size="lg" className="w-full shadow-spatial">
              <TrendingUp className="w-4 h-4 mr-1" /> View Smart Bulk Packs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
