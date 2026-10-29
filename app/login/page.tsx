"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Leaf, Lock, Mail, User, ShieldCheck, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  // Validate redirect to prevent open redirects (must start with / and not //)
  const redirectTarget =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : null;

  const { setUser, addToast } = useStore();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnverifiedEmail(null);
    setLoading(true);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login"
        ? { email: email.trim().toLowerCase(), password }
        : { email: email.trim().toLowerCase(), password, name, phone: phone || undefined };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.code === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(email.trim().toLowerCase());
          setError(data.error?.message || "Please verify your email address to sign in.");
        } else {
          setError(data.error?.message || data.error || "Authentication failed.");
        }
        setLoading(false);
        return;
      }

      if (mode === "register" && data.data?.requiresVerification) {
        addToast({
          type: "info",
          title: "Verify Your Email",
          message: "A 6-digit code has been sent to your email.",
        });
        const verifyUrl = redirectTarget
          ? `/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}&redirect=${encodeURIComponent(redirectTarget)}`
          : `/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`;
        router.push(verifyUrl);
        return;
      }

      const authenticatedUser = data.data?.user || data.user;
      if (!authenticatedUser) {
        setError("Invalid response from server.");
        setLoading(false);
        return;
      }

      setUser(authenticatedUser);
      addToast({
        type: "success",
        title: mode === "login" ? "Signed In" : "Account Created",
        message: `Welcome, ${authenticatedUser.name}!`,
      });

      if (authenticatedUser.role === "ADMIN" || authenticatedUser.role === "OPS") {
        router.push(redirectTarget || "/admin");
      } else {
        router.push(redirectTarget || "/dashboard");
      }
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
            {mode === "login" ? "Sign In to Grocerly" : "Create Grocerly Account"}
          </h1>
          <p className="text-xs text-[#6B7280]">
            {mode === "login"
              ? "Access your fresh grocery orders, saved addresses, and meal plans."
              : "Join our farm-to-table platform for fresh organic groceries."}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#F8F7F2] p-1 rounded-2xl border border-black/5 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setUnverifiedEmail(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
              mode === "login"
                ? "bg-white text-[#163C29] shadow-xs font-black"
                : "text-[#6B7280] hover:text-[#1A221E]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
              setUnverifiedEmail(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
              mode === "register"
                ? "bg-white text-[#163C29] shadow-xs font-black"
                : "text-[#6B7280] hover:text-[#1A221E]"
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold space-y-2"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            {unverifiedEmail && (
              <div className="pt-1">
                <Link
                  href={
                    redirectTarget
                      ? `/verify-email?email=${encodeURIComponent(unverifiedEmail)}&redirect=${encodeURIComponent(redirectTarget)}`
                      : `/verify-email?email=${encodeURIComponent(unverifiedEmail)}`
                  }
                  className="inline-block py-1 px-3 rounded-lg bg-red-600 text-white font-bold text-[11px]"
                >
                  Enter Verification Code →
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
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
          )}

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

          {mode === "register" && (
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#F8F7F2] px-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#6B7280]">Password *</label>
              {mode === "login" && (
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-bold text-[#163C29] hover:underline"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"}
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#163C29] hover:bg-[#1f5238] disabled:opacity-50 text-white text-center font-bold text-xs shadow-xs transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              "Authenticating..."
            ) : mode === "login" ? (
              <>
                <span>Sign In</span> <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Create Account</span> <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#6B7280]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#163C29]" />
          <span>Encrypted with bcrypt & HttpOnly secure session cookies</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-28 pb-20 max-w-md mx-auto px-4 sm:px-6 text-center">
          <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-10 shadow-xs">
            <p className="text-xs font-bold text-ink-muted">Loading sign in...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
