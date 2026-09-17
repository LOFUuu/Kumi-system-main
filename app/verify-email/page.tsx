"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";

function VerifyEmailCard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const missing = !token || !email;

  const [state, setState] = useState<"checking" | "done" | "error">(missing ? "error" : "checking");
  const [message, setMessage] = useState(
    missing ? "This verification link is invalid or incomplete." : ""
  );

  useEffect(() => {
    if (missing) return;
    let cancelled = false;
    (async () => {
      try {
        await api.verifyEmail(token, email.trim().toLowerCase());
        if (!cancelled) setState("done");
      } catch (err) {
        if (!cancelled) {
          setState("error");
          setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, email, missing]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-br from-green-deep via-green-dark to-green-mid px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-green-dark to-green-mid p-8 text-center">
          <span className="font-display text-3xl tracking-[4px] text-gold">MABUHAY HOMES</span>
        </div>
        <div className="p-8">
          {state === "checking" && (
            <div className="flex items-center gap-3 rounded-xl bg-cream p-4 text-sm text-muted">
              <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
              <span>Verifying your email…</span>
            </div>
          )}
          {state === "done" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-xl bg-green-light/15 p-4 text-sm text-green-mid">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <span>
                  {email ? <strong>{email}</strong> : "Your email"} is verified! Your account is now
                  active and you can log in.
                </span>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="btn-green w-full"
              >
                Go to Log In
              </button>
            </div>
          )}
          {state === "error" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-xl bg-danger-bg p-4 text-sm text-danger">
                <TriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <span>{message}</span>
              </div>
              <div className="flex gap-2">
                <Link href="/login" className="btn-ghost flex-1 text-center">
                  Log In
                </Link>
                <Link href="/register" className="btn-green flex-1 text-center">
                  Register Again
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailCard />
    </Suspense>
  );
}