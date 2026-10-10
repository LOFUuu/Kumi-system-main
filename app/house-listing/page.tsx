"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, RotateCcw } from "lucide-react";
import { ListingCard } from "@/components/ui";
import Reveal from "@/components/Reveal";
import { api } from "@/lib/api";
import type { HouseListing } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";

type Filter = "all" | "sale" | "rent";

function HouseListingContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlQ = searchParams.get("q") || "";
  const urlType = (searchParams.get("type") as Filter) || "all";

  const [filter, setFilter] = useState<Filter>(urlType);
  const [q, setQ] = useState(urlQ);
  const [listings, setListings] = useState<HouseListing[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync state when URL params change
  useEffect(() => {
    setQ(urlQ);
    setFilter(urlType);
  }, [urlQ, urlType]);

  const isResidentOrHowa =
    user && (user.role === "resident" || user.role === "admin" || user.role === "counselor");

  useEffect(() => {
    setLoading(true);
    api
      .listingsVerified()
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  // Update URL params when user changes search query or filter
  const updateUrl = (newQ: string, newFilter: Filter) => {
    const params = new URLSearchParams();
    if (newQ.trim()) params.set("q", newQ.trim());
    if (newFilter !== "all") params.set("type", newFilter);
    const queryString = params.toString();
    router.replace(queryString ? `/house-listing?${queryString}` : "/house-listing");
  };

  const handleFilterChange = (newFilter: Filter) => {
    setFilter(newFilter);
    updateUrl(q, newFilter);
  };

  const handleSearchChange = (val: string) => {
    setQ(val);
    updateUrl(val, filter);
  };

  const clearSearch = () => {
    setQ("");
    setFilter("all");
    router.replace("/house-listing");
  };

  // Comprehensive multi-field property search
  const shown = useMemo(() => {
    return listings.filter((l) => {
      if (filter !== "all" && l.listingType !== filter) return false;
      if (!q.trim()) return true;

      const term = q.toLowerCase().trim();
      const nameMatch = l.houseName ? l.houseName.toLowerCase().includes(term) : false;
      const addressMatch = l.address ? l.address.toLowerCase().includes(term) : false;
      const blockMatch = l.blockNo ? `block ${l.blockNo}`.toLowerCase().includes(term) || l.blockNo.toLowerCase().includes(term) : false;
      const lotMatch = l.lotNo ? `lot ${l.lotNo}`.toLowerCase().includes(term) || l.lotNo.toLowerCase().includes(term) : false;
      const descMatch = l.description ? l.description.toLowerCase().includes(term) : false;
      const typeMatch = l.listingType ? (l.listingType === "sale" ? "for sale" : "for rent").includes(term) : false;
      const bedMatch = l.bedrooms ? `${l.bedrooms} bedroom`.toLowerCase().includes(term) : false;

      return nameMatch || addressMatch || blockMatch || lotMatch || descMatch || typeMatch || bedMatch;
    });
  }, [listings, filter, q]);

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All Properties" },
    { key: "sale", label: "For Sale" },
    { key: "rent", label: "For Rent" },
  ];

  return (
    <div className="section">
      {/* Header */}
      <div className="section-head text-center sm:text-left">
        <h2>House Listings</h2>
        <p>
          Find your next home in Mabuhay Homes 2000 Phase 5 &bull;{" "}
          <strong className="text-green-mid">Only verified listings are shown to the public.</strong>
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-cream-2 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Type Tabs */}
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => handleFilterChange(t.key)}
              className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                filter === t.key
                  ? "bg-green-mid text-white shadow-xs"
                  : "bg-cream text-green-dark hover:bg-cream-2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="field w-full pl-10 pr-9 text-xs sm:text-sm"
            placeholder="Search by name, address, block/lot, or features..."
            value={q}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {q && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Info Badge */}
      {(q.trim() || filter !== "all") && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#e8f3ec] px-4 py-2.5 text-xs text-[#123f2a]">
          <span>
            Showing <strong>{shown.length}</strong> {shown.length === 1 ? "property" : "properties"}
            {q.trim() && (
              <>
                {" "}matching &ldquo;<strong>{q}</strong>&rdquo;
              </>
            )}
            {filter !== "all" && (
              <>
                {" "}under <strong>For {filter === "sale" ? "Sale" : "Rent"}</strong>
              </>
            )}
          </span>
          <button
            onClick={clearSearch}
            className="inline-flex items-center gap-1 font-bold text-[#45a057] hover:underline"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-4 shadow-xs">
              <div className="h-48 rounded-xl bg-gray-200" />
              <div className="mt-3 h-5 w-3/4 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-1/2 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && shown.length === 0 && (
        <div className="my-12 rounded-3xl border border-cream-2 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cream text-green-dark mb-3">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-green-dark">No Properties Found</h3>
          <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
            {q.trim()
              ? `We couldn't find any verified listings matching "${q}". Try adjusting your search query.`
              : "No verified listings match your selected filter."}
          </p>
          {(q.trim() || filter !== "all") && (
            <button
              onClick={clearSearch}
              className="btn-green mt-5 inline-flex items-center gap-1.5 !px-5 !py-2 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Search & Filters
            </button>
          )}
        </div>
      )}

      {/* Listings Grid */}
      {!loading && shown.length > 0 && (
        <Reveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger>
          {shown.map((h) => (
            <ListingCard key={h.id} listing={h} />
          ))}
        </Reveal>
      )}

      {/* Add Listing CTA for authorized residents */}
      {isResidentOrHowa && (
        <div className="mt-10 text-center">
          <Link href="/add-listing" className="btn-green !text-white shadow-sm inline-flex items-center gap-2">
            + Add Your Listing
          </Link>
        </div>
      )}
    </div>
  );
}

export default function HouseListingPage() {
  return (
    <Suspense
      fallback={
        <div className="section py-20 text-center text-xs font-semibold text-muted animate-pulse">
          Loading house listings…
        </div>
      }
    >
      <HouseListingContent />
    </Suspense>
  );
}
