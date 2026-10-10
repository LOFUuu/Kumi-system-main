"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users, Calendar, Info, Percent, Coins, User, Search, X, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { formatPHP, type Amenity } from "@/lib/mock-data";

function ReservationHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQ = searchParams.get("q") || "";

  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(urlQ);

  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

  useEffect(() => {
    setLoading(true);
    api
      .amenities()
      .then((data) => setAmenities(data))
      .catch(() => setAmenities([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSearchChange = (val: string) => {
    setQ(val);
    const params = new URLSearchParams();
    if (val.trim()) params.set("q", val.trim());
    const queryString = params.toString();
    router.replace(queryString ? `/reservation?${queryString}` : "/reservation");
  };

  const clearSearch = () => {
    setQ("");
    router.replace("/reservation");
  };

  const shownAmenities = useMemo(() => {
    if (!q.trim()) return amenities;
    const term = q.toLowerCase().trim();
    return amenities.filter((a) => {
      const matchName = a.name ? a.name.toLowerCase().includes(term) : false;
      const matchDesc = a.description ? a.description.toLowerCase().includes(term) : false;
      const matchCap = a.maxCapacity ? `${a.maxCapacity} pax`.toLowerCase().includes(term) || String(a.maxCapacity).includes(term) : false;
      return matchName || matchDesc || matchCap;
    });
  }, [amenities, q]);

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#faf8f2] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-[#143424] sm:text-5xl">
            Book an Amenity
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[#5c6e60] sm:text-base">
            Reserve the swimming pool, covered court and more — approvals are
            confirmed by the HOA within 24 hours.
          </p>

          {/* Search Bar */}
          <div className="relative mx-auto mt-6 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="h-10 w-full rounded-full border border-[#e8e4da] bg-white pl-10 pr-9 text-xs text-[#143424] placeholder:text-[#8ba090] outline-none shadow-xs focus:border-[#45a057] focus:ring-2 focus:ring-[#45a057]/15"
              placeholder="Search amenities by name, description, or capacity..."
              value={q}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {q && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Resident Discount Banner */}
        <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-[#decb9e]/50 bg-[#f4efe4] p-4 text-sm text-[#38483c] shadow-sm sm:p-5">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#cbd9ce] text-[#1b4332]">
              <Percent className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div>
              <strong className="block font-serif text-sm font-bold text-[#1b4332] sm:text-base">
                Resident Discount
              </strong>
              <p className="mt-0.5 text-xs text-[#47574b] sm:text-sm leading-relaxed">
                Residents enjoy a <strong className="font-semibold text-[#1b4332]">20% discount</strong> on public (per-hour) rates. All reservations require a GCash downpayment, which is verified by the HOA before approval.
              </p>
            </div>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid gap-8 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-3xl border border-[#e8e4da] bg-white p-5 shadow-sm"
              >
                <div className="h-52 w-full rounded-2xl bg-neutral-200" />
                <div className="mt-4 h-6 w-1/2 rounded bg-neutral-200" />
                <div className="mt-2 h-4 w-3/4 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        )}

        {/* Empty Search Result State */}
        {!loading && shownAmenities.length === 0 && (
          <div className="rounded-3xl border border-[#e8e4da] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf3ee] text-[#143424] mb-3">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#143424]">No Amenities Found</h3>
            <p className="mt-1 text-xs text-[#5c6e60] max-w-sm mx-auto">
              {q.trim()
                ? `No community amenities match your search for "${q}".`
                : "No amenities currently available for booking."}
            </p>
            {q.trim() && (
              <button
                onClick={clearSearch}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#1a3826] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#132c1e] transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear Amenity Search
              </button>
            )}
          </div>
        )}

        {/* Amenities Cards Grid */}
        {!loading && shownAmenities.length > 0 && (
          <div className="grid gap-8 md:grid-cols-2">
            {shownAmenities.map((a) => (
              <div
                key={a.id}
                className="flex flex-col justify-between rounded-3xl border border-[#e8e4da] bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
              >
                <div>
                  {/* Amenity Image */}
                  <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-neutral-100 sm:h-56">
                    <img
                      src={a.image}
                      alt={a.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Title & Description */}
                  <div className="mt-4">
                    <h3 className="font-serif text-2xl font-bold text-[#143424]">
                      {a.name}
                    </h3>
                    <p className="mt-1 text-xs text-[#5c6e60] sm:text-sm">
                      {a.description}
                    </p>
                  </div>

                  {/* Badges / Rates */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf3ee] px-3 py-1.5 font-medium text-[#22442e]">
                      <Users className="h-3.5 w-3.5 text-[#3b634c]" />
                      Max {a.maxCapacity} pax
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf3ee] px-3 py-1.5 font-medium text-[#22442e]">
                      <Coins className="h-3.5 w-3.5 text-[#3b634c]" />
                      Public {formatPHP(a.rateWalkin)}/head
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf3ee] px-3 py-1.5 font-medium text-[#22442e]">
                      <User className="h-3.5 w-3.5 text-[#3b634c]" />
                      Private {formatPHP(a.ratePrivate)}/hr
                    </span>
                  </div>
                </div>

                {/* Actions & Policy Note */}
                <div className="mt-5">
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href={`/reservation/${a.id}?type=public`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a3826] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#132c1e] active:scale-[0.99]"
                    >
                      <Calendar className="h-4 w-4" />
                      Book Public
                    </Link>
                    <Link
                      href={`/reservation/${a.id}?type=private`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#eeb742] px-4 py-3 text-sm font-bold text-[#1a3826] shadow-sm transition-all hover:bg-[#deb03a] active:scale-[0.99]"
                    >
                      <Users className="h-4 w-4 text-[#1a3826]" />
                      Book Private
                    </Link>
                  </div>

                  {/* Bottom Note */}
                  <div className="mt-3 flex items-start gap-1.5 text-[11px] text-[#6b7c6f] sm:text-xs">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6b7c6f]" />
                    <span>
                      Partial or whole area for hire. Fruits, drinks and food within the area allowed.
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReservationHub() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-xs font-semibold text-[#5c6e60] animate-pulse">
          Loading amenity hub…
        </div>
      }
    >
      <ReservationHubContent />
    </Suspense>
  );
}
