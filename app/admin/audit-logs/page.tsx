"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, ArrowLeft, AlertCircle } from "lucide-react";

interface AuditEntry {
  id: string;
  eventType: string;
  actorId: string;
  targetType?: string;
  targetId?: string;
  outcome: "SUCCESS" | "FAILURE" | "DENIED";
  requestId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await fetch("/api/admin/audit-logs");
        if (res.status === 401 || res.status === 403) {
          router.push("/admin");
          return;
        }
        const data = await res.json();
        if (res.ok && data.data?.auditLogs) {
          setLogs(data.data.auditLogs);
        } else {
          setError(data.error?.message || "Failed to load audit logs.");
        }
      } catch {
        setError("Network error communicating with audit service.");
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
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
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-black text-3xl text-[#1A221E] flex items-center gap-2">
              <Shield className="w-8 h-8 text-[#163C29]" /> Security & Audit Trail
            </h1>
            <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wider">
              ADMIN ONLY
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Tamper-evident operational and authentication events with actor correlation and secret redaction.
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

        {loading ? (
          <div className="py-12 text-center text-xs text-[#6B7280]">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-[#6B7280] text-center py-8">No audit events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/10 text-[#6B7280] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-bold">Timestamp</th>
                  <th className="py-3 px-4 font-bold">Event Type</th>
                  <th className="py-3 px-4 font-bold">Actor</th>
                  <th className="py-3 px-4 font-bold">Outcome</th>
                  <th className="py-3 px-4 font-bold">Target</th>
                  <th className="py-3 px-4 font-bold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {logs.map((log) => {
                  const outcomeColor =
                    log.outcome === "SUCCESS"
                      ? "bg-emerald-100 text-emerald-800"
                      : log.outcome === "DENIED"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800";

                  return (
                    <tr key={log.id} className="hover:bg-[#F8F7F2]/60 transition-colors font-mono text-[11px]">
                      <td className="py-3 px-4 text-[#6B7280]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#163C29] font-sans">
                        {log.eventType}
                      </td>
                      <td className="py-3 px-4 text-[#1A221E]">{log.actorId}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${outcomeColor}`}>
                          {log.outcome}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#6B7280]">
                        {log.targetType ? `${log.targetType} [${log.targetId || ""}]` : "—"}
                      </td>
                      <td className="py-3 px-4 text-[#6B7280]">{log.ip || "127.0.0.1"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
