"use client";

import { useState } from "react";
import Link from "next/link";
import { ListingCard } from "@/components/ui";
import Reveal from "@/components/Reveal";
import { MOCK_LISTINGS } from "@/lib/mock-data";

type Filter = "all" | "sale" | "rent";

export default function HouseListingPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const listings = MOCK_LISTINGS.filter((l) => {
    if (filter !== "all" && l.listingType !== filter) return false;
    if (
      q &&
      !`${l.houseName} ${l.address}`.toLowerCase().includes(q.toLowerCase())
    )
      return false;
    return true;
  });

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "sale", label: "For Sale" },
    { key: "rent", label: "For Rent" },
  ];

  return (
    <div className="section">
      <div className="section-head">
        <h2>House Listings</h2>
        <p>Find your next home in Mabuhay Homes 2000 Phase 5</p>
      </div>

      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === t.key
                  ? "bg-green-mid text-white"
                  : "bg-cream text-green-dark hover:bg-cream-2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          className="field max-w-xs"
          placeholder="Search by name or address…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {listings.length === 0 ? (
        <p className="py-20 text-center text-muted">
          No listings match your search.
        </p>
      ) : (
        <Reveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger>
          {listings.map((h) => (
            <ListingCard key={h.id} listing={h} />
          ))}
        </Reveal>
      )}

      <div className="mt-10 text-center">
        <Link href="/add-listing" className="btn-green !text-white">
          + Add Your Listing
        </Link>
      </div>
    </div>
  );
}
