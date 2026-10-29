"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { Order, UserAccount } from "@/lib/types";
import {
  ShoppingBag,
  CreditCard,
  Heart,
  Package,
  ArrowRight,
  Sparkles,
  ChevronDown,
  TrendingUp,
  Leaf,
  LogOut,
  Shield,
  MapPin,
  Clock,
  User as UserIcon,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    setUser,
    orders,
    setOrders,
    wishlist,
    addToCart,
    addToast,
    openCartDrawer,
  } = useStore();

  const [loadingOrders, setLoadingOrders] = useState(false);
  const [spendingRange, setSpendingRange] = useState("Past Orders");

  const loadUserData = useCallback(async () => {
    try {
      // Refresh current user session
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        setUser(null);
        router.push("/login?redirect=/dashboard");
        return;
      }
      const meData = await meRes.json();
      if (meData.user) {
        setUser(meData.user);
      } else {
        setUser(null);
        router.push("/login?redirect=/dashboard");
        return;
      }

      // Fetch user's orders
      setLoadingOrders(true);
      const ordersRes = await fetch("/api/orders");
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (Array.isArray(ordersData.orders)) {
          setOrders(ordersData.orders);
        }
      }
    } catch {
      // Non-blocking fallback to store cache
    } finally {
      setLoadingOrders(false);
    }
  }, [setUser, setOrders]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      addToast({
        type: "info",
        title: "Signed Out",
        message: "You have been logged out of your session.",
      });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const handleCopyId = (id: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(id);
      addToast({
        type: "success",
        title: "Order ID Copied",
        message: `${id} copied to clipboard.`,
      });
    }
  };

  const handleReorder = (order: Order) => {
    order.items.forEach((it) => {
      addToCart(it.productId, it.quantity, false);
    });
    addToast({
      type: "cart",
      title: "Order Re-added to Cart",
      message: `${order.items.length} items from #${order.id} added to cart.`,
      action: {
        label: "View Cart",
        onClick: () => openCartDrawer(),
      },
    });
  };

  // Honest calculations from real data
  const totalOrdersCount = orders.length;
  const computedTotalSpend = orders.reduce((acc, o) => {
    if (o.status !== "CANCELLED" && o.status !== "PAYMENT_FAILED") {
      return acc + o.total;
    }
    return acc;
  }, 0);
  const wishlistCount = wishlist.length;
  const activeOrders = orders.filter(
    (o) =>
      o.status !== "DELIVERED" &&
      o.status !== "CANCELLED" &&
      o.status !== "REFUNDED" &&
      o.status !== "PAYMENT_FAILED"
  );
  const activeOrderCount = activeOrders.length;

  const isStaff = user?.role === "ADMIN" || user?.role === "OPS";

  return (
    <div className="pt-24 sm:pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top Welcome Banner */}
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E5F3D6] text-forest font-heading font-black text-xl flex items-center justify-center border border-[rgba(22,60,41,0.08)] shadow-xs shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "GR"}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading font-black text-2xl sm:text-3xl text-ink tracking-tight">
                {user ? `Welcome back, ${user.name}!` : "Welcome to Grocerly"}
              </h1>
              {user && (
                <span className="bg-[#C8E27A]/35 text-[#163C29] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {user.role}
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              {user?.email || "Guest Shopper"} &bull;{" "}
              {user?.addresses?.[0]
                ? `${user.addresses[0].street}, ${user.addresses[0].city}`
                : "No saved address yet"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isStaff && (
            <Link
              href="/admin"
              className="px-4 py-2.5 rounded-full bg-[#C8E27A] hover:bg-[#b8d665] text-[#163C29] font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" /> Operations Console
            </Link>
          )}

          <Link
            href="/profile"
            className="px-4 py-2.5 rounded-full bg-[#F8F7F2] hover:bg-gray-200 text-ink font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <UserIcon className="w-3.5 h-3.5" /> Profile
          </Link>

          <Link
            href="/settings/security"
            className="px-4 py-2.5 rounded-full bg-[#F8F7F2] hover:bg-gray-200 text-ink font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" /> Security
          </Link>

          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-full bg-[#F8F7F2] hover:bg-gray-200 text-ink font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2.5 rounded-full bg-[#163C29] hover:bg-[#1f5238] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5" /> Sign In
            </Link>
          )}

          <Link
            href="/shop"
            className="px-4 py-2.5 rounded-full bg-[#163C29] hover:bg-[#1f5238] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Shop Produce
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards in Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* Card 1: Total Orders */}
        <div className="bg-white p-5 rounded-2xl border border-[rgba(22,60,41,0.08)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#F8F7F2] text-[#163C29] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
              Verified
            </span>
          </div>
          <div>
            <span className="font-heading font-black text-2xl sm:text-3xl text-ink block">
              {totalOrdersCount}
            </span>
            <span className="text-xs font-semibold text-ink-muted block mt-0.5">
              Total Orders
            </span>
          </div>
        </div>

        {/* Card 2: Total Spend */}
        <div className="bg-white p-5 rounded-2xl border border-[rgba(22,60,41,0.08)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#F8F7F2] text-[#163C29] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-forest font-bold bg-[#C8E27A]/25 px-2 py-0.5 rounded-full">
              Live Total
            </span>
          </div>
          <div>
            <span className="font-heading font-black text-2xl sm:text-3xl text-ink block">
              {formatCurrency(computedTotalSpend)}
            </span>
            <span className="text-xs font-semibold text-ink-muted block mt-0.5">
              Total Spend
            </span>
          </div>
        </div>

        {/* Card 3: Wishlist Items */}
        <Link
          href="/wishlist"
          className="bg-white p-5 rounded-2xl border border-[rgba(22,60,41,0.08)] shadow-xs flex flex-col justify-between hover:border-forest transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-red-500" />
            </div>
            <span className="text-[10px] text-ink-muted font-bold group-hover:text-forest flex items-center gap-0.5">
              View <ArrowRight className="w-3 h-3" />
            </span>
          </div>
          <div>
            <span className="font-heading font-black text-2xl sm:text-3xl text-ink block group-hover:text-forest">
              {wishlistCount}
            </span>
            <span className="text-xs font-semibold text-ink-muted block mt-0.5">
              Wishlist Items
            </span>
          </div>
        </Link>

        {/* Card 4: Active Orders */}
        <Link
          href={activeOrders[0] ? `/confirmation?orderId=${activeOrders[0].id}` : "/shop"}
          className="bg-white p-5 rounded-2xl border border-[rgba(22,60,41,0.08)] shadow-xs flex flex-col justify-between hover:border-forest transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#E5F3D6] text-forest flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
              {activeOrderCount > 0 ? "In Progress" : "All Clear"}
            </span>
          </div>
          <div>
            <span className="font-heading font-black text-2xl sm:text-3xl text-forest block">
              {activeOrderCount}
            </span>
            <span className="text-xs font-semibold text-ink-muted block mt-0.5">
              Active Orders
            </span>
          </div>
        </Link>
      </div>

      {/* Main Two-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Active Orders & Delivery Tracking */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Orders Card */}
          <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(22,60,41,0.08)]">
              <h2 className="font-heading font-extrabold text-base text-ink">
                Active Orders Tracking
              </h2>
              <span className="text-xs font-bold text-forest">
                {activeOrderCount} pending
              </span>
            </div>

            {activeOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-muted space-y-2">
                <Package className="w-8 h-8 text-ink-subtle mx-auto stroke-1" />
                <p>No orders currently in transit.</p>
                <Link href="/shop" className="text-forest font-bold hover:underline inline-block">
                  Order fresh groceries today →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-2xl bg-[#F8F7F2] border border-[rgba(22,60,41,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-ink text-sm">
                          {ord.id}
                        </span>
                        <span className="bg-[#E5F3D6] text-[#163C29] font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                          {ord.status}
                        </span>
                      </div>
                      <span className="text-ink-muted block mt-1">
                        Slot: {ord.deliverySlot} &bull; Items: {ord.items.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-heading font-black text-sm text-forest">
                        {formatCurrency(ord.total)}
                      </span>
                      <Link
                        href={`/confirmation?orderId=${encodeURIComponent(ord.id)}`}
                        className="px-3 py-1.5 rounded-xl bg-[#163C29] text-white font-bold text-xs hover:bg-[#1f5238] transition-colors"
                      >
                        Track Status →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saved Delivery Addresses */}
          <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(22,60,41,0.08)]">
              <h3 className="font-heading font-extrabold text-base text-ink flex items-center gap-2">
                <MapPin className="w-4 h-4 text-forest" />
                <span>Delivery Addresses</span>
              </h3>
            </div>

            {user?.addresses && user.addresses.length > 0 ? (
              <div className="space-y-2.5">
                {user.addresses.map((addr, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#F8F7F2] border border-[rgba(22,60,41,0.06)] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">{addr.fullName}</span>
                      <span className="text-[10px] font-mono text-ink-muted">{addr.pincode}</span>
                    </div>
                    <p className="text-ink-muted">
                      {addr.street}, {addr.city}, {addr.state}
                    </p>
                    <span className="text-[11px] text-ink-muted block">Phone: {addr.phone}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-muted py-2">
                No saved addresses yet. Addresses are automatically saved to your profile during checkout.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Order History Ledger */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(22,60,41,0.08)]">
              <h3 className="font-heading font-extrabold text-base text-ink">
                Verified Order History
              </h3>
              <span className="text-xs text-ink-muted">{orders.length} total</span>
            </div>

            {orders.length === 0 ? (
              <p className="text-xs text-ink-muted py-4 text-center">
                No orders placed yet.
              </p>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-2xl bg-[#F8F7F2]/70 border border-[rgba(22,60,41,0.06)] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleCopyId(ord.id)}
                        className="font-mono font-bold text-ink text-xs hover:text-forest transition-colors flex items-center gap-1 cursor-pointer"
                        title="Copy Order ID"
                      >
                        <span>{ord.id}</span>
                        <span className="text-[10px] text-ink-subtle">📋</span>
                      </button>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {ord.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {ord.items.map((it) => (
                        <span
                          key={it.productId}
                          className="bg-white px-2 py-0.5 rounded-lg border border-black/5 text-[10px] text-ink-muted"
                        >
                          {it.name} x{it.quantity}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] border-t border-[rgba(22,60,41,0.04)]">
                      <span className="text-ink-muted">{ord.createdAt}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-black text-forest">
                          {formatCurrency(ord.total)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleReorder(ord)}
                          className="px-2 py-0.5 rounded-md bg-[#163C29] text-white text-[10px] font-bold hover:bg-[#1f5238] transition-colors cursor-pointer"
                        >
                          Reorder
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
