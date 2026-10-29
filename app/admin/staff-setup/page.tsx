"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  UserCheck,
  RefreshCw,
  Info,
} from "lucide-react";
import { useStore } from "@/lib/store";

interface StatusResponse {
  adminExists: boolean;
  opsExists: boolean;
  adminEmail: string;
  opsEmail: string;
  canBootstrap: boolean;
  currentUserRole?: string | null;
}

export default function StaffSetupPage() {
  const router = useRouter();
  const { addToast } = useStore();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Admin form state
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [adminConfirmReset, setAdminConfirmReset] = useState(false);
  const [adminShowPassword, setAdminShowPassword] = useState(false);
  const [bootstrapSecret, setBootstrapSecret] = useState("");
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  // OPS form state
  const [opsPassword, setOpsPassword] = useState("");
  const [opsConfirmPassword, setOpsConfirmPassword] = useState("");
  const [opsConfirmReset, setOpsConfirmReset] = useState(false);
  const [opsShowPassword, setOpsShowPassword] = useState(false);
  const [submittingOps, setSubmittingOps] = useState(false);

  // Feedback notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/staff-setup");
      if (res.status === 401 || res.status === 403) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      const json = await res.json();
      if (res.ok && json.data) {
        setStatus(json.data);
        setAccessDenied(false);
      } else {
        setErrorMessage(json.error?.message || "Failed to load staff account status.");
      }
    } catch {
      setErrorMessage("Network error connecting to staff setup service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSubmitAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (adminPassword.length < 8) {
      setErrorMessage("Admin password must be at least 8 characters long.");
      return;
    }

    if (adminPassword !== adminConfirmPassword) {
      setErrorMessage("Admin passwords do not match.");
      return;
    }

    if (status?.adminExists && !adminConfirmReset) {
      setErrorMessage("Please check 'Confirm Password Reset' to update the existing Admin account.");
      return;
    }

    setSubmittingAdmin(true);

    try {
      const payload: Record<string, unknown> = {
        target: "ADMIN",
        password: adminPassword,
        confirmPassword: adminConfirmPassword,
        confirmReset: adminConfirmReset,
      };

      if (status?.canBootstrap && bootstrapSecret) {
        payload.bootstrapSecret = bootstrapSecret;
      }

      const res = await fetch("/api/admin/staff-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.data?.message || "Admin account successfully updated.");
        addToast({
          type: "success",
          title: "Admin Account Updated",
          message: "Credentials saved. All prior sessions were revoked.",
        });
        setAdminPassword("");
        setAdminConfirmPassword("");
        setAdminConfirmReset(false);
        setBootstrapSecret("");
        fetchStatus();
      } else {
        setErrorMessage(data.error?.message || data.error || "Failed to update Admin account.");
      }
    } catch {
      setErrorMessage("Network error updating Admin account.");
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const handleSubmitOps = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (opsPassword.length < 8) {
      setErrorMessage("Operations password must be at least 8 characters long.");
      return;
    }

    if (opsPassword !== opsConfirmPassword) {
      setErrorMessage("Operations passwords do not match.");
      return;
    }

    if (status?.opsExists && !opsConfirmReset) {
      setErrorMessage("Please check 'Confirm Password Reset' to update the existing Operations account.");
      return;
    }

    setSubmittingOps(true);

    try {
      const payload = {
        target: "OPS",
        password: opsPassword,
        confirmPassword: opsConfirmPassword,
        confirmReset: opsConfirmReset,
      };

      const res = await fetch("/api/admin/staff-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.data?.message || "Operations account successfully updated.");
        addToast({
          type: "success",
          title: "Operations Account Updated",
          message: "Credentials saved. All prior sessions were revoked.",
        });
        setOpsPassword("");
        setOpsConfirmPassword("");
        setOpsConfirmReset(false);
        fetchStatus();
      } else {
        setErrorMessage(data.error?.message || data.error || "Failed to update Operations account.");
      }
    } catch {
      setErrorMessage("Network error updating Operations account.");
    } finally {
      setSubmittingOps(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 text-center text-xs text-[#6B7280]">
        Verifying staff authorization status...
      </div>
    );
  }

  if (accessDenied && !status?.canBootstrap) {
    return (
      <div className="pt-28 pb-20 max-w-md mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-red-200 p-8 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="font-heading font-black text-xl text-[#1A221E]">
            Administrator Access Required
          </h1>
          <p className="text-xs text-[#6B7280]">
            Staff account provisioning is restricted to authenticated Administrators. Please sign in with an Admin account to manage credentials.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/login?redirect=/admin/staff-setup"
              className="px-5 py-2.5 rounded-full bg-[#163C29] text-white text-xs font-bold hover:bg-[#1f5238] transition-all"
            >
              Sign In as Admin →
            </Link>
            <Link
              href="/admin"
              className="px-5 py-2.5 rounded-full bg-[#F8F7F2] text-[#1A221E] text-xs font-bold hover:bg-gray-200 transition-all"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#163C29] hover:underline mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Operations Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#163C29] text-[#C8E27A] flex items-center justify-center shadow-xs">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-heading font-black text-2xl sm:text-3xl text-[#1A221E]">
                  Staff Account Management
                </h1>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Secure provisioning and credential recovery for Admin and Operations staff.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchStatus}
              className="px-3 py-1.5 rounded-xl bg-[#F8F7F2] hover:bg-gray-200 text-[#1A221E] font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-black/5 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#F8F7F2] border border-black/5 flex items-center justify-between">
            <div>
              <span className="font-bold text-[#1A221E] block">admin@grocerly.in</span>
              <span className="text-[11px] text-[#6B7280]">Role: ADMIN</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                status?.adminExists
                  ? "bg-purple-100 text-purple-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {status?.adminExists ? "CONFIGURED" : "NOT CREATED"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8F7F2] border border-black/5 flex items-center justify-between">
            <div>
              <span className="font-bold text-[#1A221E] block">ops@grocerly.in</span>
              <span className="text-[11px] text-[#6B7280]">Role: OPS</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                status?.opsExists
                  ? "bg-blue-100 text-blue-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {status?.opsExists ? "CONFIGURED" : "NOT CREATED"}
            </span>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Initial Bootstrap Advisory if 0 admins exist */}
      {status?.canBootstrap && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Initial Bootstrap Mode Active</span>
          </div>
          <p className="text-[11px] text-amber-800">
            No Administrator account currently exists in the database. You may provision the initial Admin account by supplying your trusted deployment secret (<code>AUTH_SECRET</code>). Once an Admin is provisioned, this bootstrap feature is permanently locked.
          </p>
        </div>
      )}

      {/* Two Column Layout: Admin & OPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OPTION 1: ADMIN ACCOUNT */}
        <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-black/5 flex items-center justify-between">
            <div>
              <h2 className="font-heading font-black text-lg text-[#1A221E] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#163C29]" />
                {status?.adminExists ? "Reset Admin Account" : "Create Admin Account"}
              </h2>
              <span className="text-xs text-[#6B7280]">Account: admin@grocerly.in</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase">
              ADMIN
            </span>
          </div>

          <form onSubmit={handleSubmitAdmin} className="space-y-4">
            {status?.canBootstrap && (
              <div>
                <label className="block text-xs font-bold text-[#1A221E] mb-1">
                  Deployment Setup Secret (AUTH_SECRET)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter AUTH_SECRET configured in environment"
                  value={bootstrapSecret}
                  onChange={(e) => setBootstrapSecret(e.target.value)}
                  className="w-full bg-[#F8F7F2] px-3.5 py-2 rounded-xl text-xs border border-black/10 focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#1A221E] mb-1">
                New Admin Password
              </label>
              <div className="relative">
                <input
                  type={adminShowPassword ? "text" : "password"}
                  required
                  placeholder="Min 8 chars, uppercase, lowercase, number"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-[#F8F7F2] px-3.5 py-2 pr-10 rounded-xl text-xs border border-black/10 focus:outline-none focus:ring-1 focus:ring-forest"
                />
                <button
                  type="button"
                  onClick={() => setAdminShowPassword(!adminShowPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
                >
                  {adminShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A221E] mb-1">
                Confirm Admin Password
              </label>
              <input
                type={adminShowPassword ? "text" : "password"}
                required
                placeholder="Re-enter new password"
                value={adminConfirmPassword}
                onChange={(e) => setAdminConfirmPassword(e.target.value)}
                className="w-full bg-[#F8F7F2] px-3.5 py-2 rounded-xl text-xs border border-black/10 focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>

            {status?.adminExists && (
              <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-[#1A221E]">
                <input
                  type="checkbox"
                  checked={adminConfirmReset}
                  onChange={(e) => setAdminConfirmReset(e.target.checked)}
                  className="rounded text-forest focus:ring-forest"
                />
                <span className="font-semibold text-[11px]">
                  Confirm password reset for admin@grocerly.in
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={submittingAdmin}
              className="w-full py-2.5 rounded-xl bg-[#163C29] hover:bg-[#1f5238] text-white font-bold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {submittingAdmin
                ? "Saving Credentials..."
                : status?.adminExists
                ? "Reset Admin Password"
                : "Create Admin Account"}
            </button>
          </form>
        </div>

        {/* OPTION 2: OPERATIONS ACCOUNT */}
        <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-black/5 flex items-center justify-between">
            <div>
              <h2 className="font-heading font-black text-lg text-[#1A221E] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#163C29]" />
                {status?.opsExists ? "Reset OPS Account" : "Create OPS Account"}
              </h2>
              <span className="text-xs text-[#6B7280]">Account: ops@grocerly.in</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
              OPS
            </span>
          </div>

          <form onSubmit={handleSubmitOps} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1A221E] mb-1">
                New Operations Password
              </label>
              <div className="relative">
                <input
                  type={opsShowPassword ? "text" : "password"}
                  required
                  placeholder="Min 8 chars, uppercase, lowercase, number"
                  value={opsPassword}
                  onChange={(e) => setOpsPassword(e.target.value)}
                  className="w-full bg-[#F8F7F2] px-3.5 py-2 pr-10 rounded-xl text-xs border border-black/10 focus:outline-none focus:ring-1 focus:ring-forest"
                />
                <button
                  type="button"
                  onClick={() => setOpsShowPassword(!opsShowPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
                >
                  {opsShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A221E] mb-1">
                Confirm Operations Password
              </label>
              <input
                type={opsShowPassword ? "text" : "password"}
                required
                placeholder="Re-enter new password"
                value={opsConfirmPassword}
                onChange={(e) => setOpsConfirmPassword(e.target.value)}
                className="w-full bg-[#F8F7F2] px-3.5 py-2 rounded-xl text-xs border border-black/10 focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>

            {status?.opsExists && (
              <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-[#1A221E]">
                <input
                  type="checkbox"
                  checked={opsConfirmReset}
                  onChange={(e) => setOpsConfirmReset(e.target.checked)}
                  className="rounded text-forest focus:ring-forest"
                />
                <span className="font-semibold text-[11px]">
                  Confirm password reset for ops@grocerly.in
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={submittingOps}
              className="w-full py-2.5 rounded-xl bg-[#163C29] hover:bg-[#1f5238] text-white font-bold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {submittingOps
                ? "Saving Credentials..."
                : status?.opsExists
                ? "Reset OPS Password"
                : "Create OPS Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
