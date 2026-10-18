"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function ViewingsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const listingId = searchParams.get("listingId");
    const target = listingId
      ? `/my-listings?tab=viewings&listingId=${encodeURIComponent(listingId)}`
      : "/my-listings?tab=viewings";
    router.replace(target);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-green-dark" />
      <p className="mt-4 text-sm text-muted">Redirecting to My Listings viewings…</p>
    </div>
  );
}

export default function ViewingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-dark" />
          <p className="mt-4 text-sm text-muted">Loading…</p>
        </div>
      }
    >
      <ViewingsRedirect />
    </Suspense>
  );
}
