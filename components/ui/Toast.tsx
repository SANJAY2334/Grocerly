"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { ShoppingBag, Heart, CheckCircle2, Sparkles, Tag, X } from "lucide-react";

export function ToastContainer() {
  const { toasts, removeToast } = useStore();

  const getIcon = (type: string) => {
    switch (type) {
      case "cart":
        return <ShoppingBag className="w-4 h-4 text-[#163C29]" />;
      case "wishlist":
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case "coupon":
        return <Tag className="w-4 h-4 text-emerald-600" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#163C29]" />;
    }
  };

  const getBadgeBg = (type: string) => {
    switch (type) {
      case "cart":
        return "bg-[#C8E27A]/40 border-[#C8E27A]";
      case "wishlist":
        return "bg-rose-50 border-rose-200";
      case "coupon":
        return "bg-emerald-50 border-emerald-200";
      case "success":
        return "bg-emerald-50 border-emerald-200";
      default:
        return "bg-forest/10 border-forest/20";
    }
  };

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="pointer-events-auto relative overflow-hidden bg-white/95 backdrop-blur-md rounded-2xl border border-[rgba(22,60,41,0.12)] p-3.5 shadow-spatial flex items-start gap-3 select-none"
          >
            {/* Type Icon Badge */}
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${getBadgeBg(
                toast.type
              )}`}
            >
              {getIcon(toast.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-4">
              <h4 className="text-xs font-bold text-[#163C29] tracking-tight">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="text-[11px] text-ink-muted mt-0.5 leading-snug line-clamp-2">
                  {toast.message}
                </p>
              )}
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    removeToast(toast.id);
                  }}
                  className="mt-2 text-[11px] font-extrabold text-[#163C29] hover:underline flex items-center gap-1 group"
                >
                  <span>{toast.action.label}</span>
                  <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
                </button>
              )}
            </div>

            {/* Dismiss Cross */}
            <button
              onClick={() => removeToast(toast.id)}
              className="absolute top-2.5 right-2.5 p-1 rounded-full text-ink-subtle hover:text-ink hover:bg-black/5 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Timed progress indicator */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: (toast.duration || 3500) / 1000, ease: "linear" }}
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8E27A] origin-left"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
