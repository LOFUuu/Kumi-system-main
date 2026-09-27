"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, TriangleAlert, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("New password must be at least 8 characters long.");
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
        <div className="bg-gradient-to-br from-green-dark to-green-mid p-8 text-center">
          <span className="font-display text-3xl tracking-[4px] text-gold">MABUHAY HOMES</span>
        </div>
        <div className="p-8">
          {done ? (
            <div className="flex items-start gap-2 rounded-xl bg-green-light/15 p-4 text-sm text-green-mid">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span>
                Your password has been updated! <Link href="/login" className="font-semibold underline">Log in</Link> with
                your new password.
              </span>
            </div>
          ) : !token || !email ? (
            <div className="flex items-start gap-2 rounded-xl bg-danger-bg p-4 text-sm text-danger">
              <TriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span>
                This reset link is invalid or incomplete. Please request a new one from the{" "}
                <Link href="/forgot-password" className="font-semibold underline">forgot password</Link> page.
              </span>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-2xl font-bold text-green-dark">Set New Password</h2>
              <p className="mb-5 text-sm text-muted">Choose a new password for <strong>{email}</strong>.</p>
              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl bg-danger-bg p-3 text-sm text-danger">
                  <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" /> <span>{error}</span>
                </div>
              )}
              <form className="space-y-4" onSubmit={submit}>
                <div>
                  <label className="field-label">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="field !pr-10"
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-green-dark"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="field-label">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      className="field !pr-10"
                      required
                      placeholder="Re-enter your password"
                      value={confirm}
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
                </div>
                <button type="submit" disabled={submitting} className="btn-green w-full disabled:opacity-60">
                  {submitting ? "Updating…" : "Update Password"}
                </button>
              </form>
            </>
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