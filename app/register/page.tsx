"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  TriangleAlert,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { validatePassword } from "@/lib/password-validation";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, registerAccount, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirm: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState("");

  const pwStrength = useMemo(() => validatePassword(form.password), [form.password]);

  useEffect(() => {
    if (!loading && user) {
      const target =
        user.role === "admin"
          ? "/admin"
          : user.role === "counselor"
          ? "/admin/residents"
          : "/";
      router.replace(target);
    }
  }, [user, loading, router]);

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

  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };

  /** Sanitize raw backend error messages so users never see technical details. */
  function friendlyError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    // Hide raw DB / network errors
    if (
      /ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|socket|getaddrinfo|connect\s/i.test(msg) ||
      /MongoServerError|MongooseError|mysql|mariadb|PROTOCOL_/i.test(msg) ||
      /internal server error/i.test(msg)
    ) {
      return "We're having trouble connecting right now. Please try again in a moment.";
    }
    return msg || "Something went wrong. Please try again.";
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    const pwCheck = validatePassword(form.password);
    if (!pwCheck.valid) {
      setError(pwCheck.error || "Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await registerAccount({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        role: "resident",
      });
      // Immediately log the user in
      try {
        await login(form.email.trim(), form.password);
        return;
      } catch {
        setDone(form.email.trim().toLowerCase());
        setSubmitting(false);
      }
    } catch (err) {
      setError(friendlyError(err));
      setSubmitting(false);
    }
  };

  /* ── Shared input classes ────────────────────────────────────────────── */
  const inputBase =
    "w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/10";
  const inputPw =
    "w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/10";
  const labelBase = "block text-xs font-semibold text-gray-600 mb-1";
  const iconBase =
    "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400";

  return (
    <div className="flex min-h-[85vh] items-center justify-center bg-gradient-to-br from-green-deep via-green-dark to-green-mid px-4 py-10 sm:py-14">
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-green-dark to-green-mid px-8 py-7 text-center">
          <span className="font-display text-2xl tracking-[4px] text-gold">
            MABUHAY HOMES
          </span>
          <p className="mt-1 text-[10px] uppercase tracking-[1.5px] text-white/50">
            Community Portal
          </p>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="px-6 py-6 sm:px-8 sm:py-7">
          {/* Error banner */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {done ? (
            /* ── Success state ────────────────────────────────────── */
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                <span>
                  <strong>{done}</strong> was registered successfully! Your
                  account is ready.
                </span>
              </div>
              <Link
                href="/login"
                className="btn-green w-full text-center flex items-center justify-center py-3"
              >
                Go to Log In →
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className={labelBase}>Full Name</label>
                  <div className="relative">
                    <div className={iconBase}>
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Juan Dela Cruz"
                      value={form.fullName}
                      onChange={set("fullName")}
                      className={inputBase}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className={labelBase}>Email Address</label>
                  <div className="relative">
                    <div className={iconBase}>
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="you@email.com"
                      value={form.email}
                      onChange={set("email")}
                      className={inputBase}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className={labelBase}>
                    Phone Number{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <div className={iconBase}>
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      placeholder="+63 9xx xxx xxxx"
                      value={form.phone}
                      onChange={set("phone")}
                      className={inputBase}
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className={labelBase}>Complete Address</label>
                  <div className="relative">
                    <div className={iconBase}>
                      <MapPin className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Block / Lot / Street"
                      value={form.address}
                      onChange={set("address")}
                      className={inputBase}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className={labelBase}>Password</label>
                  <div className="relative">
                    <div className={iconBase}>
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={set("password")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          confirmInputRef.current?.focus();
                        }
                      }}
                      className={inputPw}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition hover:text-gray-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Minimal strength indicator */}
                  {form.password.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex flex-1 gap-1">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              i <= pwStrength.score ? pwStrength.color : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      {pwStrength.label && (
                        <span className="text-[10px] font-medium text-gray-500">
                          {pwStrength.label}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Hint */}
                  <p className="mt-1 text-[11px] text-gray-400">
                    Use at least 8 characters.
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className={labelBase}>Confirm Password</label>
                  <div className="relative">
                    <div className={iconBase}>
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      ref={confirmInputRef}
                      type={showConfirm ? "text" : "password"}
                      required
                      placeholder="Re-enter your password"
                      value={form.confirm}
                      onChange={set("confirm")}
                      className={inputPw}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition hover:text-gray-600"
                      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirm ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Match indicator */}
                  {form.confirm.length > 0 && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                      {form.password === form.confirm ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Passwords
                          match
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <TriangleAlert className="h-3.5 w-3.5" /> Passwords do
                          not match
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-1 w-full rounded-lg bg-[#1b4332] py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#143326] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Account…
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
                <span className="h-px flex-1 bg-gray-200" />
                or
                <span className="h-px flex-1 bg-gray-200" />
              </div>

              {/* Google Sign In */}
              <GoogleSignInButton />

              {/* Footer */}
              <p className="mt-5 text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[#1b4332] hover:underline"
                >
                  Log In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}