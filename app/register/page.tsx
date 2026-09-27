"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  MailCheck,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function RegisterPage() {
  const { registerAccount } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmFocused, setIsConfirmFocused] = useState(false);
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
  const [sending, setSending] = useState(false);

  const showConfirmSection =
    form.password.length > 0 || form.confirm.length > 0 || isConfirmFocused;

  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };

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
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
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
      setDone(form.email.trim().toLowerCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setSending(true);
    setError("");
    try {
      await api.resendVerification(done || form.email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resend the email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center bg-gradient-to-br from-green-deep via-green-dark to-green-mid px-4 py-10 sm:py-14">
      <div className="w-full max-w-[460px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-green-dark to-green-mid p-8 text-center">
          <span className="font-display text-3xl tracking-[4px] text-gold">MABUHAY HOMES</span>
          <p className="mt-1.5 text-[11px] uppercase tracking-[1.5px] text-white/55">Community Portal</p>
        </div>
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl bg-danger-bg p-3 text-sm text-danger">
              <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

        {done ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl bg-green-light/15 p-4 text-sm text-green-mid">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span>
                <strong>{done}</strong> was registered successfully.
              </span>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-cream p-4 text-sm text-muted">
              <MailCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span>
                We sent a verification link to <strong>{done}</strong>. Open it to activate your
                account — it expires in 24 hours. Check your spam folder if you don&apos;t see it.
              </span>
            </div>
            <button
              onClick={resend}
              disabled={sending}
              className="btn-ghost w-full disabled:opacity-60"
            >
              {sending ? "Sending…" : "Resend verification email"}
            </button>
            <Link href="/login" className="btn-green w-full text-center">
              Go to Log In
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="space-y-4">
              {/* FULL NAME */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  FULL NAME
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={form.fullName}
                    onChange={set("fullName")}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/15"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  EMAIL
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={form.email}
                    onChange={set("email")}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/15"
                  />
                </div>
              </div>

              {/* PHONE */}
              <div>
                <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  <span>PHONE</span>
                  <span className="text-[10px] font-normal tracking-normal text-gray-400 lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    placeholder="Enter your phone number (optional)"
                    value={form.phone}
                    onChange={set("phone")}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/15"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">Example: +63 9xx xxx xxxx</p>
              </div>

              {/* ADDRESS */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  ADDRESS
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter your complete address"
                    value={form.address}
                    onChange={set("address")}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/15"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  PASSWORD
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    value={form.password}
                    onChange={set("password")}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        confirmInputRef.current?.focus();
                      }
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 transition hover:text-gray-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD (Animated slide down / hide) */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  showConfirmSection
                    ? "max-h-28 opacity-100 mt-4 pointer-events-auto"
                    : "max-h-0 opacity-0 mt-0 pointer-events-none"
                }`}
              >
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  CONFIRM PASSWORD
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    ref={confirmInputRef}
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={form.confirm}
                    onChange={set("confirm")}
                    onFocus={() => setIsConfirmFocused(true)}
                    onBlur={() => setIsConfirmFocused(false)}
                    tabIndex={showConfirmSection ? 0 : -1}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 transition hover:text-gray-600"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* CREATE ACCOUNT BUTTON */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-[#1b4332] py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#143326] active:scale-[0.99] disabled:opacity-60"
                >
                  {submitting ? "Creating Account…" : "Create Account"}
                </button>
              </div>
            </form>

            {/* DIVIDER */}
            <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
              <span className="h-px flex-1 bg-gray-200" /> or{" "}
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            {/* GOOGLE SIGN IN */}
            <GoogleSignInButton />

            {/* FOOTER */}
            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#1b4332] hover:underline">
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