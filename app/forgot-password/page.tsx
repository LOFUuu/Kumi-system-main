"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.forgotPassword(email.trim());
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
        <div className="bg-gradient-to-br from-green-dark to-green-mid p-8 text-center">
          <span className="font-display text-3xl tracking-[4px] text-gold">MABUHAY HOMES</span>
        </div>
        <div className="p-8">
          <h2 className="font-serif text-2xl font-bold text-green-dark">Forgot Password?</h2>
          <p className="mb-5 text-sm text-muted">Enter your email and we&apos;ll send a reset link.</p>
          {sent ? (
            <div className="flex items-start gap-2 rounded-xl bg-green-light/15 p-4 text-sm text-green-mid">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span>
                If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. Check your
                inbox (and spam folder).
              </span>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl bg-danger-bg p-3 text-sm text-danger">
                  <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" /> <span>{error}</span>
                </div>
              )}
              <form className="space-y-4" onSubmit={submit}>
                <div>
                  <label className="field-label">Email Address</label>
                  <input
                    type="email"
                    className="field"
                    required
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={submitting} className="btn-green w-full disabled:opacity-60">
                  {submitting ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
            </>
          )}
          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/login" className="font-semibold text-green-mid hover:underline">← Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}