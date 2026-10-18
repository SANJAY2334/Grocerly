"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ArrowRight, Leaf, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OrbitFallback } from "@/components/3d/OrbitFallback";

const FreshnessOrbit = dynamic(
  () => import("@/components/3d/FreshnessOrbit").then((mod) => mod.FreshnessOrbit),
  {
    ssr: false,
    loading: () => <OrbitFallback />,
  }
);

export function HeroSection() {
  return (
    <section className="relative pt-24 sm:pt-28 pb-12 lg:pb-16 overflow-hidden bg-[#F8F7F2] min-h-[720px] lg:min-h-[780px] flex items-center">
      {/* Script Floating Annotation on Far Right (Exact from Screenshot) */}
      <div className="hidden 2xl:block absolute right-8 top-44 font-script text-3xl xl:text-4xl font-bold text-forest/70 rotate-12 select-none pointer-events-none">
        Good Food<br />Brighter Days<br /><span className="text-2xl ml-4">♡</span>
      </div>

      <div className="w-[min(100%-48px,1440px)] mx-auto px-2 sm:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          
          {/* LEFT COLUMN: Hero Copy, CTAs & Trust Indicators */}
          <div className="lg:col-span-5 flex flex-col items-start space-y-6">
            {/* Pill Eyebrow */}
            <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-white/80 border border-[rgba(22,60,41,0.08)] text-[11px] font-bold uppercase tracking-widest text-ink/80 shadow-2xs">
              FRESH FOOD &bull; BETTER TOMORROW
            </div>

            {/* Main Headline (Scaled to dominant editorial size) */}
            <h1 className="font-heading font-black text-5xl sm:text-6xl lg:text-[68px] xl:text-[76px] text-ink leading-[1.03] tracking-tight">
              Good Food<br />
              <span className="relative inline-block text-ink">
                Brighter Days
                {/* Organic Lime Green Brush Underline (from screenshot) */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-[#C8E27A] pointer-events-none -z-10"
                  viewBox="0 0 240 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 8.5C45 4.5 130 3 237 8.5C180 4 95 4.5 3 8.5Z"
                    fill="currentColor"
                  />
                  <path
                    d="M12 9C55 5.5 140 4 230 9"
                    stroke="#B2D354"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-sm sm:text-base text-ink-muted leading-relaxed max-w-md font-normal">
              Premium groceries, smarter choices and a healthier tomorrow &mdash; delivered to your door.
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <Link href="/shop">
                <Button variant="primary" size="lg" className="rounded-full bg-[#163C29] hover:bg-[#1f5238] text-white px-7 font-bold shadow-xs text-sm">
                  Shop Now <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/recipes">
                <Button variant="secondary" size="lg" className="rounded-full bg-white hover:bg-[#F8F7F2] text-ink border border-[rgba(22,60,41,0.12)] px-6 font-bold shadow-xs text-sm">
                  Explore Recipes
                </Button>
              </Link>
            </div>

            {/* 4-Item Stats Strip */}
            <div className="pt-6 border-t border-[rgba(22,60,41,0.08)] grid grid-cols-4 gap-3 w-full text-left">
              <div>
                <span className="font-heading font-black text-xl text-ink block">34+</span>
                <span className="text-[11px] text-ink-muted block leading-tight mt-0.5">Fresh Products</span>
              </div>
              <div>
                <span className="font-heading font-black text-xl text-ink block">8</span>
                <span className="text-[11px] text-ink-muted block leading-tight mt-0.5">Chef Recipes</span>
              </div>
              <div>
                <span className="font-heading font-black text-xl text-ink block">94.8</span>
                <span className="text-[11px] text-ink-muted block leading-tight mt-0.5">Freshness Index</span>
              </div>
              <div className="flex flex-col">
                <Leaf className="w-5 h-5 text-forest mb-0.5" />
                <span className="text-[11px] text-ink-muted leading-tight">Sustainable Packaging</span>
              </div>
            </div>

            {/* Social Proof Row */}
            <div className="pt-1 flex items-center gap-3.5">
              {/* Avatar Stack */}
              <div className="flex -space-x-2">
                <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-2xs">
                  <Image src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="Customer" fill className="object-cover" />
                </div>
                <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-2xs">
                  <Image src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Customer" fill className="object-cover" />
                </div>
                <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-2xs">
                  <Image src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="Customer" fill className="object-cover" />
                </div>
              </div>

              {/* Text & Rating */}
              <div className="text-left text-xs">
                <span className="text-xs font-bold text-ink block leading-tight">
                  Trusted by <strong>10,000+</strong> happy homes
                </span>
                <div className="flex items-center gap-1 text-xs text-amber-500 font-bold mt-0.5">
                  <span>★★★★★</span>
                  <span className="text-ink font-semibold ml-0.5">4.8/5</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT INTEGRATED COMPOSITION: 3D Produce Orbit + Floating Freshness Card + Recipe Teaser */}
          <div className="lg:col-span-7 relative flex flex-col lg:flex-row items-center justify-center gap-6">
            
            {/* Center 3D Produce Bubble & Orbit */}
            <div className="relative w-full max-w-[460px] flex flex-col items-center">
              <FreshnessOrbit />
              
              {/* Carousel Pagination Dots Underneath (Exact from Screenshot) */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#163C29]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#163C29]/30" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#163C29]/30" />
              </div>
            </div>

            {/* Right Floating Cards Stack: Freshness Index & Recipe Teaser */}
            <div className="w-full lg:max-w-[270px] flex flex-col gap-4 shrink-0">
              
              {/* Floating Live Freshness Index Card (Exact from Screenshot) */}
              <div className="bg-white rounded-3xl p-5 border border-[rgba(22,60,41,0.08)] shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-ink leading-tight">
                      Live Freshness<br />Index <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-0.5 animate-pulse" />
                    </h3>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="font-heading font-black text-3xl text-ink">
                        94.8
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-ink-muted">Excellent</span>
                  </div>

                  {/* Leaf Icon in Lime Circle */}
                  <div className="w-11 h-11 rounded-full bg-[#C8E27A]/25 border border-[#C8E27A]/40 text-[#163C29] flex items-center justify-center shrink-0">
                    <Leaf className="w-5 h-5 fill-[#7DA024] text-[#163C29]" />
                  </div>
                </div>

                {/* 4 Metric Progress Rows */}
                <div className="space-y-2.5 pt-1 text-xs">
                  <div>
                    <div className="flex justify-between font-semibold text-[11px] text-ink mb-1">
                      <span>Produce Quality</span>
                      <span className="font-bold">97%</span>
                    </div>
                    <div className="w-full bg-[#F8F7F2] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#163C29] h-full w-[97%] rounded-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-[11px] text-ink mb-1">
                      <span>Inventory Health</span>
                      <span className="font-bold">92%</span>
                    </div>
                    <div className="w-full bg-[#F8F7F2] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#163C29] h-full w-[92%] rounded-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-[11px] text-ink mb-1">
                      <span>Delivery Readiness</span>
                      <span className="font-bold">96%</span>
                    </div>
                    <div className="w-full bg-[#F8F7F2] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#163C29] h-full w-[96%] rounded-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-[11px] text-ink mb-1">
                      <span>Sustainability</span>
                      <span className="font-bold">89%</span>
                    </div>
                    <div className="w-full bg-[#F8F7F2] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#163C29] h-full w-[89%] rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[rgba(22,60,41,0.06)] text-[10px] text-ink-subtle">
                  Live farm-to-table index
                </div>
              </div>

              {/* Recipe Teaser Card */}
              <Link
                href="/recipes"
                className="bg-white rounded-3xl p-3.5 border border-[rgba(22,60,41,0.08)] shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3 group"
              >
                <div>
                  <h4 className="font-heading font-extrabold text-xs text-ink">
                    Fresh Ideas<br />Healthier You
                  </h4>
                  <span className="text-[10px] font-semibold text-ink-muted group-hover:text-forest flex items-center gap-1 mt-1">
                    Explore our chef-crafted recipes &rarr;
                  </span>
                </div>
                <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border border-[rgba(22,60,41,0.08)] shadow-2xs">
                  <Image
                    src="https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=200&q=80"
                    alt="Chef Recipe"
                    fill
                    className="object-cover group-hover:scale-110 transition-transform"
                  />
                </div>
              </Link>

            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
