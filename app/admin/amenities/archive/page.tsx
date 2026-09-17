"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Users,
  CheckCircle2,
  AlertCircle,
  Box,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPHP, type Amenity } from "@/lib/mock-data";

export default function AdminArchivePage() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Restore / permanent-delete target
  const [restoreTarget, setRestoreTarget] = useState<Amenity | null>(null);
  const [restoring, setRestoring] = useState(false);

  const loadArchived = () => {
    setLoading(true);
    api
      .archivedAmenities()
      .then(setAmenities)
      .catch(() => setAmenities([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadArchived();
  }, []);

  const handleRestore = async (amenity: Amenity) => {
    setRestoring(true);
    try {
      await api.amenityUnarchive(amenity.id);
      setSuccessMsg(`"${amenity.name}" has been restored and is now active.`);
      setRestoreTarget(null);
      loadArchived();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to restore amenity.");
      setTimeout(() => setErrorMsg(""), 4000);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
              <Archive className="h-5 w-5 text-amber-600" />
            </span>
            <h1 className="font-serif text-3xl font-bold text-green-dark">Amenities Archive</h1>
          </div>
          <p className="text-sm text-muted ml-11">
            Archived amenities are hidden from the public and cannot be booked. You can restore them anytime.
          </p>
        </div>
        <a
          href="/admin/amenities"
          className="btn-ghost flex items-center gap-1.5 text-sm font-semibold text-green-dark border border-cream-2 shadow-sm px-4 py-2 rounded-xl hover:bg-cream transition"
        >
          ← Back to Amenities
        </a>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-light/40 bg-green-light/10 p-3.5 text-xs font-semibold text-green-dark">
          <CheckCircle2 className="h-4 w-4 text-green-mid flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-bg p-3.5 text-xs font-semibold text-danger">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Archived Amenities Grid */}
      {loading ? (
        <div className="py-20 text-center text-muted">
          <Archive className="mx-auto h-8 w-8 mb-3 text-amber-300 animate-pulse" />
          <p>Loading archived amenities…</p>
        </div>
      ) : amenities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50/30 p-20 text-center">
          <Box className="mx-auto mb-4 h-12 w-12 text-amber-300" />
          <p className="font-serif text-lg font-semibold text-amber-700">No archived amenities</p>
          <p className="mt-1 text-xs text-muted">Amenities you archive will appear here. They can be restored at any time.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-xs font-semibold text-muted">
            {amenities.length} archived {amenities.length === 1 ? "amenity" : "amenities"}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {amenities.map((a) => (
              <div
                key={a.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm opacity-80 transition hover:opacity-100 hover:shadow-md"
              >
                <div>
                  {/* Image with archived overlay */}
                  <div
                    className="relative h-44 w-full bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${a.image || "https://picsum.photos/seed/amenity/800/600"})`,
                    }}
                  >
                    <div className="absolute inset-0 bg-amber-900/40 flex items-center justify-center">
                      <span className="flex items-center gap-1.5 rounded-full bg-amber-700/90 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
                        <Archive className="h-3.5 w-3.5" /> Archived
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-xl font-bold text-green-dark">{a.name}</h3>
                      <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                        <Users className="h-3.5 w-3.5 text-green-mid" /> {a.maxCapacity} pax
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-muted line-clamp-2 leading-relaxed">
                      {a.description || "No description provided."}
                    </p>

                    <div className="mt-4 space-y-1.5 rounded-xl border border-cream-2 bg-cream/40 p-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted">Public (Walk-in):</span>
                        <strong className="text-green-dark">{formatPHP(a.rateWalkin)} / head</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Public (Night):</span>
                        <strong className="text-green-dark">{formatPHP(a.rateWhole)} / head</strong>
                      </div>
                      <div className="flex justify-between border-t border-cream-2 pt-1">
                        <span className="text-muted">Private Flat Rate:</span>
                        <strong className="text-green-mid">{formatPHP(a.ratePrivate)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Restore Button */}
                <div className="flex gap-2 border-t border-amber-100 p-3 bg-amber-50/40">
                  <button
                    onClick={() => setRestoreTarget(a)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100"
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" /> Restore Amenity
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Restore Confirmation Modal */}
      {restoreTarget && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4"
          onClick={() => !restoring && setRestoreTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-light/20">
                <ArchiveRestore className="h-5 w-5 text-green-mid" />
              </span>
              <h3 className="font-serif text-lg font-bold text-green-dark">Restore Amenity?</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Restoring <strong>&ldquo;{restoreTarget.name}&rdquo;</strong> will make it visible to
              residents again and available for booking.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setRestoreTarget(null)}
                disabled={restoring}
                className="btn-ghost flex-1 justify-center !py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRestore(restoreTarget)}
                disabled={restoring}
                className="flex-1 rounded-xl bg-green-mid px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-dark disabled:opacity-60 transition"
              >
                {restoring ? "Restoring…" : "Yes, Restore"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
