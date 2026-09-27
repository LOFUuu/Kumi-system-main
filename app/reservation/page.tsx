"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Users, Calendar, Info, Percent, Coins, User } from "lucide-react";
import { api } from "@/lib/api";
import { formatPHP, type Amenity } from "@/lib/mock-data";

export default function ReservationHub() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .amenities()
      .then((data) => setAmenities(data))
      .catch(() => setAmenities([]))
      .finally(() => setLoading(false));
  }, []);

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
        </div>

        {/* Resident Discount Banner */}
        <div className="mx-auto mb-10 max-w-2xl rounded-2xl border border-[#decb9e]/50 bg-[#f4efe4] p-4 text-sm text-[#38483c] shadow-sm sm:p-5">
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
                <div className="mt-4 flex gap-2">
                  <div className="h-7 w-20 rounded-full bg-neutral-100" />
                  <div className="h-7 w-28 rounded-full bg-neutral-100" />
                  <div className="h-7 w-28 rounded-full bg-neutral-100" />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="h-11 rounded-xl bg-neutral-200" />
                  <div className="h-11 rounded-xl bg-neutral-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && amenities.length === 0 && (
          <div className="rounded-2xl border border-[#e8e4da] bg-white p-12 text-center shadow-sm">
            <p className="text-base font-medium text-[#5c6e60]">
              No amenities currently available for booking.
            </p>
          </div>
        )}

        {/* Amenities Cards Grid */}
        {!loading && amenities.length > 0 && (
          <div className="grid gap-8 md:grid-cols-2">
            {amenities.map((a) => (
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

