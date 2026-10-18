import React from "react";
import Link from "next/link";
import { Scale, ArrowLeft, Truck, RefreshCcw, CheckCircle } from "lucide-react";

export default function TermsOfServicePage() {
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
              Terms & Conditions
            </span>
            <span className="text-xs text-[#6B7280]">Effective: October 2026</span>
          </div>
          <h1 className="font-heading font-black text-3xl text-[#1A221E]">
            Terms of Service
          </h1>
          <p className="text-sm text-[#6B7280] mt-2">
            Standards for ordering, payment processing, delivery slots, and produce returns on Grocerly.
          </p>
        </div>

        <div className="prose prose-emerald max-w-none space-y-6 text-sm text-[#374151] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#163C29] flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#163C29]" /> 1. Produce Quality & Farm-Fresh Guarantee
            </h2>
            <p>
              Grocerly sources all fresh vegetables, fruits, dairy, and pantry items directly from certified organic and sustainable
              farms. If any produce received does not meet our 94+ Freshness Index score, report it within 6 hours for immediate credit.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#163C29] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#163C29]" /> 2. Delivery Slots & Pincode Serviceability
            </h2>
            <p>
              Deliveries are dispatched during your selected time window in temperature-controlled packaging. Orders above ₹300 qualify
              for 100% free delivery across all serviceable metro zones.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#163C29] flex items-center gap-2">
              <RefreshCcw className="w-4 h-4 text-[#163C29]" /> 3. Order Cancellations & State Transitions
            </h2>
            <p>
              Customers may cancel orders while in PENDING_PAYMENT or CONFIRMED state. Once produce enters PACKED or OUT_FOR_DELIVERY status,
              cancellations cannot be processed due to cold-chain produce safety standards.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#163C29] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#163C29]" /> 4. Pricing & Tax Compliance
            </h2>
            <p>
              All item prices are calculated with 100% mathematical integer precision in Indian Paise to eliminate floating-point drift.
              Inclusive Goods & Services Tax (GST) is computed and split equally between CGST and SGST in accordance with statutory regulations.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
