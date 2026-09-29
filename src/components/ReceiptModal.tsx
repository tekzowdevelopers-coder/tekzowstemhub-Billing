"use client";

import React, { useRef, useState } from "react";
import { X, Download, Printer, Send, MessageSquare, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ReceiptModalProps {
  receipt: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReceiptModal({ receipt, isOpen, onClose }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{ type: "success" | "error"; text: string; actionUrl?: string } | null>(null);

  if (!isOpen || !receipt) return null;

  const payment = receipt.payment;
  const student = payment.student;
  const parent = student.parent;
  const enrollment = payment.enrollment;
  const installment = payment.installment;
  const branch = receipt.branch || student.branch;

  // Calculate cumulative figures
  let totalPaid = 0;
  let totalBalance = 0;
  let nextDueDate: string = "Completed";

  if (enrollment?.installments) {
    enrollment.installments.forEach((inst: any) => {
      totalPaid += inst.paidAmount;
      totalBalance += inst.balanceAmount;
      if (inst.balanceAmount > 0 && nextDueDate === "Completed") {
        nextDueDate = new Date(inst.dueDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    });
  } else {
    totalPaid = payment.amount;
  }

  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 850,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width mm
      const pageHeight = 297; // A4 height mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      pdf.save(`Receipt-${receipt.receiptNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = async () => {
    try {
      setWaSending(true);
      const res = await fetch(`/api/receipts/${receipt.id}/send-whatsapp`, { method: "POST" });
      const data = await res.json();
      if (data.success && data.whatsappUrl) {
        // Automatically open WhatsApp Web or native app
        const win = window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
        if (!win || win.closed || typeof win.closed === "undefined") {
          setNotificationMsg({
            type: "success",
            text: "WhatsApp receipt prepared! Click button if not opened:",
            actionUrl: data.whatsappUrl,
          });
        } else {
          setNotificationMsg({
            type: "success",
            text: "Opening WhatsApp with official receipt...",
            actionUrl: data.whatsappUrl,
          });
        }
      } else if (data.success) {
        setNotificationMsg({ type: "success", text: "Receipt sent successfully via WhatsApp to parent!" });
      } else {
        setNotificationMsg({ type: "error", text: "WhatsApp sending failed: " + (data.error || "Network error") });
      }
    } catch (e: any) {
      setNotificationMsg({ type: "error", text: e.message });
    } finally {
      setWaSending(false);
      setTimeout(() => setNotificationMsg(null), 8000);
    }
  };

  const handleSendSMS = async () => {
    try {
      setSmsSending(true);
      const res = await fetch(`/api/receipts/${receipt.id}/send-sms`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setNotificationMsg({ type: "success", text: "Payment SMS confirmation dispatched successfully!" });
      } else {
        setNotificationMsg({ type: "error", text: "SMS sending failed" });
      }
    } catch (e: any) {
      setNotificationMsg({ type: "error", text: e.message });
    } finally {
      setSmsSending(false);
      setTimeout(() => setNotificationMsg(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden my-auto">
        {/* Top Control Bar */}
        <div className="border-b border-slate-200 bg-slate-50 p-3 sm:px-6 sm:py-4 print:hidden shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-tekzow-600 bg-tekzow-50 px-2.5 py-1 rounded-full border border-tekzow-200">
                  {receipt.receiptNumber}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  {payment.paymentMode} • {new Date(payment.paymentDate).toLocaleDateString("en-IN")}
                </span>
              </div>
              <button
                onClick={onClose}
                className="sm:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto no-scrollbar w-full sm:w-auto justify-end">
              <button
                onClick={handleSendWhatsApp}
                disabled={waSending}
                className="inline-flex items-center space-x-1 rounded-lg bg-emerald-600 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50 transition shrink-0"
                title="Send to Parent WhatsApp"
              >
                {waSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                <span>WhatsApp</span>
              </button>

              <button
                onClick={handleSendSMS}
                disabled={smsSending}
                className="inline-flex items-center space-x-1 rounded-lg bg-sky-600 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-500 disabled:opacity-50 transition shrink-0"
                title="Send SMS to Parent"
              >
                {smsSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>SMS</span>
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center space-x-1 rounded-lg border border-slate-300 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition shrink-0"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isExporting}
                className="inline-flex items-center space-x-1 rounded-lg bg-navy-900 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-navy-800 disabled:opacity-50 transition shrink-0"
              >
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span>Download PDF</span>
              </button>

              <button
                onClick={onClose}
                className="hidden sm:inline-flex rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Feedback alert */}
        {notificationMsg && (
          <div
            className={`mx-4 sm:mx-6 mt-3 flex items-center justify-between rounded-lg p-3 text-xs font-medium shrink-0 ${
              notificationMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <div className="flex items-center space-x-2">
              {notificationMsg.type === "success" ? <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />}
              <span>{notificationMsg.text}</span>
            </div>
            {notificationMsg.actionUrl && (
              <a
                href={notificationMsg.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition ml-3 shrink-0"
              >
                <span>Open WhatsApp</span>
                <Send className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {/* Official Letterhead Container (Printable Canvas) */}
        <div className="p-3 sm:p-6 md:p-8 overflow-y-auto flex justify-center bg-slate-100 flex-1">
          <div
            ref={receiptRef}
            className="w-full max-w-[794px] bg-white text-slate-800 relative flex flex-col justify-between shadow-lg p-4 sm:p-8 md:p-12 box-border border border-slate-200 rounded-xl"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Watermark in background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none">
              <img
                src="/tekzow_letterhead.png"
                alt="Tekzow Watermark"
                className="w-64 sm:w-96 object-contain"
              />
            </div>

            {/* Header Section */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b-2 border-tekzow-500">
                {/* Official Brand Logo */}
                <div className="flex items-center">
                  <img
                    src="/tekzow-logo.png"
                    alt="Tekzow STEMHub"
                    className="h-10 sm:h-12 w-auto object-contain"
                  />
                </div>

                {/* Contact Information */}
                <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
                  <div className="flex items-center sm:justify-end space-x-1 font-medium">
                    <span className="text-tekzow-600">📞</span>
                    <span>+91 83628 50853</span>
                  </div>
                  <div className="flex items-center sm:justify-end space-x-1 font-medium">
                    <span className="text-tekzow-600">✉️</span>
                    <span>joinus@tekzowstemhub.com</span>
                  </div>
                  <div className="flex items-center sm:justify-end space-x-1 font-medium">
                    <span className="text-tekzow-600">🌐</span>
                    <span>Tekzowstemhub.com</span>
                  </div>
                </div>
              </div>

              {/* Receipt Title & Meta */}
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-navy-900 tracking-wider">OFFICIAL PAYMENT RECEIPT</h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Manual Payment Collection Record</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs sm:text-sm font-bold text-tekzow-700">{receipt.receiptNumber}</p>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Date: {new Date(payment.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Student & Payment Metadata Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4 sm:mt-6">
                {/* Student Details */}
                <div className="rounded-xl border border-slate-200 p-3.5 sm:p-4 bg-white shadow-xs space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-1.5">Student Details</h3>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <span className="text-slate-500 font-medium">Student Name:</span>
                    <span className="col-span-2 font-bold text-slate-900">{student.name}</span>

                    <span className="text-slate-500 font-medium">Student ID:</span>
                    <span className="col-span-2 font-mono font-bold text-tekzow-700">{student.studentCode}</span>

                    <span className="text-slate-500 font-medium">Parent:</span>
                    <span className="col-span-2 font-semibold text-slate-800">
                      {parent?.fatherName || parent?.motherName || "Guardian"}
                    </span>

                    <span className="text-slate-500 font-medium">Mobile:</span>
                    <span className="col-span-2 font-mono text-slate-700">{parent?.whatsappNumber || parent?.mobile}</span>

                    <span className="text-slate-500 font-medium">Branch:</span>
                    <span className="col-span-2 font-semibold text-slate-900">{branch?.name} ({branch?.code})</span>
                  </div>
                </div>

                {/* Course & Payment Details */}
                <div className="rounded-xl border border-slate-200 p-3.5 sm:p-4 bg-white shadow-xs space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-1.5">Transaction Details</h3>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <span className="text-slate-500 font-medium">Course:</span>
                    <span className="col-span-2 font-bold text-slate-900">{enrollment?.course?.name}</span>

                    <span className="text-slate-500 font-medium">Plan:</span>
                    <span className="col-span-2 font-semibold text-slate-800">{enrollment?.plan?.name}</span>

                    <span className="text-slate-500 font-medium">Payment Mode:</span>
                    <span className="col-span-2">
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                        {payment.paymentMode}
                      </span>
                    </span>

                    <span className="text-slate-500 font-medium">Reference:</span>
                    <span className="col-span-2 font-mono text-slate-800">{payment.transactionReference || "Cash"}</span>

                    <span className="text-slate-500 font-medium">Collected By:</span>
                    <span className="col-span-2 font-semibold text-slate-700">{payment.createdBy || "Staff Cashier"}</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="mt-4 sm:mt-6 rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[420px]">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3">#</th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3">Fee Particulars</th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3">Installment</th>
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">Amount Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-white">
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-slate-500">1</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <p className="font-bold text-slate-900">{enrollment?.course?.name}</p>
                        <p className="text-slate-500 text-[11px]">{enrollment?.plan?.name} Tuition & STEM Lab Fee</p>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-slate-700">
                        Installment {installment?.installmentNumber || 1}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-black text-slate-900 text-sm">
                        ₹{payment.amount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                    <tr>
                      <td colSpan={3} className="px-3 sm:px-4 py-2.5 sm:py-3 text-right text-slate-700">
                        Total Amount Received:
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-black text-tekzow-700 text-sm sm:text-base">
                        ₹{payment.amount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Financial Balance Summary Card */}
              <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 bg-tekzow-50/60 border border-tekzow-200 rounded-xl p-3 sm:p-4 text-center">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Enrolled Fee</span>
                  <p className="text-sm sm:text-base font-black text-slate-900 mt-0.5">₹{enrollment?.finalFee.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700">Total Paid So Far</span>
                  <p className="text-sm sm:text-base font-black text-emerald-700 mt-0.5">₹{totalPaid.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-700">Remaining Balance</span>
                  <p className="text-sm sm:text-base font-black text-rose-700 mt-0.5">₹{totalBalance.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">Next Due Date</span>
                  <p className="text-xs sm:text-sm font-black text-navy-900 mt-1">{nextDueDate}</p>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="mt-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div className="text-[11px] text-slate-500 space-y-1 max-w-sm">
                  <p className="font-bold text-slate-700">Terms & Conditions:</p>
                  <p>1. Computer generated receipt for manual fee collection.</p>
                  <p>2. Fees once paid are non-refundable and non-transferable.</p>
                  <p>3. Please preserve this receipt for future reference.</p>
                </div>

                <div className="text-left sm:text-center shrink-0">
                  <div className="w-36 border-b border-slate-300 pb-10"></div>
                  <p className="text-xs font-bold text-slate-800 mt-1">Authorized Signatory</p>
                  <p className="text-[10px] text-slate-500">Tekzow STEMHub Billing</p>
                </div>
              </div>
            </div>

            {/* Official Letterhead Footer Artwork */}
            <div className="pt-6 sm:pt-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-t border-slate-200 pt-3">
                <div className="flex items-center space-x-2 text-[10px] sm:text-[11px] text-slate-600 max-w-md font-medium">
                  <span className="text-tekzow-600 text-sm shrink-0">📍</span>
                  <span>
                    21, 2nd Main Rd, near GoodWorks Infinity Park, Electronic City Phase I, Bengaluru, Karnataka 560100
                  </span>
                </div>

                {/* Decorative angled graphic accents matching letterhead */}
                <div className="flex items-center space-x-1 shrink-0 self-end sm:self-auto">
                  <div className="w-8 sm:w-10 h-2.5 sm:h-3 bg-navy-900 skew-x-[-25deg]"></div>
                  <div className="w-10 sm:w-14 h-2.5 sm:h-3 bg-tekzow-500 skew-x-[-25deg]"></div>
                  <div className="w-14 sm:w-20 h-2.5 sm:h-3 bg-cyan-400 skew-x-[-25deg]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}