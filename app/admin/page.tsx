"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useStore } from "@/lib/store";
import { Order, OrderStatus, Product, Coupon, AuditLogEntry } from "@/lib/types";
import {
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
} from "@/lib/order-state-machine";
import { formatCurrency } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  Filter,
  KeyRound,
  Layers,
  Lock,
  Package,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Tag,
  Truck,
  UserCheck,
  X,
} from "lucide-react";

export default function AdminPage() {
  const { user, setUser, catalogue, setCatalogue, addToast } = useStore();

  const [activeTab, setActiveTab] = useState<"inventory" | "orders" | "coupons" | "audit">(
    "inventory"
  );
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState<boolean>(() => Boolean(user && (user.role === "ADMIN" || user.role === "OPS")));

  // Inventory state
  const [products, setProducts] = useState<Product[]>(catalogue);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState<number>(0);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [updatingInventory, setUpdatingInventory] = useState(false);

  // Orders state
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>("ALL");
  const [transitioningOrderId, setTransitioningOrderId] = useState<string | null>(null);

  // Coupons state
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Verify authenticated user role
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const storeUser = useStore.getState().user;
      if (meRes.ok) {
        const meData = await meRes.json();
        const meUser = meData.data?.user || meData.user;
        if (meUser) {
          if (!storeUser || storeUser.id !== meUser.id || storeUser.role !== meUser.role) {
            setUser(meUser);
          }
          if (meUser.role === "ADMIN" || meUser.role === "OPS") {
            setIsStaff(true);
          } else {
            setIsStaff(false);
            setLoading(false);
            return;
          }
        } else if (storeUser && (storeUser.role === "ADMIN" || storeUser.role === "OPS")) {
          setIsStaff(true);
        } else {
          setIsStaff(false);
          setLoading(false);
          return;
        }
      } else if (storeUser && (storeUser.role === "ADMIN" || storeUser.role === "OPS")) {
        setIsStaff(true);
      } else {
        setIsStaff(false);
        setLoading(false);
        return;
      }

      // 2. Fetch products & live inventory
      const prodRes = await fetch("/api/products");
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const prodList = prodData.data?.products || prodData.products;
        if (prodList) {
          setProducts(prodList);
          setCatalogue(prodList);
        }
      }

      // 3. Fetch all orders (Staff RBAC returns all customer orders)
      const ordRes = await fetch("/api/orders");
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        const ordList = ordData.data?.orders || ordData.orders;
        if (ordList) {
          setAllOrders(ordList);
        }
      }

      // 4. Load inventory & coupons & audit via admin inventory endpoint
      const invRes = await fetch("/api/admin/inventory");
      if (invRes.ok) {
        const invData = await invRes.json();
        const invPayload = invData.data || invData;
        if (invPayload.products) setProducts(invPayload.products);
        if (invPayload.coupons) setCoupons(invPayload.coupons);
        if (invPayload.auditLogs) setAuditLogs(invPayload.auditLogs);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }, [setUser, setCatalogue]);

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setUpdatingInventory(true);

    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: editingProduct.id,
          stockDelta,
          price: newPrice > 0 ? newPrice : undefined,
          reason: `Admin manual adjustment by ${user?.email || "staff"}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.product) {
        setProducts((prev) =>
          prev.map((p) => (p.id === data.product.id ? data.product : p))
        );
        setCatalogue(
          products.map((p) => (p.id === data.product.id ? data.product : p))
        );
        addToast({
          type: "success",
          title: "Inventory Updated",
          message: `${data.product.name}: stock is now ${data.product.stock} units.`,
        });
        setEditingProduct(null);
        setStockDelta(0);
      } else {
        addToast({
          type: "error",
          title: "Update Failed",
          message: data.error || "Could not update inventory.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        message: "Failed to connect to inventory service.",
      });
    } finally {
      setUpdatingInventory(false);
    }
  };

  const handleTransitionOrder = async (orderId: string, nextStatus: OrderStatus) => {
    setTransitioningOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          note: `Advanced to ${nextStatus} by ${user?.role || "Staff"} (${user?.name || "Operations"})`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.order) {
        setAllOrders((prev) =>
          prev.map((o) => (o.id === data.order.id ? data.order : o))
        );
        addToast({
          type: "success",
          title: "Order Status Advanced",
          message: `Order #${orderId} moved to ${ORDER_STATUS_LABELS[nextStatus]}.`,
        });
      } else {
        addToast({
          type: "error",
          title: "Transition Disallowed",
          message: data.error || "Invalid status transition.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        message: "Could not update order status.",
      });
    } finally {
      setTransitioningOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 text-center">
        <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-12 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-forest border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-bold text-ink-muted">
            Verifying staff credentials & RBAC authorization...
          </p>
        </div>
      </div>
    );
  }

  // RBAC Access Control Gate
  if (!isStaff) {
    return (
      <div className="pt-28 pb-20 max-w-lg mx-auto px-4 text-center">
        <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-8 sm:p-10 shadow-xs space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="font-heading font-black text-2xl text-ink">
            Staff Access Required
          </h1>
          <p className="text-xs text-ink-muted max-w-sm mx-auto">
            This administrative and operations console is restricted to authenticated users with <strong>ADMIN</strong> or <strong>OPS</strong> privileges.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-full bg-[#163C29] text-white text-xs font-bold hover:bg-[#1f5238] transition-all"
            >
              Sign In as Staff →
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-full bg-[#F8F7F2] text-ink text-xs font-bold hover:bg-gray-200 transition-all"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders =
    orderFilter === "ALL"
      ? allOrders
      : allOrders.filter((o) => o.status === orderFilter);

  const lowStockCount = products.filter(
    (p) => p.stock <= (p.lowStockThreshold ?? 10)
  ).length;

  return (
    <div className="pt-24 sm:pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-forest text-[#C8E27A] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-ink">
              Operations & Inventory Console
            </h1>
            <span className="bg-[#C8E27A]/35 text-[#163C29] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
              {user?.role}
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Logged in as {user?.name} ({user?.email}) &bull; Enforcing authoritative state machine transitions and stock reservations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === "ADMIN" && (
            <Link
              href="/admin/staff-setup"
              className="px-3.5 py-2 rounded-xl bg-forest hover:bg-forest/90 text-[#C8E27A] font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <KeyRound className="w-3.5 h-3.5" /> Staff Setup
            </Link>
          )}
          <button
            type="button"
            onClick={loadAdminData}
            className="px-3.5 py-2 rounded-xl bg-[#F8F7F2] hover:bg-gray-200 text-ink font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link
            href="/dashboard"
            className="px-3.5 py-2 rounded-xl bg-white border border-black/10 hover:border-forest text-ink font-bold text-xs transition-colors"
          >
            Customer View
          </Link>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-[rgba(22,60,41,0.08)] shadow-2xs gap-1.5 overflow-x-auto text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "inventory"
              ? "bg-[#163C29] text-white shadow-xs font-black"
              : "text-ink-muted hover:text-ink hover:bg-[#F8F7F2]"
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Inventory & Stock ({products.length})</span>
          {lowStockCount > 0 && (
            <span className="ml-1 bg-amber-400 text-black text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
              {lowStockCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "orders"
              ? "bg-[#163C29] text-white shadow-xs font-black"
              : "text-ink-muted hover:text-ink hover:bg-[#F8F7F2]"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Order Fulfillment ({allOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("coupons")}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "coupons"
              ? "bg-[#163C29] text-white shadow-xs font-black"
              : "text-ink-muted hover:text-ink hover:bg-[#F8F7F2]"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Coupons & Promos ({coupons.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "audit"
              ? "bg-[#163C29] text-white shadow-xs font-black"
              : "text-ink-muted hover:text-ink hover:bg-[#F8F7F2]"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Audit Log Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: INVENTORY MANAGEMENT */}
      {activeTab === "inventory" && (
        <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[rgba(22,60,41,0.08)]">
            <div>
              <h2 className="font-heading font-extrabold text-lg text-ink">
                Stock & Pricing Control
              </h2>
              <p className="text-xs text-ink-muted">
                Real-time catalogue inventory. Adjust stock counts, replenish shelves, and inspect reserved units.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search produce..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8F7F2] pl-8 pr-3 py-1.5 rounded-xl text-xs border border-black/10 focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-200 text-ink-muted text-[10px] uppercase font-bold">
                  <th className="py-2.5 px-2">Product</th>
                  <th className="py-2.5 px-2">Category</th>
                  <th className="py-2.5 px-2 text-right">Price</th>
                  <th className="py-2.5 px-2 text-center">Available Stock</th>
                  <th className="py-2.5 px-2 text-center">Reserved</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((p) => {
                  const isLow = p.stock <= (p.lowStockThreshold ?? 10);
                  const isOOS = p.stock <= 0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/70">
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-[#F8F7F2] shrink-0 border border-black/5">
                            <Image
                              src={p.image}
                              alt={p.name}
                              fill
                              className="object-contain p-0.5"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-ink block">{p.name}</span>
                            <span className="text-[10px] text-ink-muted font-mono">{p.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-ink-muted capitalize">{p.category}</td>
                      <td className="py-2 px-2 text-right font-bold text-forest">
                        {formatCurrency(p.price)} / {p.unit}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-ink">
                        {p.stock}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-ink-muted">
                        {p.reservedStock ?? 0}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {isOOS ? (
                          <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Low Stock
                          </span>
                        ) : (
                          <span className="bg-[#E5F3D6] text-forest text-[10px] font-bold px-2 py-0.5 rounded-full">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(p);
                            setStockDelta(0);
                            setNewPrice(p.price);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#F8F7F2] hover:bg-forest hover:text-white text-ink text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ORDER OPERATIONS & STATE TRANSITIONS */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[rgba(22,60,41,0.08)]">
            <div>
              <h2 className="font-heading font-extrabold text-lg text-ink">
                Order Fulfillment Ledger
              </h2>
              <p className="text-xs text-ink-muted">
                Advance orders through the operational lifecycle. Inventory reservations are committed on completion or restored on cancellation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-ink-muted" />
              <select
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                className="bg-[#F8F7F2] px-3 py-1.5 rounded-xl text-xs font-bold border border-black/10 focus:outline-none"
              >
                <option value="ALL">All Statuses ({allOrders.length})</option>
                <option value="PENDING_PAYMENT">Pending Payment</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PROCESSING">Processing</option>
                <option value="PACKED">Packed</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <p className="text-xs text-ink-muted py-6 text-center">
                No orders match the selected status filter.
              </p>
            ) : (
              filteredOrders.map((ord) => {
                const nextAllowedTransitions = ORDER_TRANSITIONS[ord.status] || [];
                return (
                  <div
                    key={ord.id}
                    className="p-4 rounded-2xl bg-[#F8F7F2] border border-[rgba(22,60,41,0.06)] space-y-3 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-ink text-sm">{ord.id}</span>
                        <span className="bg-[#E5F3D6] text-forest font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                          {ORDER_STATUS_LABELS[ord.status]}
                        </span>
                        <span className="text-[10px] font-mono text-ink-muted">
                          {ord.paymentMethod} ({ord.paymentStatus})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-ink-muted text-[11px]">{ord.createdAt}</span>
                        <span className="font-heading font-black text-forest text-sm">
                          {formatCurrency(ord.total)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                      <div>
                        <span className="font-bold text-ink">
                          {ord.address.fullName} ({ord.address.city} - {ord.address.pincode})
                        </span>
                        <span className="text-ink-muted block mt-0.5">
                          Slot: {ord.deliverySlot} &bull; Items: {ord.items.length}
                        </span>
                      </div>

                      {/* Allowed Transitions Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-ink-muted mr-1">
                          Advance To:
                        </span>
                        {nextAllowedTransitions.length === 0 ? (
                          <span className="text-ink-subtle italic text-[10px]">
                            Terminal state
                          </span>
                        ) : (
                          nextAllowedTransitions.map((nextStatus) => (
                            <button
                              key={nextStatus}
                              type="button"
                              disabled={transitioningOrderId === ord.id}
                              onClick={() => handleTransitionOrder(ord.id, nextStatus)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                                nextStatus === "CANCELLED" || nextStatus === "REFUNDED"
                                  ? "bg-red-100 hover:bg-red-200 text-red-800"
                                  : "bg-[#163C29] hover:bg-[#1f5238] text-white"
                              }`}
                            >
                              {nextStatus.replace(/_/g, " ")}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: COUPONS & CAMPAIGNS */}
      {activeTab === "coupons" && (
        <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-[rgba(22,60,41,0.08)]">
            <h2 className="font-heading font-extrabold text-lg text-ink">Active Promotions</h2>
            <p className="text-xs text-ink-muted">
              Authoritative validation rules checked by the server before any discount is applied.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coupons.map((c) => {
              const isExpired = Date.now() > new Date(c.expiresAt).getTime() || !c.active;
              return (
                <div
                  key={c.code}
                  className={`p-4 rounded-2xl border text-xs space-y-2 ${
                    isExpired
                      ? "bg-gray-50 border-gray-200 opacity-60"
                      : "bg-[#F8F7F2] border-[rgba(22,60,41,0.06)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-forest">{c.code}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isExpired
                          ? "bg-red-100 text-red-800"
                          : "bg-[#E5F3D6] text-forest"
                      }`}
                    >
                      {isExpired ? "EXPIRED" : "ACTIVE"}
                    </span>
                  </div>
                  <p className="text-ink-muted">{c.description}</p>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5 text-[11px]">
                    <div>
                      <span className="text-ink-muted block text-[10px]">Min Subtotal:</span>
                      <span className="font-bold text-ink">{formatCurrency(c.minOrderSubtotal)}</span>
                    </div>
                    <div>
                      <span className="text-ink-muted block text-[10px]">Discount:</span>
                      <span className="font-bold text-ink">
                        {c.discountType === "FLAT" ? `₹${c.discountValue} Flat` : `${c.discountValue}%`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-[rgba(22,60,41,0.08)]">
            <h2 className="font-heading font-extrabold text-lg text-ink">
              Authoritative Audit Log
            </h2>
            <p className="text-xs text-ink-muted">
              Immutable event trail recorded for security, order status updates, and inventory changes.
            </p>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-ink-muted py-6 text-center">No audit logs recorded yet.</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#F8F7F2] border border-black/5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-forest">{log.action}</span>
                      <span className="text-[10px] text-ink-muted font-mono">{log.actorEmail}</span>
                    </div>
                    <span className="text-[11px] text-ink block mt-0.5">{log.details}</span>
                  </div>
                  <span className="text-[10px] font-mono text-ink-muted shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Inline Inventory Stock Adjustment Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[rgba(22,60,41,0.12)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-black text-base text-ink">
                Adjust Stock & Price
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 text-gray-400 hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#F8F7F2] text-xs space-y-1">
              <span className="font-bold text-ink block">{editingProduct.name}</span>
              <div className="flex justify-between text-ink-muted text-[11px]">
                <span>Current Stock: {editingProduct.stock}</span>
                <span>Current Price: {formatCurrency(editingProduct.price)}</span>
              </div>
            </div>

            <form onSubmit={handleUpdateStock} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-ink-muted mb-1">
                  Add / Deduct Stock (Delta)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    value={stockDelta}
                    onChange={(e) => setStockDelta(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none"
                    placeholder="e.g. +25 or -10"
                  />
                  <span className="text-ink-muted shrink-0 font-bold">
                    = {Math.max(0, editingProduct.stock + stockDelta)} total
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink-muted mb-1">
                  Update Price (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={newPrice}
                  onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 rounded-xl border border-black/10 font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingInventory}
                  className="flex-1 py-2.5 rounded-xl bg-[#163C29] text-white font-bold hover:bg-[#1f5238] cursor-pointer"
                >
                  {updatingInventory ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
