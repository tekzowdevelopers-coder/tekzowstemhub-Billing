"use client";

import React, { useEffect, useState } from "react";
import {
  Bell, Search, RefreshCw, Send, MessageSquare, CheckCircle2,
  AlertCircle, Filter, Eye, X
} from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?channel=${channelFilter}&status=${statusFilter}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [channelFilter, statusFilter]);

  const handleRetry = async (notificationId: string) => {
    try {
      setRetryingId(notificationId);
      const res = await fetch(`/api/notifications/${notificationId}/retry`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Notification retried and delivered successfully!");
        fetchNotifications();
      } else {
        alert("Retry failed");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">Notification & Reminders Stream</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit logs of all WhatsApp receipts, SMS payment alerts, and automated due reminders
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center space-x-6 text-xs font-semibold text-slate-600">
        <div className="flex items-center space-x-2">
          <span>Channel:</span>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-bold text-slate-800"
          >
            <option value="ALL">All Channels</option>
            <option value="WHATSAPP">WhatsApp Business</option>
            <option value="SMS">DLT SMS</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-bold text-slate-800"
          >
            <option value="ALL">All Statuses</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="QUEUED">Queued</option>
          </select>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
            <tr>
              <th className="px-5 py-3.5">Channel</th>
              <th className="px-5 py-3.5">Template</th>
              <th className="px-5 py-3.5">Recipient</th>
              <th className="px-5 py-3.5">Message Snippet</th>
              <th className="px-5 py-3.5">Timestamp</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate-400">Loading notification stream...</td></tr>
            ) : notifications.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate-400">No notification logs recorded.</td></tr>
            ) : (
              notifications.map((n) => {
                const latestLog = n.logs?.[0];
                return (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                        n.channel === "WHATSAPP" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-sky-50 text-sky-700 border border-sky-200"
                      }`}>
                        {n.channel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-800 font-bold">{n.templateId}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-600">{latestLog?.recipient || "Parent"}</td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">{latestLog?.message || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-medium">
                      {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        n.status === "DELIVERED"
                          ? "bg-emerald-100 text-emerald-800"
                          : n.status === "FAILED"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {n.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {n.channel === "WHATSAPP" && (
                          (() => {
                            const raw = latestLog?.recipient || "";
                            let digits = raw.replace(/[^0-9]/g, "");
                            if (digits.length === 10) digits = "91" + digits;
                            else if (digits.length === 11 && digits.startsWith("0")) digits = "91" + digits.substring(1);
                            const waUrl = digits
                              ? `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(latestLog?.message || "")}`
                              : `https://api.whatsapp.com/send?text=${encodeURIComponent(latestLog?.message || "")}`;
                            return (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                                title="Open in WhatsApp"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </a>
                            );
                          })()
                        )}
                        <button
                          onClick={() => setSelectedMessage({ message: latestLog?.message || "No content", recipient: latestLog?.recipient, channel: n.channel })}
                          className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200"
                          title="View Full Message"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {n.status === "FAILED" && (
                          <button
                            onClick={() => handleRetry(n.id)}
                            disabled={retryingId === n.id}
                            className="rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center space-x-1"
                          >
                            <RefreshCw className={`h-3 w-3 ${retryingId === n.id ? "animate-spin" : ""}`} />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Message Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Message Content Preview</h2>
                {selectedMessage.recipient && (
                  <p className="text-xs text-slate-500 font-mono">Recipient: {selectedMessage.recipient}</p>
                )}
              </div>
              <button onClick={() => setSelectedMessage(null)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-xs bg-slate-50 p-4 rounded-xl border text-slate-800 leading-relaxed max-h-96 overflow-y-auto">
              {selectedMessage.message}
            </pre>
            <div className="flex justify-end space-x-2 pt-2 border-t">
              {selectedMessage.channel === "WHATSAPP" && (
                (() => {
                  const raw = selectedMessage.recipient || "";
                  let digits = raw.replace(/[^0-9]/g, "");
                  if (digits.length === 10) digits = "91" + digits;
                  else if (digits.length === 11 && digits.startsWith("0")) digits = "91" + digits.substring(1);
                  const waUrl = digits
                    ? `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(selectedMessage.message || "")}`
                    : `https://api.whatsapp.com/send?text=${encodeURIComponent(selectedMessage.message || "")}`;
                  return (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Open in WhatsApp</span>
                    </a>
                  );
                })()
              )}
              <button
                onClick={() => setSelectedMessage(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}