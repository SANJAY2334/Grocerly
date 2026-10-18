"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Leaf, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber;
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Password reset token is missing from your link.");
      return;
    }

    if (!isStrong) {
      setError("Please ensure your new password meets all security criteria.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.error?.message || data.error || "Password reset failed. The link may have expired.");
      }
    } catch {
      setError("Network error while connecting to reset service.");
      setLoading(false);
    }
  };

  return (
    <div className="pt-28 pb-20 max-w-md mx-auto px-4 sm:px-6">
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#163C29] text-[#C8E27A] flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="font-heading font-black text-2xl text-[#1A221E]">
            Set New Password
          </h1>
          <p className="text-xs text-[#6B7280]">
            Please enter your new strong password below.
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

        {success ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-3 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="font-bold text-sm">Password Updated!</p>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Your Grocerly account password has been updated successfully. Other active sessions have been terminated.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block py-2.5 px-5 rounded-xl bg-[#163C29] text-white text-xs font-bold"
              >
                Sign In With New Password →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">New Password *</label>
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

              {/* Password strength checklist */}
              <div className="mt-2 space-y-1 text-[11px] text-[#6B7280]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? "text-emerald-600" : "text-gray-300"}`} />
                  <span>8+ characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasUppercase && hasLowercase ? "text-emerald-600" : "text-gray-300"}`} />
                  <span>Uppercase & lowercase</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? "text-emerald-600" : "text-gray-300"}`} />
                  <span>At least one number</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Confirm New Password *</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#F8F7F2] px-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !isStrong || !passwordsMatch}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#163C29] hover:bg-[#1f5238] disabled:opacity-50 text-white text-center font-bold text-xs shadow-xs transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? "Updating Password..." : (
                <>
                  <span>Save New Password</span> <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
          <div className="text-xs font-bold text-[#6B7280]">Loading...</div>
        </div>
      }
    >
      <ResetPasswordContent />
    </React.Suspense>
  );
}
