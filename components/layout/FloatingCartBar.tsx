"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { ShoppingBag, ArrowUp } from "lucide-react";

export function FloatingCartBar() {
  const { cart, getCartTotals, openCartDrawer } = useStore();
  const [isVisible, setIsVisible] = useState(false);

  const { total, itemCount } = getCartTotals();

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled down more than 350px
      setIsVisible(window.scrollY > 350);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {isVisible && (
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Quick Cart Pill (if items exist) */}
            {itemCount > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                onClick={openCartDrawer}
                className="group flex items-center gap-3 bg-[#163C29] text-white px-4 py-2.5 rounded-full shadow-spatial border border-white/10 hover:bg-[#1f5238] transition-all active:scale-95"
                aria-label="View shopping basket"
              >
                <div className="relative">
                  <ShoppingBag className="w-4 h-4 text-[#C8E27A]" />
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-[#C8E27A] text-[#163C29] font-black text-[9px] flex items-center justify-center">
                    {itemCount}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span>Basket</span>
                  <span className="text-[#C8E27A]">•</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </motion.button>
            )}

            {/* Back to Top Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToTop}
              className="w-10 h-10 rounded-full bg-white text-[#163C29] border border-[rgba(22,60,41,0.12)] shadow-spatial flex items-center justify-center hover:bg-[#F8F7F2] hover:scale-105 active:scale-90 transition-all"
              aria-label="Scroll back to top"
            >
              <ArrowUp className="w-4 h-4" />
            </motion.button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
