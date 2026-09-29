"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogIn,
  Lock,
  Plus,
  BedDouble,
  ShowerHead,
  Ruler,
  Archive,
  ChevronDown,
  Check,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatPHP, type HouseListing } from "@/lib/mock-data";

type FilterTab = "all" | "sale" | "rent";
type TxStatus = "available" | "reserved" | "sold_rented";

const TX_LABELS: Record<TxStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  sold_rented: "Sold / Rented Out",
};

const TX_COLORS: Record<TxStatus, string> = {
  available: "bg-emerald-100 text-emerald-800",
  reserved: "bg-amber-100 text-amber-800",
  sold_rented: "bg-rose-100 text-rose-800",
};

function StatusPill({ listing }: { listing: HouseListing }) {
  const isRent = listing.listingType === "rent";
  return (
    <span className="rounded-full bg-green-light/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-green-dark">
      {isRent ? "For Rent" : "For Sale"}
    </span>
  );
}

function TxStatusDropdown({
  listing,
  onUpdate,
}: {
  listing: HouseListing;
  onUpdate: (updated: HouseListing) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Map DB value to our dropdown keys
  const current: TxStatus =
    (listing.transactionStatus as TxStatus) ?? "available";

  const handleSelect = async (val: TxStatus) => {
    setOpen(false);
    if (val === current) return;
    setLoading(true);
    try {
      const { listing: updated } = await api.listingUpdate(listing.id, {
        transactionStatus: val,
      });
      onUpdate(updated);
    } catch {
      /* silently ignore; user can retry */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition hover:opacity-80 ${TX_COLORS[current]}`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
        {TX_LABELS[current]}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 bottom-full mb-1 z-30 min-w-[180px] overflow-hidden rounded-xl border border-[#e8e4da] bg-white shadow-xl">
            {(Object.keys(TX_LABELS) as TxStatus[]).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleSelect(val)}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold transition hover:bg-[#f5f8f5] ${
                  val === current ? "text-green-dark" : "text-[#143424]"
                }`}
              >
                {val === current && (
                  <Check className="h-3 w-3 shrink-0 text-green-mid" />
                )}
                <span className={val === current ? "" : "ml-5"}>
                  {TX_LABELS[val]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ArchiveModal({
  listing,
  onClose,
  onArchived,
}: {
  listing: HouseListing;
  onClose: () => void;
  onArchived: (id: number) => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleArchive = async () => {
    setLoading(true);
    setError("");
    try {
      await api.listingArchive(listing.id, reason.trim() || undefined);
      onArchived(listing.id);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to archive listing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-600" />
              <h3 className="font-serif text-lg font-bold text-green-dark">
                Archive Listing
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted">
              <strong>{listing.houseName}</strong> will be removed from the public
              feed. You can restore it later from the archive page.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 rounded-lg p-1.5 text-muted hover:bg-cream hover:text-green-dark"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">
            Reason (optional)
          </label>
          <textarea
            className="w-full rounded-xl border border-[#dde5de] bg-[#f5f8f5] px-3 py-2.5 text-sm text-[#143424] outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/10 min-h-[80px] resize-none"
            placeholder="e.g. Property is now rented, temporarily off market…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost flex-1 justify-center text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-60"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Archiving…</>
            ) : (
              <><Archive className="h-4 w-4" /> Archive</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyListingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<FilterTab>("all");
  const [listings, setListings] = useState<HouseListing[]>([]);
  const [archiveTarget, setArchiveTarget] = useState<HouseListing | null>(null);

  const load = () => {
    api
      .listings()
      .then((all) => {
        const mine = all.filter(
          (l) =>
            !l.isArchived &&
            Boolean(
              user?.id &&
                (l.uploadedBy === user.id || l.ownerId === user.id)
            )
        );
        setListings(mine);
      })
      .catch(() => setListings([]));
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleUpdateListing = (updated: HouseListing) => {
    setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleArchived = (id: number) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  if (!user) {
    return (
      <div className="section">
        <div className="mx-auto max-w-md rounded-2xl border border-cream-2 bg-white p-8 text-center shadow-sm">
          <LogIn className="mx-auto h-10 w-10 text-green-mid" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-green-dark">
            Sign in to view your listings
          </h2>
          <p className="mt-2 text-sm text-muted">
            You must be signed in to manage your property listings.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="btn-green mt-6 inline-flex w-full justify-center"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const filtered = listings.filter((l) => {
    if (tab === "sale") return l.listingType === "sale";
    if (tab === "rent") return l.listingType === "rent";
    return true;
  });

  return (
    <div className="section">
      {archiveTarget && (
        <ArchiveModal
          listing={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onArchived={handleArchived}
        />
      )}

      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-3xl font-bold text-green-dark sm:text-4xl">
            My Listings
          </h1>
          <p className="text-sm text-muted">
            Manage your submitted property listings.
          </p>
        </div>
        <Link href="/add-listing" className="btn-green !text-white flex items-center gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" /> Create New Listing
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-cream-2 bg-cream p-1">
        {(
          [
            { key: "all", label: "All Properties", count: listings.length },
            { key: "sale", label: "For Sale", count: listings.filter((l) => l.listingType === "sale").length },
            { key: "rent", label: "For Rent", count: listings.filter((l) => l.listingType === "rent").length },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
              tab === t.key
                ? "bg-white text-green-dark shadow-xs"
                : "text-muted hover:text-green-dark"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full px-1.5 text-[10px] ${
                tab === t.key ? "bg-cream-2 text-green-dark" : "bg-white/60 text-muted"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-2 p-16 text-center text-muted">
          <p>No listings found under this tab.</p>
          <div className="mt-4">
            <Link href="/add-listing" className="btn-ghost">
              + Add a new listing
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((l) => {
            const cover = l.images && l.images[0]
              ? l.images[0]
              : "https://picsum.photos/seed/home/600/400";

            return (
              <div
                key={l.id}
                className="rounded-2xl border border-cream-2 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row">
                  <div
                    className="h-48 w-full sm:h-auto sm:w-64 flex-shrink-0 bg-cover bg-center rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none overflow-hidden"
                    style={{ backgroundImage: `url(${cover})` }}
                  />

                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-serif text-xl font-bold text-green-dark">
                            {l.houseName}
                          </h3>
                          <p className="text-xs text-muted">
                            Block {l.blockNo}, Lot {l.lotNo}, Mabuhay Homes
                          </p>
                        </div>
                        <StatusPill listing={l} />
                      </div>

                      <div className="mt-3 font-serif text-2xl font-bold text-green-mid">
                        {formatPHP(l.price)}
                        {l.listingType === "rent" && (
                          <span className="text-xs font-normal text-muted"> / month</span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-green-mid">
                        <span className="flex items-center gap-1">
                          <BedDouble className="h-4 w-4" /> {l.bedrooms} Beds
                        </span>
                        <span className="flex items-center gap-1">
                          <ShowerHead className="h-4 w-4" /> {l.bathrooms} Baths
                        </span>
                        <span className="flex items-center gap-1">
                          <Ruler className="h-4 w-4" /> {l.sqm} sqm
                        </span>
                      </div>
                    </div>

                    {/* Footer row */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-cream-2 pt-3 text-[11px] text-muted">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>
                          Verification:{" "}
                          <strong className="capitalize text-green-dark">
                            {l.verificationStatus?.replace(/_/g, " ") ?? "pending"}
                          </strong>
                        </span>
                        {/* Transaction status — owner controlled */}
                        <TxStatusDropdown listing={l} onUpdate={handleUpdateListing} />
                      </div>

                      <div className="flex items-center gap-3">
                        <Link
                          href={`/house/${l.id}`}
                          className="font-semibold text-green-mid hover:underline"
                        >
                          View →
                        </Link>
                        <button
                          type="button"
                          onClick={() => setArchiveTarget(l)}
                          className="flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-900 transition"
                        >
                          <Archive className="h-3 w-3" /> Archive
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
