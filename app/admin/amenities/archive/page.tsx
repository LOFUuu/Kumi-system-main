"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Users,
  CheckCircle2,
  AlertCircle,
  Box,
  Building2,
  Waves,
  MapPin,
  Trash2,
  AlertTriangle,
  CreditCard,
  CalendarDays,
  Eye,
  ReceiptText,
  X,
  Coins,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPHP, type Amenity, type HouseListing, type User, type Reservation, type DuesRecord } from "@/lib/mock-data";

type ArchiveTab = "amenities" | "listings" | "residents" | "reservations" | "dues";

export default function AdminArchivePage() {
  const [activeTab, setActiveTab] = useState<ArchiveTab>("listings");

  // Amenities Archive State
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [restoreAmenityTarget, setRestoreAmenityTarget] = useState<Amenity | null>(null);
  const [restoringAmenity, setRestoringAmenity] = useState(false);

  // Listings Archive State
  const [listings, setListings] = useState<HouseListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [restoreListingTarget, setRestoreListingTarget] = useState<HouseListing | null>(null);
  const [restoringListing, setRestoringListing] = useState(false);

  // Residents Archive State
  const [residents, setResidents] = useState<User[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [restoreResidentTarget, setRestoreResidentTarget] = useState<User | null>(null);
  const [restoringResident, setRestoringResident] = useState(false);
  const [deleteResidentTarget, setDeleteResidentTarget] = useState<User | null>(null);
  const [deletingResident, setDeletingResident] = useState(false);

  // Reservations Archive State
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [restoreReservationTarget, setRestoreReservationTarget] = useState<Reservation | null>(null);
  const [restoringReservation, setRestoringReservation] = useState(false);
  const [deleteReservationTarget, setDeleteReservationTarget] = useState<Reservation | null>(null);
  const [deletingReservation, setDeletingReservation] = useState(false);
  const [viewReservationTarget, setViewReservationTarget] = useState<Reservation | null>(null);
  const [resSearch, setResSearch] = useState("");
  const [resStatusFilter, setResStatusFilter] = useState("all");

  // Monthly Dues Archive State
  const [dues, setDues] = useState<DuesRecord[]>([]);
  const [loadingDues, setLoadingDues] = useState(true);
  const [restoreDueTarget, setRestoreDueTarget] = useState<DuesRecord | null>(null);
  const [restoringDue, setRestoringDue] = useState(false);
  const [selectedDueIds, setSelectedDueIds] = useState<number[]>([]);
  const [duesSearch, setDuesSearch] = useState("");

  // Common notifications
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const notify = (type: "ok" | "err", msg: string) => {
    if (type === "ok") {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4500);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 4500);
    }
  };

  const loadArchivedAmenities = () => {
    setLoadingAmenities(true);
    api
      .archivedAmenities()
      .then(setAmenities)
      .catch(() => setAmenities([]))
      .finally(() => setLoadingAmenities(false));
  };

  const loadArchivedListings = () => {
    setLoadingListings(true);
    api
      .archivedListings()
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setLoadingListings(false));
  };

  const loadArchivedResidents = () => {
    setLoadingResidents(true);
    api
      .archivedUsers()
      .then(setResidents)
      .catch(() => setResidents([]))
      .finally(() => setLoadingResidents(false));
  };

  const loadArchivedReservations = () => {
    setLoadingReservations(true);
    api
      .archivedReservations()
      .then(setReservations)
      .catch(() => setReservations([]))
      .finally(() => setLoadingReservations(false));
  };

  const loadArchivedDues = () => {
    setLoadingDues(true);
    api
      .archivedDues()
      .then(setDues)
      .catch(() => setDues([]))
      .finally(() => setLoadingDues(false));
  };

  useEffect(() => {
    loadArchivedAmenities();
    loadArchivedListings();
    loadArchivedResidents();
    loadArchivedReservations();
    loadArchivedDues();
  }, [activeTab]);

  const handleRestoreAmenity = async (amenity: Amenity) => {
    setRestoringAmenity(true);
    try {
      await api.amenityUnarchive(amenity.id);
      notify("ok", `"${amenity.name}" has been restored and is now active.`);
      setRestoreAmenityTarget(null);
      loadArchivedAmenities();
    } catch (err: unknown) {
      notify("err", err instanceof Error ? err.message : "Failed to restore amenity.");
    } finally {
      setRestoringAmenity(false);
    }
  };

  const handleRestoreListing = async (listing: HouseListing) => {
    setRestoringListing(true);
    try {
      await api.listingUnarchive(listing.id);
      notify("ok", `Listing "${listing.houseName}" has been restored to active community listings.`);
      setRestoreListingTarget(null);
      loadArchivedListings();
    } catch (err: unknown) {
      notify("err", err instanceof Error ? err.message : "Failed to restore listing.");
    } finally {
      setRestoringListing(false);
    }
  };

  const handleRestoreResident = async (resident: User) => {
    setRestoringResident(true);
    try {
      await api.userUnarchive(resident.id);
      notify("ok", `${resident.fullName} has been restored to the active Residents list.`);
      setRestoreResidentTarget(null);
      loadArchivedResidents();
    } catch (err: unknown) {
      notify("err", err instanceof Error ? err.message : "Failed to restore resident.");
    } finally {
      setRestoringResident(false);
    }
  };

  const handleDeleteResident = async (resident: User) => {
    setDeletingResident(true);
    try {
      await api.userDelete(resident.id);
      notify("ok", `${resident.fullName}'s record has been permanently deleted.`);
      setDeleteResidentTarget(null);
      setResidents((prev) => prev.filter((r) => r.id !== resident.id));
    } catch (err: unknown) {
      notify("err", err instanceof Error ? err.message : "Failed to delete resident.");
    } finally {
      setDeletingResident(false);
    }
  };

  const handleRestoreReservation = async (reservation: Reservation) => {
    setRestoringReservation(true);
    try {
      const result = await api.restoreReservation(reservation.id);
      if (!result.ok) {
        throw new Error("Failed to restore reservation.");
      }
      notify("ok", `Reservation #${reservation.id} (${reservation.residentName}) was successfully restored to active reservations.`);
      setRestoreReservationTarget(null);
      loadArchivedReservations();
    } catch (err: unknown) {
      notify("err", err instanceof Error ? err.message : "Failed to restore reservation.");
    } finally {
      setRestoringReservation(false);
    }
  };

  const handleDeleteReservation = async (reservation: Reservation) => {
    setDeletingReservation(true);
    try {
      await api.deleteReservation(reservation.id);
      notify("ok", `Reservation #${reservation.id} has been permanently deleted from the archive.`);
      setDeleteReservationTarget(null);
      setReservations((prev) => prev.filter((r) => r.id !== reservation.id));
    } catch (err: unknown) {
      notify("err", err instanceof Error ? err.message : "Failed to delete reservation.");
    } finally {
      setDeletingReservation(false);
    }
  };

  const handleRestoreDue = async (target: DuesRecord) => {
    setRestoringDue(true);
    try {
      await api.unarchiveDues([target.id]);
      notify("ok", `Dues record for "${target.residentName}" (${target.dueMonth}) has been restored.`);
      setRestoreDueTarget(null);
      loadArchivedDues();
    } catch (err: unknown) {
      notify("err", err instanceof Error ? err.message : "Failed to restore dues record.");
    } finally {
      setRestoringDue(false);
    }
  };

  const handleBulkRestoreDues = async () => {
    if (selectedDueIds.length === 0) return;
    setRestoringDue(true);
    try {
      await api.unarchiveDues(selectedDueIds);
      notify("ok", `Successfully restored ${selectedDueIds.length} dues records.`);
      setSelectedDueIds([]);
      loadArchivedDues();
    } catch (err: unknown) {
      notify("err", err instanceof Error ? err.message : "Failed to restore dues records.");
    } finally {
      setRestoringDue(false);
    }
  };

  const filteredReservations = reservations.filter((r) => {
    const q = resSearch.toLowerCase().trim();
    const matchSearch =
      !q ||
      r.residentName?.toLowerCase().includes(q) ||
      r.amenityName?.toLowerCase().includes(q) ||
      r.userEmail?.toLowerCase().includes(q) ||
      r.date?.includes(q) ||
      String(r.id).includes(q);
    const matchStatus = resStatusFilter === "all" || r.status === resStatusFilter;
    return matchSearch && matchStatus;
  });

  const filteredDues = dues.filter((d) => {
    const q = duesSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      d.residentName.toLowerCase().includes(q) ||
      (d.blockNo && d.blockNo.toLowerCase().includes(q)) ||
      (d.lotNo && d.lotNo.toLowerCase().includes(q)) ||
      d.dueMonth.includes(q) ||
      (d.archiveReason && d.archiveReason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="pb-16">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
              <Archive className="h-5 w-5 text-amber-600" />
            </span>
            <h1 className="font-serif text-3xl font-bold text-green-dark">HOA Archive Center</h1>
          </div>
          <p className="text-xs text-muted ml-11">
            Archived items are safely hidden from active views and can be restored anytime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/dues"
            className="btn-ghost flex items-center gap-1.5 text-xs font-semibold text-green-dark border border-cream-2 shadow-xs px-3.5 py-2 rounded-xl hover:bg-cream transition"
          >
            ← Back to Dues
          </Link>
          <Link
            href="/admin/listings"
            className="btn-ghost flex items-center gap-1.5 text-xs font-semibold text-green-dark border border-cream-2 shadow-xs px-3.5 py-2 rounded-xl hover:bg-cream transition"
          >
            ← Back to Listings
          </Link>
          <Link
            href="/admin/amenities"
            className="btn-ghost flex items-center gap-1.5 text-xs font-semibold text-green-dark border border-cream-2 shadow-xs px-3.5 py-2 rounded-xl hover:bg-cream transition"
          >
            ← Back to Amenities
          </Link>
          <Link
            href="/admin/residents"
            className="btn-ghost flex items-center gap-1.5 text-xs font-semibold text-green-dark border border-cream-2 shadow-xs px-3.5 py-2 rounded-xl hover:bg-cream transition"
          >
            ← Back to Residents
          </Link>
          <Link
            href="/admin/reservations"
            className="btn-ghost flex items-center gap-1.5 text-xs font-semibold text-green-dark border border-cream-2 shadow-xs px-3.5 py-2 rounded-xl hover:bg-cream transition"
          >
            ← Back to Reservations
          </Link>
        </div>
      </div>

      {/* ── Archive Sub-Tabs ──────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("listings")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
            activeTab === "listings"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-cream/80 text-amber-900 border border-amber-200/60 hover:bg-amber-100/50"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>House Listings Archive ({listings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("amenities")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
            activeTab === "amenities"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-cream/80 text-amber-900 border border-amber-200/60 hover:bg-amber-100/50"
          }`}
        >
          <Waves className="h-4 w-4" />
          <span>Amenities Archive ({amenities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("residents")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
            activeTab === "residents"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-cream/80 text-amber-900 border border-amber-200/60 hover:bg-amber-100/50"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Residents Archive ({residents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("reservations")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
            activeTab === "reservations"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-cream/80 text-amber-900 border border-amber-200/60 hover:bg-amber-100/50"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span>Reservations Archive ({reservations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("dues")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
            activeTab === "dues"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-cream/80 text-amber-900 border border-amber-200/60 hover:bg-amber-100/50"
          }`}
        >
          <Coins className="h-4 w-4" />
          <span>Monthly Dues Archive ({dues.length})</span>
        </button>

        <Link
          href="/admin/payments?tab=archive"
          className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100"
        >
          <CreditCard className="h-4 w-4 text-emerald-700" />
          <span>Payment Archive →</span>
        </Link>
      </div>

      {/* ── Notifications ─────────────────────────────────────────── */}
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

      {/* ── HOUSE LISTINGS ARCHIVE ─────────────────────────────────── */}
      {activeTab === "listings" && (
        <div>
          {loadingListings ? (
            <div className="py-20 text-center text-muted">
              <Archive className="mx-auto h-8 w-8 mb-3 text-amber-300 animate-pulse" />
              <p className="text-xs">Loading archived listings…</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50/30 p-16 text-center">
              <Box className="mx-auto mb-3 h-12 w-12 text-amber-300" />
              <p className="font-serif text-lg font-semibold text-amber-800">No archived listings</p>
              <p className="mt-1 text-xs text-muted max-w-sm">
                Properties archived from the Listings Admin panel will appear here. You can restore them anytime.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted">
                {listings.length} archived {listings.length === 1 ? "property listing" : "property listings"}
              </p>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((l) => {
                  const cover =
                    l.images && l.images[0]
                      ? l.images[0]
                      : "https://picsum.photos/seed/" + l.id + "/400/300";

                  return (
                    <div
                      key={l.id}
                      className="flex flex-col justify-between overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-xs opacity-90 transition hover:opacity-100 hover:shadow-md"
                    >
                      <div>
                        {/* Image with overlay */}
                        <div
                          className="relative h-44 w-full bg-cover bg-center border-b border-amber-100 bg-cream"
                          style={{ backgroundImage: `url(${cover})` }}
                        >
                          <div className="absolute inset-0 bg-amber-950/40 flex items-center justify-center">
                            <span className="flex items-center gap-1.5 rounded-full bg-amber-700/90 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow-sm">
                              <Archive className="h-3.5 w-3.5" /> Archived
                            </span>
                          </div>

                          <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
                            {formatPHP(l.price)}
                            {l.listingType === "rent" && <span className="text-[10px] font-normal">/mo</span>}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-4 space-y-3">
                          <div>
                            <h3 className="font-serif text-base font-bold text-green-dark line-clamp-1">
                              {l.houseName}
                            </h3>
                            <p className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 text-green-mid flex-shrink-0" />
                              <span className="truncate">
                                {l.address || `Blk ${l.blockNo} Lot ${l.lotNo}, Mabuhay Homes`}
                              </span>
                            </p>
                          </div>

                          {/* Owner & Archive Reason */}
                          <div className="rounded-xl bg-amber-50/70 border border-amber-200/50 p-3 text-[11px] space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-muted">Owner:</span>
                              <strong className="text-green-dark">{l.ownerName || "Resident"}</strong>
                            </div>
                            {l.archiveReason && (
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-muted flex-shrink-0">Reason:</span>
                                <span className="font-semibold text-amber-800 text-right">
                                  {l.archiveReason}
                                </span>
                              </div>
                            )}
                            {l.archivedAt && (
                              <div className="flex justify-between text-[10px] text-muted border-t border-amber-200/40 pt-1">
                                <span>Archived on:</span>
                                <span>{new Date(l.archivedAt).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="border-t border-amber-100 bg-amber-50/30 p-3">
                        <button
                          type="button"
                          onClick={() => setRestoreListingTarget(l)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-2xs transition hover:bg-amber-100 hover:text-amber-900"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5 text-amber-600" />
                          <span>Restore Listing</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AMENITIES ARCHIVE ──────────────────────────────────────── */}
      {activeTab === "amenities" && (
        <div>
          {loadingAmenities ? (
            <div className="py-20 text-center text-muted">
              <Archive className="mx-auto h-8 w-8 mb-3 text-amber-300 animate-pulse" />
              <p className="text-xs">Loading archived amenities…</p>
            </div>
          ) : amenities.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50/30 p-16 text-center">
              <Box className="mx-auto mb-3 h-12 w-12 text-amber-300" />
              <p className="font-serif text-lg font-semibold text-amber-800">No archived amenities</p>
              <p className="mt-1 text-xs text-muted max-w-sm">
                Amenities you archive will appear here. They can be restored at any time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted">
                {amenities.length} archived {amenities.length === 1 ? "amenity" : "amenities"}
              </p>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {amenities.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-xs opacity-90 transition hover:opacity-100 hover:shadow-md"
                  >
                    <div>
                      {/* Image with overlay */}
                      <div
                        className="relative h-44 w-full bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${a.image || "https://picsum.photos/seed/amenity/800/600"})`,
                        }}
                      >
                        <div className="absolute inset-0 bg-amber-950/40 flex items-center justify-center">
                          <span className="flex items-center gap-1.5 rounded-full bg-amber-700/90 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow-sm">
                            <Archive className="h-3.5 w-3.5" /> Archived
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-serif text-base font-bold text-green-dark">{a.name}</h3>
                          <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                            <Users className="h-3.5 w-3.5 text-green-mid" /> {a.maxCapacity} pax
                          </span>
                        </div>

                        <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                          {a.description || "No description provided."}
                        </p>

                        <div className="space-y-1 rounded-xl border border-cream-2 bg-cream/40 p-2.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted">Public (Walk-in):</span>
                            <strong className="text-green-dark">{formatPHP(a.rateWalkin)} / head</strong>
                          </div>
                          <div className="flex justify-between border-t border-cream-2 pt-1">
                            <span className="text-muted">Private Flat Rate:</span>
                            <strong className="text-green-mid">{formatPHP(a.ratePrivate)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="border-t border-amber-100 bg-amber-50/30 p-3">
                      <button
                        type="button"
                        onClick={() => setRestoreAmenityTarget(a)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-2xs transition hover:bg-amber-100"
                      >
                        <ArchiveRestore className="h-3.5 w-3.5 text-amber-600" />
                        <span>Restore Amenity</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RESIDENTS ARCHIVE ──────────────────────────────────────── */}
      {activeTab === "residents" && (
        <div>
          {loadingResidents ? (
            <div className="py-20 text-center text-muted">
              <Archive className="mx-auto h-8 w-8 mb-3 text-amber-300 animate-pulse" />
              <p className="text-xs">Loading archived residents…</p>
            </div>
          ) : residents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50/30 p-16 text-center">
              <Box className="mx-auto mb-3 h-12 w-12 text-amber-300" />
              <p className="font-serif text-lg font-semibold text-amber-800">No archived residents</p>
              <p className="mt-1 text-xs text-muted max-w-sm">
                Residents archived from the Residents Admin panel will appear here. Their dues, payments, and reservations history is always preserved.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted">
                {residents.length} archived {residents.length === 1 ? "resident" : "residents"}
              </p>

              {/* Table */}
              <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-amber-100 bg-amber-50/60 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                      <tr>
                        <th className="px-4 py-3.5">Name</th>
                        <th className="px-4 py-3.5">Email</th>
                        <th className="px-4 py-3.5">Role</th>
                        <th className="px-4 py-3.5">Block / Lot</th>
                        <th className="px-4 py-3.5">Archived On</th>
                        <th className="px-4 py-3.5">Reason</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-50">
                      {residents.map((r) => (
                        <tr key={r.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-green-dark whitespace-nowrap">
                            {r.fullName}
                          </td>
                          <td className="px-4 py-3.5 text-muted whitespace-nowrap">{r.email}</td>
                          <td className="px-4 py-3.5 capitalize text-green-deep whitespace-nowrap">
                            {r.role.replace("_", " ")}
                          </td>
                          <td className="px-4 py-3.5 text-muted whitespace-nowrap">
                            {r.blockNo || r.lotNo
                              ? `${r.blockNo ?? "—"} / ${r.lotNo ?? "—"}`
                              : "/"}
                          </td>
                          <td className="px-4 py-3.5 text-muted whitespace-nowrap">
                            {r.archivedAt
                              ? new Date(r.archivedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "2-digit",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3.5 max-w-[200px]">
                            <span className="text-amber-700 truncate block">
                              {r.archiveReason || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                title="Restore Resident"
                                onClick={() => setRestoreResidentTarget(r)}
                                className="flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 shadow-2xs transition hover:bg-amber-100"
                              >
                                <ArchiveRestore className="h-3.5 w-3.5 text-amber-600" />
                                Restore
                              </button>
                              <button
                                type="button"
                                title="Delete Permanently"
                                onClick={() => setDeleteResidentTarget(r)}
                                className="flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 shadow-2xs transition hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RESERVATIONS ARCHIVE ─────────────────────────────────────── */}
      {activeTab === "reservations" && (
        <div>
          {loadingReservations ? (
            <div className="py-20 text-center text-muted">
              <Archive className="mx-auto h-8 w-8 mb-3 text-amber-300 animate-pulse" />
              <p className="text-xs">Loading archived reservations…</p>
            </div>
          ) : reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50/30 p-16 text-center">
              <Box className="mx-auto mb-3 h-12 w-12 text-amber-300" />
              <p className="font-serif text-lg font-semibold text-amber-800">No archived reservations</p>
              <p className="mt-1 text-xs text-muted max-w-sm">
                Reservations archived from the Reservations Admin panel will appear here. Their dues, payments, and reservations history is always preserved.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search & Status Filter */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-muted">
                  {filteredReservations.length} archived {filteredReservations.length === 1 ? "reservation" : "reservations"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search resident, amenity, date..."
                      value={resSearch}
                      onChange={(e) => setResSearch(e.target.value)}
                      className="rounded-xl border border-amber-200/80 bg-white px-3 py-1.5 text-xs text-green-dark outline-none focus:border-amber-500 w-56 shadow-2xs"
                    />
                  </div>
                  <select
                    value={resStatusFilter}
                    onChange={(e) => setResStatusFilter(e.target.value)}
                    className="rounded-xl border border-amber-200/80 bg-white px-3 py-1.5 text-xs text-green-dark outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                  >
                    <option value="all">Status: All</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-amber-100 bg-amber-50/60 text-[11px] font-bold uppercase tracking-wider text-amber-900/80">
                        <th className="px-4 py-3.5">Guest / Resident</th>
                        <th className="px-4 py-3.5">Amenity</th>
                        <th className="px-4 py-3.5">Type</th>
                        <th className="px-4 py-3.5">Date</th>
                        <th className="px-4 py-3.5">Session</th>
                        <th className="px-4 py-3.5 text-center">Pax</th>
                        <th className="px-4 py-3.5">Downpayment</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5">Archived On</th>
                        <th className="px-4 py-3.5">Reason</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100/60">
                      {filteredReservations.map((r) => (
                        <tr key={r.id} className="hover:bg-amber-50/30 transition">
                          <td className="px-4 py-3.5 font-medium text-green-dark">
                            <div>{r.residentName}</div>
                            {r.userEmail && <div className="text-[10px] text-muted">{r.userEmail}</div>}
                          </td>
                          <td className="px-4 py-3.5 text-green-dark font-semibold">
                            {r.amenityName}
                          </td>
                          <td className="px-4 py-3.5 capitalize">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              r.reservationType === "private"
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                              {r.reservationType}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-green-dark whitespace-nowrap">
                            {r.date}
                          </td>
                          <td className="px-4 py-3.5 capitalize text-muted">
                            {r.bookingType}
                          </td>
                          <td className="px-4 py-3.5 text-center">{r.paxCount}</td>
                          <td className="px-4 py-3.5 font-bold text-green-mid whitespace-nowrap">
                            {formatPHP(r.downpayment)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${
                              r.status === "approved"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : r.status === "declined"
                                ? "bg-rose-100 text-rose-700 border-rose-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-muted whitespace-nowrap text-[11px]">
                            {r.archivedAt
                              ? new Date(r.archivedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "2-digit",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3.5 max-w-[160px]">
                            <span className="text-amber-800 truncate block text-[11px]" title={r.archiveReason || ""}>
                              {r.archiveReason || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                title="View Details"
                                onClick={() => setViewReservationTarget(r)}
                                className="flex items-center gap-1 rounded-lg border border-cream-2 bg-white px-2 py-1.5 text-[11px] font-semibold text-green-dark shadow-2xs transition hover:bg-cream"
                              >
                                <Eye className="h-3.5 w-3.5 text-green-mid" />
                                View
                              </button>
                              <button
                                type="button"
                                title="Restore Reservation"
                                onClick={() => setRestoreReservationTarget(r)}
                                className="flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-amber-800 shadow-2xs transition hover:bg-amber-100"
                              >
                                <ArchiveRestore className="h-3.5 w-3.5 text-amber-600" />
                                Restore
                              </button>
                              <button
                                type="button"
                                title="Delete Permanently"
                                onClick={() => setDeleteReservationTarget(r)}
                                className="flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-rose-600 shadow-2xs transition hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MONTHLY DUES ARCHIVE ─────────────────────────────────────── */}
      {activeTab === "dues" && (
        <div>
          {loadingDues ? (
            <div className="py-20 text-center text-muted">
              <Archive className="mx-auto h-8 w-8 mb-3 text-amber-300 animate-pulse" />
              <p className="text-xs">Loading archived monthly dues…</p>
            </div>
          ) : dues.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50/30 p-16 text-center">
              <Box className="mx-auto mb-3 h-12 w-12 text-amber-300" />
              <p className="font-serif text-lg font-semibold text-amber-800">No archived monthly dues</p>
              <p className="mt-1 text-xs text-muted max-w-sm">
                Dues archived from the Monthly Dues ledger will appear here. You can restore them anytime.
              </p>
              <Link
                href="/admin/dues"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-amber-800 shadow-2xs hover:bg-amber-100 transition"
              >
                Go to Active Dues Ledger →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header / Search & Bulk Actions */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-muted">
                    {filteredDues.length} archived {filteredDues.length === 1 ? "due record" : "due records"}
                  </p>
                  {selectedDueIds.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                      {selectedDueIds.length} selected
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedDueIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkRestoreDues}
                      disabled={restoringDue}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 transition cursor-pointer"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      {restoringDue ? "Restoring..." : `Restore Selected (${selectedDueIds.length})`}
                    </button>
                  )}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search resident, unit, month..."
                      value={duesSearch}
                      onChange={(e) => setDuesSearch(e.target.value)}
                      className="rounded-xl border border-amber-200/80 bg-white px-3 py-1.5 text-xs text-green-dark outline-none focus:border-amber-500 w-56 shadow-2xs"
                    />
                  </div>
                  <Link
                    href="/admin/dues"
                    className="flex items-center gap-1 rounded-xl border border-cream-2 bg-white px-3 py-1.5 text-xs font-semibold text-green-dark shadow-2xs hover:bg-cream transition"
                  >
                    Open Dues Ledger →
                  </Link>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-amber-100 bg-amber-50/60 text-[11px] font-bold uppercase tracking-wider text-amber-900/80">
                        <th className="p-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredDues.length > 0 &&
                              filteredDues.every((d) => selectedDueIds.includes(d.id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDueIds(Array.from(new Set([...selectedDueIds, ...filteredDues.map((d) => d.id)])));
                              } else {
                                const currentIds = new Set(filteredDues.map((d) => d.id));
                                setSelectedDueIds(selectedDueIds.filter((id) => !currentIds.has(id)));
                              }
                            }}
                            className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3.5">Resident</th>
                        <th className="px-4 py-3.5">Unit / Block</th>
                        <th className="px-4 py-3.5">Due Month</th>
                        <th className="px-4 py-3.5">Amount Due</th>
                        <th className="px-4 py-3.5">Amount Paid</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5">Archived On</th>
                        <th className="px-4 py-3.5">Reason</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100/60">
                      {filteredDues.map((d) => (
                        <tr key={d.id} className="hover:bg-amber-50/30 transition">
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={selectedDueIds.includes(d.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedDueIds((prev) =>
                                  prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]
                                );
                              }}
                              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3.5 font-bold text-green-dark whitespace-nowrap">
                            {d.residentName}
                          </td>
                          <td className="px-4 py-3.5 text-muted whitespace-nowrap">
                            {d.blockNo || d.lotNo ? `${d.blockNo || "—"} / ${d.lotNo || "—"}` : "—"}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-green-dark whitespace-nowrap">
                            {d.dueMonth}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-green-dark whitespace-nowrap">
                            {formatPHP(d.amountDue)}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-green-mid whitespace-nowrap">
                            {formatPHP(d.amountPaid)}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize bg-gray-100 text-gray-700">
                              {d.status || "unpaid"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-muted whitespace-nowrap text-[11px]">
                            {d.archivedAt
                              ? new Date(d.archivedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "2-digit",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3.5 max-w-[160px]">
                            <span className="text-amber-800 truncate block text-[11px]" title={d.archiveReason || ""}>
                              {d.archiveReason || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              title="Restore Dues Record"
                              onClick={() => setRestoreDueTarget(d)}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 shadow-2xs transition hover:bg-amber-100 cursor-pointer"
                            >
                              <ArchiveRestore className="h-3.5 w-3.5 text-amber-600" />
                              Restore
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RESTORE DUE MODAL ────────────────────────────────────────── */}
      {restoreDueTarget && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => !restoringDue && setRestoreDueTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-light/20">
                <ArchiveRestore className="h-5 w-5 text-green-mid" />
              </span>
              <h3 className="font-serif text-lg font-bold text-green-dark">Restore Dues Record?</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Restore monthly dues for <strong>{restoreDueTarget.residentName}</strong> ({restoreDueTarget.dueMonth})? This will return it to the active dues ledger.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setRestoreDueTarget(null)}
                disabled={restoringDue}
                className="btn-ghost flex-1 justify-center !py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRestoreDue(restoreDueTarget)}
                disabled={restoringDue}
                className="flex-1 rounded-xl bg-green-mid px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-dark disabled:opacity-60 transition cursor-pointer"
              >
                {restoringDue ? "Restoring…" : "Yes, Restore"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESTORE LISTING MODAL ───────────────────────────────────── */}
      {restoreListingTarget && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => !restoringListing && setRestoreListingTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-light/20">
                <ArchiveRestore className="h-5 w-5 text-green-mid" />
              </span>
              <h3 className="font-serif text-lg font-bold text-green-dark">Restore Listing?</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Restoring <strong>&ldquo;{restoreListingTarget.houseName}&rdquo;</strong> will make it visible to residents and non-residents in the active community listings again.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setRestoreListingTarget(null)}
                disabled={restoringListing}
                className="btn-ghost flex-1 justify-center !py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRestoreListing(restoreListingTarget)}
                disabled={restoringListing}
                className="flex-1 rounded-xl bg-green-mid px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-dark disabled:opacity-60 transition"
              >
                {restoringListing ? "Restoring…" : "Yes, Restore"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESTORE AMENITY MODAL ───────────────────────────────────── */}
      {restoreAmenityTarget && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => !restoringAmenity && setRestoreAmenityTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-light/20">
                <ArchiveRestore className="h-5 w-5 text-green-mid" />
              </span>
              <h3 className="font-serif text-lg font-bold text-green-dark">Restore Amenity?</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Restoring <strong>&ldquo;{restoreAmenityTarget.name}&rdquo;</strong> will make it visible to residents again and available for reservations.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setRestoreAmenityTarget(null)}
                disabled={restoringAmenity}
                className="btn-ghost flex-1 justify-center !py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRestoreAmenity(restoreAmenityTarget)}
                disabled={restoringAmenity}
                className="flex-1 rounded-xl bg-green-mid px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-dark disabled:opacity-60 transition"
              >
                {restoringAmenity ? "Restoring…" : "Yes, Restore"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESTORE RESIDENT MODAL ──────────────────────────────────── */}
      {restoreResidentTarget && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => !restoringResident && setRestoreResidentTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-light/20">
                <ArchiveRestore className="h-5 w-5 text-green-mid" />
              </span>
              <h3 className="font-serif text-lg font-bold text-green-dark">Restore Resident?</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              <strong>{restoreResidentTarget.fullName}</strong> will be moved back to the active Residents list. Their status will be set to <strong>Active</strong>.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setRestoreResidentTarget(null)}
                disabled={restoringResident}
                className="btn-ghost flex-1 justify-center !py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRestoreResident(restoreResidentTarget)}
                disabled={restoringResident}
                className="flex-1 rounded-xl bg-green-mid px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-dark disabled:opacity-60 transition"
              >
                {restoringResident ? "Restoring…" : "Restore Resident"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE RESIDENT PERMANENTLY MODAL ──────────────────────── */}
      {deleteResidentTarget && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => !deletingResident && setDeleteResidentTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </span>
              <h3 className="font-serif text-lg font-bold text-rose-700">Delete Permanently?</h3>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 leading-relaxed mb-3">
              ⚠️ This action <strong>cannot be undone</strong>. The resident record for{" "}
              <strong>{deleteResidentTarget.fullName}</strong> will be permanently deleted from the database.
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Only use this for duplicate accounts or records created by mistake. Historical dues, payments, and reservations will remain for data integrity.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteResidentTarget(null)}
                disabled={deletingResident}
                className="btn-ghost flex-1 justify-center !py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteResident(deleteResidentTarget)}
                disabled={deletingResident}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60 transition"
              >
                {deletingResident ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── RESTORE RESERVATION MODAL ───────────────────────────────── */}
      {restoreReservationTarget && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => !restoringReservation && setRestoreReservationTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-light/20">
                <ArchiveRestore className="h-5 w-5 text-green-mid" />
              </span>
              <h3 className="font-serif text-lg font-bold text-green-dark">Restore Reservation?</h3>
            </div>
            <div className="rounded-xl border border-cream-2 bg-cream/30 p-3 mb-3 text-xs space-y-1 text-green-dark">
              <div><strong>Reservation:</strong> #{restoreReservationTarget.id}</div>
              <div><strong>Resident:</strong> {restoreReservationTarget.residentName}</div>
              <div><strong>Amenity:</strong> {restoreReservationTarget.amenityName}</div>
              <div><strong>Date & Session:</strong> {restoreReservationTarget.date} ({restoreReservationTarget.bookingType})</div>
              <div><strong>Status:</strong> <span className="capitalize font-semibold">{restoreReservationTarget.status}</span></div>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Restoring will return this reservation to the active Reservations list. The system will verify that the amenity slot is available and prevent double booking if already occupied.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setRestoreReservationTarget(null)}
                disabled={restoringReservation}
                className="btn-ghost flex-1 justify-center !py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRestoreReservation(restoreReservationTarget)}
                disabled={restoringReservation}
                className="flex-1 rounded-xl bg-green-mid px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-dark disabled:opacity-60 transition"
              >
                {restoringReservation ? "Restoring…" : "Restore"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE RESERVATION PERMANENTLY MODAL ────────────────────── */}
      {deleteReservationTarget && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => !deletingReservation && setDeleteReservationTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </span>
              <h3 className="font-serif text-lg font-bold text-rose-700">Delete Permanently?</h3>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 leading-relaxed mb-3">
              ⚠️ This action <strong>cannot be undone</strong>. The archived reservation record for{" "}
              <strong>{deleteReservationTarget.residentName}</strong> ({deleteReservationTarget.amenityName} on {deleteReservationTarget.date}) will be permanently deleted.
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Historical dues and financial payment records will remain safely preserved for audit compliance.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteReservationTarget(null)}
                disabled={deletingReservation}
                className="btn-ghost flex-1 justify-center !py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteReservation(deleteReservationTarget)}
                disabled={deletingReservation}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60 transition"
              >
                {deletingReservation ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW RESERVATION DETAILS MODAL ─────────────────────────── */}
      {viewReservationTarget && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setViewReservationTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-cream-2 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cream-2 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-green-mid" />
                <h3 className="font-serif text-lg font-bold text-green-dark">Archived Reservation Details</h3>
              </div>
              <button
                onClick={() => setViewReservationTarget(null)}
                className="rounded-lg p-1 text-muted hover:bg-cream"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-cream-2 bg-cream/30 p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted">Reservation ID</span>
                  <span className="font-bold text-green-dark">#{viewReservationTarget.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Guest / Resident</span>
                  <span className="font-semibold text-green-dark">{viewReservationTarget.residentName}</span>
                </div>
                {viewReservationTarget.userEmail && (
                  <div className="flex justify-between">
                    <span className="text-muted">Email</span>
                    <span className="text-green-dark">{viewReservationTarget.userEmail}</span>
                  </div>
                )}
                {viewReservationTarget.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted">Phone</span>
                    <span className="text-green-dark">{viewReservationTarget.phone}</span>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-cream-2 bg-cream/30 p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted">Amenity</span>
                  <span className="font-semibold text-green-dark">{viewReservationTarget.amenityName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Date & Session</span>
                  <span className="font-semibold text-green-dark">{viewReservationTarget.date} ({viewReservationTarget.bookingType})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Booking Type</span>
                  <span className="capitalize text-green-dark">{viewReservationTarget.reservationType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Pax Count</span>
                  <span className="text-green-dark">{viewReservationTarget.paxCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Downpayment</span>
                  <span className="font-bold text-green-mid">{formatPHP(viewReservationTarget.downpayment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Payment Method</span>
                  <span className="text-green-dark">{viewReservationTarget.gcashRef ? `GCash (${viewReservationTarget.gcashRef})` : "Cash"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Reservation Status</span>
                  <span className="capitalize font-bold text-green-dark">{viewReservationTarget.status}</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2 text-amber-900">
                <div className="flex justify-between">
                  <span className="font-medium text-amber-700">Archived At</span>
                  <span>{viewReservationTarget.archivedAt ? new Date(viewReservationTarget.archivedAt).toLocaleString() : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-amber-700">Archive Reason</span>
                  <span>{viewReservationTarget.archiveReason || "—"}</span>
                </div>
              </div>

              {viewReservationTarget.receiptPath && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1">
                    <ReceiptText className="h-3.5 w-3.5" /> Receipt / Payment Proof
                  </div>
                  <div className="rounded-xl border border-cream-2 overflow-hidden bg-cream/20">
                    <img
                      src={viewReservationTarget.receiptPath}
                      alt="Receipt"
                      className="max-h-48 w-full object-cover object-top"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setViewReservationTarget(null)}
                className="rounded-xl border border-cream-2 px-5 py-2 text-xs font-semibold text-green-dark hover:bg-cream transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
