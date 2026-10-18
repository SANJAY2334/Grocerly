"use client";

import React, { useState } from "react";
import { Sparkles, ShieldCheck, ThermometerSnowflake, Truck, Leaf, Activity } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function FreshnessIndex() {
  const [activeTab, setActiveTab] = useState<"overall" | "produce" | "inventory" | "delivery">("overall");

  const metrics = [
    {
      title: "Produce Quality",
      score: 97,
      status: "Peak Crispness",
      detail: "Morning harvest batch tested for moisture and zero chemical residues.",
      icon: ShieldCheck,
      color: "bg-emerald-500",
    },
    {
      title: "Inventory Health",
      score: 92,
      status: "Optimal Rotation",
      detail: "Zero batch lingering over 24 hours in fulfillment centers.",
      icon: ThermometerSnowflake,
      color: "bg-teal-500",
    },
    {
      title: "Delivery Readiness",
      score: 96,
      status: "Chilled Fleet Active",
      detail: "Cold-chain insulated crates dispatching within 18 minutes.",
      icon: Truck,
      color: "bg-lime-dark",
    },
    {
      title: "Sustainability",
      score: 89,
      status: "Eco-Conscious",
      detail: "100% recyclable paper packaging and EV fleet dispatch.",
      icon: Leaf,
      color: "bg-forest",
    },
  ];

  return (
    <section id="freshness" className="py-16 md:py-24 bg-surface-elevated border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 mb-3">
              <Badge variant="lime">
                <Activity className="w-3.5 h-3.5 mr-1 text-forest" />
                Live Freshness Index
              </Badge>
            </div>
            <h2 className="font-heading font-black text-3xl sm:text-4xl text-ink tracking-tight">
              Real-time grocery intelligence.
            </h2>
            <p className="text-sm sm:text-base text-ink-muted max-w-xl mt-2">
              Every vegetable, fruit, and dairy batch is indexed for harvest time, cold-chain temperature integrity, and freshness metrics.
            </p>
          </div>

          <div className="text-xs text-ink-muted flex items-center gap-2 bg-surface px-3.5 py-2 rounded-spatial-sm border border-border shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Simulated Sensor Network • Updated 2 mins ago</span>
          </div>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Hero Metric Card */}
          <div className="lg:col-span-4 bg-forest text-surface p-8 rounded-spatial-lg shadow-spatial flex flex-col justify-between relative overflow-hidden">
            {/* Background ambient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-lime/10 rounded-full blur-3xl -z-0" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold uppercase tracking-widest text-lime">
                  System Index
                </span>
                <span className="bg-lime/20 text-lime px-2.5 py-1 rounded-pill text-[11px] font-bold">
                  Status: Excellent
                </span>
              </div>

              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-heading font-black text-6xl sm:text-7xl text-surface tracking-tight">
                  94.8
                </span>
                <span className="text-lg font-bold text-lime">/ 100</span>
              </div>
              <p className="text-xs text-surface/80 leading-relaxed max-w-xs">
                Aggregate freshness composite score across all active farm batches and delivery nodes today.
              </p>
            </div>

            <div className="relative z-10 pt-8 mt-8 border-t border-forest-light/60 flex items-center justify-between text-xs text-surface/70">
              <span>Next Batch Arrival: <strong>05:30 AM</strong></span>
              <Sparkles className="w-4 h-4 text-lime" />
            </div>
          </div>

          {/* Sub-Metrics 4-Card Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.title}
                  className="bg-surface p-6 rounded-spatial border border-border shadow-spatial flex flex-col justify-between hover:border-forest/30 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-spatial-sm bg-surface-muted text-forest flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-heading font-black text-2xl text-ink">
                        {m.score}%
                      </span>
                    </div>

                    <h4 className="font-heading font-bold text-base text-ink mb-1">
                      {m.title}
                    </h4>
                    <span className="inline-block text-xs font-bold text-forest mb-2">
                      {m.status}
                    </span>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      {m.detail}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/60">
                    <div className="w-full bg-surface-muted h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-forest h-full rounded-full transition-all duration-700"
                        style={{ width: `${m.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
