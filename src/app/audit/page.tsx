"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Search, Clock } from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit-logs")
      .then((r) => r.json())
      .then((d) => setLogs(d.auditLogs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-navy-900 tracking-tight">System Audit Trail</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable log of all financial modifications, payment recordings, student creations, and plan updates
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
            <tr>
              <th className="px-5 py-3.5">Action</th>
              <th className="px-5 py-3.5">Entity</th>
              <th className="px-5 py-3.5">Entity ID</th>
              <th className="px-5 py-3.5">IP Address</th>
              <th className="px-5 py-3.5">Timestamp</th>
              <th className="px-5 py-3.5">Mutation Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading audit history...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-slate-400">No audit logs recorded.</td></tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <span className="rounded-md bg-tekzow-50 px-2 py-0.5 text-[10px] font-bold text-tekzow-700 border border-tekzow-200">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-slate-800">{l.entity}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-500 text-[11px]">{l.entityId || "—"}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-500">{l.ipAddress}</td>
                  <td className="px-5 py-3.5 text-slate-500 font-medium">
                    {new Date(l.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 max-w-md truncate">
                    {l.newData || l.oldData || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}