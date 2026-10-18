import React from "react";
import Link from "next/link";
import { Leaf } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#F8F7F2] border-t border-[rgba(22,60,41,0.08)] py-10 mt-16 select-none">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* LEFT: Brand Logo & Motto */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-forest text-lime flex items-center justify-center shrink-0">
              <Leaf className="w-4 h-4 fill-lime text-forest" />
            </div>
            <span className="font-heading font-extrabold text-sm sm:text-base text-ink tracking-tight">
              Grocerly: <span className="font-normal text-ink-muted">Good Food. Brighter Days.</span>
            </span>
          </div>

          {/* CENTER: Editorial Mission Capsule */}
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-ink-muted text-center">
            HEALTHY PEOPLE &bull; HEALTHY HOMES &bull; A BRIGHTER TOMORROW
          </div>

          {/* RIGHT: Handwritten Signature */}
          <div className="text-right">
            <div className="font-script text-2xl sm:text-3xl font-bold text-forest leading-tight -rotate-3 hover:rotate-0 transition-transform">
              Eat Good<br />
              <span className="ml-2">Live Better ♡</span>
            </div>
          </div>
        </div>

        {/* BOTTOM: Policy & Contact Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-[rgba(22,60,41,0.05)] text-xs text-ink-muted">
          <Link href="/privacy" className="hover:text-forest transition-colors">
            Privacy Policy
          </Link>
          <span>&bull;</span>
          <Link href="/terms" className="hover:text-forest transition-colors">
            Terms of Service
          </Link>
          <span>&bull;</span>
          <Link href="/contact" className="hover:text-forest transition-colors">
            Contact Support
          </Link>
          <span>&bull;</span>
          <Link href="/orders" className="hover:text-forest transition-colors">
            My Orders
          </Link>
          <span>&bull;</span>
          <span>© {new Date().getFullYear()} Grocerly Inc.</span>
        </div>
      </div>
    </footer>
  );
}
