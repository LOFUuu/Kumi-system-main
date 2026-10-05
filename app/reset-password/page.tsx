"use client";

import { Suspense, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  TriangleAlert,
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "@/lib/api";

/* ── Password strength helpers ──────────────────────────────────────────── */

interface StrengthResult {
  score: number;       // 0–4
  label: string;
  color: string;       // Tailwind bg colour
  checks: {
    label: string;
    pass: boolean;
  }[];
}

function evaluatePassword(pw: string): StrengthResult {
  const checks = [
    { label: "At least 8 characters",           pass: pw.length >= 8 },
    { label: "Contains a number (0-9)",          pass: /\d/.test(pw) },
    { label: "Contains a letter (a-z / A-Z)",   pass: /[a-zA-Z]/.test(pw) },
    { label: "Contains a special character",     pass: /[^a-zA-Z0-9]/.test(pw) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const label = ["", "Weak", "Fair", "Good", "Strong"][score] ?? "";
  const color = [
    "",
    "bg-red-400",
    "bg-amber-400",
    "bg-sky-400",
    "bg-emerald-500",
  ][score] ?? "";
  return { score, label, color, checks };
}

/* ── Main reset form ────────────────────────────────────────────────────── */

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPassword, setShowPw]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]             = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [done, setDone]               = useState(false);

  const strength = useMemo(() => evaluatePassword(password), [password]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      setError("Password must contain at least one letter and one number.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.resetPassword(token, email.trim().toLowerCase(), password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-br from-green-deep via-green-dark to-green-mid px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header banner */}
        <div className="bg-gradient-to-br from-green-dark to-green-mid p-8 text-center">
          <span className="font-display text-3xl tracking-[4px] text-gold">MABUHAY HOMES</span>
          <p className="mt-1 text-xs text-white/60 tracking-widest uppercase">Community Portal</p>
        </div>

        <div className="p-8">
          {/* ── SUCCESS STATE ───────────────────────────────────────────── */}
          {done ? (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-dark/10 text-green-dark">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h2 className="mt-4 font-serif text-2xl font-bold text-green-dark">
                Password Updated Successfully
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Your password has been changed. You can now log in with your new password.
              </p>
              <Link
                href="/login"
                className="btn-green mt-6 inline-flex w-full items-center justify-center gap-2 text-center"
              >
                Back to Login
              </Link>
            </div>

          /* ── INVALID / MISSING TOKEN ─────────────────────────────────── */
          ) : !token || !email ? (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-bg text-danger">
                <X className="h-8 w-8" />
              </div>
              <h2 className="mt-4 font-serif text-2xl font-bold text-green-dark">Invalid Reset Link</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                This reset link is invalid or incomplete. Links expire after{" "}
                <strong>1 hour</strong> and can only be used once.
              </p>
              <Link
                href="/forgot-password"
                className="btn-green mt-6 inline-flex w-full items-center justify-center gap-2 text-center"
              >
                Request a New Link
              </Link>
            </div>

          /* ── RESET FORM ──────────────────────────────────────────────── */
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-dark/10 text-green-dark">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-green-dark leading-tight">Reset Your Password</h2>
                  <p className="text-xs text-muted truncate max-w-[220px]">For: {email}</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl bg-danger-bg p-3 text-sm text-danger">
                  <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={submit}>
                {/* New Password */}
                <div>
                  <label className="field-label" htmlFor="new-password">New Password</label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      className="field !pr-10"
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      value={password}
                      autoComplete="new-password"
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-green-dark"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password strength bar */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-1 gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                i <= strength.score ? strength.color : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        {strength.label && (
                          <span className="text-[11px] font-semibold text-muted w-12 text-right">
                            {strength.label}
                          </span>
                        )}
                      </div>

                      {/* Requirement checklist */}
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-3">
                        {strength.checks.map((c) => (
                          <li
                            key={c.label}
                            className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                              c.pass ? "text-emerald-600" : "text-muted"
                            }`}
                          >
                            <CheckCircle2
                              className={`h-3 w-3 shrink-0 ${c.pass ? "text-emerald-500" : "text-gray-300"}`}
                            />
                            {c.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="field-label" htmlFor="confirm-password">Confirm New Password</label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      className={`field !pr-10 ${
                        confirm.length > 0 && confirm !== password
                          ? "border-danger focus:ring-danger/20"
                          : ""
                      }`}
                      required
                      placeholder="Re-enter your password"
                      value={confirm}
                      autoComplete="new-password"
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-green-dark"
                      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirm.length > 0 && confirm !== password && (
                    <p className="mt-1 text-[11px] text-danger flex items-center gap-1">
                      <TriangleAlert className="h-3 w-3" /> Passwords do not match
                    </p>
                  )}
                  {confirm.length > 0 && confirm === password && (
                    <p className="mt-1 text-[11px] text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Passwords match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || strength.score < 2 || password !== confirm}
                  className="btn-green w-full disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            </>
          )}

          {!done && (
            <p className="mt-6 text-center text-sm text-muted">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 font-semibold text-green-mid hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Login
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}