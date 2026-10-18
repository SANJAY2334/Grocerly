import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ShoppingBag, ArrowLeft, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="pt-36 pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center">
      <div className="w-20 h-20 rounded-full bg-forest text-lime flex items-center justify-center mb-6 shadow-spatial">
        <Sparkles className="w-10 h-10" />
      </div>

      <span className="text-xs font-bold uppercase tracking-widest text-forest mb-1">
        404 Error • Page Not Found
      </span>

      <h1 className="font-heading font-black text-3xl sm:text-5xl text-ink tracking-tight mb-3">
        Out of stock or misplaced aisle.
      </h1>

      <p className="text-sm text-ink-muted max-w-md leading-relaxed mb-8">
        The grocery page or recipe you&apos;re looking for doesn&apos;t exist or has moved to another department.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <Button variant="primary" size="lg">
            <ArrowLeft className="w-4 h-4" /> Return to Home
          </Button>
        </Link>
        <Link href="/shop">
          <Button variant="secondary" size="lg">
            <ShoppingBag className="w-4 h-4" /> Browse Catalog
          </Button>
        </Link>
      </div>
    </div>
  );
}
