"use client";

import React from "react";
import Image from "next/image";

export function OrbitFallback() {
  return (
    <div className="relative w-full h-[400px] md:h-[480px] lg:h-[520px] flex items-center justify-center select-none">
      {/* Orbital Glass Ring Effects */}
      <div className="absolute w-[360px] h-[360px] md:w-[420px] md:h-[420px] rounded-full border border-forest/15 animate-spin" style={{ animationDuration: "40s" }} />
      <div className="absolute w-[280px] h-[280px] md:w-[320px] md:h-[320px] rounded-full border border-lime/40 animate-spin" style={{ animationDuration: "28s", animationDirection: "reverse" }} />
      <div className="absolute w-[200px] h-[200px] rounded-full border border-dashed border-forest/20 animate-spin" style={{ animationDuration: "20s" }} />

      {/* Central Glass Bubble Enclosure with Produce Composition */}
      <div className="relative z-10 w-72 h-72 md:w-80 md:h-80 rounded-full bg-gradient-to-br from-white/60 via-lime/10 to-transparent backdrop-blur-md border border-white/80 shadow-spatial flex items-center justify-center overflow-hidden">
        <div className="relative w-full h-full p-4">
          {/* Avocado (top right) */}
          <div className="absolute top-4 right-12 w-28 h-28 animate-float" style={{ animationDelay: "0s" }}>
            <Image
              src="https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=300&q=80"
              alt="Fresh Avocado"
              fill
              className="object-contain drop-shadow-md rounded-full"
            />
          </div>

          {/* Tomato (center left) */}
          <div className="absolute top-20 left-4 w-28 h-28 animate-float" style={{ animationDelay: "1s" }}>
            <Image
              src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=300&q=80"
              alt="Fresh Tomato"
              fill
              className="object-contain drop-shadow-md rounded-full"
            />
          </div>

          {/* Red Onion (bottom center) */}
          <div className="absolute bottom-6 left-16 w-24 h-24 animate-float" style={{ animationDelay: "2s" }}>
            <Image
              src="https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=300&q=80"
              alt="Red Onion"
              fill
              className="object-contain drop-shadow-md rounded-full"
            />
          </div>

          {/* Lemon (bottom right) */}
          <div className="absolute bottom-10 right-8 w-20 h-20 animate-float" style={{ animationDelay: "1.5s" }}>
            <Image
              src="https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=300&q=80"
              alt="Fresh Lemon"
              fill
              className="object-contain drop-shadow-md rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
