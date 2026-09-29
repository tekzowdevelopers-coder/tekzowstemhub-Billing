"use client";

import React, { useState } from "react";
import { X, CreditCard, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface CollectPaymentModalProps {
  installment: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentResult: any) => void;
}

export default function CollectPaymentModal({
  installment,
  isOpen,
  onClose,
  onSuccess,
}: CollectPaymentModalProps) {
  const [amount, setAmount] = useState<number>(installment?.balanceAmount || 0);
  const [paymentMode, setPaymentMode] = useState<string>("UPI");
  const [transactionReference, setTransactionReference] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState<string>("");
  const [step, setStep] = useState<"FORM" | "CONFIRM">("FORM");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !installment) return null;

  const student = installment.enrollment?.student;
  const course = installment.enrollment?.course;
  const plan = installment.enrollment?.plan;

  const previouslyPaid = installment.paidAmount || 0;
  const currentBalance = installment.balanceAmount || 0;
  const payAmount = Number(amount) || 0;
  const remainingBalanceAfter = Math.max(0, currentBalance - payAmount);
  const projectedStatus = remainingBalanceAfter === 0 ? "PAID" : "PARTIAL";

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      setError("Please enter a valid payment amount greater than ₹0");
      return;
    }
    if (payAmount > currentBalance + 0.01) {
      setError(`Amount cannot exceed outstanding balance of ₹${currentBalance.toLocaleString("en-IN")}`);
      return;
    }
    setError(null);
    setStep("CONFIRM");
  };

  const handleFinalSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentId: installment.id,
          amount: payAmount,
          paymentMode,
          transactionReference: transactionReference.trim() || undefined,
          paymentDate,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record payment");
      }

      onSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
      setStep("FORM");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="rounded-xl bg-tekzow-100 p-2 text-tekzow-700">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Manual Payment Collection</h2>
              <p className="text-xs text-slate-500">Record off-app received fee (Cash, UPI, Bank)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 flex items-center space-x-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Form */}
        {step === "FORM" ? (
          <form onSubmit={handleProceedToConfirm} className="p-6 space-y-4">
            {/* Student & Installment context badge */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
              <div className="flex justify-between font-semibold text-slate-900">
                <span>{student?.name} ({student?.studentCode})</span>
                <span className="text-tekzow-700 font-bold">{course?.name}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Installment {installment.installmentNumber} ({plan?.name})</span>
                <span>Due Date: {new Date(installment.dueDate).toLocaleDateString("en-IN")}</span>
              </div>
            </div>

            {/* Balances overview */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50">
                <span className="text-slate-500">Installment</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">₹{installment.amount.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50">
                <span className="text-slate-500">Previously Paid</span>
                <p className="font-bold text-emerald-600 text-sm mt-0.5">₹{previouslyPaid.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-xl border border-rose-200 p-2.5 bg-rose-50">
                <span className="text-rose-700 font-semibold">Current Balance</span>
                <p className="font-extrabold text-rose-700 text-sm mt-0.5">₹{currentBalance.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Input fields */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount Received (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={currentBalance}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-tekzow-600 focus:ring-1 focus:ring-tekzow-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Mode <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-tekzow-600 focus:ring-1 focus:ring-tekzow-600"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                  <option value="CARD">Card Swipe (POS)</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:border-tekzow-600 focus:ring-1 focus:ring-tekzow-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Transaction / Reference ID {paymentMode !== "CASH" && <span className="text-slate-400 font-normal">(e.g. UPI Ref / Cheque No)</span>}
              </label>
              <input
                type="text"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                placeholder={paymentMode === "CASH" ? "Optional receipt memo" : "e.g. UPI123456789"}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-mono text-slate-900 focus:border-tekzow-600 focus:ring-1 focus:ring-tekzow-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Internal Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid by father at front desk"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-tekzow-600 focus:ring-1 focus:ring-tekzow-600"
              />
            </div>

            {/* Real-time summary preview */}
            <div className="rounded-xl bg-tekzow-50/70 border border-tekzow-200 p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Remaining Balance After Payment:</span>
                <span className="font-bold text-slate-900">₹{remainingBalanceAfter.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Installment Status Will Become:</span>
                <span className={`font-black uppercase ${projectedStatus === "PAID" ? "text-emerald-700" : "text-amber-700"}`}>
                  {projectedStatus}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-tekzow-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-tekzow-700 transition"
              >
                Review & Confirm
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Confirmation Dialog (SRS Section 33) */
          <div className="p-6 space-y-5">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-emerald-600 mb-1" />
              <h3 className="text-sm font-bold text-emerald-900">Confirm Payment Details</h3>
              <p className="text-xs text-emerald-700">Please verify before committing to financial records</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Student:</span>
                <span className="font-bold text-slate-900">{student?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Installment:</span>
                <span className="font-semibold text-slate-800">Installment {installment.installmentNumber} ({course?.name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Amount Received:</span>
                <span className="font-black text-tekzow-700 text-sm">₹{payAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Payment Mode:</span>
                <span className="font-bold text-slate-800">{paymentMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Reference ID:</span>
                <span className="font-mono text-slate-800">{transactionReference || "Cash Payment"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Payment Date:</span>
                <span className="font-medium text-slate-800">{paymentDate}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic text-center">
              * Once confirmed, a unique receipt will be generated, and WhatsApp & SMS notifications will be queued for the parent.
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setStep("FORM")}
                disabled={loading}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading}
                className="inline-flex items-center space-x-2 rounded-xl bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Confirm & Record Payment</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}