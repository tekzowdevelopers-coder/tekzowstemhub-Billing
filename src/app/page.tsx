"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  CreditCard,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Send,
  PlusCircle,
  FileCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import CollectPaymentModal from "@/components/CollectPaymentModal";
import ReceiptModal from "@/components/ReceiptModal";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInstallmentForPayment, setSelectedInstallmentForPayment] = useState<any>(null);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSendReminder = async (instId: string, studentName: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentId: instId,
          channel: "WHATSAPP",
          templateId: "payment_overdue",
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setReminderToast(`WhatsApp overdue reminder sent to parent of ${studentName}!`);
      } else {
        setReminderToast(`Reminder dispatched to parent.`);
      }
      setTimeout(() => setReminderToast(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-tekzow-600 border-t-transparent"></div>
          <p className="text-xs font-semibold text-slate-500">Loading branch financial data...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const monthlyTrends = data?.monthlyTrends || [];
  const statusBreakdown = data?.statusBreakdown || [];
  const upcomingDues = data?.upcomingDues || [];
  const overdueList = data?.overdueList || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Alert */}
      {reminderToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{reminderToast}</span>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational and collection overview for Tekzow STEMHub
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            href="/students"
            className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <Users className="h-4 w-4 text-tekzow-600" />
            <span>Manage Students</span>
          </Link>
          <Link
            href="/enrollments"
            className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <PlusCircle className="h-4 w-4 text-emerald-600" />
            <span>New Enrollment</span>
          </Link>
          <Link
            href="/payments"
            className="inline-flex items-center space-x-1.5 rounded-xl bg-tekzow-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-tekzow-700 transition"
          >
            <CreditCard className="h-4 w-4" />
            <span>Collect Payment</span>
          </Link>
        </div>
      </div>

      {/* 8 Primary KPI Cards (SRS Section 13) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Students</span>
            <div className="rounded-xl bg-tekzow-50 p-2 text-tekzow-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{kpis.totalStudents || 0}</p>
            <span className="text-[11px] font-semibold text-emerald-600">{kpis.activeStudents || 0} currently active</span>
          </div>
        </div>

        {/* Total Enrolled Fee */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Enrolled Fee</span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">₹{(kpis.totalEnrolledFee || 0).toLocaleString("en-IN")}</p>
            <span className="text-[11px] font-medium text-slate-400">Contracted Course Fees</span>
          </div>
        </div>

        {/* Total Collected */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Collected</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-emerald-600">₹{(kpis.totalCollected || 0).toLocaleString("en-IN")}</p>
            <span className="text-[11px] font-semibold text-emerald-700">
              {kpis.totalEnrolledFee ? Math.round(((kpis.totalCollected || 0) / kpis.totalEnrolledFee) * 100) : 0}% realized
            </span>
          </div>
        </div>

        {/* Pending Amount */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Amount</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-amber-600">₹{(kpis.pendingAmount || 0).toLocaleString("en-IN")}</p>
            <span className="text-[11px] font-medium text-slate-500">Scheduled in installments</span>
          </div>
        </div>

        {/* Today's Collection */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Collection</span>
            <div className="rounded-xl bg-sky-50 p-2 text-sky-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-sky-700">₹{(kpis.todayCollection || 0).toLocaleString("en-IN")}</p>
            <span className="text-[11px] font-medium text-slate-400">Received today</span>
          </div>
        </div>

        {/* Due This Month */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Due This Month</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-blue-700">₹{(kpis.dueThisMonth || 0).toLocaleString("en-IN")}</p>
            <span className="text-[11px] font-medium text-slate-500">Current calendar cycle</span>
          </div>
        </div>

        {/* Overdue Amount */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-xs col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Total Overdue Amount</span>
            <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl font-black text-rose-700">₹{(kpis.overdueAmount || 0).toLocaleString("en-IN")}</p>
            <Link
              href="/due-payments?filter=OVERDUE"
              className="text-xs font-bold text-rose-800 hover:underline flex items-center space-x-1"
            >
              <span>View Overdue Queue</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Charts Section: Monthly Trends (Section 14) & Status Donut (Section 15) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Collection Trend */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monthly Collection Trend</h2>
              <p className="text-xs text-slate-500">Recorded student fees realization month-wise</p>
            </div>
            <span className="text-xs font-semibold text-tekzow-600 bg-tekzow-50 px-2.5 py-1 rounded-full border border-tekzow-200">
              FY 2026-27
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Collection"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Bar dataKey="collection" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status Breakdown */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Installment Statuses</h2>
            <p className="text-xs text-slate-500">Distribution across active students</p>
          </div>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusBreakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any, name: any) => [`${val} Installments`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            {statusBreakdown.map((item: any) => (
              <div key={item.name} className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 font-medium">{item.name}:</span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actionable Lists: Upcoming Dues (Section 16) & Overdue Queue (Section 17) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Dues */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Upcoming Due Payments</h2>
              <p className="text-xs text-slate-500">Installments maturing in the next 30 days</p>
            </div>
            <Link href="/due-payments?filter=DUE_MONTH" className="text-xs font-semibold text-tekzow-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {upcomingDues.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">No upcoming installments due</p>
            ) : (
              upcomingDues.map((inst: any) => (
                <div key={inst.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{inst.enrollment.student.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {inst.enrollment.course.name} ({inst.enrollment.plan.name}) • Inst {inst.installmentNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900">₹{inst.balanceAmount.toLocaleString("en-IN")}</p>
                    <span className="text-[10px] font-semibold text-tekzow-600 bg-tekzow-50 px-2 py-0.5 rounded">
                      Due: {new Date(inst.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overdue Queue with Instant Action Buttons (Section 17) */}
        <div className="rounded-2xl border border-rose-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-rose-900">Critical Overdue Students</h2>
              <p className="text-xs text-rose-600">Action required: send reminder or record fee</p>
            </div>
            <Link href="/due-payments?filter=OVERDUE" className="text-xs font-bold text-rose-700 hover:underline">
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {overdueList.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">No overdue payments! Excellent collection.</p>
            ) : (
              overdueList.slice(0, 5).map((item: any) => (
                <div key={item.installmentId} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs font-bold text-slate-900">{item.studentName}</p>
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-700">
                        {item.daysOverdue}d overdue
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Parent: {item.parentName} ({item.mobile}) • {item.courseName}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSendReminder(item.installmentId, item.studentName)}
                      className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition flex items-center space-x-1"
                      title="Send WhatsApp Reminder"
                    >
                      <Send className="h-3 w-3" />
                      <span>Reminder</span>
                    </button>
                    <button
                      onClick={() =>
                        setSelectedInstallmentForPayment({
                          id: item.installmentId,
                          balanceAmount: item.amount,
                          paidAmount: 0,
                          amount: item.amount,
                          installmentNumber: 2,
                          dueDate: item.dueDate,
                          enrollment: {
                            student: { name: item.studentName, studentCode: item.studentCode },
                            course: { name: item.courseName },
                            plan: { name: "Plan" },
                          },
                        })
                      }
                      className="rounded-lg bg-tekzow-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-tekzow-700 transition"
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

      {/* Collect Payment Modal */}
      {selectedInstallmentForPayment && (
        <CollectPaymentModal
          installment={selectedInstallmentForPayment}
          isOpen={!!selectedInstallmentForPayment}
          onClose={() => setSelectedInstallmentForPayment(null)}
          onSuccess={(result) => {
            fetchDashboardData();
            if (result.receipt) {
              // Fetch full receipt details to launch receipt modal
              fetch(`/api/receipts/${result.receipt.id}`)
                .then((r) => r.json())
                .then((d) => {
                  if (d.receipt) setActiveReceipt(d.receipt);
                });
            }
          }}
        />
      )}

      {/* Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          isOpen={!!activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
}