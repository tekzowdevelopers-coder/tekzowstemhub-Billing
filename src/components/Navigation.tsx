"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, GraduationCap, CreditCard, CalendarClock,
  FileText, BookOpen, BarChart3, Bell, ShieldCheck, Building2,
  ChevronDown, UserCheck, Menu, X, LogOut, Lock, Receipt
} from "lucide-react";

export default function Navigation({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    fetchSession();
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleSwitchBranch = async (branchId: string) => {
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeBranchId: branchId }),
    });
    window.location.reload();
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  // On login page, render full screen without header or sidebar
  if (pathname === "/login") {
    return <main className="min-h-screen w-full bg-slate-50">{children}</main>;
  }

  const isSuperAdmin = session?.isSuperAdmin;
  const isAccountant = session?.currentUser?.role === "ACCOUNTANT";
  const canSwitchOrManageBranches = isSuperAdmin || isAccountant;

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Students", href: "/students", icon: Users },
    { label: "Enrollments", href: "/enrollments", icon: GraduationCap },
    { label: "Payments", href: "/payments", icon: CreditCard },
    { label: "Due Payments", href: "/due-payments", icon: CalendarClock },
    { label: "Receipts", href: "/receipts", icon: FileText },
    { label: "Courses & Plans", href: "/courses", icon: BookOpen },
    { label: "Reports", href: "/reports", icon: BarChart3 },
    { label: "Franchise Branches", href: "/branches", icon: Building2 },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Audit Logs", href: "/audit", icon: ShieldCheck },
    { label: "Expenses", href: "/expenses", icon: Receipt },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 border-b border-slate-200 bg-white/95 backdrop-blur px-3 sm:px-6 flex items-center justify-between shadow-2xs">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 sm:p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="flex items-center">
            {/* Official Logo */}
            <img
              src="/tekzow-logo.png"
              alt="Tekzow STEMHub"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Right: Branch Isolation Indicator & User Profile */}
        <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
          {/* Branch Selector: Visible/Unlocked ONLY for Super Admin / Accountant */}
          {canSwitchOrManageBranches ? (
            <div className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-100 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Building2 className="h-3.5 w-3.5 text-tekzow-600 shrink-0" />
              <select
                value={session?.activeBranchId || "ALL"}
                onChange={(e) => handleSwitchBranch(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer max-w-[110px] sm:max-w-none truncate"
              >
                {isSuperAdmin && <option value="ALL">🏢 All Branches</option>}
                {session?.branches?.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* Locked Branch Indicator for Branch Admin / Staff */
            <div className="flex items-center space-x-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0">
              <Lock className="h-3 w-3 text-indigo-600 shrink-0" />
              <span className="truncate max-w-[110px] sm:max-w-none">
                {session?.currentUser?.branch?.name || "Assigned Branch"}
              </span>
            </div>
          )}

          {/* User badge */}
          <div className="hidden sm:flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 shrink-0">
            <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[120px] lg:max-w-none">{session?.currentUser?.name || "Staff"}</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 rounded-xl border border-slate-200 bg-white px-2 sm:px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition shrink-0"
            title="Log out"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-16 bottom-0 z-30 w-64 border-r border-slate-200 bg-white py-6 flex-col justify-between overflow-y-auto">
        <div className="space-y-1 px-3">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-tekzow-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="px-4 pt-4 border-t border-slate-100">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-[11px] space-y-1">
            <span className="font-bold text-slate-800">
              Role: {session?.currentUser?.role?.replace("_", " ") || "User"}
            </span>
            <p className="text-slate-500 text-[10px]">
              {canSwitchOrManageBranches ? "Cross-branch authority" : "Isolated branch access"}
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
          <div className="w-64 bg-white h-full p-6 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <img
                  src="/tekzow-logo.png"
                  alt="Tekzow STEMHub"
                  className="h-8 w-auto object-contain"
                />
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-1 overflow-y-auto max-h-[70vh]">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${
                        isActive ? "bg-tekzow-600 text-white font-bold" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 truncate">{session?.currentUser?.name || "Staff"}</p>
                <p className="text-[10px] text-slate-500">{session?.currentUser?.branch?.name || "Assigned Branch"}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          {/* Clickable backdrop to close */}
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Page Content Wrapper with Guaranteed Safe Padding */}
      <main className="md:ml-64 pt-20 px-4 pb-8 md:pt-24 md:px-8 md:pb-12 min-h-screen transition-all">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </>
  );
}