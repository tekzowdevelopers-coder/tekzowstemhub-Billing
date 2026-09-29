"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard, Search, Plus, Filter, Download, FileText,
  AlertCircle, CheckCircle2, X, RefreshCw
} from "lucide-react";
import CollectPaymentModal from "@/components/CollectPaymentModal";
import ReceiptModal from "@/components/ReceiptModal";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [pendingInstallments, setPendingInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [isSelectStudentModalOpen, setIsSelectStudentModalOpen] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payments?search=${encodeURIComponent(search)}&mode=${modeFilter}&status=${statusFilter}`);
      const data = await res.json();
      setPayments(data.payments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInstallments = async () => {
    try {
      const res = await fetch("/api/installments?filter=ALL");
      const data = await res.json();
      setPendingInstallments(data.installments || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchPendingInstallments();
  }, [modeFilter, statusFilter]);

  const handleVoidPayment = async (paymentId: string) => {
    const reason = prompt("Enter void / reversal reason for audit log:");
    if (!reason) return;
    try {
      const res = await fetch(`/api/payments/${paymentId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Payment voided and installment balance restored successfully.");
        fetchPayments();
        fetchPendingInstallments();
      } else {
        alert(data.error || "Failed to void payment");
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleExportCsv = () => {
    const headers = ["Receipt No", "Date", "Student Name", "Student ID", "Course", "Installment", "Amount", "Mode", "Reference", "Status"];
    const rows = payments.map(p => [
      p.receipt?.receiptNumber || "N/A",
      new Date(p.paymentDate).toLocaleDateString("en-IN"),
      `"${p.student?.name || ""}"`,
      p.student?.studentCode || "",
      `"${p.enrollment?.course?.name || ""}"`,
      p.installment?.installmentNumber || 1,
      p.amount,
      p.paymentMode,
      p.transactionReference || "Cash",
      p.status,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Tekzow-Payments-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">Manual Payment Collection</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record off-app received fees (Cash, UPI, Bank Transfer) with receipt generation
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsSelectStudentModalOpen(true)}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-tekzow-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-tekzow-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Collect New Payment</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (SRS Section 46) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student, receipt #, ref ID, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchPayments()}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-tekzow-600"
          />
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
            <Filter className="h-3.5 w-3.5" />
            <span>Mode:</span>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800"
            >
              <option value="ALL">All Modes</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CARD">Card</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="VOID">Void</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
            <tr>
              <th className="px-5 py-3.5">Receipt #</th>
              <th className="px-5 py-3.5">Payment Date</th>
              <th className="px-5 py-3.5">Student</th>
              <th className="px-5 py-3.5">Course</th>
              <th className="px-5 py-3.5 text-right">Amount Paid</th>
              <th className="px-5 py-3.5">Mode</th>
              <th className="px-5 py-3.5">Transaction Ref</th>
              <th className="px-5 py-3.5">Staff</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={10} className="py-12 text-center text-slate-400">Loading payment ledger...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={10} className="py-12 text-center text-slate-400">No payment records found.</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-5 py-3.5 font-mono font-bold text-tekzow-700">
                    {p.receipt?.receiptNumber || "N/A"}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-700">
                    {new Date(p.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/students/${p.student.id}`} className="font-bold text-slate-900 hover:text-tekzow-600">
                      {p.student.name}
                    </Link>
                    <p className="font-mono text-[11px] text-slate-400">{p.student.studentCode}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800">{p.enrollment?.course?.name}</p>
                    <p className="text-slate-400 text-[10px]">Inst {p.installment?.installmentNumber}</p>
                  </td>
                  <td className="px-5 py-3.5 text-right font-black text-slate-900 text-sm">
                    ₹{p.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      {p.paymentMode}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-600">
                    {p.transactionReference || "Cash"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 font-medium">
                    {p.createdBy || "Staff"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      p.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600 line-through"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {p.receipt && (
                        <button
                          onClick={() => {
                            fetch(`/api/receipts/${p.receipt.id}`)
                              .then(r => r.json())
                              .then(d => { if (d.receipt) setActiveReceipt(d.receipt); });
                          }}
                          className="rounded-lg bg-tekzow-50 px-2.5 py-1 text-[11px] font-bold text-tekzow-700 hover:bg-tekzow-100 transition"
                        >
                          Receipt
                        </button>
                      )}
                      {p.status === "ACTIVE" && (
                        <button
                          onClick={() => handleVoidPayment(p.id)}
                          className="rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 transition"
                          title="Void / Reverse Transaction"
                        >
                          Void
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Select Student / Installment Modal */}
      {isSelectStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Select Pending Installment to Collect</h2>
                <p className="text-xs text-slate-500">Pick any active student with an outstanding balance</p>
              </div>
              <button onClick={() => setIsSelectStudentModalOpen(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {pendingInstallments.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No pending installments found!</p>
              ) : (
                pendingInstallments.map((inst: any) => (
                  <div key={inst.id} className="py-3 flex items-center justify-between hover:bg-slate-50 p-2 rounded-xl">
                    <div>
                      <p className="font-bold text-xs text-slate-900">{inst.enrollment.student.name} ({inst.enrollment.student.studentCode})</p>
                      <p className="text-[11px] text-slate-500">
                        {inst.enrollment.course.name} • Installment {inst.installmentNumber} • Due {new Date(inst.dueDate).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-xs font-black text-rose-600">₹{inst.balanceAmount.toLocaleString("en-IN")}</p>
                        <span className="text-[10px] text-slate-400">Balance</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedInstallment(inst);
                          setIsSelectStudentModalOpen(false);
                        }}
                        className="rounded-xl bg-tekzow-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-tekzow-700"
                      >
                        Collect
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {selectedInstallment && (
        <CollectPaymentModal
          installment={selectedInstallment}
          isOpen={!!selectedInstallment}
          onClose={() => setSelectedInstallment(null)}
          onSuccess={(result) => {
            fetchPayments();
            fetchPendingInstallments();
            if (result.receipt) {
              fetch(`/api/receipts/${result.receipt.id}`)
                .then((r) => r.json())
                .then((d) => {
                  if (d.receipt) setActiveReceipt(d.receipt);
                });
            }
          }}
        />
      )}

      {/* Letterhead Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal receipt={activeReceipt} isOpen={!!activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </div>
  );
}