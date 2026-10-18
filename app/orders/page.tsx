"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Order } from "@/lib/types";
import { Package, Clock, ChevronRight, AlertCircle, ShoppingBag } from "lucide-react";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch("/api/orders");
        if (res.status === 401) {
          router.push("/login?redirect=/orders");
          return;
        }
        const data = await res.json();
        if (data.orders) {
          setOrders(data.orders);
        } else {
          setError(data.error?.message || data.error || "Failed to load orders.");
        }
      } catch {
        setError("Network error connecting to orders service.");
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [router]);

  return (
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-10 shadow-xs space-y-6">
        <div>
          <h1 className="font-heading font-black text-3xl text-[#1A221E] flex items-center gap-2">
            <Package className="w-8 h-8 text-[#163C29]" /> Your Order History
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Track live deliveries, review previous grocery orders, and download invoices.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-[#6B7280]">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#F8F7F2] text-[#163C29] flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div className="font-heading font-bold text-lg text-[#1A221E]">No orders placed yet</div>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              Your organic grocery cart is waiting! Explore fresh harvest produce from local farms.
            </p>
            <Link
              href="/shop"
              className="inline-block py-3 px-6 rounded-2xl bg-[#163C29] text-white text-xs font-bold hover:bg-[#1f5238] transition-all"
            >
              Start Shopping →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusColor =
                order.status === "DELIVERED"
                  ? "bg-emerald-100 text-emerald-800"
                  : order.status === "CANCELLED"
                  ? "bg-red-100 text-red-800"
                  : "bg-[#C8E27A] text-[#163C29]";

              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block p-5 rounded-2xl bg-[#F8F7F2] border border-black/5 hover:border-[#163C29] transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-black text-sm text-[#1A221E]">
                          #{order.id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${statusColor}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6B7280] flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Slot: {order.deliverySlot}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-heading font-black text-base text-[#163C29]">
                        ₹{order.pricing ? order.pricing.finalPayable.toFixed(2) : order.total.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-[#6B7280]">
                        {order.items.length} {order.items.length === 1 ? "item" : "items"}
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail Row */}
                  <div className="flex items-center justify-between pt-3 border-t border-black/5">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {order.items.slice(0, 4).map((item, idx) => (
                        <div
                          key={idx}
                          className="w-10 h-10 rounded-xl bg-white border border-black/5 overflow-hidden shrink-0"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {order.items.length > 4 && (
                        <div className="w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center text-[10px] font-bold text-[#6B7280]">
                          +{order.items.length - 4}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-[#163C29] group-hover:translate-x-1 transition-transform">
                      <span>View Details</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
