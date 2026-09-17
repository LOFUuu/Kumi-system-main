"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="section"><p className="text-muted">Loading…</p></div>;
  }

  const isHowa = user.role === "admin" || user.role === "counselor";
  if (!isHowa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream/40 p-8">
        <div className="max-w-md rounded-2xl border border-gold/30 bg-gold/5 p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-gold" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-green-dark">HOWA access only</h2>
          <p className="mt-2 text-sm text-muted">
            The admin console is restricted to Homeowners Association administrators.
          </p>
          <button onClick={() => router.push("/")} className="btn-green mt-6 inline-flex w-full justify-center">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
