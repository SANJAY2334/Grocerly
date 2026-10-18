import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Eye, FileText, ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6">
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-10 shadow-xs space-y-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#163C29] hover:underline mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-[#C8E27A] text-[#163C29] text-[10px] font-black uppercase tracking-wider">
              Legal & Trust
            </span>
            <span className="text-xs text-[#6B7280]">Last Updated: October 2026</span>
          </div>
          <h1 className="font-heading font-black text-3xl text-[#1A221E]">
            Grocerly Privacy Policy
          </h1>
          <p className="text-sm text-[#6B7280] mt-2">
            How Grocerly safeguards your personal, payment, and grocery delivery data with bank-grade security.
          </p>
        </div>

        <div className="prose prose-emerald max-w-none space-y-6 text-sm text-[#374151] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#163C29] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#163C29]" /> 1. Information We Collect
            </h2>
            <p>
              When you create an account, order produce, or subscribe to Grocerly delivery slots, we collect your name,
              normalized email address, optional contact number, delivery addresses, and order transaction history.
            </p>
            <p>
              We do not store plaintext payment passwords, raw card numbers, or full CVV codes. Sensitive authentication credentials
              are protected with cryptographic salts and scrypt/bcrypt hashing.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#163C29] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#163C29]" /> 2. Security & Session Integrity
            </h2>
            <p>
              All customer sessions utilize HttpOnly, SameSite-restricted, encrypted cookies to eliminate cross-site scripting (XSS)
              token leakage. One-Time Passwords (OTPs) are hashed before persistence and automatically expired after 5 minutes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#163C29] flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#163C29]" /> 3. Data Retention & Customer Isolation
            </h2>
            <p>
              Strict customer-level authorization policies ensure no customer can inspect, query, or modify another customer’s
              order items, addresses, or profile records.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#163C29] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#163C29]" /> 4. Contact Our Privacy Office
            </h2>
            <p>
              For data access requests, deletion, or privacy queries, email our Data Protection Officer at{" "}
              <a href="mailto:privacy@grocerly.in" className="text-[#163C29] font-bold underline">
                privacy@grocerly.in
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
