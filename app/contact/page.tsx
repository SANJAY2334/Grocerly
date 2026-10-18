"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";

export default function ContactPage() {
  const { addToast } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    addToast({
      type: "success",
      title: "Message Sent",
      message: "Thank you! Our customer care team will respond within 2 business hours.",
    });
  };

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
          <h1 className="font-heading font-black text-3xl text-[#1A221E]">
            Contact Grocerly
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Questions about your order, produce sourcing, or farm partnerships? We are here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Details */}
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-[#F8F7F2] space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#163C29] text-[#C8E27A] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1A221E]">Customer Care & Orders</div>
                  <div className="text-[#6B7280]">care@grocerly.in</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#163C29] text-[#C8E27A] flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1A221E]">Delivery Helpline</div>
                  <div className="text-[#6B7280]">+91 1800 266 8989 (Toll Free)</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#163C29] text-[#C8E27A] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1A221E]">Support Hours</div>
                  <div className="text-[#6B7280]">Daily 06:00 AM – 11:00 PM IST</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#163C29] text-[#C8E27A] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#1A221E]">Fulfillment Central</div>
                  <div className="text-[#6B7280]">Fort & Colaba Cold Hub, Mumbai 400001</div>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div>
            {submitted ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-heading font-bold text-base text-emerald-900">Message Received</h3>
                <p className="text-xs text-emerald-700">
                  Thank you, {name}! Your ticket has been logged and our customer relations specialist will reach out shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="py-2 px-4 rounded-xl bg-[#163C29] text-white text-xs font-bold"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#F8F7F2] px-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] mb-1">Your Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#F8F7F2] px-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Question about delivery slot"
                    className="w-full bg-[#F8F7F2] px-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] mb-1">Message</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we assist you?"
                    className="w-full bg-[#F8F7F2] px-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 px-6 rounded-2xl bg-[#163C29] hover:bg-[#1f5238] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
