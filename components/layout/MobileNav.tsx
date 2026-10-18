"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ChefHat, Heart, User } from "lucide-react";
import { useStore } from "@/lib/store";

export function MobileNav() {
  const pathname = usePathname();
  const { cart, wishlist } = useStore();
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const wishlistCount = wishlist.length;

  const items = [
    { label: "Home", href: "/", icon: Home },
    { label: "Shop", href: "/shop", icon: ShoppingBag, badge: cartCount },
    { label: "Recipes", href: "/recipes", icon: ChefHat },
    { label: "Wishlist", href: "/wishlist", icon: Heart, badge: wishlistCount },
    { label: "Account", href: "/dashboard", icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-border shadow-spatial py-2 px-3 safe-area-pb">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-spatial-sm transition-colors ${
                isActive ? "text-forest font-bold" : "text-ink-muted hover:text-ink"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 rounded-full bg-forest text-surface font-extrabold text-[9px] flex items-center justify-center px-1">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
