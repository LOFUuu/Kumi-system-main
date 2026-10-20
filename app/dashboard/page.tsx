"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#f8faf7]">
      <p className="text-sm font-semibold text-muted">Redirecting to Home…</p>
    </div>
  );
}
