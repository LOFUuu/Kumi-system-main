import Link from "next/link";
import type { ReactNode } from "react";
import { MapPin, BedDouble, ShowerHead, Ruler } from "lucide-react";
import { formatPHP, type HouseListing } from "@/lib/mock-data";

export function StatBox({ icon, value, label }: { icon: ReactNode; value: string | number; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-cream-2 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-mid/10 text-green-mid">{icon}</div>
        <div>
          <div className="font-serif text-3xl font-bold text-green-dark">{value}</div>
          <div className="text-sm text-muted">{label}</div>
        </div>
      </div>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold/5" />
    </div>
  );
}

export function ListingCard({ listing }: { listing: HouseListing }) {
  const isRent = listing.listingType === "rent";
  const cover = listing.images[0];
  return (
    <div className="group overflow-hidden rounded-2xl border border-cream-2 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-48 bg-cover bg-center" style={{ backgroundImage: `url(${cover})` }}>
        <div className="absolute inset-0 bg-gradient-to-t from-green-deep/70 to-transparent" />
        <span className={`badge absolute left-3 top-3 ${isRent ? "badge-rent" : "badge-sale"}`}>
          {isRent ? "FOR RENT" : "FOR SALE"}
        </span>
        <div className="absolute bottom-3 left-3 font-serif text-xl font-bold text-white">
          {formatPHP(listing.price)}
          {isRent && <span className="text-sm font-normal opacity-80">/mo</span>}
        </div>
      </div>
      <div className="p-5">
        <div className="font-serif text-lg font-bold text-green-dark">{listing.houseName}</div>
        <div className="mt-1 flex items-center gap-1 text-sm text-muted">
          <MapPin className="h-4 w-4 text-green-mid" />
          {listing.address}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-green-mid">
          <span className="flex items-center gap-1">
            <BedDouble className="h-4 w-4" /> {listing.bedrooms}
          </span>
          <span className="flex items-center gap-1">
            <ShowerHead className="h-4 w-4" /> {listing.bathrooms}
          </span>
          <span className="flex items-center gap-1">
            <Ruler className="h-4 w-4" /> {listing.sqm} sqm
          </span>
        </div>
        <Link
          href={`/house/${listing.id}`}
          className="mt-4 flex items-center justify-between rounded-xl bg-cream px-4 py-2.5 text-sm font-semibold text-green-dark transition hover:bg-green-mid hover:text-white"
        >
          <span>View Property</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
