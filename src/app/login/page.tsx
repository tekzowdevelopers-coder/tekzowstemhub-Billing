"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2, Eye, EyeOff
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid credentials. Please verify your email/phone and password.");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-tekzow-50/60 flex flex-col justify-between relative overflow-hidden">
      {/* Top Header */}
      <header className="px-6 py-5 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <img
            src="/tekzow-logo.png"
            alt="Tekzow STEMHub"
            className="h-8 sm:h-9 w-auto object-contain"
          />
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-semibold">Enterprise Secure Access</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex justify-center mb-1">
              <img
                src="/tekzow-logo.png"
                alt="Tekzow STEMHub"
                className="h-11 sm:h-12 w-auto object-contain"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight">
              Sign In to Portal
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Student Fee & Billing Management System
            </p>
          </div>

          {error && (
            <div className="flex items-start space-x-2.5 rounded-xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Address or Registered Mobile
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. admin@tekzow.com"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-xs text-slate-900 font-medium focus:border-tekzow-600 focus:ring-1 focus:ring-tekzow-600 outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert("Please contact your Central Administrator to reset your password.")}
                  className="text-[11px] font-semibold text-tekzow-600 hover:text-tekzow-700"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-10 py-2.5 text-xs text-slate-900 font-medium focus:border-tekzow-600 focus:ring-1 focus:ring-tekzow-600 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-tekzow-600 focus:ring-tekzow-500 h-3.5 w-3.5"
                />
                <span>Remember this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 rounded-xl bg-tekzow-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-tekzow-700 disabled:opacity-50 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            <span>Multi-Branch Data Isolated SaaS</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-400">
        © 2026 Tekzow STEMHub • Student Fee & Billing Management System v1.1
      </footer>
    </div>
  );
}