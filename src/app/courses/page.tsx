"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen, Plus, Clock, Layers, CheckCircle2, X, Loader2
} from "lucide-react";

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
  const [selectedCourseForPlan, setSelectedCourseForPlan] = useState<any>(null);

  // New Course state
  const [courseName, setCourseName] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseDuration, setCourseDuration] = useState("6 Months");
  const [submittingCourse, setSubmittingCourse] = useState(false);

  // New Plan state
  const [planName, setPlanName] = useState("");
  const [planDuration, setPlanDuration] = useState(6);
  const [planTotalFee, setPlanTotalFee] = useState(14000);
  const [installmentsCount, setInstallmentsCount] = useState(2);
  const [submittingPlan, setSubmittingPlan] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/courses");
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingCourse(true);
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: courseName,
          description: courseDesc,
          duration: courseDuration,
          isGlobal: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsAddCourseModalOpen(false);
      setCourseName("");
      setCourseDesc("");
      fetchCourses();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingCourse(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForPlan) return;
    try {
      setSubmittingPlan(true);
      // Generate default installment breakdown
      const splits = [];
      const pct = Math.round(100 / installmentsCount);
      const amt = Math.round(planTotalFee / installmentsCount);
      for (let i = 0; i < installmentsCount; i++) {
        splits.push({
          installmentNumber: i + 1,
          percentage: i === installmentsCount - 1 ? 100 - pct * (installmentsCount - 1) : pct,
          defaultAmount: amt,
          dueOffsetMonths: i * 2,
        });
      }

      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseForPlan.id,
          name: planName,
          durationMonths: planDuration,
          totalFee: planTotalFee,
          installments: splits,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsAddPlanModalOpen(false);
      setPlanName("");
      fetchCourses();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingPlan(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">Courses & Dynamic Plans</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure courses, custom curriculum pricing, and dynamic installment rules
          </p>
        </div>

        <button
          onClick={() => setIsAddCourseModalOpen(true)}
          className="inline-flex items-center space-x-1.5 rounded-xl bg-tekzow-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-tekzow-700 transition shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Course</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <p className="text-xs text-slate-400 py-12 text-center col-span-2">Loading courses...</p>
        ) : (
          courses.map((course) => (
            <div key={course.id} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-slate-900">{course.name}</h2>
                    <span className="rounded bg-tekzow-50 px-2 py-0.5 text-[10px] font-bold text-tekzow-700 border border-tekzow-200">
                      {course.duration}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{course.description || "Hands-on STEM curriculum."}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedCourseForPlan(course);
                    setIsAddPlanModalOpen(true);
                  }}
                  className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 transition"
                  title="Add Plan"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Plans breakdown */}
              <div className="space-y-2 border-t pt-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Available Plans & Installment Rules</h3>
                {course.plans?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No plans created yet.</p>
                ) : (
                  course.plans.map((p: any) => (
                    <div key={p.id} className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{p.name} ({p.durationMonths} Months)</span>
                        <span className="font-black text-tekzow-700 text-sm">₹{p.totalFee.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/60">
                        {p.installments?.map((inst: any) => (
                          <span key={inst.id} className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 font-medium">
                            Inst {inst.installmentNumber}: ₹{inst.defaultAmount.toLocaleString("en-IN")} ({inst.percentage}%) • +{inst.dueOffsetMonths}mo
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Course Modal */}
      {isAddCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-slate-900">Add New Course</h2>
              <button onClick={() => setIsAddCourseModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Course Name *</label>
                <input required value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="e.g. AI & Machine Learning" className="w-full border rounded-xl p-2 mt-1" />
              </div>
              <div>
                <label className="font-bold text-slate-700">Description</label>
                <textarea rows={3} value={courseDesc} onChange={e => setCourseDesc(e.target.value)} placeholder="Curriculum overview..." className="w-full border rounded-xl p-2 mt-1" />
              </div>
              <div>
                <label className="font-bold text-slate-700">Duration</label>
                <input value={courseDuration} onChange={e => setCourseDuration(e.target.value)} placeholder="e.g. 6 Months" className="w-full border rounded-xl p-2 mt-1" />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setIsAddCourseModalOpen(false)} className="border px-4 py-2 rounded-xl">Cancel</button>
                <button type="submit" disabled={submittingCourse} className="bg-tekzow-600 text-white font-bold px-5 py-2 rounded-xl">Save Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {isAddPlanModalOpen && selectedCourseForPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Add Plan for {selectedCourseForPlan.name}</h2>
                <p className="text-xs text-slate-500">Configure duration, total fee, and installment split</p>
              </div>
              <button onClick={() => setIsAddPlanModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Plan Name *</label>
                <input required value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. 6-Month Fast Track" className="w-full border rounded-xl p-2 mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Duration (Months)</label>
                  <input type="number" min="1" value={planDuration} onChange={e => setPlanDuration(Number(e.target.value))} className="w-full border rounded-xl p-2 mt-1" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Total Fee (₹)</label>
                  <input type="number" min="1000" value={planTotalFee} onChange={e => setPlanTotalFee(Number(e.target.value))} className="w-full border rounded-xl p-2 mt-1" />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Number of Installments</label>
                <select value={installmentsCount} onChange={e => setInstallmentsCount(Number(e.target.value))} className="w-full border rounded-xl p-2 mt-1 font-bold">
                  <option value={1}>1 Installment (Full Upfront)</option>
                  <option value={2}>2 Installments (50% / 50%)</option>
                  <option value={3}>3 Installments (40% / 30% / 30%)</option>
                  <option value={4}>4 Installments (Quarterly)</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setIsAddPlanModalOpen(false)} className="border px-4 py-2 rounded-xl">Cancel</button>
                <button type="submit" disabled={submittingPlan} className="bg-tekzow-600 text-white font-bold px-5 py-2 rounded-xl">Create Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}