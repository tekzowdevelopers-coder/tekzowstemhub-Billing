"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarClock, Search, Send, CreditCard, Eye, AlertTriangle,
  CheckCircle2, Clock, Calendar, MessageSquare, Phone
} from "lucide-react";
import CollectPaymentModal from "@/components/CollectPaymentModal";
import ReceiptModal from "@/components/ReceiptModal";

export default function DuePaymentsPage() {
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, DUE_TODAY, DUE_WEEK, DUE_MONTH, OVERDUE
  const [search, setSearch] = useState("");
  const [toastMsg, setToastMsg] = useState<{ text: string; url?: string } | string | null>(null);

  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);

  const fetchDueInstallments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/installments?filter=${filter}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setInstallments(data.installments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDueInstallments();
  }, [filter]);

  const handleSendReminder = async (instId: string, studentName: string, channel: "WHATSAPP" | "SMS") => {
    try {
      const templateId = filter === "OVERDUE" ? "payment_overdue" : "payment_due_reminder";
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentId: instId,
          channel,
          templateId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (channel === "WHATSAPP" && data.whatsappUrl) {
          // Open WhatsApp directly
          window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
          setToastMsg({
            text: `Opening WhatsApp reminder for ${studentName}...`,
            url: data.whatsappUrl,
          });
        } else {
          setToastMsg({ text: `${channel} reminder dispatched for ${studentName}!` });
        }
      } else {
        setToastMsg({ text: `Failed: ${data.error || "Could not send reminder"}` });
      }
      setTimeout(() => setToastMsg(null), 8000);
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 rounded-2xl bg-slate-900 px-5 py-3.5 text-xs font-semibold text-white shadow-2xl border border-slate-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{typeof toastMsg === "string" ? toastMsg : toastMsg.text}</span>
          {typeof toastMsg !== "string" && toastMsg.url && (
            <a
              href={toastMsg.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1 font-bold text-white transition flex items-center space-x-1"
            >
              <span>Open WhatsApp</span>
              <Send className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">Due & Overdue Payments Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated due date tracking, reminder dispatch, and direct collection
          </p>
        </div>
      </div>

      {/* Tabs matching SRS Section 45 */}
      <div className="border-b border-slate-200 flex space-x-6 text-xs font-bold text-slate-500 overflow-x-auto no-scrollbar pb-1">
        {[
          { key: "ALL", label: "All Pending" },
          { key: "DUE_TODAY", label: "Due Today" },
          { key: "DUE_WEEK", label: "Due This Week" },
          { key: "DUE_MONTH", label: "Due This Month" },
          { key: "OVERDUE", label: "🚨 Overdue Queue" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`pb-3 border-b-2 transition ${
              filter === t.key
                ? t.key === "OVERDUE"
                  ? "border-rose-600 text-rose-600 font-extrabold"
                  : "border-tekzow-600 text-tekzow-600 font-extrabold"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, code, parent mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchDueInstallments()}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-tekzow-600"
          />
        </div>
      </div>

      {/* Due Installments Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
            <tr>
              <th className="px-5 py-3.5">Student</th>
              <th className="px-5 py-3.5">Parent Contact</th>
              <th className="px-5 py-3.5">Course & Plan</th>
              <th className="px-5 py-3.5">Installment</th>
              <th className="px-5 py-3.5">Due Date</th>
              <th className="px-5 py-3.5 text-right">Balance Due</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center text-slate-400">Scanning due schedules...</td></tr>
            ) : installments.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-slate-400">No installments found for this criteria.</td></tr>
            ) : (
              installments.map((inst) => {
                const student = inst.enrollment.student;
                const parent = student.parent;
                const course = inst.enrollment.course;
                const isOverdue = inst.daysOverdue > 0;

                return (
                  <tr key={inst.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <Link href={`/students/${student.id}`} className="font-bold text-slate-900 hover:text-tekzow-600">
                        {student.name}
                      </Link>
                      <p className="font-mono text-[11px] text-tekzow-700">{student.studentCode}</p>
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{parent?.fatherName || parent?.motherName || "Guardian"}</p>
                      <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-500">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{parent?.mobile}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{course.name}</p>
                      <p className="text-slate-400 text-[10px]">{inst.enrollment.plan.name}</p>
                    </td>

                    <td className="px-5 py-3.5 font-bold text-slate-700">
                      Inst {inst.installmentNumber}
                    </td>

                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {new Date(inst.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>

                    <td className="px-5 py-3.5 text-right font-black text-rose-600 text-sm">
                      ₹{inst.balanceAmount.toLocaleString("en-IN")}
                    </td>

                    <td className="px-5 py-3.5">
                      {isOverdue ? (
                        <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700 border border-rose-200">
                          {inst.daysOverdue}D OVERDUE
                        </span>
                      ) : (
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                          PENDING
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleSendReminder(inst.id, student.name, "WHATSAPP")}
                          className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center space-x-1"
                          title="Send WhatsApp Reminder"
                        >
                          <Send className="h-3 w-3" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => setSelectedInstallment(inst)}
                          className="rounded-lg bg-tekzow-600 px-3 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-tekzow-700 transition"
                        >
                          Collect
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedInstallment && (
        <CollectPaymentModal
          installment={selectedInstallment}
          isOpen={!!selectedInstallment}
          onClose={() => setSelectedInstallment(null)}
          onSuccess={(result) => {
            fetchDueInstallments();
            if (result.receipt) {
              fetch(`/api/receipts/${result.receipt.id}`).then(r => r.json()).then(d => { if (d.receipt) setActiveReceipt(d.receipt); });
            }
          }}
        />
      )}

      {activeReceipt && (
        <ReceiptModal receipt={activeReceipt} isOpen={!!activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </div>
  );
}