"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search, Filter, Plus, Download, Printer, Eye, Edit2, Ban,
  FileText, Paperclip, X, AlertTriangle, CheckCircle2, Building2,
  Calendar, CreditCard, Tag, DollarSign, ArrowUpDown, ChevronDown
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  description?: string;
  isGlobal: boolean;
}

interface Expense {
  id: string;
  branchId: string;
  expenseCode: string;
  expenseDate: string;
  categoryId: string;
  amount: number;
  paymentMode: string;
  paidTo?: string | null;
  referenceNumber?: string | null;
  description: string;
  notes?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  status: "ACTIVE" | "VOID";
  voidReason?: string | null;
  voidedAt?: string | null;
  voidedBy?: string | null;
  createdBy?: string | null;
  createdAt: string;
  category: { id: string; name: string };
  branch?: { id: string; name: string; code: string };
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  // Filter States
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [datePreset, setDatePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Form states
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formBranchId, setFormBranchId] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formPaymentMode, setFormPaymentMode] = useState("UPI");
  const [formPaidTo, setFormPaidTo] = useState("");
  const [formReference, setFormReference] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formAttachmentUrl, setFormAttachmentUrl] = useState("");
  const [formAttachmentName, setFormAttachmentName] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Void state
  const [voidReason, setVoidReason] = useState("");
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  // New Category state
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatSubmitting, setNewCatSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      setSession(data);
      if (data?.activeBranchId && data.activeBranchId !== "ALL") {
        setBranchFilter(data.activeBranchId);
      }
    } catch (e) {
      console.error("Session fetch failed", e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/expense-categories");
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
        if (data.categories.length > 0 && !formCategoryId) {
          setFormCategoryId(data.categories[0].id);
        }
      }
    } catch (e) {
      console.error("Fetch categories failed", e);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (categoryFilter !== "ALL") queryParams.set("category", categoryFilter);
      if (modeFilter !== "ALL") queryParams.set("paymentMode", modeFilter);
      if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
      if (datePreset !== "ALL") queryParams.set("datePreset", datePreset);
      if (datePreset === "CUSTOM" && startDate && endDate) {
        queryParams.set("startDate", startDate);
        queryParams.set("endDate", endDate);
      }
      if (branchFilter && branchFilter !== "ALL") {
        queryParams.set("branchId", branchFilter);
      }

      const res = await fetch(`/api/expenses?` + queryParams.toString());
      const data = await res.json();
      if (data.expenses) {
        setExpenses(data.expenses);
        setFilteredTotal(data.filteredTotal || 0);
      }
    } catch (e) {
      console.error("Fetch expenses failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter, modeFilter, statusFilter, datePreset, startDate, endDate, branchFilter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      setFormError("");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/expenses/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setFormAttachmentUrl(data.url);
        setFormAttachmentName(data.filename);
      } else {
        setFormError(data.error || "File upload failed");
      }
    } catch (err: any) {
      setFormError(err.message || "File upload error");
    } finally {
      setUploadingFile(false);
    }
  };

  const resetForm = () => {
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormBranchId(session?.activeBranchId !== "ALL" ? session?.activeBranchId || "" : session?.branches?.[0]?.id || "");
    setFormCategoryId(categories[0]?.id || "");
    setFormAmount("");
    setFormPaymentMode("UPI");
    setFormPaidTo("");
    setFormReference("");
    setFormDescription("");
    setFormNotes("");
    setFormAttachmentUrl("");
    setFormAttachmentName("");
    setFormError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (exp: Expense) => {
    setSelectedExpense(exp);
    setFormDate(new Date(exp.expenseDate).toISOString().split("T")[0]);
    setFormBranchId(exp.branchId);
    setFormCategoryId(exp.categoryId);
    setFormAmount(String(exp.amount));
    setFormPaymentMode(exp.paymentMode);
    setFormPaidTo(exp.paidTo || "");
    setFormReference(exp.referenceNumber || "");
    setFormDescription(exp.description);
    setFormNotes(exp.notes || "");
    setFormAttachmentUrl(exp.attachmentUrl || "");
    setFormAttachmentName(exp.attachmentName || "");
    setFormError("");
    setIsEditModalOpen(true);
  };

  const handleOpenViewModal = (exp: Expense) => {
    setSelectedExpense(exp);
    setIsViewModalOpen(true);
  };

  const handleOpenVoidModal = (exp: Expense) => {
    setSelectedExpense(exp);
    setVoidReason("");
    setIsVoidModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formAmount || Number(formAmount) <= 0) {
      setFormError("Please enter a valid expense amount.");
      return;
    }
    if (!formDescription.trim()) {
      setFormError("Description is required.");
      return;
    }
    if (!formCategoryId) {
      setFormError("Please select a category.");
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        expenseDate: formDate,
        categoryId: formCategoryId,
        amount: Number(formAmount),
        paymentMode: formPaymentMode,
        paidTo: formPaidTo.trim(),
        referenceNumber: formReference.trim(),
        description: formDescription.trim(),
        notes: formNotes.trim(),
        attachmentUrl: formAttachmentUrl,
        attachmentName: formAttachmentName,
      };

      if (formBranchId) {
        payload.branchId = formBranchId;
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        fetchExpenses();
      } else {
        setFormError(data.error || "Failed to create expense");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    setFormError("");

    if (!formAmount || Number(formAmount) <= 0) {
      setFormError("Please enter a valid expense amount.");
      return;
    }
    if (!formDescription.trim()) {
      setFormError("Description is required.");
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        expenseDate: formDate,
        categoryId: formCategoryId,
        amount: Number(formAmount),
        paymentMode: formPaymentMode,
        paidTo: formPaidTo.trim(),
        referenceNumber: formReference.trim(),
        description: formDescription.trim(),
        notes: formNotes.trim(),
        attachmentUrl: formAttachmentUrl,
        attachmentName: formAttachmentName,
      };

      const res = await fetch(`/api/expenses/${selectedExpense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        fetchExpenses();
      } else {
        setFormError(data.error || "Failed to update expense");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to update expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmVoid = async () => {
    if (!selectedExpense) return;
    if (!voidReason.trim()) {
      alert("Please provide a reason for voiding this expense.");
      return;
    }

    try {
      setVoidSubmitting(true);
      const res = await fetch(`/api/expenses/${selectedExpense.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidReason }),
      });

      const data = await res.json();
      if (data.success) {
        setIsVoidModalOpen(false);
        fetchExpenses();
      } else {
        alert(data.error || "Failed to void expense");
      }
    } catch (err: any) {
      alert(err.message || "Failed to void expense");
    } finally {
      setVoidSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      setNewCatSubmitting(true);
      const res = await fetch("/api/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          description: newCatDesc.trim(),
          isGlobal: session?.isSuperAdmin || false,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchCategories();
        setFormCategoryId(data.category.id);
        setNewCatName("");
        setNewCatDesc("");
        setIsAddCategoryModalOpen(false);
      } else {
        alert(data.error || "Failed to create category");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create category");
    } finally {
      setNewCatSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Expense ID",
      "Branch",
      "Date",
      "Category",
      "Description",
      "Paid To",
      "Amount",
      "Payment Mode",
      "Reference",
      "Notes",
      "Added By",
      "Status",
    ];

    const rows = expenses.map((exp) => [
      exp.expenseCode,
      `"${exp.branch?.name || ""}"`,
      new Date(exp.expenseDate).toLocaleDateString("en-IN"),
      `"${exp.category?.name || ""}"`,
      `"${exp.description.replace(/"/g, '""')}"`,
      `"${(exp.paidTo || "").replace(/"/g, '""')}"`,
      exp.amount,
      exp.paymentMode,
      `"${exp.referenceNumber || ""}"`,
      `"${(exp.notes || "").replace(/"/g, '""')}"`,
      `"${exp.createdBy || ""}"`,
      exp.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Tekzow-Expenses-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isSuperAdminOrAccountant = session?.isSuperAdmin || session?.currentUser?.role === "ACCOUNTANT";

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">Expenses</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record, categorize, and track operational branch expenses and receipts
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
            onClick={() => window.print()}
            className="hidden sm:inline-flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>Print</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-tekzow-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-tekzow-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Expense ID, description, vendor, ref #, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchExpenses()}
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-tekzow-600"
            />
          </div>

          {/* Quick Search Action */}
          <button
            onClick={fetchExpenses}
            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition shrink-0"
          >
            Search
          </button>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Branch filter (visible only to Super Admin / Accountant) */}
          {isSuperAdminOrAccountant && (
            <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Branch:</span>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800"
              >
                <option value="ALL">All Branches</option>
                {session?.branches?.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Preset Filter */}
          <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Date:</span>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="PREV_MONTH">Previous Month</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Inputs if CUSTOM selected */}
          {datePreset === "CUSTOM" && (
            <div className="flex items-center space-x-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800"
              />
            </div>
          )}

          {/* Category Filter */}
          <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
            <Tag className="h-3.5 w-3.5 text-slate-400" />
            <span>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800 max-w-[150px] truncate"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode Filter */}
          <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
            <span>Mode:</span>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800"
            >
              <option value="ALL">All Modes</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CARD">Card</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800"
            >
              <option value="ACTIVE">Active</option>
              <option value="VOID">Void</option>
              <option value="ALL">All</option>
            </select>
          </div>

          {/* Clear / Reset Button */}
          {(search || categoryFilter !== "ALL" || modeFilter !== "ALL" || statusFilter !== "ACTIVE" || datePreset !== "ALL" || branchFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearch("");
                setCategoryFilter("ALL");
                setModeFilter("ALL");
                setStatusFilter("ACTIVE");
                setDatePreset("ALL");
                setStartDate("");
                setEndDate("");
                setBranchFilter("ALL");
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Expense Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b">
              <tr>
                <th className="px-5 py-3.5">Expense ID</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Paid To</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5">Payment Mode</th>
                <th className="px-5 py-3.5">Added By</th>
                <th className="px-5 py-3.5 text-center">Attachment</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Loading expense records...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No expense records found matching current criteria.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-tekzow-700">
                      <button
                        onClick={() => handleOpenViewModal(exp)}
                        className="hover:underline text-left"
                      >
                        {exp.expenseCode}
                      </button>
                      {exp.branch && (
                        <p className="text-[10px] text-slate-400 font-normal font-sans">
                          {exp.branch.name}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                      {new Date(exp.expenseDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                        {exp.category?.name || "General"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="font-semibold text-slate-900 truncate" title={exp.description}>
                        {exp.description}
                      </p>
                      {exp.referenceNumber && (
                        <p className="font-mono text-[10px] text-slate-400">
                          Ref: {exp.referenceNumber}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {exp.paidTo || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                      ₹{exp.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                        {exp.paymentMode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-medium whitespace-nowrap">
                      {exp.createdBy || "Staff"}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      {exp.attachmentUrl ? (
                        <a
                          href={exp.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition"
                          title="View receipt"
                        >
                          <Paperclip className="h-3 w-3" />
                          <span>Receipt</span>
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          exp.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600 line-through"
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleOpenViewModal(exp)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {exp.status === "ACTIVE" && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(exp)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-tekzow-600 transition"
                              title="Edit Expense"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenVoidModal(exp)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                              title="Void Expense"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* List Summary Footer (Table-level summary per Section 22) */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
          <div>
            Showing <span className="font-bold text-slate-800">{expenses.length}</span> expenses
          </div>
          <div className="text-sm font-bold text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
            Total of current filtered records:{" "}
            <span className="text-tekzow-700 font-black">
              ₹{filteredTotal.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ADD EXPENSE MODAL */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">Add New Expense</h2>
                <p className="text-xs text-slate-500">Record a branch expense transaction</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Expense Date */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Expense Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600"
                  />
                </div>

                {/* Branch Selection (Visible for Super Admin) */}
                {isSuperAdminOrAccountant ? (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Branch</label>
                    <select
                      value={formBranchId}
                      onChange={(e) => setFormBranchId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600 bg-white"
                    >
                      {session?.branches?.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Branch</label>
                    <input
                      type="text"
                      disabled
                      value={session?.currentUser?.branch?.name || "Assigned Branch"}
                      className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Expense Category */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddCategoryModalOpen(true)}
                      className="text-[11px] text-tekzow-600 hover:underline font-bold"
                    >
                      + New
                    </button>
                  </div>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 4500"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Payment Mode */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Payment Mode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formPaymentMode}
                    onChange={(e) => setFormPaymentMode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600 bg-white"
                  >
                    <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Vendor / Paid To */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Vendor / Paid To <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Electricity Board, Vendor Name"
                    value={formPaidTo}
                    onChange={(e) => setFormPaidTo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600"
                  />
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reference / Transaction Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI123456789, Bill #, Cheque #"
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600 font-mono"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Short description of the expense"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional details, item breakdown, or context..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600"
                />
              </div>

              {/* Attachment Upload */}
              <div className="rounded-xl border border-dashed border-slate-300 p-3 bg-slate-50">
                <label className="block font-bold text-slate-700 mb-1">
                  Receipt / Invoice Proof <span className="text-slate-400 font-normal">(JPG, PNG, PDF up to 10MB)</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileUpload}
                    className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-tekzow-50 file:text-tekzow-700 hover:file:bg-tekzow-100"
                  />
                  {uploadingFile && <span className="text-xs text-tekzow-600 font-bold">Uploading...</span>}
                </div>
                {formAttachmentUrl && (
                  <div className="mt-2 flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-xs text-emerald-700 font-semibold truncate flex items-center space-x-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 inline mr-1" />
                      {formAttachmentName || "File attached"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormAttachmentUrl("");
                        setFormAttachmentName("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-tekzow-600 px-5 py-2 font-bold text-white hover:bg-tekzow-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT EXPENSE MODAL */}
      {/* ========================================================= */}
      {isEditModalOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Edit Expense ({selectedExpense.expenseCode})
                </h2>
                <p className="text-xs text-slate-500">Update expense details (updates are logged in audit history)</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateExpense} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Expense Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={formPaymentMode}
                    onChange={(e) => setFormPaymentMode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600 bg-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Card</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor / Paid To</label>
                  <input
                    type="text"
                    value={formPaidTo}
                    onChange={(e) => setFormPaidTo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reference Number</label>
                  <input
                    type="text"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600"
                />
              </div>

              {/* Attachment Upload in Edit */}
              <div className="rounded-xl border border-dashed border-slate-300 p-3 bg-slate-50">
                <label className="block font-bold text-slate-700 mb-1">Receipt Attachment</label>
                <div className="flex items-center space-x-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileUpload}
                    className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-tekzow-50 file:text-tekzow-700 hover:file:bg-tekzow-100"
                  />
                  {uploadingFile && <span className="text-xs text-tekzow-600 font-bold">Uploading...</span>}
                </div>
                {formAttachmentUrl && (
                  <div className="mt-2 flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                    <a
                      href={formAttachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-tekzow-700 hover:underline font-semibold truncate flex items-center"
                    >
                      <Paperclip className="h-3 w-3 mr-1 text-slate-500" />
                      {formAttachmentName || "View Current Receipt"}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setFormAttachmentUrl("");
                        setFormAttachmentName("");
                      }}
                      className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-tekzow-600 px-5 py-2 font-bold text-white hover:bg-tekzow-700 disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW DETAILS MODAL */}
      {/* ========================================================= */}
      {isViewModalOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Expense Details
                </span>
                <h2 className="text-xl font-black text-slate-900">{selectedExpense.expenseCode}</h2>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Status Header Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-2">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                      selectedExpense.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700 line-through"
                    }`}
                  >
                    {selectedExpense.status}
                  </span>
                  {selectedExpense.branch && (
                    <span className="text-slate-600 font-semibold">
                      {selectedExpense.branch.name}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Amount</span>
                  <span className="text-lg font-black text-slate-900">
                    ₹{selectedExpense.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* VOID Banner if voided */}
              {selectedExpense.status === "VOID" && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-800 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <Ban className="h-4 w-4 text-rose-600" />
                    <span>This expense was voided</span>
                  </div>
                  <p className="text-xs">
                    <span className="font-semibold">Reason:</span> {selectedExpense.voidReason}
                  </p>
                  <p className="text-[10px] text-rose-600">
                    Voided by {selectedExpense.voidedBy || "Admin"} on{" "}
                    {selectedExpense.voidedAt
                      ? new Date(selectedExpense.voidedAt).toLocaleString("en-IN")
                      : "N/A"}
                  </p>
                </div>
              )}

              {/* Data Fields */}
              <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Date</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedExpense.expenseDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                  <span className="font-semibold text-tekzow-700">
                    {selectedExpense.category?.name || "General"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Mode</span>
                  <span className="font-semibold text-slate-800">{selectedExpense.paymentMode}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Paid To</span>
                  <span className="font-semibold text-slate-800">
                    {selectedExpense.paidTo || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Reference #</span>
                  <span className="font-mono text-slate-800">
                    {selectedExpense.referenceNumber || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Added By</span>
                  <span className="font-semibold text-slate-800">
                    {selectedExpense.createdBy || "Staff"}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Description
                </span>
                <p className="text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {selectedExpense.description}
                </p>
              </div>

              {/* Notes */}
              {selectedExpense.notes && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Notes
                  </span>
                  <p className="text-slate-700 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                    {selectedExpense.notes}
                  </p>
                </div>
              )}

              {/* Attachment Preview / Link */}
              {selectedExpense.attachmentUrl ? (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Attachment / Receipt
                  </span>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center space-x-2 truncate">
                      <Paperclip className="h-4 w-4 text-tekzow-600 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">
                        {selectedExpense.attachmentName || "Receipt Attachment"}
                      </span>
                    </div>
                    <a
                      href={selectedExpense.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg bg-tekzow-600 px-3 py-1 text-xs font-bold text-white hover:bg-tekzow-700 transition"
                    >
                      View Receipt
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="pt-2 text-[10px] text-slate-400 text-center">
                Record created on {new Date(selectedExpense.createdAt).toLocaleString("en-IN")}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="rounded-xl bg-slate-100 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VOID EXPENSE MODAL */}
      {/* ========================================================= */}
      {isVoidModalOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-lg font-black text-slate-900">Void Expense Record</h2>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                You are voiding expense{" "}
                <span className="font-mono font-bold text-slate-900">
                  {selectedExpense.expenseCode}
                </span>{" "}
                for <span className="font-bold">₹{selectedExpense.amount.toLocaleString("en-IN")}</span>.
              </p>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-amber-800 text-[11px]">
                ℹ️ Financial records are never permanently deleted. This expense will be marked as{" "}
                <span className="font-bold">VOID</span> and retained in audit logs.
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block font-bold text-slate-700">
                Reason for Voiding <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Duplicate entry, incorrect bill amount, cancelled order"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsVoidModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={voidSubmitting}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {voidSubmitting ? "Voiding..." : "Confirm Void"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD CATEGORY MODAL */}
      {/* ========================================================= */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-slate-900">Add Expense Category</h3>
              <button
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laboratory Equipment"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Short description"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-tekzow-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newCatSubmitting}
                  className="rounded-xl bg-tekzow-600 px-4 py-1.5 font-bold text-white hover:bg-tekzow-700 disabled:opacity-50"
                >
                  {newCatSubmitting ? "Adding..." : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
