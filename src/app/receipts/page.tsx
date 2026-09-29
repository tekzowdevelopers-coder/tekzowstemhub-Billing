"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText, Search, Download, Printer, Eye, MessageSquare, Send, CheckCircle2, Filter
} from "lucide-react";
import ReceiptModal from "@/components/ReceiptModal";

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeReceipt, setActiveReceipt] = useState<any>(null);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/receipts?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setReceipts(data.receipts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">Receipts Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official Tekzow STEMHub branded payment receipts repository & PDF exports
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search receipt #, student name, student code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchReceipts()}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-tekzow-600"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
            <tr>
              <th className="px-5 py-3.5">Receipt #</th>
              <th className="px-5 py-3.5">Date Issued</th>
              <th className="px-5 py-3.5">Student</th>
              <th className="px-5 py-3.5">Course & Plan</th>
              <th className="px-5 py-3.5 text-right">Amount Paid</th>
              <th className="px-5 py-3.5">Mode</th>
              <th className="px-5 py-3.5">Branch</th>
              <th className="px-5 py-3.5">WhatsApp / SMS</th>
              <th className="px-5 py-3.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="py-12 text-center text-slate-400">Loading receipts archive...</td></tr>
            ) : receipts.length === 0 ? (
              <tr><td colSpan={9} className="py-12 text-center text-slate-400">No receipts found.</td></tr>
            ) : (
              receipts.map((r) => {
                const p = r.payment;
                const student = p?.student;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-tekzow-700">
                      {r.receiptNumber}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {new Date(r.generatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/students/${student?.id}`} className="font-bold text-slate-900 hover:text-tekzow-600">
                        {student?.name}
                      </Link>
                      <p className="font-mono text-[11px] text-slate-400">{student?.studentCode}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{p?.enrollment?.course?.name}</p>
                      <p className="text-slate-400 text-[10px]">{p?.enrollment?.plan?.name}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900 text-sm">
                      ₹{p?.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {p?.paymentMode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-700">
                      {r.branch?.code}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-1.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          r.whatsappStatus === "DELIVERED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          WA: {r.whatsappStatus}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          r.smsStatus === "DELIVERED" ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          SMS: {r.smsStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setActiveReceipt(r)}
                        className="rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-navy-800 transition"
                      >
                        Open Receipt
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {activeReceipt && (
        <ReceiptModal receipt={activeReceipt} isOpen={!!activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </div>
  );
}