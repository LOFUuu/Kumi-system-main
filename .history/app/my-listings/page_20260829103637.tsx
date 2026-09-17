"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatPHP, type HouseListing } from "@/lib/mock-data";
import { ListingCard } from "@/components/ui";

export default function MyListingsPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<HouseListing[]>([]);

  useEffect(() => {
    api
      .listings()
      .then(setListings)
      .catch(() => setListings([]));
  }, []);

  const name = user?.fullName ?? "";
  const mine = listings.filter((l) => l.ownerName === name);

  return (
    <div className="section">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl font-bold text-green-dark">
            My Listings
          </h1>
          <p className="text-muted">
            Manage the properties you&apos;ve listed.
          </p>
        </div>
        <Link href="/add-listing" className="btn-green !Text-white">
          + Add Listing
        </Link>
      </div>

      {mine.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-2 p-16 text-center text-muted">
          You haven&apos;t listed any properties yet.
          <div className="mt-4">
            <Link href="/add-listing" className="btn-ghost">
              Add your first listing
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((h) => (
            <div key={h.id} className="relative">
              <ListingCard listing={h} />
              <div className="mt-2 flex gap-2">
                <Link
                  href={`/house/${h.id}`}
                  className="btn-ghost flex-1 !py-2 text-xs"
                >
                  View
                </Link>
                <button className="btn-ghost flex-1 !py-2 text-xs">Edit</button>
                <button className="btn-ghost flex-1 !py-2 text-xs text-danger">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
