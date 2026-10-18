"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { ShieldCheck, Lock, Laptop, Trash2, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";

interface SessionInfo {
  id: string;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { addToast } = useStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/auth/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data?.sessions || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setLoadingPassword(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      setLoadingPassword(false);

      if (res.ok && data.success) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        addToast({
          type: "success",
          title: "Password Updated",
          message: "Your password has been changed. Other sessions have been revoked.",
        });
        fetchSessions();
      } else {
        setPasswordError(data.error?.message || data.error || "Failed to update password.");
      }
    } catch {
      setLoadingPassword(false);
      setPasswordError("Network error while connecting to security service.");
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/auth/sessions/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        addToast({
          type: "info",
          title: "Session Terminated",
          message: "The selected session has been revoked.",
        });
        fetchSessions();
      }
    } catch {
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to revoke session.",
      });
    }
  };

  return (
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-10 shadow-xs space-y-8">
        <div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#163C29] hover:underline mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
          </Link>
          <h1 className="font-heading font-black text-3xl text-[#1A221E] flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-[#163C29]" /> Security & Active Sessions
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Manage your account credentials, password updates, and connected browser sessions.
          </p>
        </div>

        {/* Change Password Form */}
        <div className="space-y-4 max-w-lg border-b border-black/5 pb-8">
          <h2 className="font-heading font-bold text-base text-[#163C29] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#163C29]" /> Update Password
          </h2>

          {passwordError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-[#F8F7F2] px-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">New Password (8+ characters) *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#F8F7F2] px-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6B7280] mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#F8F7F2] px-3.5 py-2.5 rounded-xl border border-[rgba(22,60,41,0.1)] text-xs font-bold text-[#1A221E] focus:outline-none focus:ring-1 focus:ring-[#163C29]"
              />
            </div>

            <button
              type="submit"
              disabled={loadingPassword}
              className="py-3 px-6 rounded-2xl bg-[#163C29] text-white font-bold text-xs hover:bg-[#1f5238] transition-all cursor-pointer"
            >
              {loadingPassword ? "Updating Password..." : "Change Password"}
            </button>
          </form>
        </div>

        {/* Active Sessions List */}
        <div className="space-y-4">
          <h2 className="font-heading font-bold text-base text-[#163C29] flex items-center gap-2">
            <Laptop className="w-4 h-4 text-[#163C29]" /> Active Server Sessions
          </h2>
          <p className="text-xs text-[#6B7280]">
            These are devices and browsers currently authenticated to your Grocerly account.
          </p>

          {loadingSessions ? (
            <p className="text-xs text-[#6B7280]">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-[#6B7280]">No other remote sessions active.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-4 rounded-2xl bg-[#F8F7F2] border border-black/5 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[#1A221E] flex items-center gap-2">
                      <span>{sess.userAgent || "Desktop Browser"}</span>
                    </div>
                    <div className="text-[11px] text-[#6B7280]">
                      IP: {sess.ipAddress || "127.0.0.1"} • Connected: {new Date(sess.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRevokeSession(sess.id)}
                    className="p-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
