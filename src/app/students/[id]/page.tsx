"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users, ArrowLeft, Phone, Mail, MapPin, Calendar, CreditCard,
  CheckCircle2, Clock, AlertTriangle, FileText, Send, Bell,
  ShieldCheck, RefreshCw, X, Trash2, Loader2
} from "lucide-react";
import CollectPaymentModal from "@/components/CollectPaymentModal";
import ReceiptModal from "@/components/ReceiptModal";

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;

  const [student, setStudent] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "installments" | "payments" | "receipts" | "notifications" | "audit">("installments");

  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [voidingPaymentId, setVoidingPaymentId] = useState<string | null>(null);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/students/${studentId}`);
      const data = await res.json();
      setStudent(data.student);
      setNotifications(data.notifications || []);
      setAuditLogs(data.auditLogs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      setSession(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStudentData();
    fetchSession();
  }, [studentId]);

  const handleDeleteStudent = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/students/${studentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete student");
      alert(data.message || "Student deleted successfully");
      router.push("/students");
    } catch (err: any) {
      alert(err.message);
      setIsDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleVoidPayment = async (paymentId: string) => {
    const reason = prompt("Please provide a reason for voiding this payment record:");
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
        fetchStudentData();
      } else {
        alert(data.error || "Failed to void payment");
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-tekzow-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-sm font-bold text-slate-700">Student not found.</p>
        <Link href="/students" className="text-xs text-tekzow-600 font-semibold mt-2 inline-block">Return to Directory</Link>
      </div>
    );
  }

  const enrollment = student.enrollments?.[0];
  const installments = enrollment?.installments || [];
  const payments = student.payments || [];
  const parent = student.parent;

  let totalFee = enrollment?.finalFee || 0;
  let totalPaid = 0;
  payments.filter((p: any) => p.status === "ACTIVE").forEach((p: any) => { totalPaid += p.amount; });
  let totalPending = Math.max(0, totalFee - totalPaid);
  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Link href="/students" className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-tekzow-600">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Students</span>
        </Link>
      </div>

      {/* Student 360 Header Profile Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-tekzow-600 to-cyan-500 text-white font-black text-2xl flex items-center justify-center shadow-md">
            {student.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-navy-900">{student.name}</h1>
              <span className="rounded-md bg-tekzow-50 px-2 py-0.5 text-xs font-bold text-tekzow-700 border border-tekzow-200">
                {student.studentCode}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {student.branch?.name} ({student.branch?.code})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {student.schoolName || "School N/A"} • {student.grade || "Grade N/A"} • Academic Year {student.academicYear}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Parent Contacts */}
          <div className="flex items-center space-x-3 text-xs bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <div>
              <p className="font-bold text-slate-800">{parent?.fatherName || parent?.motherName || "Guardian"}</p>
              <p className="text-slate-500 font-mono">{parent?.whatsappNumber || parent?.mobile}</p>
            </div>
            {(() => {
              const raw = parent?.whatsappNumber || parent?.mobile || "";
              let digits = raw.replace(/[^0-9]/g, "");
              if (digits.length === 10) digits = "91" + digits;
              else if (digits.length === 11 && digits.startsWith("0")) digits = "91" + digits.substring(1);
              const waText = encodeURIComponent(
                `Hello ${parent?.fatherName || parent?.motherName || "Parent"}, greetings from Tekzow STEMHub regarding student ${student.name} (${student.studentCode}).`
              );
              const waLink = digits ? `https://api.whatsapp.com/send?phone=${digits}&text=${waText}` : `https://api.whatsapp.com/send?text=${waText}`;
              return (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700 transition"
                  title="Chat on WhatsApp"
                >
                  <Send className="h-4 w-4" />
                </a>
              );
            })()}
          </div>

          {/* Super Admin Delete Action */}
          {session?.isSuperAdmin && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center space-x-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition"
              title="Delete Student (Super Admin Only)"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Student</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Enrolled Fee</span>
          <p className="text-xl font-black text-slate-900 mt-1">₹{totalFee.toLocaleString("en-IN")}</p>
          <span className="text-[10px] text-slate-500 font-medium">Course: {enrollment?.course?.name || "None"}</span>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-emerald-600">Total Paid</span>
          <p className="text-xl font-black text-emerald-600 mt-1">₹{totalPaid.toLocaleString("en-IN")}</p>
          <span className="text-[10px] text-emerald-700 font-semibold">{totalFee ? Math.round((totalPaid / totalFee) * 100) : 0}% cleared</span>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-rose-600">Pending Amount</span>
          <p className="text-xl font-black text-rose-600 mt-1">₹{totalPending.toLocaleString("en-IN")}</p>
          <span className="text-[10px] text-slate-500 font-medium">Remaining balance</span>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-400">Installments Status</span>
          <p className="text-xl font-black text-tekzow-700 mt-1">
            {installments.filter((i: any) => i.balanceAmount === 0).length}/{installments.length} Paid
          </p>
          <span className="text-[10px] text-slate-500 font-medium">Plan: {enrollment?.plan?.name || "Standard"}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-6 text-xs font-bold text-slate-500">
        {[
          { key: "installments", label: "Installments Schedule" },
          { key: "payments", label: "Payment History" },
          { key: "receipts", label: "Receipts" },
          { key: "overview", label: "Bio & Contact" },
          { key: "notifications", label: "Notification Logs" },
          { key: "audit", label: "Audit Timeline" },
        ].map((tab: any) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 border-b-2 transition ${
              activeTab === tab.key ? "border-tekzow-600 text-tekzow-600" : "border-transparent hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Installments */}
      {activeTab === "installments" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
              <tr>
                <th className="px-5 py-3.5">Installment</th>
                <th className="px-5 py-3.5">Due Date</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5 text-right">Paid</th>
                <th className="px-5 py-3.5 text-right">Balance</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {installments.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">No installments configured.</td></tr>
              ) : (
                installments.map((inst: any) => (
                  <tr key={inst.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-bold text-slate-900">Installment {inst.installmentNumber}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {new Date(inst.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">₹{inst.amount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-600">₹{inst.paidAmount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-rose-600">₹{inst.balanceAmount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                        inst.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : inst.status === "PARTIAL"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : inst.status === "OVERDUE"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}>
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {inst.balanceAmount > 0 ? (
                        <button
                          onClick={() => setSelectedInstallment({ ...inst, enrollment })}
                          className="rounded-xl bg-tekzow-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-tekzow-700 transition"
                        >
                          Collect Payment
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-600">Paid in Full</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Payments History */}
      {activeTab === "payments" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Installment</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5">Mode</th>
                <th className="px-5 py-3.5">Reference ID</th>
                <th className="px-5 py-3.5">Receipt #</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">No payments recorded.</td></tr>
              ) : (
                payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {new Date(p.paymentDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">
                      Inst {p.installment?.installmentNumber || 1}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900 text-sm">
                      ₹{p.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {p.paymentMode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-700">
                      {p.transactionReference || "Cash"}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-tekzow-700">
                      {p.receipt?.receiptNumber || "N/A"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        p.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600 line-through"
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
                            className="rounded-lg bg-tekzow-50 px-2 py-1 text-[11px] font-bold text-tekzow-700 hover:bg-tekzow-100"
                          >
                            Receipt
                          </button>
                        )}
                        {p.status === "ACTIVE" && (
                          <button
                            onClick={() => handleVoidPayment(p.id)}
                            className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                            title="Void Payment (Financial Reversal)"
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
      )}

      {/* Tab: Receipts */}
      {activeTab === "receipts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {payments.filter((p: any) => p.receipt).map((p: any) => (
            <div key={p.receipt.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-tekzow-600 bg-tekzow-50 px-2 py-0.5 rounded">
                  {p.receipt.receiptNumber}
                </span>
                <p className="text-base font-black text-slate-900 mt-2">₹{p.amount.toLocaleString("en-IN")}</p>
                <p className="text-xs text-slate-500 mt-0.5">Mode: {p.paymentMode} • Date: {new Date(p.paymentDate).toLocaleDateString("en-IN")}</p>
              </div>
              <button
                onClick={() => {
                  fetch(`/api/receipts/${p.receipt.id}`).then(r => r.json()).then(d => { if (d.receipt) setActiveReceipt(d.receipt); });
                }}
                className="rounded-xl bg-navy-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-navy-800 transition"
              >
                View Letterhead Receipt
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Overview Bio */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 text-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2">Student Particulars</h3>
            <p><span className="text-slate-400 font-semibold">Full Name:</span> <span className="font-bold text-slate-900">{student.name}</span></p>
            <p><span className="text-slate-400 font-semibold">Student Code:</span> <span className="font-mono font-bold text-tekzow-700">{student.studentCode}</span></p>
            <p><span className="text-slate-400 font-semibold">School Name:</span> {student.schoolName || "N/A"}</p>
            <p><span className="text-slate-400 font-semibold">Grade/Class:</span> {student.grade || "N/A"}</p>
            <p><span className="text-slate-400 font-semibold">Gender:</span> {student.gender}</p>
            <p><span className="text-slate-400 font-semibold">City & State:</span> {student.city}, {student.state} ({student.pincode})</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 text-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2">Parent / Contact Details</h3>
            <p><span className="text-slate-400 font-semibold">Father Name:</span> <span className="font-bold text-slate-900">{parent?.fatherName || "N/A"}</span></p>
            <p><span className="text-slate-400 font-semibold">Mother Name:</span> {parent?.motherName || "N/A"}</p>
            <p><span className="text-slate-400 font-semibold">Mobile Number:</span> <span className="font-mono font-bold text-slate-900">{parent?.mobile}</span></p>
            <p>
              <span className="text-slate-400 font-semibold">WhatsApp Number:</span>{" "}
              {(() => {
                const raw = parent?.whatsappNumber || parent?.mobile || "";
                let digits = raw.replace(/[^0-9]/g, "");
                if (digits.length === 10) digits = "91" + digits;
                else if (digits.length === 11 && digits.startsWith("0")) digits = "91" + digits.substring(1);
                const waUrl = digits ? `https://api.whatsapp.com/send?phone=${digits}` : "#";
                return (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono font-bold text-emerald-700 hover:underline inline-flex items-center space-x-1"
                    title="Click to chat on WhatsApp"
                  >
                    <span>{parent?.whatsappNumber || "N/A"}</span>
                    <Send className="h-3 w-3 inline text-emerald-600 ml-1" />
                  </a>
                );
              })()}
            </p>
            <p><span className="text-slate-400 font-semibold">Email:</span> {parent?.email || "N/A"}</p>
            <p><span className="text-slate-400 font-semibold">Home Address:</span> {parent?.address || "N/A"}</p>
          </div>
        </div>
      )}

      {/* Tab: Notification Logs */}
      {activeTab === "notifications" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">WhatsApp & SMS Notification Logs</h3>
          <div className="divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No notifications dispatched yet.</p>
            ) : (
              notifications.map((n: any) => (
                <div key={n.id} className="py-3 flex justify-between items-start text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded">{n.channel}</span>
                      <span className="font-semibold text-slate-800">{n.templateId}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        n.status === "DELIVERED" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}>
                        {n.status}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 font-mono text-[11px]">{n.logs?.[0]?.message?.slice(0, 100)}...</p>
                  </div>
                  <span className="text-slate-400 text-[11px]">{new Date(n.createdAt).toLocaleString("en-IN")}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Audit History */}
      {activeTab === "audit" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Audit Trail</h3>
          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No audit records.</p>
            ) : (
              auditLogs.map((a: any) => (
                <div key={a.id} className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{a.action}</span>
                    <span className="text-slate-400 font-normal">{new Date(a.createdAt).toLocaleString("en-IN")}</span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-600 mt-1">{a.newData || a.oldData}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedInstallment && (
        <CollectPaymentModal
          installment={selectedInstallment}
          isOpen={!!selectedInstallment}
          onClose={() => setSelectedInstallment(null)}
          onSuccess={(result) => {
            fetchStudentData();
            if (result.receipt) {
              fetch(`/api/receipts/${result.receipt.id}`).then(r => r.json()).then(d => { if (d.receipt) setActiveReceipt(d.receipt); });
            }
          }}
        />
      )}

      {activeReceipt && (
        <ReceiptModal receipt={activeReceipt} isOpen={!!activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}

      {/* Super Admin Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="rounded-xl bg-rose-100 p-2.5">
                <Trash2 className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Student Profile</h3>
                <p className="text-xs text-rose-600 font-semibold">Super Admin Authority Required</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900">{student.name}</strong> (<span className="font-mono text-tekzow-700 font-bold">{student.studentCode}</span>)?
            </p>

            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-[11px] text-rose-800 space-y-1">
              <p className="font-bold">⚠️ Warning: Irreversible Action</p>
              <p>This will remove all associated enrollment records, installment schedules, and payment receipts from the database.</p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteStudent}
                className="inline-flex items-center space-x-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>{deleting ? "Deleting..." : "Permanently Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}