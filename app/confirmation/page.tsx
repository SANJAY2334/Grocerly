"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useStore } from "@/lib/store";
import { Order, OrderStatus } from "@/lib/types";
import {
  ORDER_STATUS_DESCRIPTIONS,
  ORDER_STATUS_LABELS,
} from "@/lib/order-state-machine";
import { formatCurrency } from "@/lib/utils";
import {
  AlertCircle,
  Check,
  Clock,
  FileText,
  PackageCheck,
  Printer,
  RefreshCw,
  Share2,
  ShoppingBag,
  Truck,
  X,
  XCircle,
} from "lucide-react";

const PROGRESS_STAGES: Array<{
  key: OrderStatus;
  label: string;
}> = [
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PROCESSING", label: "Processing" },
  { key: "PACKED", label: "Packed" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const queryOrderId = searchParams.get("orderId");

  const { currentOrder, orders, setCurrentOrder, updateOrderInStore, addToast } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);

  const loadOrder = useCallback(
    async (targetId: string) => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(targetId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.order) {
            setOrder(data.order);
            setCurrentOrder(data.order);
            updateOrderInStore(data.order);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to local store copy if offline
      }

      const localMatch =
        (currentOrder && currentOrder.id === targetId ? currentOrder : null) ||
        orders.find((o) => o.id === targetId) ||
        null;
      setOrder(localMatch);
      setLoading(false);
    },
    [currentOrder, orders, setCurrentOrder, updateOrderInStore]
  );

  useEffect(() => {
    const resolvedId = queryOrderId || currentOrder?.id || orders[0]?.id;
    if (!resolvedId) {
      setOrder(null);
      setLoading(false);
      return;
    }
    loadOrder(resolvedId);
  }, [queryOrderId, currentOrder?.id, orders, loadOrder]);

  useEffect(() => {
    if (order && (order.status === "CONFIRMED" || order.status === "DELIVERED")) {
      try {
        confetti({
          particleCount: 65,
          spread: 65,
          origin: { y: 0.55 },
          colors: ["#163C29", "#C8E27A", "#B2D354", "#34683E"],
        });
      } catch {
        // Ignore in headless environments
      }
    }
  }, [order]);

  const handleShareLink = () => {
    if (typeof window !== "undefined" && order) {
      const shareUrl = `${window.location.origin}/confirmation?orderId=${encodeURIComponent(order.id)}`;
      navigator.clipboard.writeText(shareUrl);
      addToast({
        type: "success",
        title: "Order Link Copied",
        message: `Link for order ${order.id} copied to clipboard.`,
      });
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          note: "Cancelled by customer from order confirmation screen",
        }),
      });
      const data = await res.json();
      if (res.ok && data.order) {
        setOrder(data.order);
        setCurrentOrder(data.order);
        updateOrderInStore(data.order);
        addToast({
          type: "info",
          title: "Order Cancelled",
          message: `Order ${order.id} has been cancelled and reserved stock was released.`,
        });
      } else {
        addToast({
          type: "error",
          title: "Cannot Cancel Order",
          message: data.error || "Order can no longer be cancelled at this stage.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        message: "Could not reach server to cancel order.",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-28 pb-20 max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-10 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-[#163C29] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-bold text-ink-muted">Loading verified order record...</p>
        </div>
      </div>
    );
  }

  // Honest Empty State — Never fabricate a fake order when none exists
  if (!order) {
    return (
      <div className="pt-28 pb-20 max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-8 sm:p-12 shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#F8F7F2] text-forest flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-ink">
            No Order Found
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto">
            We could not find an active or matching order ID. Place a real order from our shop or check your account dashboard for past orders.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/shop"
              className="px-6 py-3 rounded-full bg-[#163C29] hover:bg-[#1f5238] text-white font-bold text-xs shadow-xs transition-all"
            >
              Browse Fresh Produce →
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-full bg-[#F8F7F2] hover:bg-gray-200/70 text-ink font-bold text-xs transition-all"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isTerminalNegative =
    order.status === "CANCELLED" ||
    order.status === "PAYMENT_FAILED" ||
    order.status === "REFUNDED";
  const isPendingPayment = order.status === "PENDING_PAYMENT";
  const canCustomerCancel =
    order.status === "PENDING_PAYMENT" || order.status === "CONFIRMED";

  const currentStageIndex = PROGRESS_STAGES.findIndex((s) => s.key === order.status);
  const activeIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

  return (
    <div className="pt-24 sm:pt-28 pb-20 max-w-2xl mx-auto px-4 sm:px-6">
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-10 shadow-xs text-center space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-forest uppercase tracking-widest block">
            Order Status & Receipt
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadOrder(order.id)}
              className="flex items-center gap-1 text-xs font-bold text-ink-muted hover:text-forest transition-colors p-1.5 rounded-lg hover:bg-[#F8F7F2]"
              title="Refresh live status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleShareLink}
              className="flex items-center gap-1.5 text-xs font-bold text-ink-muted hover:text-forest transition-colors p-1.5 rounded-lg hover:bg-[#F8F7F2]"
              title="Copy order link"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        {/* Status Icon Badge */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          {isTerminalNegative ? (
            <div className="w-18 h-18 rounded-full bg-red-100 text-red-700 flex items-center justify-center shadow-xs">
              <XCircle className="w-9 h-9" />
            </div>
          ) : isPendingPayment ? (
            <div className="w-18 h-18 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <Clock className="w-9 h-9" />
            </div>
          ) : (
            <div className="w-18 h-18 rounded-full bg-[#E5F3D6] text-[#163C29] flex items-center justify-center shadow-xs">
              <Check className="w-9 h-9 stroke-[3.2]" />
            </div>
          )}
        </div>

        {/* Headline */}
        <div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-ink leading-tight">
            {isTerminalNegative
              ? `Order ${ORDER_STATUS_LABELS[order.status]}`
              : isPendingPayment
              ? "Awaiting Payment Confirmation"
              : "Order Confirmed!"}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            {ORDER_STATUS_DESCRIPTIONS[order.status]}
          </p>
        </div>

        {/* Order Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#F8F7F2] p-4 rounded-2xl border border-[rgba(22,60,41,0.06)] text-xs text-left">
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider block">
              Order ID
            </span>
            <span className="font-mono font-bold text-ink block mt-0.5">{order.id}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider block">
              Delivery Window
            </span>
            <span className="font-bold text-ink block mt-0.5">{order.deliverySlot}</span>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider block">
              Payment Status
            </span>
            <span className="font-bold text-forest block mt-0.5">
              {order.paymentMethod} • {order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Progress Bar (Only for non-cancelled/active progression) */}
        {!isTerminalNegative && !isPendingPayment && (
          <div className="pt-2 pb-1">
            <div className="flex items-center justify-between relative px-2 sm:px-6">
              <div className="absolute left-6 right-6 top-3.5 h-0.5 bg-gray-200 -z-0" />
              <div
                className="absolute left-6 top-3.5 h-0.5 bg-[#163C29] transition-all duration-500 -z-0"
                style={{
                  width: `${(activeIndex / (PROGRESS_STAGES.length - 1)) * 84}%`,
                }}
              />

              {PROGRESS_STAGES.map((stage, idx) => {
                const isPast = idx < activeIndex;
                const isCurrent = idx === activeIndex;

                return (
                  <div
                    key={stage.key}
                    className="flex flex-col items-center gap-1.5 relative z-10 bg-white px-1"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        isPast
                          ? "bg-[#163C29] text-white"
                          : isCurrent
                          ? "bg-[#163C29] text-white ring-4 ring-[#E5F3D6]"
                          : "bg-white border-2 border-gray-300 text-gray-300"
                      }`}
                    >
                      {isPast || isCurrent ? "✓" : "○"}
                    </div>
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold ${
                        isCurrent || isPast ? "text-[#163C29]" : "text-ink-muted font-normal"
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Current Status & Honest Customer Cancellation Action */}
        <div className="p-3.5 bg-[#E5F3D6]/45 rounded-2xl border border-[#C8E27A]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#163C29] text-[#C8E27A] flex items-center justify-center shrink-0">
              {order.status === "OUT_FOR_DELIVERY" ? (
                <Truck className="w-4 h-4" />
              ) : isTerminalNegative ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <PackageCheck className="w-4 h-4" />
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-[#163C29] block">
                Current Status: {ORDER_STATUS_LABELS[order.status]}
              </span>
              <span className="text-[11px] text-ink-muted block">
                Delivering to: {order.address.fullName}, {order.address.street}, {order.address.city} -{" "}
                {order.address.pincode}
              </span>
            </div>
          </div>

          {canCustomerCancel && (
            <button
              type="button"
              disabled={isCancelling}
              onClick={handleCancelOrder}
              className="text-[11px] font-bold text-red-700 bg-white hover:bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 transition-colors shrink-0 cursor-pointer"
            >
              {isCancelling ? "Cancelling..." : "Cancel Order"}
            </button>
          )}
        </div>

        {/* Recorded Server Audit Timeline (No Fabricated Telemetry) */}
        {order.timeline && order.timeline.length > 0 && (
          <div className="text-left bg-[#F8F7F2] rounded-2xl p-4 border border-[rgba(22,60,41,0.06)] space-y-2.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted block">
              Verified Order Event Log
            </span>
            <div className="space-y-2">
              {order.timeline.map((event, idx) => (
                <div
                  key={`${event.status}-${event.timestamp}-${idx}`}
                  className="flex items-start justify-between gap-3 text-xs border-b border-black/5 last:border-none pb-2 last:pb-0"
                >
                  <div>
                    <span className="font-bold text-ink">
                      {ORDER_STATUS_LABELS[event.status] || event.status}
                    </span>
                    <span className="text-[11px] text-ink-muted block">{event.note}</span>
                  </div>
                  <span className="text-[10px] font-mono text-ink-muted shrink-0">
                    {new Date(event.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Itemized Order Receipt */}
        <div className="pt-2 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wider block">
              Order Items ({order.items.reduce((acc, i) => acc + i.quantity, 0)})
            </span>
            <button
              type="button"
              onClick={() => setShowInvoiceModal(true)}
              className="text-xs font-bold text-forest hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Tax Invoice</span>
            </button>
          </div>

          <div className="divide-y divide-[rgba(22,60,41,0.06)] border-y border-[rgba(22,60,41,0.06)] text-xs">
            {order.items.map((item) => (
              <div
                key={item.productId}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-[#F8F7F2] shrink-0 border border-black/5">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-contain p-0.5"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-ink block">{item.name}</span>
                    <span className="text-[10px] text-ink-muted">
                      {formatCurrency(item.price ?? item.unitPrice ?? 0)} × {item.quantity} ({item.unit})
                    </span>
                  </div>
                </div>
                <span className="font-extrabold text-forest">
                  {formatCurrency((item.price ?? item.unitPrice ?? 0) * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 space-y-1.5 text-xs">
            {order.mrpTotal && order.mrpTotal > order.subtotal && (
              <div className="flex justify-between text-ink-muted">
                <span>MRP Total</span>
                <span>{formatCurrency(order.mrpTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink-muted">
              <span>Item Subtotal</span>
              <span className="font-bold text-ink">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.couponDiscount && order.couponDiscount > 0 ? (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Coupon Discount ({order.couponCode})</span>
                <span>-{formatCurrency(order.couponDiscount)}</span>
              </div>
            ) : order.discount > 0 ? (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Total Savings</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Delivery Fee</span>
              <span>{order.deliveryFee === 0 ? "FREE" : formatCurrency(order.deliveryFee)}</span>
            </div>
            {typeof order.gstAmount === "number" && (
              <div className="flex justify-between text-[11px] text-ink-muted">
                <span>Included GST (5%)</span>
                <span>{formatCurrency(order.gstAmount)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-[rgba(22,60,41,0.08)] flex justify-between text-sm font-extrabold text-ink">
              <span>Total Amount</span>
              <span className="font-heading font-black text-lg text-forest">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
          <Link
            href="/dashboard"
            className="w-full py-3 px-6 rounded-full bg-white hover:bg-[#F8F7F2] text-ink text-center font-bold text-xs border border-[rgba(22,60,41,0.15)] shadow-2xs transition-all"
          >
            View in Dashboard
          </Link>
          <Link
            href="/shop"
            className="w-full py-3 px-6 rounded-full bg-[#163C29] hover:bg-[#1f5238] text-white text-center font-bold text-xs shadow-xs transition-all"
          >
            Continue Shopping &rarr;
          </Link>
        </div>
      </div>

      {/* Tax Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[rgba(22,60,41,0.1)] relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowInvoiceModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-gray-100 pb-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-black text-xl text-forest">
                    Grocerly Retail Ltd.
                  </h3>
                  <p className="text-[11px] text-ink-muted">
                    GSTIN: 27AABCU9603R1ZM &bull; FSSAI: 10023022001842
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded bg-[#E5F3D6] text-forest text-[10px] font-extrabold">
                    TAX INVOICE
                  </span>
                  <p className="text-[11px] font-mono mt-1 text-ink-muted">{order.id}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-4 p-3 bg-[#F8F7F2] rounded-xl">
              <div>
                <span className="text-[10px] font-bold text-ink-muted uppercase block">
                  Billed & Shipped To
                </span>
                <p className="font-bold text-ink mt-0.5">{order.address.fullName}</p>
                <p className="text-[11px] text-ink-muted">
                  {order.address.street}, {order.address.city} - {order.address.pincode}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-ink-muted uppercase block">
                  Payment & Timestamp
                </span>
                <p className="font-bold text-ink mt-0.5">
                  {order.paymentMethod} ({order.paymentStatus})
                </p>
                <p className="text-[11px] text-ink-muted">{order.createdAt}</p>
              </div>
            </div>

            <table className="w-full text-xs text-left mb-4">
              <thead>
                <tr className="border-b border-gray-200 text-ink-muted text-[10px] uppercase font-bold">
                  <th className="py-1.5">Item</th>
                  <th className="py-1.5 text-center">Qty</th>
                  <th className="py-1.5 text-right">Unit Price</th>
                  <th className="py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <tr key={item.productId}>
                    <td className="py-2 font-medium text-ink">{item.name}</td>
                    <td className="py-2 text-center text-ink-muted">{item.quantity}</td>
                    <td className="py-2 text-right text-ink-muted">{formatCurrency(item.price ?? item.unitPrice ?? 0)}</td>
                    <td className="py-2 text-right font-bold text-forest">
                      {formatCurrency((item.price ?? item.unitPrice ?? 0) * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-gray-200 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-ink-muted">
                <span>Item Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.couponDiscount && order.couponDiscount > 0 ? (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Coupon ({order.couponCode})</span>
                  <span>-{formatCurrency(order.couponDiscount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-ink-muted">
                <span>Delivery Charges</span>
                <span>
                  {order.deliveryFee === 0 ? "₹0 (Free)" : formatCurrency(order.deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Included GST (2.5% CGST + 2.5% SGST)</span>
                <span>
                  {formatCurrency(order.gstAmount ?? Math.round(order.subtotal * 0.05))}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-extrabold text-sm text-forest">
                <span>Grand Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 rounded-full border border-gray-200 text-xs font-bold hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
                className="px-5 py-2 rounded-full bg-[#163C29] text-white text-xs font-bold hover:bg-[#1f5238] flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-28 pb-20 max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-10 shadow-xs">
            <p className="text-xs font-bold text-ink-muted">Loading order confirmation...</p>
          </div>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
