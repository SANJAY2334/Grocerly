"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Leaf, ShieldCheck, ArrowRight, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const rawRedirect = searchParams.get("redirect");
  const redirectTo =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";

  const { setUser, addToast } = useStore();

  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric character
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    const next = [...digits];
    next[index] = cleaned[cleaned.length - 1]; // take latest digit
    setDigits(next);

    // Auto-advance focus to next field
    if (index < 5 && cleaned) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const fullOtp = digits.join("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: fullOtp }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || data.error || "Verification failed. The code may be incorrect or expired.");
        setLoading(false);
        return;
      }

      setUser(data.data?.user || data.user);
      setSuccess("Email successfully verified! Redirecting...");
      addToast({
        type: "success",
        title: "Verified!",
        message: "Your email address is verified. Welcome to Grocerly!",
      });

      setTimeout(() => {
        router.push(redirectTo);
      }, 1000);
    } catch {
      setError("Network error while connecting to verification service.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError(null);
    setResending(true);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose: "EMAIL_VERIFICATION" }),
      });

      const data = await res.json();
      setResending(false);

      if (res.ok) {
        setCooldown(60);
        addToast({
          type: "info",
          title: "Code Dispatched",
          message: "A new 6-digit verification code was sent to your email.",
        });
      } else {
        setError(data.error?.message || data.error || "Unable to resend code.");
      }
    } catch {
      setResending(false);
      setError("Network error requesting new code.");
    }
  };

  return (
    <div className="pt-28 pb-20 max-w-md mx-auto px-4 sm:px-6">
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-8 shadow-xs space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#163C29] text-[#C8E27A] flex items-center justify-center mx-auto shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="font-heading font-black text-2xl text-[#1A221E]">
            Verify Your Email
          </h1>
          <p className="text-xs text-[#6B7280]">
            Enter the 6-digit verification code sent to:
          </p>
          <div className="font-bold text-xs text-[#163C29] bg-[#F8F7F2] py-1.5 px-3 rounded-full inline-block">
            {email || "your registered email"}
          </div>
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

        {success && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!initialEmail && (
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8F7F2] px-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
              />
            </div>
          )}

          {/* 6 Digit Input Grid */}
          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-2 text-center">
              Enter 6-Digit Code
            </label>
            <div className="flex justify-between gap-2" onPaste={handlePaste}>
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  aria-label={`Digit ${idx + 1}`}
                  className="w-12 h-14 text-center text-xl font-black bg-[#F8F7F2] border-2 border-[rgba(22,60,41,0.1)] focus:border-[#163C29] rounded-2xl outline-none transition-all focus:scale-105"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || fullOtp.length !== 6}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#163C29] hover:bg-[#1f5238] disabled:opacity-50 text-white text-center font-bold text-xs shadow-xs transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? "Verifying Code..." : (
              <>
                <span>Confirm & Sign In</span> <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Resend Cooldown Section */}
        <div className="pt-2 text-center">
          {cooldown > 0 ? (
            <p className="text-xs text-[#6B7280]">
              Resend code available in <span className="font-bold text-[#163C29]">{cooldown}s</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-xs font-bold text-[#163C29] hover:underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
              <span>{resending ? "Sending..." : "Resend Verification Code"}</span>
            </button>
          )}
        </div>

        <div className="border-t border-black/5 pt-4 text-center text-xs text-[#6B7280]">
          Wrong email address?{" "}
          <Link
            href={
              redirectTo !== "/dashboard"
                ? `/register?redirect=${encodeURIComponent(redirectTo)}`
                : "/register"
            }
            className="font-bold text-[#163C29] hover:underline"
          >
            Register again
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
          <div className="text-xs font-bold text-[#6B7280]">Loading...</div>
        </div>
      }
    >
      <VerifyEmailContent />
    </React.Suspense>
  );
}
