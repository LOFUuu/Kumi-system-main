"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  LogIn,
  MapPin,
  Home,
  ArrowRight,
  BedDouble,
  ShowerHead,
  Ruler,
  Waves,
  Trophy,
  DoorOpen,
  Leaf,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPHP, type HouseListing, type Amenity } from "@/lib/mock-data";
import type { MapActive } from "@/components/CommunityMap";

const CommunityMap = dynamic(() => import("@/components/CommunityMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[580px] w-full items-center justify-center rounded-3xl bg-[#edf3ee] text-[#1a3826] font-semibold text-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 animate-pulse text-[#2d6a4f]" />
        Loading Community Map…
      </div>
    </div>
  ),
});

export default function MapPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<MapActive>(null);
  const [listings, setListings] = useState<HouseListing[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);

  useEffect(() => {
    if (user) {
      api.listings().then(setListings).catch(() => setListings([]));
      api.amenities().then(setAmenities).catch(() => setAmenities([]));
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#faf8f2] px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-[#e8e4da] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf3ee]">
            <LogIn className="h-6 w-6 text-[#1a3826]" />
          </div>
          <h2 className="mt-4 font-serif text-2xl font-bold text-[#143424]">
            Sign in to view the community map
          </h2>
          <p className="mt-2 text-sm text-[#5c6e60]">
            The community map and subdivision details are restricted to registered users and residents.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href="/login?next=/map"
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#1a3826] py-3 text-sm font-semibold text-white transition hover:bg-[#132c1e]"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-[#e8e4da] bg-[#faf8f2] py-3 text-sm font-semibold text-[#143424] transition hover:bg-white"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filter public listings: Verified + Available + Map Visible + Not Archived
  const publicListings = listings.filter((l) => {
    const isVerified = l.verificationStatus === "verified" || l.verificationStatus === undefined;
    const isAvailable = l.status === "available";
    const notArchived = !l.isArchived;
    const isMapVisible = l.showOnMap !== false;
    return isVerified && isAvailable && notArchived && isMapVisible;
  });

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#faf8f2] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ── Page Header ────────────────────────────────────────────────────── */}
        <div className="mb-7 text-center">
          <div className="inline-flex items-center gap-2 text-3xl font-bold text-[#143424] sm:text-4xl">
            <MapPin className="h-8 w-8 text-[#2d6a4f]" />
            <h1 className="font-serif">Community Map</h1>
          </div>
          <p className="mt-1 text-sm font-medium text-[#5c6e60] sm:text-base">
            Explore Mabuhay Homes 2000 Phase 5 • Salawag
          </p>
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#2d6a4f]" />
        </div>

        {/* ── Main Layout: Map (Left) + Right Side Panel ─────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* ── Left Column: Interactive Map Container ────────────────────────── */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-3">
            <div className="relative z-10 h-[580px] w-full overflow-hidden rounded-3xl border border-[#e8e4da] bg-white shadow-md">
              <CommunityMap
                active={active}
                onSelect={setActive}
                listings={publicListings}
                amenities={amenities}
              />
            </div>

            {/* ── Map Legend Bar (matching reference screenshot) ─────────────── */}
            <div className="rounded-2xl border border-[#e8e4da] bg-white p-3.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-[#143424]">
                <span className="font-bold text-[#1a3826] flex items-center gap-1.5">
                  Map Legend:
                </span>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1a3826] text-white text-[10px]">
                      <Home className="h-3 w-3" />
                    </span>
                    House Listing
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0284c7] text-white text-[10px]">
                      <Waves className="h-3 w-3" />
                    </span>
                    Pool
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ea580c] text-white text-[10px]">
                      <Trophy className="h-3 w-3" />
                    </span>
                    Sports Court
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e11d48] text-white text-[10px]">
                      <DoorOpen className="h-3 w-3" />
                    </span>
                    Entrance Gate
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Side Panel ────────────────────────────────────── */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">
            {/* ── House Listings Panel ──────────────────────────────────────── */}
            <div className="rounded-3xl border border-[#e8e4da] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1a3826] text-white shadow-xs">
                    <Home className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#143424]">
                      House Listings
                    </h3>
                    <p className="text-[11px] text-[#5c6e60]">
                      View available and verified house listings in Mabuhay Homes Phase 5.
                    </p>
                  </div>
                </div>
                <Link
                  href="/house-listing"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf3ee] text-[#1a3826] hover:bg-[#1a3826] hover:text-white transition shadow-xs"
                  title="View all house listings"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Cards List */}
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {publicListings.map((l) => {
                  const isSelected = active?.type === "listing" && active.id === l.id;
                  const cover = l.images && l.images[0]
                    ? l.images[0]
                    : "https://picsum.photos/seed/home/600/400";

                  return (
                    <div
                      key={l.id}
                      onClick={() => setActive({ type: "listing", id: l.id })}
                      className={`group cursor-pointer rounded-2xl border p-2.5 transition ${
                        isSelected
                          ? "border-[#2d6a4f] bg-[#edf3ee] shadow-sm"
                          : "border-[#e8e4da] bg-[#faf8f2] hover:border-[#c8d8cc] hover:bg-white"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div
                          className="h-20 w-24 shrink-0 rounded-xl bg-cover bg-center overflow-hidden border border-[#e8e4da]"
                          style={{ backgroundImage: `url(${cover})` }}
                        />

                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-serif text-xs font-bold text-[#143424] group-hover:text-[#2d6a4f] line-clamp-1">
                                {l.houseName}
                              </h4>
                              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 uppercase">
                                {l.listingType === "rent" ? "For Rent" : "For Sale"}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#5c6e60] mt-0.5 truncate">
                              Block {l.blockNo}, Lot {l.lotNo}, Mabuhay Homes Phase 5
                            </p>
                          </div>

                          <div className="mt-1 flex items-center justify-between">
                            <div className="font-serif text-sm font-bold text-[#2d6a4f]">
                              {formatPHP(l.price)}
                              {l.listingType === "rent" && (
                                <span className="text-[9px] font-normal text-[#5c6e60]"> /month</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-semibold text-[#5c6e60]">
                              <span className="flex items-center gap-0.5">
                                <BedDouble className="h-3 w-3" /> {l.bedrooms}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <ShowerHead className="h-3 w-3" /> {l.bathrooms}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Ruler className="h-3 w-3" /> {l.sqm}m²
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {publicListings.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#c8d8cc] p-6 text-center text-xs text-[#5c6e60]">
                    No verified public house listings currently match the map display criteria.
                  </div>
                )}
              </div>
            </div>

            {/* ── Amenities Panel ───────────────────────────────────────────── */}
            <div className="rounded-3xl border border-[#e8e4da] bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Leaf className="h-4 w-4 text-[#2d6a4f]" />
                <h3 className="font-serif text-base font-bold text-[#143424]">
                  Amenities
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Swimming Pool */}
                <button
                  type="button"
                  onClick={() => setActive({ type: "amenity", id: 1 })}
                  className="flex items-center justify-between rounded-xl border border-[#e8e4da] bg-[#faf8f2] p-3 text-left transition hover:border-[#0284c7] hover:bg-sky-50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0284c7] text-white">
                      <Waves className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#143424]">Swimming Pool</div>
                      <div className="text-[10px] text-[#5c6e60]">Capacity: 50</div>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[#5c6e60]" />
                </button>

                {/* Covered Court */}
                <button
                  type="button"
                  onClick={() => setActive({ type: "amenity", id: 2 })}
                  className="flex items-center justify-between rounded-xl border border-[#e8e4da] bg-[#faf8f2] p-3 text-left transition hover:border-[#ea580c] hover:bg-orange-50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ea580c] text-white">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#143424]">Covered Court</div>
                      <div className="text-[10px] text-[#5c6e60]">Capacity: 50</div>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[#5c6e60]" />
                </button>
              </div>
            </div>

            {/* ── Community Banner Quote (matching screenshot bottom banner) ─── */}
            <div className="flex items-center justify-between rounded-2xl border border-[#c8d8cc] bg-[#edf3ee] p-4 text-xs font-medium text-[#1a3826]">
              <div className="flex items-center gap-2.5">
                <Leaf className="h-5 w-5 shrink-0 text-[#2d6a4f]" />
                <p className="leading-snug">
                  A safe, peaceful, and connected community for a better tomorrow.
                </p>
              </div>
              <Sparkles className="h-5 w-5 shrink-0 text-[#2d6a4f]/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
