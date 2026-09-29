"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, Search, Plus, Upload, Eye, CreditCard, GraduationCap,
  Filter, CheckCircle, AlertTriangle, X, Loader2, Phone, MessageSquare, Trash2
} from "lucide-react";
import CollectPaymentModal from "@/components/CollectPaymentModal";
import ReceiptModal from "@/components/ReceiptModal";

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [studentToDelete, setStudentToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState<any>({
    name: "", gender: "Male", schoolName: "", grade: "Grade 6", academicYear: "2026-2027",
    fatherName: "", motherName: "", relationship: "Father", mobile: "", whatsappNumber: "",
    email: "", city: "Hosur", state: "Tamil Nadu", address: ""
  });
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);

  const [importRowsText, setImportRowsText] = useState("");
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/students?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      const data = await res.json();
      setStudents(data.students || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();
      setBranches(data.branches || []);
      if (data.branches?.length) setSelectedBranchId(data.branches[0].id);
    } catch (e) {
      console.error(e);
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
    fetchStudents();
    fetchBranches();
    fetchSession();
  }, [statusFilter]);

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/students/${studentToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete student");
      setStudentToDelete(null);
      fetchStudents();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddStudentSubmit = async (allowDuplicate = false) => {
    try {
      setFormSubmitting(true);
      setDuplicateWarning(null);
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, branchId: selectedBranchId, allowDuplicate }),
      });
      const data = await res.json();
      if (res.status === 409 && data.duplicateDetected) {
        setDuplicateWarning(data);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to create student");
      setIsAddModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handlePreviewImport = async () => {
    try {
      setImporting(true);
      const lines = importRowsText.trim().split("\n");
      if (lines.length < 2) return alert("Please enter header and at least one student row.");
      const headers = lines[0].split(",").map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim());
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
        return obj;
      });
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, branchId: selectedBranchId, dryRun: true }),
      });
      const data = await res.json();
      setImportPreview(data);
    } catch (e: any) { alert(e.message); } finally { setImporting(false); }
  };

  const handleConfirmImport = async () => {
    try {
      setImporting(true);
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: importPreview.previewResults.map((p: any) => p.row),
          branchId: selectedBranchId,
          dryRun: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Imported ${data.importedCount} students!`);
        setIsImportModalOpen(false);
        setImportPreview(null);
        setImportRowsText("");
        fetchStudents();
      }
    } catch (e: any) { alert(e.message); } finally { setImporting(false); }
  };
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">Student Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">Centralized registry of students, parents, and fee profiles</p>
        </div>
        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <Upload className="h-4 w-4 text-slate-600" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-tekzow-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-tekzow-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, student code, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchStudents()}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-tekzow-600"
          />
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
          <Filter className="h-3.5 w-3.5" />
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Student</th>
              <th className="px-5 py-3.5">School & Grade</th>
              <th className="px-5 py-3.5">Parent Contact</th>
              <th className="px-5 py-3.5">Branch</th>
              <th className="px-5 py-3.5 text-right">Enrolled Fee</th>
              <th className="px-5 py-3.5 text-right">Paid</th>
              <th className="px-5 py-3.5 text-right">Pending</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="py-12 text-center text-slate-400">Loading directory...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={9} className="py-12 text-center text-slate-400">No students found.</td></tr>
            ) : (
              students.map((student) => {
                const sum = student.financialSummary || {};
                return (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-xl bg-tekzow-100 text-tekzow-700 font-black flex items-center justify-center text-sm">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <Link href={`/students/${student.id}`} className="font-bold text-slate-900 hover:text-tekzow-600 hover:underline">
                            {student.name}
                          </Link>
                          <p className="font-mono text-[11px] text-tekzow-700 font-semibold">{student.studentCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{student.schoolName || "N/A"}</p>
                      <p className="text-slate-500 text-[11px]">{student.grade || "General"}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{student.parent?.fatherName || student.parent?.motherName || "Guardian"}</p>
                      <div className="flex items-center space-x-1.5 text-slate-500 font-mono text-[11px]">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{student.parent?.mobile}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {student.branch?.code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">₹{(sum.totalEnrolledFee || 0).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-600">₹{(sum.totalPaid || 0).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-rose-600">₹{(sum.totalPending || 0).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5">
                      {sum.hasOverdue ? (
                        <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">OVERDUE</span>
                      ) : sum.totalPending === 0 && sum.totalEnrolledFee > 0 ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">PAID</span>
                      ) : (
                        <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">ACTIVE</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Link href={`/students/${student.id}`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-tekzow-600 transition" title="View 360 Profile">
                          <Eye className="h-4 w-4" />
                        </Link>
                        {student.enrollments?.[0]?.installments?.find((i: any) => i.balanceAmount > 0) && (
                          <button
                            onClick={() => {
                              const inst = student.enrollments[0].installments.find((i: any) => i.balanceAmount > 0);
                              setSelectedInstallment({
                                ...inst,
                                enrollment: {
                                  student: { name: student.name, studentCode: student.studentCode },
                                  course: student.enrollments[0].course,
                                  plan: student.enrollments[0].plan,
                                },
                              });
                            }}
                            className="rounded-lg bg-tekzow-50 p-1.5 text-tekzow-700 hover:bg-tekzow-100 transition"
                            title="Collect Fee"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        )}
                        {session?.isSuperAdmin && (
                          <button
                            onClick={() => setStudentToDelete(student)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Delete Student (Super Admin Only)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Add New Student</h2>
                <p className="text-xs text-slate-500">Student ID auto-generated per branch sequence</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            {duplicateWarning && (
              <div className="m-6 rounded-xl bg-amber-50 p-4 border border-amber-300 text-xs text-amber-800 space-y-2">
                <p className="font-bold">{duplicateWarning.message}</p>
                <div className="flex space-x-2">
                  <Link href={`/students/${duplicateWarning.existingStudent.id}`} className="rounded bg-amber-600 px-3 py-1 font-bold text-white">Open Existing</Link>
                  <button type="button" onClick={() => handleAddStudentSubmit(true)} className="rounded border border-amber-400 px-3 py-1">Continue Anyway</button>
                </div>
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); handleAddStudentSubmit(false); }} className="p-6 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Branch *</label>
                <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} className="w-full rounded-xl border border-slate-300 p-2 font-bold text-slate-900 mt-1">
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Student Name *</label>
                  <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded-xl p-2 mt-1" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Gender</label>
                  <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full border rounded-xl p-2 mt-1">
                    <option value="Male">Male</option><option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">School Name</label>
                  <input value={formData.schoolName} onChange={e => setFormData({ ...formData, schoolName: e.target.value })} className="w-full border rounded-xl p-2 mt-1" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Grade / Class</label>
                  <input value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} className="w-full border rounded-xl p-2 mt-1" />
                </div>
              </div>
              <div className="border-t pt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Parent / Father Name *</label>
                  <input required value={formData.fatherName} onChange={e => setFormData({ ...formData, fatherName: e.target.value })} className="w-full border rounded-xl p-2 mt-1" />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Primary Mobile *</label>
                  <input required value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value, whatsappNumber: formData.whatsappNumber || e.target.value })} className="w-full border rounded-xl p-2 mt-1 font-mono" />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700">WhatsApp Number *</label>
                  <input required value={formData.whatsappNumber} onChange={e => setFormData({ ...formData, whatsappNumber: e.target.value })} className="w-full border rounded-xl p-2 mt-1 font-mono" />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="border px-4 py-2 rounded-xl">Cancel</button>
                <button type="submit" disabled={formSubmitting} className="bg-tekzow-600 text-white font-bold px-5 py-2 rounded-xl">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-slate-900">Bulk CSV Import</h2>
              <button onClick={() => setIsImportModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            {!importPreview ? (
              <div className="space-y-3 text-xs">
                <textarea rows={6} value={importRowsText} onChange={e => setImportRowsText(e.target.value)} placeholder="Student Name, Parent Name, Mobile, School, Grade&#10;Karan Singh, Baldev Singh, +919876543220, DPS, Grade 6" className="w-full border rounded-xl p-3 font-mono" />
                <button onClick={handlePreviewImport} disabled={importing || !importRowsText.trim()} className="w-full bg-tekzow-600 text-white font-bold py-2 rounded-xl">Preview Data</button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between font-bold bg-slate-50 p-3 rounded-xl">
                  <span className="text-emerald-700">Valid: {importPreview.summary.valid}</span>
                  <span className="text-amber-700">Duplicates: {importPreview.summary.duplicates}</span>
                </div>
                <div className="flex justify-end space-x-2">
                  <button onClick={() => setImportPreview(null)} className="border px-4 py-2 rounded-xl">Back</button>
                  <button onClick={handleConfirmImport} disabled={importPreview.summary.valid === 0} className="bg-emerald-600 text-white font-bold px-5 py-2 rounded-xl">Confirm Import</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedInstallment && (
        <CollectPaymentModal
          installment={selectedInstallment}
          isOpen={!!selectedInstallment}
          onClose={() => setSelectedInstallment(null)}
          onSuccess={(result) => {
            fetchStudents();
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
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="rounded-xl bg-rose-100 p-2.5">
                <Trash2 className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Student</h3>
                <p className="text-xs text-rose-600 font-semibold">Super Admin Authority Required</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900">{studentToDelete.name}</strong> (<span className="font-mono text-tekzow-700 font-bold">{studentToDelete.studentCode}</span>)?
            </p>

            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-[11px] text-rose-800 space-y-1">
              <p className="font-bold">⚠️ Warning: Irreversible Action</p>
              <p>This will remove all associated enrollment records, installment schedules, and payment receipts from the database.</p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setStudentToDelete(null)}
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