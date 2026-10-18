"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Order } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  ArrowLeft,
  Package,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
} from "lucide-react";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const { addToast } = useStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.status === 401) {
          router.push(`/login?redirect=/orders/${orderId}`);
          return;
        }
        const data = await res.json();
        if (res.ok && data.order) {
          setOrder(data.order);
        } else {
          setError(data.error?.message || data.error || "Order not found or permission denied.");
        }
      } catch {
        setError("Network error loading order details.");
      } finally {
        setLoading(false);
      }
    }
    if (orderId) loadOrder();
  }, [orderId, router]);

  const handleCancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          note: "Customer requested cancellation via portal",
        }),
      });

      const data = await res.json();
      setCancelling(false);

      if (res.ok && data.order) {
        setOrder(data.order);
        addToast({
          type: "info",
          title: "Order Cancelled",
          message: "Your order has been cancelled and any reserved stock released.",
        });
      } else {
        addToast({
          type: "error",
          title: "Cancellation Failed",
          message: data.error?.message || data.error || "Order cannot be cancelled at this stage.",
        });
      }
    } catch {
      setCancelling(false);
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to communicate with cancellation service.",
      });
    }
  };

  if (loading) {
    return (
      <div className="pt-32 pb-20 max-w-4xl mx-auto px-4 text-center text-xs text-[#6B7280]">
        Loading order details...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="pt-28 pb-20 max-w-md mx-auto px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="font-heading font-bold text-lg text-[#1A221E]">Order Unavailable</h2>
        <p className="text-xs text-[#6B7280]">{error || "Could not retrieve order details."}</p>
        <Link
          href="/orders"
          className="inline-block py-2.5 px-5 rounded-xl bg-[#163C29] text-white text-xs font-bold"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  // 4-Stage Timeline Definition
  const timelineStages = [
    { label: "Confirmed", status: "CONFIRMED" },
    { label: "Processing", status: "PROCESSING" },
    { label: "Packed", status: "PACKED" },
    { label: "Out for Delivery", status: "OUT_FOR_DELIVERY" },
    { label: "Delivered", status: "DELIVERED" },
  ];

  const statusPriority: Record<string, number> = {
    PENDING_PAYMENT: 0,
    CONFIRMED: 1,
    PROCESSING: 2,
    PACKED: 3,
    OUT_FOR_DELIVERY: 4,
    DELIVERED: 5,
    CANCELLED: -1,
  };

  const currentStageIndex = statusPriority[order.status] ?? 0;
  const canCancel = order.status === "PENDING_PAYMENT" || order.status === "CONFIRMED";

  return (
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-10 shadow-xs space-y-8">
        <div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#163C29] hover:underline mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to All Orders
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-black text-2xl sm:text-3xl text-[#1A221E]">
                  Order #{order.id}
                </h1>
                <span className="px-3 py-1 rounded-full bg-[#C8E27A] text-[#163C29] text-xs font-black uppercase">
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-1">
                Placed on {new Date(order.timestamp).toLocaleString()}
              </p>
            </div>

            {canCancel && (
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="py-2.5 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{cancelling ? "Cancelling..." : "Cancel Order"}</span>
              </button>
            )}
          </div>
        </div>

        {/* 4-Stage Visual Fulfillment Timeline */}
        {order.status !== "CANCELLED" && (
          <div className="p-6 rounded-2xl bg-[#F8F7F2] border border-black/5 space-y-4">
            <h3 className="font-heading font-bold text-xs uppercase text-[#6B7280] tracking-wider">
              Fulfillment Journey
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {timelineStages.map((stage, idx) => {
                const isPassed = currentStageIndex >= idx + 1;
                const isCurrent = currentStageIndex === idx + 1;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-center space-y-1 ${
                      isCurrent
                        ? "bg-[#163C29] text-white border-[#163C29] shadow-xs"
                        : isPassed
                        ? "bg-white text-emerald-800 border-emerald-200"
                        : "bg-white/50 text-gray-400 border-gray-100"
                    }`}
                  >
                    <div className="flex justify-center">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    <div className="text-[11px] font-bold">{stage.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Address and Delivery Slot Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[#F8F7F2] border border-black/5 space-y-2">
            <div className="flex items-center gap-2 font-heading font-bold text-xs text-[#163C29]">
              <MapPin className="w-4 h-4" /> Destination Address
            </div>
            <div className="text-xs font-bold text-[#1A221E]">{order.address.fullName}</div>
            <div className="text-xs text-[#6B7280]">{order.address.street}</div>
            <div className="text-xs text-[#6B7280]">
              {order.address.city}, {order.address.state} — {order.address.pincode}
            </div>
            <div className="text-[11px] font-semibold text-[#163C29] pt-1">{order.address.phone}</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#F8F7F2] border border-black/5 space-y-2">
            <div className="flex items-center gap-2 font-heading font-bold text-xs text-[#163C29]">
              <Clock className="w-4 h-4" /> Delivery Window & Payment
            </div>
            <div className="text-xs font-bold text-[#1A221E]">{order.deliverySlot}</div>
            <div className="text-xs text-[#6B7280]">
              Payment Method: <span className="font-semibold text-[#1A221E]">{order.paymentMethod}</span>
            </div>
            <div className="text-xs text-[#6B7280]">
              Status: <span className="font-semibold text-[#163C29]">{order.paymentStatus}</span>
            </div>
          </div>
        </div>

        {/* Purchased Items List */}
        <div className="space-y-4">
          <h3 className="font-heading font-bold text-base text-[#163C29]">
            Purchased Harvest Items ({order.items.length})
          </h3>
          <div className="divide-y divide-black/5">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#F8F7F2] border border-black/5 overflow-hidden shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#1A221E]">{item.name}</div>
                    <div className="text-[11px] text-[#6B7280]">
                      {item.unit} • ₹{item.unitPrice ?? item.price ?? 0} each
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xs text-[#1A221E]">
                    ₹{(item.lineTotal || (item.unitPrice ?? item.price ?? 0) * item.quantity).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-[#6B7280]">Qty: {item.quantity}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final Price Breakdown */}
        <div className="p-5 rounded-2xl bg-[#F8F7F2] border border-black/5 space-y-2 max-w-sm ml-auto">
          <div className="flex justify-between text-xs text-[#6B7280]">
            <span>Items Subtotal</span>
            <span>₹{(order.pricing?.itemSubtotal || order.subtotal).toFixed(2)}</span>
          </div>
          {order.pricing?.discountAmount ? (
            <div className="flex justify-between text-xs text-emerald-700 font-bold">
              <span>Coupon Discount ({order.pricing.couponCode})</span>
              <span>-₹{order.pricing.discountAmount.toFixed(2)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-xs text-[#6B7280]">
            <span>Delivery Fee</span>
            <span>
              {order.pricing?.deliveryFee === 0 ? "FREE" : `₹${order.pricing?.deliveryFee || 0}`}
            </span>
          </div>
          <div className="flex justify-between text-xs text-[#6B7280]">
            <span>GST (5% Inclusive)</span>
            <span>₹{(order.pricing?.gstAmount || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-[#163C29] pt-2 border-t border-black/10">
            <span>Total Payable</span>
            <span>₹{(order.pricing?.finalPayable || order.total).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
