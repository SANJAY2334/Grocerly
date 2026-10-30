"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/types";
import { Boxes, ArrowLeft, AlertCircle, Edit2, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export default function AdminProductsPage() {
  const router = useRouter();
  const { addToast } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit stock inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newStock, setNewStock] = useState<number>(0);
  const [newPrice, setNewPrice] = useState<number>(0);

  const loadProducts = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inventory");
      if (res.status === 401 || res.status === 403) {
        router.push("/login?redirect=/admin/products");
        return;
      }
      const data = await res.json();
      const productList = data.data?.products || data.products;
      if (res.ok && productList) {
        setProducts(productList);
      } else {
        setError(data.error?.message || data.error || "Failed to load product inventory.");
      }
    } catch {
      setError("Network error loading inventory.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleUpdate = async (product: Product) => {
    const targetPrice = newPrice || product.price;
    if (!Number.isFinite(targetPrice) || targetPrice < 0.5 || targetPrice > 100000) {
      addToast({
        type: "error",
        title: "Invalid Price",
        message: "Price must be between ₹0.50 and ₹1,00,000.",
      });
      return;
    }

    if (!Number.isFinite(newStock) || newStock < 0 || newStock > 100000) {
      addToast({
        type: "error",
        title: "Invalid Stock",
        message: "Stock must be between 0 and 1,00,000 units.",
      });
      return;
    }

    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          stock: newStock,
          price: newPrice || product.price,
        }),
      });

      const data = await res.json();
      if (res.ok && data.product) {
        setEditingId(null);
        addToast({
          type: "success",
          title: "Product Updated",
          message: `${product.name} inventory successfully saved.`,
        });
        loadProducts();
      } else {
        addToast({
          type: "error",
          title: "Update Failed",
          message: data.error || "Failed to update product.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to communicate with inventory service.",
      });
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="font-heading font-black text-3xl text-[#1A221E] flex items-center gap-2">
            <Boxes className="w-8 h-8 text-[#163C29]" /> Catalog & Inventory
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time stock reservation monitoring, pricing configuration, and catalog management.
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

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F8F7F2] pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-xs font-bold text-[#1A221E]"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#6B7280]">Loading catalog...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/10 text-[#6B7280] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-bold">Item</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 font-bold">Price (₹)</th>
                  <th className="py-3 px-4 font-bold">Stock</th>
                  <th className="py-3 px-4 font-bold">Reserved</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((prod) => {
                  const isEditing = editingId === prod.id;
                  const isLow = prod.stock <= (prod.lowStockThreshold || 10);

                  return (
                    <tr key={prod.id} className="hover:bg-[#F8F7F2]/60 transition-colors">
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-10 h-10 rounded-xl object-cover bg-[#F8F7F2]"
                        />
                        <div>
                          <div className="font-bold text-[#1A221E]">{prod.name}</div>
                          <div className="text-[11px] text-[#6B7280]">{prod.unit}</div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#6B7280]">{prod.category}</td>
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="100000"
                            value={newPrice}
                            onChange={(e) => setNewPrice(Number(e.target.value))}
                            className="w-20 px-2 py-1 rounded-lg border border-black/10 text-xs font-bold"
                          />
                        ) : (
                          <span className="font-bold text-[#163C29]">{formatCurrency(prod.price)}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="100000"
                            value={newStock}
                            onChange={(e) => setNewStock(Number(e.target.value))}
                            className="w-20 px-2 py-1 rounded-lg border border-black/10 text-xs font-bold"
                          />
                        ) : (
                          <span
                            className={`font-bold ${
                              isLow ? "text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full" : "text-[#1A221E]"
                            }`}
                          >
                            {prod.stock} units
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#6B7280]">{prod.reservedStock || 0}</td>
                      <td className="py-3.5 px-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 rounded-lg bg-gray-200 text-[11px] font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdate(prod)}
                              className="px-2.5 py-1 rounded-lg bg-[#163C29] text-white text-[11px] font-bold"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(prod.id);
                              setNewStock(prod.stock);
                              setNewPrice(prod.price);
                            }}
                            className="p-1.5 rounded-lg text-[#163C29] hover:bg-[#F8F7F2]"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
