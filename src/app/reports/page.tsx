"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3, Download, Calendar, Filter, Building2, TrendingUp,
  AlertTriangle, CreditCard, CheckCircle2
} from "lucide-react";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"collection" | "outstanding" | "branch">("collection");
  const [period, setPeriod] = useState("THIS_MONTH");
  const [loading, setLoading] = useState(true);

  const [collectionData, setCollectionData] = useState<any>(null);
  const [outstandingList, setOutstandingList] = useState<any[]>([]);
  const [branchMetrics, setBranchMetrics] = useState<any[]>([]);

  const fetchCollectionReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/collection?period=${period}`);
      const data = await res.json();
      setCollectionData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchOutstandingReport = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports/outstanding");
      const data = await res.json();
      setOutstandingList(data.outstandingList || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports/branch");
      const data = await res.json();
      setBranchMetrics(data.branchMetrics || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "collection") fetchCollectionReport();
    if (activeTab === "outstanding") fetchOutstandingReport();
    if (activeTab === "branch") fetchBranchReport();
  }, [activeTab, period]);

  const handleExportCsv = () => {
    if (activeTab === "collection") {
      const headers = ["Receipt No", "Date", "Student", "Amount", "Mode", "Reference"];
      const rows = (collectionData?.payments || []).map((p: any) => [
        p.receipt?.receiptNumber || "N/A",
        new Date(p.paymentDate).toLocaleDateString("en-IN"),
        `"${p.student?.name || ""}"`,
        p.amount,
        p.paymentMode,
        p.transactionReference || "Cash",
      ]);
      downloadCsv(`Collection-Report-${period}.csv`, headers, rows);
    } else if (activeTab === "outstanding") {
      const headers = ["Student ID", "Student Name", "Parent", "Mobile", "Course", "Total Fee", "Paid", "Pending", "Days Overdue"];
      const rows = outstandingList.map((o: any) => [
        o.studentCode,
        `"${o.studentName}"`,
        `"${o.parentName}"`,
        o.mobile,
        `"${o.courseName}"`,
        o.totalFee,
        o.paidAmount,
        o.pendingAmount,
        o.daysOverdue,
      ]);
      downloadCsv("Outstanding-Fees-Report.csv", headers, rows);
    }
  };

  const downloadCsv = (filename: string, headers: string[], rows: any[]) => {
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">Financial Reports & Intelligence</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Collection realization, outstanding student balances, and multi-branch performance
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
        >
          <Download className="h-4 w-4 text-slate-600" />
          <span>Export Excel / CSV</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-6 text-xs font-bold text-slate-500">
        {[
          { key: "collection", label: "Collection Report" },
          { key: "outstanding", label: "Outstanding Dues Report" },
          { key: "branch", label: "Multi-Branch Comparison" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`pb-3 border-b-2 transition ${
              activeTab === t.key ? "border-tekzow-600 text-tekzow-600 font-extrabold" : "border-transparent hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Collection Report (SRS Section 48 & 51) */}
      {activeTab === "collection" && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center space-x-4 text-xs font-semibold">
            <span className="text-slate-500">Timeframe:</span>
            {["TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH", "PREV_MONTH"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 transition ${
                  period === p ? "bg-tekzow-600 text-white font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Collection summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400">Total Collected</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                ₹{(collectionData?.summary?.totalCollection || 0).toLocaleString("en-IN")}
              </p>
              <span className="text-[11px] text-slate-500">{collectionData?.summary?.totalTransactions || 0} transactions</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400">UPI Collection</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                ₹{(collectionData?.summary?.modeBreakdown?.UPI || 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400">Cash Collection</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                ₹{(collectionData?.summary?.modeBreakdown?.CASH || 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400">Bank Transfer</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                ₹{(collectionData?.summary?.modeBreakdown?.BANK_TRANSFER || 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
                <tr>
                  <th className="px-5 py-3.5">Receipt #</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Course</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5">Mode</th>
                  <th className="px-5 py-3.5">Reference ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(collectionData?.payments || []).length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">No collections in this period.</td></tr>
                ) : (
                  collectionData.payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono font-bold text-tekzow-700">{p.receipt?.receiptNumber}</td>
                      <td className="px-5 py-3 text-slate-700">{new Date(p.paymentDate).toLocaleDateString("en-IN")}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{p.student?.name}</td>
                      <td className="px-5 py-3 text-slate-600">{p.enrollment?.course?.name}</td>
                      <td className="px-5 py-3 text-right font-black text-slate-900">₹{p.amount.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold">{p.paymentMode}</span></td>
                      <td className="px-5 py-3 font-mono text-slate-500">{p.transactionReference || "Cash"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Outstanding Report (SRS Section 49) */}
      {activeTab === "outstanding" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
              <tr>
                <th className="px-5 py-3.5">Student ID</th>
                <th className="px-5 py-3.5">Student Name</th>
                <th className="px-5 py-3.5">Parent & Mobile</th>
                <th className="px-5 py-3.5">Branch</th>
                <th className="px-5 py-3.5 text-right">Total Fee</th>
                <th className="px-5 py-3.5 text-right">Paid</th>
                <th className="px-5 py-3.5 text-right">Pending</th>
                <th className="px-5 py-3.5">Next Due</th>
                <th className="px-5 py-3.5 text-center">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {outstandingList.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-slate-400">All fees are fully cleared!</td></tr>
              ) : (
                outstandingList.map((o) => (
                  <tr key={o.studentId} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-mono font-bold text-tekzow-700">{o.studentCode}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">{o.studentName}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{o.parentName}</p>
                      <p className="font-mono text-[11px] text-slate-500">{o.mobile}</p>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">{o.branchName}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-600">₹{o.totalFee.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-600">₹{o.paidAmount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5 text-right font-black text-rose-600 text-sm">₹{o.pendingAmount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {o.nextDueDate ? new Date(o.nextDueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {o.daysOverdue > 0 ? (
                        <span className="rounded bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 text-[10px]">
                          {o.daysOverdue}D
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Multi-Branch Comparison (SRS Section 50) */}
      {activeTab === "branch" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {branchMetrics.map((b) => (
            <div key={b.branchId} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{b.branchName} ({b.branchCode})</h2>
                  <p className="text-xs text-slate-500">{b.phone}</p>
                </div>
                <span className="rounded-xl bg-tekzow-50 px-3 py-1 font-bold text-tekzow-700 text-xs border border-tekzow-200">
                  {b.collectionRatio}% Realization
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold">Total Students:</span>
                  <p className="font-black text-slate-900 text-lg mt-0.5">{b.totalStudents} ({b.activeStudents} active)</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold">Enrolled Fees:</span>
                  <p className="font-black text-slate-900 text-lg mt-0.5">₹{b.totalEnrolledFees.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-emerald-700 font-semibold">Collected:</span>
                  <p className="font-black text-emerald-700 text-lg mt-0.5">₹{b.totalCollected.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <span className="text-rose-700 font-semibold">Overdue Balance:</span>
                  <p className="font-black text-rose-700 text-lg mt-0.5">₹{b.overdueAmount.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}