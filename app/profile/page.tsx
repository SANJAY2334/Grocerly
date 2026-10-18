"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { User, Mail, Phone, MapPin, ShieldCheck, Plus, CheckCircle2, ArrowRight } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, addToast } = useStore();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Address modal / addition
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newStreet, setNewStreet] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPincode, setNewPincode] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login?redirect=/profile");
          return;
        }
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setName(data.user.name || "");
          setPhone(data.user.phone || "");
        } else {
          router.push("/login?redirect=/profile");
        }
      } catch {
        // network
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [router, setUser]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      setSaving(false);
      if (res.ok && data.success) {
        setUser(data.data.user);
        addToast({
          type: "success",
          title: "Profile Updated",
          message: "Your profile details have been saved.",
        });
      } else {
        addToast({
          type: "error",
          title: "Update Failed",
          message: data.error?.message || "Failed to update profile.",
        });
      }
    } catch {
      setSaving(false);
      addToast({
        type: "error",
        title: "Network Error",
        message: "Could not reach user profile service.",
      });
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: {
            fullName: name || user?.name || "Customer",
            phone: phone || user?.phone || "+91 98765 43210",
            street: newStreet,
            city: newCity,
            state: newState,
            pincode: newPincode,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setShowAddressForm(false);
        setNewStreet("");
        setNewCity("");
        setNewState("");
        setNewPincode("");
        addToast({
          type: "success",
          title: "Address Saved",
          message: "New delivery address added successfully.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to save address.",
      });
    }
  };

  if (loading) {
    return (
      <div className="pt-32 pb-20 max-w-4xl mx-auto px-4 text-center text-xs text-[#6B7280]">
        Loading your Grocerly profile...
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-10 shadow-xs space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#C8E27A] text-[#163C29] text-[10px] font-black uppercase">
                {user?.role || "CUSTOMER"}
              </span>
              {user?.verified && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Email Verified
                </span>
              )}
            </div>
            <h1 className="font-heading font-black text-3xl text-[#1A221E]">
              Account Profile
            </h1>
            <p className="text-xs text-[#6B7280]">
              Manage your personal information, delivery addresses, and security settings.
            </p>
          </div>

          <Link
            href="/settings/security"
            className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-2xl bg-[#F8F7F2] border border-black/5 text-xs font-bold text-[#163C29] hover:bg-[#163C29] hover:text-white transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Security & Sessions</span>
          </Link>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
          <h2 className="font-heading font-bold text-base text-[#163C29]">Personal Details</h2>
          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#F8F7F2] pl-10 pr-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full bg-gray-100 pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-[#6B7280] mt-1">
              Email addresses cannot be changed directly to protect account security.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-[#F8F7F2] pl-10 pr-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="py-3 px-6 rounded-2xl bg-[#163C29] text-white font-bold text-xs hover:bg-[#1f5238] transition-all cursor-pointer"
          >
            {saving ? "Saving Changes..." : "Save Profile Details"}
          </button>
        </form>

        {/* Saved Addresses Section */}
        <div className="pt-6 border-t border-black/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-base text-[#163C29] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#163C29]" /> Saved Delivery Addresses
            </h2>
            <button
              type="button"
              onClick={() => setShowAddressForm(!showAddressForm)}
              className="inline-flex items-center gap-1.5 py-2 px-3 rounded-xl bg-[#F8F7F2] hover:bg-[#163C29] hover:text-white text-[#163C29] text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Address</span>
            </button>
          </div>

          {showAddressForm && (
            <form onSubmit={handleAddAddress} className="p-4 rounded-2xl bg-[#F8F7F2] border border-black/5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#6B7280] mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1007, Wayne Manor, Green Park"
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    className="w-full bg-white px-3 py-2 rounded-xl border border-black/10 text-xs font-bold text-[#1A221E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#6B7280] mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full bg-white px-3 py-2 rounded-xl border border-black/10 text-xs font-bold text-[#1A221E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#6B7280] mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maharashtra"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="w-full bg-white px-3 py-2 rounded-xl border border-black/10 text-xs font-bold text-[#1A221E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#6B7280] mb-1">Pincode (6-Digits) *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 400001"
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                    className="w-full bg-white px-3 py-2 rounded-xl border border-black/10 text-xs font-bold text-[#1A221E]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="py-2 px-4 rounded-xl bg-gray-200 text-xs font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-[#163C29] text-white text-xs font-bold"
                >
                  Save Address
                </button>
              </div>
            </form>
          )}

          {user?.addresses && user.addresses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {user.addresses.map((addr, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#F8F7F2] border border-black/5 space-y-1">
                  <div className="font-bold text-xs text-[#1A221E]">{addr.fullName}</div>
                  <div className="text-xs text-[#6B7280]">{addr.street}</div>
                  <div className="text-xs text-[#6B7280]">
                    {addr.city}, {addr.state} — {addr.pincode}
                  </div>
                  <div className="text-[11px] font-semibold text-[#163C29] pt-1">{addr.phone}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#6B7280]">No saved addresses yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
