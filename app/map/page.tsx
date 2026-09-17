"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { HouseListing, Amenity } from "@/lib/mock-data";
import type { MapActive } from "@/components/CommunityMap";

const CommunityMap = dynamic(() => import("@/components/CommunityMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center rounded-2xl bg-gradient-to-br from-green-dark to-green-mid text-white/80">
      Loading map…
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
      <div className="section">
        <div className="mx-auto max-w-md rounded-2xl border border-cream-2 bg-white p-8 text-center shadow-sm">
          <LogIn className="mx-auto h-10 w-10 text-green-mid" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-green-dark">
            Sign in to view the community map
          </h2>
          <p className="mt-2 text-sm text-muted">
            The community map and subdivision details are restricted to registered users and residents.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/login?next=/map" className="btn-green text-center">
              Sign In
            </Link>
            <Link href="/register" className="btn-gold text-center">
              Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section !py-8">
      <div className="section-head !mb-6">
        <h2>Community Map</h2>
        <p>Explore house listings and amenities across the subdivision</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Real map (Leaflet + OpenStreetMap, no API key) */}
        <div className="relative z-10 h-[520px] overflow-hidden rounded-2xl">
          <CommunityMap active={active} onSelect={setActive} listings={listings} amenities={amenities} />
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 font-serif text-lg font-bold text-green-dark">House Listings</h3>
            <div className="space-y-2">
              {listings.map((l) => {
                const isActive = active?.type === "listing" && active.id === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => setActive({ type: "listing", id: l.id })}
                    className={`block w-full rounded-xl border p-3 text-left transition hover:border-green-light ${
                      isActive ? "border-green-light bg-cream" : "border-cream-2"
                    }`}
                  >
                    <div className="font-semibold text-green-dark">{l.houseName}</div>
                    <div className="text-xs text-muted">{l.address}</div>
                  </button>
                );
              })}
              {listings.length === 0 && (
                <div className="rounded-xl border border-cream-2 bg-cream/40 p-3 text-sm text-muted">
                  No listings found.
                </div>
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-serif text-lg font-bold text-green-dark">Amenities</h3>
            <div className="space-y-2">
              {amenities.map((a) => {
                const isActive = active?.type === "amenity" && active.id === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setActive({ type: "amenity", id: a.id })}
                    className={`block w-full rounded-xl border p-3 text-left transition hover:border-green-light ${
                      isActive ? "border-green-light bg-cream" : "border-cream-2"
                    }`}
                  >
                    <div className="font-semibold text-green-dark">{a.name}</div>
                    <div className="text-xs text-muted">Capacity: {a.maxCapacity}</div>
                  </button>
                );
              })}
              {amenities.length === 0 && (
                <div className="rounded-xl border border-cream-2 bg-cream/40 p-3 text-sm text-muted">
                  No amenities found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
