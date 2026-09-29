"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap, Plus, Search, Calendar, CreditCard, CheckCircle2,
  AlertCircle, X, Loader2, Sparkles, BookOpen
} from "lucide-react";
import ReceiptModal from "@/components/ReceiptModal";

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);

  // Form Wizard State
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [planFee, setPlanFee] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [firstPaymentEnabled, setFirstPaymentEnabled] = useState(true);
  const [firstPaymentAmount, setFirstPaymentAmount] = useState<number>(0);
  const [firstPaymentMode, setFirstPaymentMode] = useState("UPI");
  const [firstPaymentRef, setFirstPaymentRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/enrollments");
      const data = await res.json();
      setEnrollments(data.enrollments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [stuRes, courseRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/courses"),
      ]);
      const stuData = await stuRes.json();
      const courseData = await courseRes.json();
      setStudents(stuData.students || []);
      setCourses(courseData.courses || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEnrollments();
    fetchDependencies();
  }, []);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const course = courses.find((c) => c.id === courseId);
    if (course?.plans?.length) {
      handlePlanChange(course.plans[0], courseId);
    } else {
      setSelectedPlanId("");
      setPlanFee(0);
      setInstallments([]);
    }
  };

  const handlePlanChange = (plan: any, cId = selectedCourseId) => {
    setSelectedPlanId(plan.id);
    const fee = Number(plan.totalFee);
    setPlanFee(fee);
    const net = Math.max(0, fee - discount);

    // Generate dynamic installments based on plan
    const generated = (plan.installments || []).map((pi: any) => {
      const amt = Math.round((net * pi.percentage) / 100);
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + (pi.dueOffsetMonths || 0));
      return {
        installmentNumber: pi.installmentNumber,
        amount: amt,
        dueDate: d.toISOString().split("T")[0],
      };
    });

    setInstallments(generated);
    if (generated.length) {
      setFirstPaymentAmount(generated[0].amount);
    }
  };

  const handleDiscountChange = (disc: number) => {
    setDiscount(disc);
    const net = Math.max(0, planFee - disc);
    const course = courses.find((c) => c.id === selectedCourseId);
    const plan = course?.plans?.find((p: any) => p.id === selectedPlanId);
    if (plan && plan.installments) {
      const updated = plan.installments.map((pi: any) => {
        const amt = Math.round((net * pi.percentage) / 100);
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + (pi.dueOffsetMonths || 0));
        return {
          installmentNumber: pi.installmentNumber,
          amount: amt,
          dueDate: d.toISOString().split("T")[0],
        };
      });
      setInstallments(updated);
      if (updated.length) setFirstPaymentAmount(updated[0].amount);
    }
  };

  const handleStartDateChange = (newDate: string) => {
    setStartDate(newDate);
    const course = courses.find((c) => c.id === selectedCourseId);
    const plan = course?.plans?.find((p: any) => p.id === selectedPlanId);
    if (plan && plan.installments) {
      const net = Math.max(0, planFee - discount);
      const updated = plan.installments.map((pi: any) => {
        const amt = Math.round((net * pi.percentage) / 100);
        const d = new Date(newDate);
        d.setMonth(d.getMonth() + (pi.dueOffsetMonths || 0));
        return {
          installmentNumber: pi.installmentNumber,
          amount: amt,
          dueDate: d.toISOString().split("T")[0],
        };
      });
      setInstallments(updated);
    }
  };

  const finalFee = Math.max(0, planFee - discount);

  const handleSubmitEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedCourseId || !selectedPlanId) {
      alert("Please select student, course, and plan.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          courseId: selectedCourseId,
          planId: selectedPlanId,
          startDate,
          planFee,
          discount,
          finalFee,
          installments,
          firstPayment: firstPaymentEnabled
            ? {
                amount: firstPaymentAmount,
                paymentMode: firstPaymentMode,
                transactionReference: firstPaymentRef.trim() || undefined,
                notes: "Initial enrollment payment",
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enrollment failed");

      setIsEnrollModalOpen(false);
      fetchEnrollments();

      if (data.receipt) {
        fetch(`/api/receipts/${data.receipt.id}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.receipt) setActiveReceipt(d.receipt);
          });
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">Course Enrollments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage course subscriptions, dynamic installment schedules, and initial payments
          </p>
        </div>

        <button
          onClick={() => {
            if (students.length) setSelectedStudentId(students[0].id);
            if (courses.length) handleCourseChange(courses[0].id);
            setIsEnrollModalOpen(true);
          }}
          className="inline-flex items-center space-x-1.5 rounded-xl bg-tekzow-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-tekzow-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>New Student Enrollment</span>
        </button>
      </div>

      {/* Enrollments Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
            <tr>
              <th className="px-5 py-3.5">Student</th>
              <th className="px-5 py-3.5">Course & Plan</th>
              <th className="px-5 py-3.5">Branch</th>
              <th className="px-5 py-3.5 text-right">Base Fee</th>
              <th className="px-5 py-3.5 text-right">Discount</th>
              <th className="px-5 py-3.5 text-right">Final Fee</th>
              <th className="px-5 py-3.5">Installments</th>
              <th className="px-5 py-3.5 text-center">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center text-slate-400">Loading enrollments...</td></tr>
            ) : enrollments.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-slate-400">No active enrollments found.</td></tr>
            ) : (
              enrollments.map((e) => {
                const paidCount = e.installments.filter((i: any) => i.balanceAmount === 0).length;
                const latestPayment = e.payments?.[0];
                return (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <Link href={`/students/${e.student.id}`} className="font-bold text-slate-900 hover:text-tekzow-600">
                        {e.student.name}
                      </Link>
                      <p className="font-mono text-[11px] text-tekzow-700">{e.student.studentCode}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-800">{e.course.name}</p>
                      <p className="text-slate-500 text-[11px]">{e.plan.name}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {e.branch.code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-500">₹{e.planFee.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">
                      {e.discount > 0 ? `-₹${e.discount.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900">₹{e.finalFee.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded bg-tekzow-50 px-2 py-0.5 text-[10px] font-bold text-tekzow-700 border border-tekzow-200">
                        {paidCount}/{e.installments.length} Paid
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {latestPayment?.receipt ? (
                        <button
                          onClick={() => {
                            fetch(`/api/receipts/${latestPayment.receipt.id}`)
                              .then(r => r.json())
                              .then(d => { if (d.receipt) setActiveReceipt(d.receipt); });
                          }}
                          className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                        >
                          View Receipt
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Enrollment Wizard Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">New Course Enrollment</h2>
                <p className="text-xs text-slate-500">Select course, customize fee, configure installments and initial payment</p>
              </div>
              <button onClick={() => setIsEnrollModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEnrollment} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Select Student *</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 font-bold text-slate-900 mt-1"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.studentCode}) - {s.branch?.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Course Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div>
                  <label className="font-bold text-slate-700">Course *</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 font-bold text-slate-900 mt-1"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Course Plan *</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => {
                      const course = courses.find((c) => c.id === selectedCourseId);
                      const plan = course?.plans?.find((p: any) => p.id === e.target.value);
                      if (plan) handlePlanChange(plan);
                    }}
                    className="w-full rounded-xl border border-slate-300 p-2 font-bold text-slate-900 mt-1"
                  >
                    {(() => {
                      const curCourse = courses.find((c) => c.id === selectedCourseId);
                      const plans = curCourse?.plans || [];
                      if (plans.length === 0) {
                        return <option value="">No plans configured for this course</option>;
                      }
                      return plans.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.durationMonths} Month{p.durationMonths > 1 ? "s" : ""}) — ₹{p.totalFee.toLocaleString("en-IN")}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              </div>

              {/* Fee and Custom Discount (SRS Section 24) */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-slate-500">Plan Base Fee</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">₹{planFee.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <label className="text-emerald-700 font-semibold block">Custom Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={planFee}
                    value={discount}
                    onChange={(e) => handleDiscountChange(Number(e.target.value))}
                    className="w-24 text-center font-bold text-emerald-700 rounded-lg border border-slate-300 py-1 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-tekzow-700 font-bold">Final Enrolled Fee</span>
                  <p className="font-black text-tekzow-700 text-base mt-0.5">₹{finalFee.toLocaleString("en-IN")}</p>
                </div>
              </div>

              {/* Dynamic Installments Configurator (SRS Section 23 & 26) */}
              <div className="border-t pt-3">
                <h3 className="font-bold text-slate-800 mb-2">Configured Installment Due Schedule</h3>
                <div className="space-y-2">
                  {installments.map((inst, index) => (
                    <div key={index} className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700 w-24">Installment {inst.installmentNumber}:</span>
                      <div className="flex items-center space-x-1">
                        <span>₹</span>
                        <input
                          type="number"
                          value={inst.amount}
                          onChange={(e) => {
                            const updated = [...installments];
                            updated[index].amount = Number(e.target.value);
                            setInstallments(updated);
                          }}
                          className="w-24 font-bold border rounded p-1"
                        />
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-500">Due:</span>
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={(e) => {
                            const updated = [...installments];
                            updated[index].dueDate = e.target.value;
                            setInstallments(updated);
                          }}
                          className="border rounded p-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional Immediate First Payment (SRS Section 25) */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 font-bold text-emerald-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={firstPaymentEnabled}
                      onChange={(e) => setFirstPaymentEnabled(e.target.checked)}
                      className="h-4 w-4 rounded text-emerald-600"
                    />
                    <span>Collect First Installment Payment Right Now</span>
                  </label>
                  <span className="text-[11px] text-emerald-700 font-semibold">Generates instant receipt</span>
                </div>

                {firstPaymentEnabled && (
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-emerald-200 text-xs">
                    <div>
                      <label className="font-bold text-slate-700">Amount Received (₹) *</label>
                      <input
                        type="number"
                        min="1"
                        value={firstPaymentAmount}
                        onChange={(e) => setFirstPaymentAmount(Number(e.target.value))}
                        className="w-full border rounded-lg p-1.5 font-bold mt-1"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Payment Mode *</label>
                      <select
                        value={firstPaymentMode}
                        onChange={(e) => setFirstPaymentMode(e.target.value)}
                        className="w-full border rounded-lg p-1.5 font-bold mt-1"
                      >
                        <option value="UPI">UPI</option>
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CARD">Card</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Reference ID</label>
                      <input
                        type="text"
                        value={firstPaymentRef}
                        onChange={(e) => setFirstPaymentRef(e.target.value)}
                        placeholder="e.g. UPI12345"
                        className="w-full border rounded-lg p-1.5 font-mono mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button type="button" onClick={() => setIsEnrollModalOpen(false)} className="border px-4 py-2 rounded-xl">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center space-x-2 rounded-xl bg-tekzow-600 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-tekzow-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Enrollment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeReceipt && (
        <ReceiptModal receipt={activeReceipt} isOpen={!!activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </div>
  );
}