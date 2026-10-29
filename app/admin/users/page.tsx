"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserAccount } from "@/lib/types";
import { Users, Shield, ArrowLeft, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/admin/users");
        if (res.status === 401 || res.status === 403) {
          router.push("/admin");
          return;
        }
        const data = await res.json();
        if (res.ok && data.data?.users) {
          setUsers(data.data.users);
        } else {
          setError(data.error?.message || "Failed to load user list.");
        }
      } catch {
        setError("Network error communicating with administrative service.");
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, [router]);

  return (
    <div className="pt-28 pb-20 max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
      <div className="bg-white rounded-3xl border border-[rgba(22,60,41,0.08)] p-6 sm:p-10 shadow-xs space-y-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#163C29] hover:underline mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Operations Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-black text-3xl text-[#1A221E] flex items-center gap-2">
                  <Users className="w-8 h-8 text-[#163C29]" /> User Management
                </h1>
                <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wider">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-1">
                Registered accounts, verification status, and security roles.
              </p>
            </div>

            <Link
              href="/admin/staff-setup"
              className="px-3.5 py-2 rounded-xl bg-forest hover:bg-forest/90 text-[#C8E27A] font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs self-start sm:self-auto"
            >
              <KeyRound className="w-3.5 h-3.5" /> Staff Setup & Reset
            </Link>
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

        {loading ? (
          <div className="py-12 text-center text-xs text-[#6B7280]">Loading user accounts...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/10 text-[#6B7280] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-bold">User</th>
                  <th className="py-3 px-4 font-bold">Role</th>
                  <th className="py-3 px-4 font-bold">Verification</th>
                  <th className="py-3 px-4 font-bold">Phone</th>
                  <th className="py-3 px-4 font-bold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F8F7F2]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#1A221E]">{u.name}</div>
                      <div className="text-[11px] text-[#6B7280]">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          u.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : u.role === "OPS"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.verified ? (
                        <span className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold text-[11px]">Unverified</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#6B7280]">{u.phone || "—"}</td>
                    <td className="py-3.5 px-4 text-[#6B7280]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
