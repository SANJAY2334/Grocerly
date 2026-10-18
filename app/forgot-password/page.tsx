"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Leaf, Mail, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error?.message || data.error || "Unable to process password reset.");
      }
    } catch {
      setError("Network error while communicating with authentication service.");
      setLoading(false);
    }
  };

  return (
    <div className="pt-28 pb-20 max-w-md mx-auto px-4 sm:px-6">
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#163C29] text-[#C8E27A] flex items-center justify-center mx-auto shadow-xs">
            <Leaf className="w-6 h-6 fill-[#C8E27A]" />
          </div>
          <h1 className="font-heading font-black text-2xl text-[#1A221E]">
            Reset Password
          </h1>
          <p className="text-xs text-[#6B7280]">
            Enter your account email to receive a secure single-use password recovery link.
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

        {submitted ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-3 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="font-bold text-sm">Recovery Link Dispatched</p>
            <p className="text-xs text-emerald-700 leading-relaxed">
              If an account is associated with <strong>{email}</strong>, a password reset link has been dispatched.
              Please check your inbox and spam folder.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block py-2.5 px-5 rounded-xl bg-[#163C29] text-white text-xs font-bold"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Account Email *</label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#163C29] hover:bg-[#1f5238] disabled:opacity-50 text-white text-center font-bold text-xs shadow-xs transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? "Sending Recovery Link..." : (
                <>
                  <span>Send Recovery Email</span> <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-[#6B7280] pt-2">
          Remember your password?{" "}
          <Link href="/login" className="font-bold text-[#163C29] hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
