"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  TriangleAlert,
  Mail,
  ArrowLeft,
  Loader2,
  KeyRound,
} from "lucide-react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.forgotPassword(trimmed);
      setSent(true);
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
          {sent ? (
            /* ── SUCCESS STATE ─────────────────────────────────────────────── */
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-dark/10 text-green-dark">
                <Mail className="h-8 w-8" />
              </div>
              <h2 className="mt-4 font-serif text-2xl font-bold text-green-dark">Check your email</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                If an account exists for{" "}
                <strong className="text-green-dark">{email.trim()}</strong>, we&apos;ve sent
                password reset instructions to that address. Check your inbox and spam folder.
              </p>
              <div className="mt-5 rounded-xl bg-green-dark/5 border border-green-dark/10 p-4 text-left text-xs text-muted space-y-1.5">
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-mid mt-0.5 shrink-0" />
                  The reset link expires in <strong>1 hour</strong>.
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-mid mt-0.5 shrink-0" />
                  If you signed up with Google, check your email for sign-in instructions.
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-mid mt-0.5 shrink-0" />
                  Didn&apos;t receive anything? Check your spam folder or{" "}
                  <button
                    type="button"
                    onClick={() => { setSent(false); setError(""); }}
                    className="font-semibold text-green-mid hover:underline"
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
            </div>
          ) : (
            /* ── REQUEST FORM ──────────────────────────────────────────────── */
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-dark/10 text-green-dark">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-green-dark leading-tight">Forgot Password?</h2>
                  <p className="text-xs text-muted">Enter your email and we&apos;ll send a reset link.</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl bg-danger-bg p-3 text-sm text-danger">
                  <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={submit}>
                <div>
                  <label className="field-label" htmlFor="reset-email">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted/60 pointer-events-none" />
                    <input
                      id="reset-email"
                      type="email"
                      className="field !pl-10"
                      required
                      placeholder="you@email.com"
                      value={email}
                      autoComplete="email"
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-green w-full disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              {/* Security hint */}
              <p className="mt-4 text-center text-xs text-muted leading-relaxed">
                For security, we&apos;ll send a link even if we don&apos;t recognize the email address.
              </p>
            </>
          )}

          <p className="mt-6 text-center text-sm text-muted">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-semibold text-green-mid hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}