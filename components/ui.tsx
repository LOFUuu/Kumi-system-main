import Link from "next/link";
import type { ReactNode } from "react";
import { MapPin, BedDouble, ShowerHead, Ruler } from "lucide-react";
import { formatPHP, type HouseListing } from "@/lib/mock-data";

export function StatBox({ icon, value, label }: { icon: ReactNode; value: string | number; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-cream-2 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-mid/10 text-green-mid transition-colors duration-200 group-hover:bg-green-mid/15">
          {icon}
        </div>
        <div>
          <div className="font-serif text-3xl font-bold text-green-dark">{value}</div>
          <div className="text-sm text-muted">{label}</div>
        </div>
      </div>
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold/5" />
      <div className="pointer-events-none absolute -right-2 -bottom-8 h-16 w-16 rounded-full bg-green-mid/5" />
    </div>
  );
}

export function ListingCard({ listing }: { listing: HouseListing }) {
  const isRent = listing.listingType === "rent";
  const cover = listing.images[0];
  return (
    <div className="group overflow-hidden rounded-2xl border border-cream-2 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-cream-2">
        {cover ? (
          <img
            src={cover}
            alt={listing.houseName}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted/40">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-green-deep/70 via-transparent to-transparent" />
        <span className={`badge absolute left-3 top-3 backdrop-blur-sm ${isRent ? "badge-rent" : "badge-sale"}`}>
          {isRent ? "FOR RENT" : "FOR SALE"}
        </span>
        <div className="absolute bottom-3 left-3 font-serif text-xl font-bold text-white drop-shadow-sm">
          {formatPHP(listing.price)}
          {isRent && <span className="text-sm font-normal opacity-80">/mo</span>}
        </div>
      </div>

      {/* Body */}
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
          className="mt-4 flex items-center justify-between rounded-xl bg-cream px-4 py-2.5 text-sm font-semibold text-green-dark transition-all duration-200 hover:bg-green-mid hover:text-white hover:shadow-sm"
        >
          <span>View Property</span>
          <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    </div>
  );
}
