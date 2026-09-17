"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatPHP, type Amenity } from "@/lib/mock-data";

export default function ReservationHub() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  useEffect(() => {
    api
      .amenities()
      .then(setAmenities)
      .catch(() => setAmenities([]));
  }, []);

  return (
    <div className="section">
      <div className="section-head">
        <h2 className="!text-white">Book an Amenity</h2>
        <p>
          Reserve the swimming pool, covered court and more — approvals are
          confirmed by the HOA within 24 hours.
        </p>
      </div>

      <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-gold/40 bg-cream p-4 text-sm text-green-dark">
        <strong className="block text-gold-muted">Resident Discount</strong>
        Residents enjoy a <strong>20% discount</strong> on public (per-head)
        rates. All reservations require a GCash downpayment, which is verified
        by the HOA before approval.
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {amenities.map((a) => (
          <div key={a.id} className="card overflow-hidden">
            <div
              className="h-40 bg-cover bg-center"
              style={{ backgroundImage: `url(${a.image})` }}
            />
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-serif text-xl font-bold text-green-dark">
                    {a.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{a.description}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <span className="rounded-full bg-cream px-3 py-1 font-semibold text-muted">
                  Max {a.maxCapacity} pax
                </span>
                <span className="rounded-full bg-cream px-3 py-1 font-semibold text-green-mid">
                  Public {formatPHP(a.rateWalkin)}/head
                </span>
                <span className="rounded-full bg-cream px-3 py-1 font-semibold text-green-mid">
                  Private {formatPHP(a.ratePrivate)} flat
                </span>
              </div>

              <div className="mt-5 flex gap-3">
                <Link
                  href={`/reservation/${a.id}?type=public`}
                  className="btn-green flex-1 text-center !py-2.5 text-sm"
                >
                  Book Public
                </Link>
                <Link
                  href={`/reservation/${a.id}?type=private`}
                  className="btn-gold flex-1 text-center !py-2.5 text-sm"
                >
                  Book Private
                </Link>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted">
                Private = whole-venue flat rate · Public = per head with
                resident discount
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
