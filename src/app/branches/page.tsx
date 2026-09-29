"use client";

import React, { useEffect, useState } from "react";
import {
  Building2, Plus, Phone, Mail, MapPin, Users, CreditCard,
  CheckCircle2, AlertCircle, X, Loader2, ShieldCheck, Lock
} from "lucide-react";

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bRes, sRes] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/auth/session"),
      ]);
      const bData = await bRes.json();
      const sData = await sRes.json();
      setBranches(bData.branches || []);
      setSession(sData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const canAddBranch = session?.isSuperAdmin || session?.currentUser?.role === "ACCOUNTANT";

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code, address, phone, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create branch");
      setIsAddModalOpen(false);
      setName("");
      setCode("");
      setAddress("");
      setPhone("+91 ");
      setEmail("");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">Franchise Branches</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-branch management and data isolation directory
          </p>
        </div>

        {canAddBranch ? (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-tekzow-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-tekzow-700 transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Branch</span>
          </button>
        ) : (
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Branch creation restricted to Super Admin & Accountant</span>
          </div>
        )}
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-xs text-slate-400 py-12 text-center col-span-3">Loading branches...</p>
        ) : (
          branches.map((b) => (
            <div key={b.id} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-tekzow-600" />
                    <h2 className="text-base font-bold text-slate-900">{b.name}</h2>
                  </div>
                  <span className="rounded-lg bg-tekzow-50 px-2 py-0.5 text-xs font-extrabold text-tekzow-700 border border-tekzow-200">
                    {b.code}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{b.address}</span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{b.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{b.email}</span>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-400 font-medium">Students</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{b._count?.students || 0}</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-400 font-medium">Payments</span>
                  <p className="font-bold text-emerald-600 text-sm mt-0.5">{b._count?.payments || 0}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Branch Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Add New Franchise Branch</h2>
                <p className="text-xs text-slate-500">Authorized: Super Admin / Financial Accountant</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {error && (
              <div className="flex items-center space-x-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddBranch} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Branch Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Electronic City Branch"
                  className="w-full border rounded-xl p-2 mt-1 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Branch Code (3-5 letters) *</label>
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ECITY or BLR2"
                  className="w-full border rounded-xl p-2 mt-1 font-mono font-bold text-tekzow-700 uppercase"
                />
                <span className="text-[10px] text-slate-400">Used for student ID prefix: TSH-CODE-YEAR-SEQ</span>
              </div>

              <div>
                <label className="font-bold text-slate-700">Branch Phone *</label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 83628 50855"
                  className="w-full border rounded-xl p-2 mt-1 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Branch Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="branch@tekzowstemhub.com"
                  className="w-full border rounded-xl p-2 mt-1 text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Address</label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full street address..."
                  className="w-full border rounded-xl p-2 mt-1 text-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="border px-4 py-2 rounded-xl text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center space-x-1.5 bg-tekzow-600 text-white font-bold px-5 py-2 rounded-xl hover:bg-tekzow-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Branch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}