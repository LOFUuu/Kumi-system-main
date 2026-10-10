"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, TriangleAlert, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { ApiError } from "@/lib/api";
import { api } from "@/lib/api";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resentOk, setResentOk] = useState(false);

  const next = searchParams.get("next") || "";
  const reason = searchParams.get("reason");

  useEffect(() => {
    if (!loading && user) {
      const target = user.role === "admin"
        ? "/admin"
        : user.role === "counselor"
        ? "/admin/residents"
        : next && !next.startsWith("/login") && !next.startsWith("/register")
        ? next
        : "/";
      router.replace(target);
    }
  }, [user, loading, router, next]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-deep via-green-dark to-green-mid">
        <div className="flex items-center gap-3 text-gold">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="font-semibold text-sm">Redirecting…</span>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    setError("");
    setUnverifiedEmail("");
    setResentOk(false);
    try {
      await login(email, password, next ? { next } : undefined);
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(err.email || email);
      } else {
        setError(err instanceof Error ? err.message : "Invalid email or password.");
      }
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResentOk(false);
    try {
      await api.resendVerification(unverifiedEmail);
      setResentOk(true);
    } catch {
      setError("Could not resend the verification email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-deep via-green-dark to-green-mid px-4 py-14">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-green-dark to-green-mid px-9 pt-8 pb-7 text-center">
          {/* Community logo */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full overflow-hidden border-2 border-gold shadow-lg bg-white">
            <Image
              src="/logo.jpg"
              alt="Mabuhay Homes Logo"
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </div>
          <span className="font-display text-3xl tracking-[4px] text-gold">MABUHAY HOMES</span>
          <p className="mt-1.5 text-[11px] uppercase tracking-[1.5px] text-white/55">Community Portal</p>
        </div>
        <div className="p-8">
          <h2 className="font-serif text-2xl font-bold text-green-dark">Welcome Back</h2>
          <p className="mt-1.5 mb-6 text-sm text-muted">
            {reason === "book"
              ? "Please log in to book an amenity reservation."
              : reason === "reserve"
              ? "Please log in to reserve or inquire about a property."
              : "Log in to access the portal"}
          </p>

          {reason === "book" && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-gold/10 px-4 py-3 text-sm font-semibold text-gold-muted">
              <Lock className="h-4 w-4 flex-shrink-0" /> You need to sign in before you can book an amenity.
            </div>
          )}

          {reason === "reserve" && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-gold/10 px-4 py-3 text-sm font-semibold text-gold-muted">
              <Lock className="h-4 w-4 flex-shrink-0" /> You need to sign in before you can reserve a property.
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-danger-bg p-3 text-sm text-danger">
              <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" /> <span>{error}</span>
            </div>
          )}

          {unverifiedEmail && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <MailCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                <span>
                  <strong>Email not verified.</strong> Please check your inbox for the verification
                  link we sent to <strong>{unverifiedEmail}</strong>.
                </span>
              </div>
              {resentOk ? (
                <p className="mt-3 text-xs font-semibold text-green-700">✓ Verification email resent! Check your inbox.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="mt-3 text-xs font-semibold text-amber-700 underline hover:text-amber-900 disabled:opacity-60"
                >
                  {resending ? "Sending…" : "Resend verification email"}
                </button>
              )}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="field-label">Email Address</label>
              <input
                type="email"
                className="field"
                placeholder="your@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="field !pr-10"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-green-dark"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm font-semibold text-gold-muted hover:underline">
                Forgot password?
              </Link>
            </div>
            <button type="submit" disabled={submitting} className="btn-green w-full disabled:opacity-60">
              {submitting ? "Signing in…" : "Log In →"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-cream-2" /> or <span className="h-px flex-1 bg-cream-2" />
          </div>
          <GoogleSignInButton redirectTo={next || undefined} />

          <p className="mt-6 text-center text-sm text-muted">
            No account yet? <Link href="/register" className="font-semibold text-green-mid hover:underline">Sign Up here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
