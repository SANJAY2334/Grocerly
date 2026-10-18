"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Leaf, Lock, Mail, User, Phone, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { addToast } = useStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isStrong) {
      setError("Please ensure your password satisfies all security requirements.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || data.error || "Registration failed. Please check your details.");
        setLoading(false);
        return;
      }

      addToast({
        type: "success",
        title: "Account Created",
        message: "A 6-digit verification code has been sent to your email.",
      });

      router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch {
      setError("Network error while connecting to authentication service.");
      setLoading(false);
    }
  };

  return (
    <div className="pt-28 pb-20 max-w-md mx-auto px-4 sm:px-6">
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-8 shadow-xs space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#163C29] text-[#C8E27A] flex items-center justify-center mx-auto shadow-xs">
            <Leaf className="w-6 h-6 fill-[#C8E27A]" />
          </div>
          <h1 className="font-heading font-black text-2xl text-[#1A221E]">
            Create Your Account
          </h1>
          <p className="text-xs text-[#6B7280]">
            Join Grocerly for farm-fresh organic produce and express doorstep delivery.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Full Name *</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#F8F7F2] pl-10 pr-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8F7F2] pl-10 pr-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Phone Number (Optional)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#F8F7F2] pl-10 pr-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1">Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8F7F2] pl-10 pr-10 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1A221E]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Checklist */}
            <div className="mt-2 space-y-1 text-[11px] text-[#6B7280]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? "text-emerald-600" : "text-gray-300"}`} />
                <span>At least 8 characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasUppercase && hasLowercase ? "text-emerald-600" : "text-gray-300"}`} />
                <span>Uppercase & lowercase letters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? "text-emerald-600" : "text-gray-300"}`} />
                <span>At least one number</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isStrong}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#163C29] hover:bg-[#1f5238] disabled:opacity-50 text-white text-center font-bold text-xs shadow-xs transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? "Creating Account..." : (
              <>
                <span>Sign Up & Verify</span> <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-[#6B7280] pt-2">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#163C29] hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
