"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useStore } from "@/lib/store";
import { Order, OrderStatus, Product, Coupon, AuditLogEntry, Category } from "@/lib/types";
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
  Percent,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Tag,
  Trash2,
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
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Add Product Modal state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState<Category>("Vegetables");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdOriginalPrice, setNewProdOriginalPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("50");
  const [newProdUnit, setNewProdUnit] = useState("1 kg");
  const [newProdImage, setNewProdImage] = useState("");
  const [newProdBrand, setNewProdBrand] = useState("Grocerly Fresh");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdOrganic, setNewProdOrganic] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);

  // Orders state
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>("ALL");
  const [transitioningOrderId, setTransitioningOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // Coupons state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDescription, setNewCouponDescription] = useState("");
  const [newCouponType, setNewCouponType] = useState<"PERCENTAGE" | "FLAT">("PERCENTAGE");
  const [newCouponValue, setNewCouponValue] = useState("");
  const [newCouponMinSubtotal, setNewCouponMinSubtotal] = useState("299");
  const [newCouponMaxDiscount, setNewCouponMaxDiscount] = useState("");
  const [newCouponExpiresAt, setNewCouponExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [newCouponUsageLimit, setNewCouponUsageLimit] = useState("500");
  const [addingCoupon, setAddingCoupon] = useState(false);
  const [deletingCouponCode, setDeletingCouponCode] = useState<string | null>(null);

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

  // Update existing product stock/price
  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (newPrice > 0) {
      if (!Number.isFinite(newPrice) || newPrice < 0.5 || newPrice > 100000) {
        addToast({
          type: "error",
          title: "Invalid Price",
          message: "Price must be between ₹0.50 and ₹1,00,000.",
        });
        return;
      }
    }

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
      const updatedProduct = data.data?.product || data.product;
      if (res.ok && updatedProduct) {
        setProducts((prev) =>
          prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
        );
        setCatalogue(
          products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
        );
        addToast({
          type: "success",
          title: "Inventory Updated",
          message: `${updatedProduct.name}: stock is now ${updatedProduct.stock} units.`,
        });
        setEditingProduct(null);
        setStockDelta(0);
      } else {
        addToast({
          type: "error",
          title: "Update Failed",
          message: data.error?.message || data.error || "Could not update inventory.",
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

  // Add new product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice || !newProdImage.trim()) {
      addToast({
        type: "error",
        title: "Validation Error",
        message: "Product name, price, and image URL are required.",
      });
      return;
    }

    const priceNum = parseFloat(newProdPrice);
    if (!Number.isFinite(priceNum) || priceNum < 0.5 || priceNum > 100000) {
      addToast({
        type: "error",
        title: "Invalid Price",
        message: "Selling price must be between ₹0.50 and ₹1,00,000.",
      });
      return;
    }

    if (newProdOriginalPrice.trim()) {
      const origNum = parseFloat(newProdOriginalPrice);
      if (!Number.isFinite(origNum) || origNum < 0.5 || origNum > 100000) {
        addToast({
          type: "error",
          title: "Invalid MRP",
          message: "Original price (MRP) must be between ₹0.50 and ₹1,00,000.",
        });
        return;
      }
      if (origNum < priceNum) {
        addToast({
          type: "error",
          title: "Invalid MRP",
          message: "Original price (MRP) cannot be less than selling price.",
        });
        return;
      }
    }

    setAddingProduct(true);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_PRODUCT",
          name: newProdName.trim(),
          category: newProdCategory,
          price: Number(newProdPrice),
          originalPrice: newProdOriginalPrice ? Number(newProdOriginalPrice) : Number(newProdPrice),
          stock: Number(newProdStock || 0),
          unit: newProdUnit.trim(),
          image: newProdImage.trim(),
          brand: newProdBrand.trim(),
          description: newProdDescription.trim(),
          organic: newProdOrganic,
        }),
      });

      const data = await res.json();
      const created = data.data?.product || data.product;
      if (res.ok && created) {
        setProducts((prev) => [created, ...prev]);
        setCatalogue([created, ...products]);
        addToast({
          type: "success",
          title: "Product Created",
          message: `${created.name} was added to the catalogue.`,
        });
        setShowAddProductModal(false);
        setNewProdName("");
        setNewProdPrice("");
        setNewProdOriginalPrice("");
        setNewProdImage("");
        setNewProdDescription("");
      } else {
        addToast({
          type: "error",
          title: "Failed to Add Product",
          message: data.error?.message || data.error || "Server rejected product creation.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        message: "Failed to connect to catalogue service.",
      });
    } finally {
      setAddingProduct(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Permanently remove "${productName}" from the catalogue?`)) {
      return;
    }

    setDeletingProductId(productId);
    try {
      const res = await fetch(`/api/admin/inventory?productId=${encodeURIComponent(productId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        setCatalogue(products.filter((p) => p.id !== productId));
        addToast({
          type: "success",
          title: "Product Deleted",
          message: `"${productName}" was removed from the store catalogue.`,
        });
      } else {
        addToast({
          type: "error",
          title: "Delete Failed",
          message: data.error?.message || data.error || "Could not delete product.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        message: "Failed to connect to inventory service.",
      });
    } finally {
      setDeletingProductId(null);
    }
  };

  // Create new coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponValue) {
      addToast({
        type: "error",
        title: "Validation Error",
        message: "Coupon code and discount value are required.",
      });
      return;
    }

    setAddingCoupon(true);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_COUPON",
          code: newCouponCode.trim().toUpperCase(),
          description: newCouponDescription.trim() || `${newCouponValue}${newCouponType === "PERCENTAGE" ? "%" : "₹"} promotional discount`,
          discountType: newCouponType,
          discountValue: Number(newCouponValue),
          minOrderSubtotal: Number(newCouponMinSubtotal || 0),
          maxDiscountAmount: newCouponMaxDiscount ? Number(newCouponMaxDiscount) : undefined,
          expiresAt: new Date(newCouponExpiresAt).toISOString(),
          usageLimit: Number(newCouponUsageLimit || 500),
        }),
      });

      const data = await res.json();
      const createdCoupon = data.data?.coupon || data.coupon;
      if (res.ok && createdCoupon) {
        setCoupons((prev) => [createdCoupon, ...prev]);
        addToast({
          type: "success",
          title: "Promotion Created",
          message: `Coupon code "${createdCoupon.code}" is now active.`,
        });
        setShowAddCouponModal(false);
        setNewCouponCode("");
        setNewCouponDescription("");
        setNewCouponValue("");
      } else {
        addToast({
          type: "error",
          title: "Creation Failed",
          message: data.error?.message || data.error || "Could not create promotional coupon.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        message: "Failed to connect to promotions service.",
      });
    } finally {
      setAddingCoupon(false);
    }
  };

  // Toggle coupon active state
  const handleToggleCoupon = async (code: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_COUPON",
          code,
          active: !currentActive,
        }),
      });
      const data = await res.json();
      const updatedCoupon = data.data?.coupon || data.coupon;
      if (res.ok && updatedCoupon) {
        setCoupons((prev) =>
          prev.map((c) => (c.code === code ? { ...c, active: updatedCoupon.active } : c))
        );
        addToast({
          type: "success",
          title: "Coupon Status Updated",
          message: `Coupon "${code}" is now ${updatedCoupon.active ? "ACTIVE" : "INACTIVE"}.`,
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        message: "Failed to update coupon status.",
      });
    }
  };

  // Delete coupon
  const handleDeleteCoupon = async (code: string) => {
    if (!window.confirm(`Permanently delete promotional code "${code}"?`)) {
      return;
    }

    setDeletingCouponCode(code);
    try {
      const res = await fetch(`/api/admin/inventory?code=${encodeURIComponent(code)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.code !== code));
        addToast({
          type: "success",
          title: "Promotion Removed",
          message: `Coupon "${code}" was deleted.`,
        });
      } else {
        addToast({
          type: "error",
          title: "Delete Failed",
          message: data.error?.message || data.error || "Could not delete coupon.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        message: "Failed to connect to promotions service.",
      });
    } finally {
      setDeletingCouponCode(null);
    }
  };

  // Transition order status
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
      const updatedOrder = data.data?.order || data.order;
      if (res.ok && updatedOrder) {
        setAllOrders((prev) =>
          prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
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
          message: data.error?.message || data.error || "Cannot transition this order.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        message: "Failed to update order status.",
      });
    } finally {
      setTransitioningOrderId(null);
    }
  };

  // Delete / Archive Order from Admin Ledger (Retained on customer dashboard)
  const handleDeleteOrder = async (orderId: string) => {
    if (
      !window.confirm(
        `Remove order #${orderId} from the operations fulfillment ledger?\n\nNotice: This order will remain permanently visible in the customer\'s dashboard order history.`
      )
    ) {
      return;
    }

    setDeletingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders?orderId=${encodeURIComponent(orderId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setAllOrders((prev) => prev.filter((o) => o.id !== orderId));
        addToast({
          type: "success",
          title: "Order Removed from Ledger",
          message: `Order #${orderId} removed from fulfillment console (customer dashboard history preserved).`,
        });
      } else {
        addToast({
          type: "error",
          title: "Cannot Remove Order",
          message: data.error?.message || data.error || "Only DELIVERED or REFUNDED orders can be removed.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        message: "Failed to connect to order management service.",
      });
    } finally {
      setDeletingOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="pt-28 pb-20 max-w-7xl mx-auto px-4 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-forest mx-auto"></div>
        <p className="mt-4 text-xs font-semibold text-ink-muted">Loading Operations Control Plane...</p>
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
            <h1 className="font-heading font-black text-2xl text-ink">
              Operations & Inventory Console
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E5F3D6] text-forest font-bold text-xs uppercase tracking-wider">
              {user?.role}
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Logged in as {user?.name || "Staff"} ({user?.email}) &bull; Enforcing authoritative state machine transitions and stock reservations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            className="px-3 py-2 rounded-xl border border-black/10 hover:bg-surface text-ink text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link
            href="/shop"
            className="px-3.5 py-2 rounded-xl bg-[#F8F7F2] hover:bg-gray-200 text-ink text-xs font-bold transition-colors"
          >
            Customer View
          </Link>
        </div>
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[rgba(22,60,41,0.08)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-xs font-bold">Total Products</span>
            <Boxes className="w-4 h-4 text-forest" />
          </div>
          <p className="font-heading font-black text-2xl text-ink">{products.length}</p>
          <span className="text-[10px] text-ink-muted font-bold block">
            {lowStockCount > 0 ? (
              <span className="text-amber-700 font-bold">{lowStockCount} items low stock</span>
            ) : (
              "All items stocked"
            )}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[rgba(22,60,41,0.08)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-xs font-bold">Total Orders</span>
            <Truck className="w-4 h-4 text-forest" />
          </div>
          <p className="font-heading font-black text-2xl text-ink">{allOrders.length}</p>
          <span className="text-[10px] text-ink-muted">
            {allOrders.filter((o) => !["DELIVERED", "CANCELLED", "REFUNDED"].includes(o.status)).length} active fulfillment
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[rgba(22,60,41,0.08)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-xs font-bold">Promotions</span>
            <Tag className="w-4 h-4 text-forest" />
          </div>
          <p className="font-heading font-black text-2xl text-ink">{coupons.length}</p>
          <span className="text-[10px] text-forest font-bold">
            {coupons.filter((c) => c.active).length} active discounts
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[rgba(22,60,41,0.08)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-xs font-bold">Audit Events</span>
            <Layers className="w-4 h-4 text-forest" />
          </div>
          <p className="font-heading font-black text-2xl text-ink">{auditLogs.length}</p>
          <span className="text-[10px] text-ink-muted">Security & ops trail</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[rgba(22,60,41,0.08)] pb-2 overflow-x-auto text-xs font-bold">
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
          <Truck className="w-4 h-4" />
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
                Real-time catalogue inventory. Adjust stock counts, add new produce, or remove retired items.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search produce..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F8F7F2] pl-8 pr-3 py-1.5 rounded-xl text-xs border border-black/10 focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAddProductModal(true)}
                className="px-3 py-1.5 rounded-xl bg-forest hover:bg-forest/90 text-[#C8E27A] text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
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
                  <th className="py-2.5 px-2 text-right">Actions</th>
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
                              unoptimized={p.image.startsWith("http")}
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
                        <div className="flex items-center justify-end gap-1.5">
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
                          <button
                            type="button"
                            disabled={deletingProductId === p.id}
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                Advance orders through the operational lifecycle. Terminal orders (Delivered / Refunded) can be removed from this ledger while retained in customer history.
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
                const canDeleteFromAdmin = ord.status === "DELIVERED" || ord.status === "REFUNDED";

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

                      {/* Operational Actions */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {nextAllowedTransitions.length > 0 && (
                          <>
                            <span className="text-[10px] uppercase font-bold text-ink-muted mr-1">
                              Advance To:
                            </span>
                            {nextAllowedTransitions.map((nextStatus) => (
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
                            ))}
                          </>
                        )}

                        {/* Delete / Archive from Admin Ledger if Delivered or Refunded */}
                        {canDeleteFromAdmin && (
                          <button
                            type="button"
                            disabled={deletingOrderId === ord.id}
                            onClick={() => handleDeleteOrder(ord.id)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center gap-1 transition-all cursor-pointer ml-auto sm:ml-2 disabled:opacity-50"
                            title="Remove from operations ledger (retained on customer dashboard)"
                          >
                            <Trash2 className="w-3 h-3" /> Remove from Ledger
                          </button>
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[rgba(22,60,41,0.08)]">
            <div>
              <h2 className="font-heading font-extrabold text-lg text-ink">Active Promotions & Discounts</h2>
              <p className="text-xs text-ink-muted">
                Authoritative validation rules checked by the server before any customer discount is applied.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddCouponModal(true)}
              className="px-3 py-1.5 rounded-xl bg-forest hover:bg-forest/90 text-[#C8E27A] text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Create Promotion
            </button>
          </div>

          {coupons.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-[#F8F7F2] border border-dashed border-gray-300 space-y-3">
              <Tag className="w-8 h-8 text-forest mx-auto opacity-70" />
              <p className="font-bold text-ink text-sm">No promotional campaigns created yet.</p>
              <p className="text-xs text-ink-muted max-w-sm mx-auto">
                Create promotional discount codes for your customers with custom discount percentages or flat off amounts.
              </p>
              <button
                type="button"
                onClick={() => setShowAddCouponModal(true)}
                className="px-4 py-2 rounded-xl bg-forest text-[#C8E27A] text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Create First Coupon
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coupons.map((c) => {
                const isExpired = Date.now() > new Date(c.expiresAt).getTime() || !c.active;
                return (
                  <div
                    key={c.code}
                    className={`p-4 rounded-2xl border text-xs space-y-2.5 transition-all ${
                      isExpired
                        ? "bg-gray-50 border-gray-200 opacity-60"
                        : "bg-[#F8F7F2] border-[rgba(22,60,41,0.06)] shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-forest bg-white px-2.5 py-0.5 rounded-lg border border-black/5">
                          {c.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isExpired
                              ? "bg-red-100 text-red-800"
                              : "bg-[#E5F3D6] text-forest"
                          }`}
                        >
                          {isExpired ? "INACTIVE" : "ACTIVE"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleCoupon(c.code, c.active)}
                          className="px-2 py-0.5 rounded-lg border border-black/10 hover:bg-white text-[10px] font-bold text-ink cursor-pointer"
                        >
                          {c.active ? "Pause" : "Activate"}
                        </button>
                        <button
                          type="button"
                          disabled={deletingCouponCode === c.code}
                          onClick={() => handleDeleteCoupon(c.code)}
                          className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete Coupon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-ink-muted text-[11px]">{c.description}</p>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/5 text-[11px]">
                      <div>
                        <span className="text-ink-muted block text-[10px]">Min Spend:</span>
                        <span className="font-bold text-ink">{formatCurrency(c.minOrderSubtotal)}</span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[10px]">Discount:</span>
                        <span className="font-bold text-forest">
                          {c.discountType === "FLAT" ? `₹${c.discountValue} Flat` : `${c.discountValue}%`}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-[10px]">Expires:</span>
                        <span className="font-bold text-ink">{new Date(c.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* MODAL 1: Add New Product */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[rgba(22,60,41,0.12)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-forest" />
                <h3 className="font-heading font-black text-lg text-ink">Add New Catalogue Produce</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="p-1 text-gray-400 hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-ink-muted mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alphonso Mangoes, Organic Broccoli"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full bg-[#F8F7F2] px-3.5 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink-muted mb-1">Category *</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value as Category)}
                    className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none"
                  >
                    <option value="Vegetables">Vegetables</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Staples">Staples</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ink-muted mb-1">Brand</label>
                  <input
                    type="text"
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none"
                    placeholder="Grocerly Fresh"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink-muted mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="100000"
                    required
                    placeholder="e.g. 45"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink-muted mb-1">MRP / Original (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="100000"
                    placeholder="e.g. 60 (Optional)"
                    value={newProdOriginalPrice}
                    onChange={(e) => setNewProdOriginalPrice(e.target.value)}
                    className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink-muted mb-1">Initial Stock Count *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink-muted mb-1">Unit Specification *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500g, 1 kg, 1L, 1 pc"
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink-muted mb-1">Image URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/... or /images/..."
                  value={newProdImage}
                  onChange={(e) => setNewProdImage(e.target.value)}
                  className="w-full bg-[#F8F7F2] px-3.5 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-forest"
                />
                {newProdImage && (
                  <div className="mt-2 flex items-center gap-3 p-2 rounded-xl bg-gray-50 border border-black/5">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white shrink-0 border border-black/10">
                      <Image
                        src={newProdImage}
                        alt="Preview"
                        fill
                        unoptimized
                        className="object-contain p-1"
                      />
                    </div>
                    <span className="text-[11px] text-forest font-bold">Image URL preview validated</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-ink-muted mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Fresh farm-picked organic produce..."
                  value={newProdDescription}
                  onChange={(e) => setNewProdDescription(e.target.value)}
                  className="w-full bg-[#F8F7F2] p-3 rounded-xl border border-black/10 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="organic_check"
                  checked={newProdOrganic}
                  onChange={(e) => setNewProdOrganic(e.target.checked)}
                  className="rounded text-forest focus:ring-forest cursor-pointer"
                />
                <label htmlFor="organic_check" className="font-bold text-ink text-xs cursor-pointer">
                  Certified Organic Produce
                </label>
              </div>

              <div className="flex gap-2 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-black/10 font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingProduct}
                  className="flex-1 py-2.5 rounded-xl bg-[#163C29] text-white font-bold hover:bg-[#1f5238] shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {addingProduct ? "Adding Product..." : "Add to Catalogue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Promotion Coupon */}
      {showAddCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[rgba(22,60,41,0.12)] space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-forest" />
                <h3 className="font-heading font-black text-lg text-ink">Create Promotional Campaign</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCouponModal(false)}
                className="p-1 text-gray-400 hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-ink-muted mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DIWALI50, FRESH20, FESTIVE"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#F8F7F2] px-3.5 py-2 rounded-xl border border-black/10 text-xs font-mono font-black tracking-wider uppercase focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-muted mb-1">Campaign Description</label>
                <input
                  type="text"
                  placeholder="e.g. 20% off on all organic vegetables above ₹299"
                  value={newCouponDescription}
                  onChange={(e) => setNewCouponDescription(e.target.value)}
                  className="w-full bg-[#F8F7F2] px-3.5 py-2 rounded-xl border border-black/10 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink-muted mb-1">Discount Type *</label>
                  <select
                    value={newCouponType}
                    onChange={(e) => setNewCouponType(e.target.value as "PERCENTAGE" | "FLAT")}
                    className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat INR (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ink-muted mb-1">
                    {newCouponType === "PERCENTAGE" ? "Discount Percentage (%) *" : "Flat Discount (₹) *"}
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={newCouponType === "PERCENTAGE" ? "100" : undefined}
                    required
                    placeholder={newCouponType === "PERCENTAGE" ? "e.g. 20" : "e.g. 50"}
                    value={newCouponValue}
                    onChange={(e) => setNewCouponValue(e.target.value)}
                    className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink-muted mb-1">Min Order Subtotal (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="299"
                    value={newCouponMinSubtotal}
                    onChange={(e) => setNewCouponMinSubtotal(e.target.value)}
                    className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink-muted mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Optional (e.g. 150)"
                    value={newCouponMaxDiscount}
                    onChange={(e) => setNewCouponMaxDiscount(e.target.value)}
                    className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink-muted mb-1">Valid Until Date</label>
                  <input
                    type="date"
                    required
                    value={newCouponExpiresAt}
                    onChange={(e) => setNewCouponExpiresAt(e.target.value)}
                    className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink-muted mb-1">Usage Limit</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={newCouponUsageLimit}
                    onChange={(e) => setNewCouponUsageLimit(e.target.value)}
                    className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setShowAddCouponModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-black/10 font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCoupon}
                  className="flex-1 py-2.5 rounded-xl bg-[#163C29] text-white font-bold hover:bg-[#1f5238] shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {addingCoupon ? "Creating..." : "Launch Campaign"}
                </button>
              </div>
            </form>
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
                className="p-1 text-gray-400 hover:text-ink cursor-pointer"
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
                  step="0.5"
                  min="0.5"
                  max="100000"
                  value={newPrice}
                  onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#F8F7F2] px-3 py-2 rounded-xl border border-black/10 text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 rounded-xl border border-black/10 font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingInventory}
                  className="flex-1 py-2.5 rounded-xl bg-[#163C29] text-white font-bold hover:bg-[#1f5238] cursor-pointer disabled:opacity-50"
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
