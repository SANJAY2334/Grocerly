"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Order, OrderStatus } from "@/lib/types";
import { ORDER_TRANSITIONS } from "@/lib/order-state-machine";
import { Truck, ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";

export default function AdminOrdersPage() {
  const router = useRouter();
  const { addToast, user } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders");
      if (res.status === 401 || res.status === 403) {
        router.push("/admin");
        return;
      }
      const data = await res.json();
      if (res.ok && data.data?.orders) {
        setOrders(data.data.orders);
      } else {
        setError(data.error?.message || "Failed to load orders.");
      }
    } catch {
      setError("Network error communicating with order service.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleAdvanceStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          note: `Advanced to ${nextStatus} via Admin Console by ${user?.name || "Staff"}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.order) {
        addToast({
          type: "success",
          title: "Order Updated",
          message: `Order #${orderId} is now ${nextStatus}.`,
        });
        loadOrders();
      } else {
        addToast({
          type: "error",
          title: "Transition Rejected",
          message: data.error?.message || data.error || "Cannot advance status.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Error",
        message: "Network error updating order.",
      });
    }
  };

  const filtered = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="pt-28 pb-20 max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-10 shadow-xs space-y-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#163C29] hover:underline mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Operations Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading font-black text-3xl text-[#1A221E] flex items-center gap-2">
                <Truck className="w-8 h-8 text-[#163C29]" /> Order Fulfillment Console
              </h1>
              <p className="text-xs text-[#6B7280] mt-1">
                Fulfillment state transitions, delivery slot dispatching, and tracking.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
              {["ALL", "PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilter(st)}
                    className={`py-1.5 px-3 rounded-xl transition-colors cursor-pointer ${
                      filter === st ? "bg-[#163C29] text-white" : "bg-[#F8F7F2] text-[#6B7280] hover:text-[#1A221E]"
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          </div>
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
        ) : filtered.length === 0 ? (
          <p className="text-xs text-[#6B7280] text-center py-8">No orders found matching this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/10 text-[#6B7280] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-bold">Order ID</th>
                  <th className="py-3 px-4 font-bold">Customer</th>
                  <th className="py-3 px-4 font-bold">Slot</th>
                  <th className="py-3 px-4 font-bold">Total</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Advance Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((o) => {
                  const allowedNext = ORDER_TRANSITIONS[o.status] || [];

                  return (
                    <tr key={o.id} className="hover:bg-[#F8F7F2]/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#163C29]">
                        <Link href={`/orders/${o.id}`} className="hover:underline">
                          #{o.id}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#1A221E]">{o.address.fullName}</div>
                        <div className="text-[11px] text-[#6B7280]">{o.address.city}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#6B7280]">{o.deliverySlot}</td>
                      <td className="py-3.5 px-4 font-bold text-[#1A221E]">
                        ₹{o.pricing ? o.pricing.finalPayable.toFixed(2) : o.total.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#C8E27A] text-[#163C29] text-[10px] font-black uppercase">
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          {allowedNext.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleAdvanceStatus(o.id, st)}
                              className="px-2 py-1 rounded-lg bg-[#163C29] hover:bg-[#1f5238] text-white text-[10px] font-bold cursor-pointer"
                            >
                              → {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
