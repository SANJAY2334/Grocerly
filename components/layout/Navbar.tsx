"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Search, Heart, ShoppingBag, Menu, X, Leaf } from "lucide-react";
import { useStore } from "@/lib/store";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { user, cart, wishlist, openCartDrawer, setFilter, openCommandPalette } = useStore();
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = wishlist.length;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setFilter("search", searchQuery.trim());
    router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const navLinks = [
    { label: "Shop", href: "/shop" },
    { label: "Categories", href: "/shop" },
    { label: "Recipes", href: "/recipes" },
    { label: "Freshness", href: "/#freshness" },
    { label: "About", href: "/dashboard" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
        isScrolled
          ? "bg-[#F8F7F2]/95 backdrop-blur-md shadow-xs border-b border-border/80 py-3"
          : "bg-[#F8F7F2] py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 lg:gap-8">
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-7 h-7 rounded-full bg-forest text-lime flex items-center justify-center">
            <Leaf className="w-4 h-4 fill-lime text-forest" />
          </div>
          <span className="font-heading font-extrabold text-xl tracking-tight text-forest">
            Grocerly
          </span>
        </Link>

        {/* Center-Left: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-ink-muted">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`transition-colors hover:text-forest ${
                  isActive ? "text-forest font-semibold" : ""
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Center-Right: Desktop Search Bar (Exact Pill style + ⌘K Command Palette trigger) */}
        <div
          onClick={openCommandPalette}
          className="hidden md:flex items-center flex-1 max-w-sm bg-surface rounded-pill px-4 py-2 border border-border/90 shadow-2xs hover:border-forest/40 transition-all cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openCommandPalette();
            }
          }}
          aria-label="Open search command palette"
        >
          <Search className="w-4 h-4 text-ink-subtle mr-2.5 shrink-0 group-hover:text-forest transition-colors" />
          <span className="w-full text-xs text-ink-subtle group-hover:text-ink transition-colors select-none">
            Search fresh groceries, recipes...
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold text-ink-muted bg-[#F8F7F2] border border-border rounded shadow-2xs shrink-0">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </div>

        {/* Right Actions: Wishlist, Cart with dark badge, User Avatar */}
        <div className="flex items-center gap-3.5 shrink-0">
          {/* Wishlist Icon */}
          <Link
            href="/wishlist"
            className="relative p-2 rounded-full text-ink hover:text-forest hover:bg-surface transition-colors"
            aria-label="Wishlist"
          >
            <Heart className="w-5 h-5 text-ink/80 hover:text-forest" />
            {wishlistCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-forest" />
            )}
          </Link>

          {/* Cart with Dark Badge */}
          <button
            onClick={openCartDrawer}
            className="relative p-2 rounded-full text-ink hover:text-forest hover:bg-surface transition-colors"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5 text-ink/80 hover:text-forest" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-forest text-surface font-extrabold text-[10px] flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>

          {/* Staff Admin Portal Link if authenticated staff */}
          {user && (user.role === "ADMIN" || user.role === "OPS") && (
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider bg-[#C8E27A] hover:bg-[#b8d665] text-[#163C29] px-2.5 py-1 rounded-full transition-colors"
            >
              <span>{user.role}</span>
            </Link>
          )}

          {/* User Profile Avatar / Sign In */}
          {user ? (
            <Link
              href="/dashboard"
              className="relative w-8 h-8 rounded-full overflow-hidden bg-[#E5F3D6] text-forest font-heading font-black text-xs flex items-center justify-center border border-border shadow-xs hover:ring-2 hover:ring-forest transition-all shrink-0"
              title={`Dashboard (${user.name})`}
            >
              <span>{user.name ? user.name.slice(0, 2).toUpperCase() : "U"}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-xs font-bold text-forest hover:text-forest/80 px-2.5 py-1 rounded-full hover:bg-surface transition-colors"
            >
              Sign In
            </Link>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-full text-ink hover:bg-surface"
            aria-label="Toggle Navigation"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-surface px-4 py-4 shadow-spatial animate-in slide-in-from-top">
          <div
            onClick={() => {
              setIsMobileMenuOpen(false);
              openCommandPalette();
            }}
            className="flex items-center justify-between bg-surface-muted rounded-pill px-4 py-2 border border-border mb-3 cursor-pointer"
          >
            <div className="flex items-center">
              <Search className="w-4 h-4 text-ink-subtle mr-2.5" />
              <span className="text-xs text-ink-subtle">Search groceries, recipes...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[9px] font-bold text-ink-muted bg-white border border-border rounded">
              Search
            </kbd>
          </div>
          <div className="flex flex-col gap-1 text-sm font-semibold text-ink">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-spatial-sm hover:bg-surface-muted transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
