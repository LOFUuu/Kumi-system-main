import Link from "next/link";
import type { ReactNode } from "react";
import { MapPin, BedDouble, ShowerHead, Ruler, ChevronRight } from "lucide-react";
import { formatPHP, type HouseListing } from "@/lib/mock-data";

export function StatBox({ icon, value, label }: { icon: ReactNode; value: string | number; label: string }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-[#123f2a]/10 bg-white p-5 sm:p-6 shadow-[0_8px_25px_-5px_rgba(18,63,42,0.08)] transition-all duration-300 hover:shadow-[0_12px_35px_-5px_rgba(18,63,42,0.14)] hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f3ec] text-[#123f2a] transition-transform duration-300 group-hover:scale-105">
            {icon}
          </div>
          <div>
            <div className="font-serif text-3xl font-bold text-[#123f2a]">{value}</div>
            <div className="text-xs font-semibold text-gray-500 tracking-wide">{label}</div>
          </div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 group-hover:bg-[#123f2a] group-hover:text-white transition-all duration-200">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function ListingCard({ listing }: { listing: HouseListing }) {
  const isRent = listing.listingType === "rent";
  const cover = listing.images[0];
  return (
    <div className="group overflow-hidden rounded-3xl border border-[#123f2a]/10 bg-white shadow-[0_4px_20px_-2px_rgba(18,63,42,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_15px_35px_-5px_rgba(18,63,42,0.14)]">
      {/* Image Container */}
      <div className="relative h-52 overflow-hidden bg-gray-100">
        {cover ? (
          <img
            src={cover}
            alt={listing.houseName}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M3 11l9-8 9 8" />
              <path d="M5 10v10h14V10" />
              <path d="M10 20v-6h4v6" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e3020]/75 via-transparent to-transparent" />
        <span className={`badge absolute left-3 top-3 backdrop-blur-xs font-bold text-[11px] uppercase tracking-wider rounded-full px-3 py-1 ${isRent ? "bg-amber-400 text-[#123f2a]" : "bg-[#54b868] text-white"}`}>
          {isRent ? "FOR RENT" : "FOR SALE"}
        </span>
        <div className="absolute bottom-3 left-4 font-serif text-2xl font-bold text-white drop-shadow-sm">
          {formatPHP(listing.price)}
          {isRent && <span className="text-xs font-normal opacity-85">/mo</span>}
        </div>
      </div>

      {/* Details Body */}
      <div className="p-5">
        <h3 className="font-serif text-lg font-bold text-[#123f2a] group-hover:text-[#45a057] transition-colors">{listing.houseName}</h3>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="h-3.5 w-3.5 text-[#54b868] flex-shrink-0" />
          <span className="truncate">{listing.address}</span>
        </div>
        
        {/* Specs */}
        <div className="mt-3.5 flex items-center gap-4 text-xs font-semibold text-[#123f2a]/80 bg-[#f8faf7] px-3.5 py-2 rounded-2xl border border-gray-100">
          <span className="flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5 text-[#54b868]" /> {listing.bedrooms} Beds
          </span>
          <span className="flex items-center gap-1">
            <ShowerHead className="h-3.5 w-3.5 text-[#54b868]" /> {listing.bathrooms} Baths
          </span>
          <span className="flex items-center gap-1">
            <Ruler className="h-3.5 w-3.5 text-[#54b868]" /> {listing.sqm} sqm
          </span>
        </div>

        {/* Action Button */}
        <Link
          href={`/house/${listing.id}`}
          className="mt-4 flex items-center justify-between rounded-full border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-[#123f2a] transition-all duration-200 hover:bg-[#123f2a] hover:border-[#123f2a] hover:text-white"
        >
          <span>View Property</span>
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </div>
  );
}
