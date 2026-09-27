"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  FileText,
  Building2,
  User,
  Plus,
  Archive,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  Trash2,
  Eye,
  X,
  Info,
  Check,
  Ban,
  ArrowUpDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPHP, type HouseListing, type VerificationStatus } from "@/lib/mock-data";

type Tab = "pending" | "all" | "verified" | "rejected";
type SortField = "property" | "owner" | "status" | "date";
type SortDir = "asc" | "desc";

// Helper to get initials from a full name (e.g., "Juan Dela Cruz" -> "JD")
function getInitials(name?: string): string {
  if (!name) return "HO";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Helper to format ISO or mock date string to "Apr 12, 2025"
function formatDate(dateStr?: string, fallbackId = 1): string {
  if (dateStr) {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch {
      // fallback
    }
  }
  // Deterministic realistic date if no timestamp exists
  const baseDate = new Date(2025, 3, 12 - (fallbackId % 10));
  return baseDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DocThumbnail({ url }: { url: string }) {
  const filename = url.split("/").pop() || "Document.pdf";
  const isPdf = filename.toLowerCase().endsWith(".pdf");
  const isImg = /\.(jpg|jpeg|png|webp)$/i.test(filename);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center justify-between rounded-xl border border-cream-2 bg-cream/50 p-3 text-center transition hover:border-green-mid hover:bg-white hover:shadow-sm"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white shadow-xs group-hover:scale-105 transition overflow-hidden">
        {isPdf ? (
          <div className="flex flex-col items-center">
            <FileText className="h-7 w-7 text-danger" />
            <span className="text-[9px] font-bold uppercase text-danger">PDF</span>
          </div>
        ) : isImg ? (
          <div
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${url})` }}
          />
        ) : (
          <FileText className="h-7 w-7 text-green-mid" />
        )}
      </div>
      <div className="mt-2 w-28 truncate text-[11px] font-semibold text-green-dark group-hover:text-green-mid">
        {filename}
      </div>
      <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted">
        View <ExternalLink className="h-2.5 w-2.5" />
      </span>
    </a>
  );
}

export default function AdminListingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("verified");
  const [allListings, setAllListings] = useState<HouseListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Actions dropdown open ID
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  // Archive Modal State
  const [archiveTarget, setArchiveTarget] = useState<HouseListing | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveBusy, setArchiveBusy] = useState(false);

  // View Docs Modal State
  const [docsModalListing, setDocsModalListing] = useState<HouseListing | null>(null);

  // Reject / Reason Modal State
  const [rejectTarget, setRejectTarget] = useState<HouseListing | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectBusy, setRejectBusy] = useState(false);

  // Busy action IDs
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);

  const isHowa = user?.role === "admin" || user?.role === "counselor";

  const loadListings = () => {
    setLoading(true);
    api
      .listings()
      .then((data) => {
        setAllListings(data || []);
      })
      .catch(() => setAllListings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadListings();
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Filter lists
  const pending = allListings.filter((l) => l.verificationStatus === "pending");
  const verified = allListings.filter(
    (l) => (l.verificationStatus ?? "verified") === "verified"
  );
  const rejected = allListings.filter((l) => l.verificationStatus === "rejected");

  const getActiveList = () => {
    switch (tab) {
      case "pending":
        return pending;
      case "verified":
        return verified;
      case "rejected":
        return rejected;
      case "all":
      default:
        return allListings;
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedList = [...getActiveList()].sort((a, b) => {
    let result = 0;
    if (sortField === "property") {
      result = (a.houseName || "").localeCompare(b.houseName || "");
    } else if (sortField === "owner") {
      result = (a.ownerName || "").localeCompare(b.ownerName || "");
    } else if (sortField === "status") {
      result = (a.verificationStatus || "").localeCompare(b.verificationStatus || "");
    } else if (sortField === "date") {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
      result = dateA - dateB;
    }
    return sortDir === "asc" ? result : -result;
  });

  // Action: Toggle Off Market / Available
  const handleToggleMarketStatus = async (listing: HouseListing) => {
    const nextStatus = listing.status === "off_market" ? "available" : "off_market";
    setActionBusyId(listing.id);
    try {
      await api.listingUpdate(listing.id, { status: nextStatus });
      setMsg({
        type: "success",
        text: `"${listing.houseName}" marked as ${nextStatus === "off_market" ? "No Longer on Market" : "Available"}.`,
      });
      loadListings();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update listing status.",
      });
    } finally {
      setActionBusyId(null);
    }
  };

  // Action: Approve Listing
  const handleApprove = async (listing: HouseListing) => {
    setActionBusyId(listing.id);
    try {
      await api.reviewListing(listing.id, "approve");
      setMsg({
        type: "success",
        text: `"${listing.houseName}" has been verified and published to the live feed!`,
      });
      loadListings();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to approve listing.",
      });
    } finally {
      setActionBusyId(null);
    }
  };

  // Action: Confirm Reject
  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setMsg({ type: "error", text: "Please enter a reason for rejecting this listing." });
      return;
    }
    setRejectBusy(true);
    try {
      await api.reviewListing(rejectTarget.id, "reject", rejectReason.trim());
      setMsg({
        type: "success",
        text: `Listing "${rejectTarget.houseName}" has been rejected.`,
      });
      setRejectTarget(null);
      setRejectReason("");
      loadListings();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to reject listing.",
      });
    } finally {
      setRejectBusy(false);
    }
  };

  // Action: Confirm Archive
  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    if (!archiveReason.trim()) {
      setMsg({ type: "error", text: "Please select a reason for archiving." });
      return;
    }
    setArchiveBusy(true);
    try {
      await api.listingArchive(archiveTarget.id, archiveReason);
      setMsg({
        type: "success",
        text: `"${archiveTarget.houseName}" moved to Archive. You can view or restore it in the Archive panel.`,
      });
      setArchiveTarget(null);
      setArchiveReason("");
      loadListings();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to archive listing.",
      });
    } finally {
      setArchiveBusy(false);
    }
  };

  // Action: Delete Listing
  const handleDelete = async (listing: HouseListing) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete "${listing.houseName}" (Block ${listing.blockNo}, Lot ${listing.lotNo})? This action cannot be undone.`
      )
    ) {
      return;
    }
    setActionBusyId(listing.id);
    try {
      await api.listingDelete(listing.id);
      setMsg({
        type: "success",
        text: `Listing "${listing.houseName}" has been deleted.`,
      });
      loadListings();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete listing.",
      });
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="relative pb-16">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-green-dark tracking-tight">
            Listings &amp; Ownership Verification
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Review submitted proof documents and manage live community listings.
          </p>
        </div>
        <Link
          href="/add-listing"
          className="btn-green !text-white flex items-center gap-1.5 text-xs font-semibold shadow-xs"
        >
          <Plus className="h-4 w-4" /> Add Listing
        </Link>
      </div>

      {/* ── Notifications ─────────────────────────────────────────── */}
      {msg && (
        <div
          className={`mb-5 flex items-center justify-between rounded-xl border p-3.5 text-xs font-semibold ${
            msg.type === "success"
              ? "border-green-light/40 bg-green-light/10 text-green-dark"
              : "border-danger/30 bg-danger-bg text-danger"
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-green-mid flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-danger flex-shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
          <button
            onClick={() => setMsg(null)}
            className="text-muted hover:text-green-dark text-xs"
          >
            &times;
          </button>
        </div>
      )}

      {/* ── Filter Tabs ───────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setTab("pending")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
            tab === "pending"
              ? "bg-green-dark text-white shadow-xs"
              : "bg-cream/70 text-green-dark border border-cream-2 hover:bg-cream"
          }`}
        >
          <span>Pending Review ({pending.length})</span>
        </button>

        <button
          onClick={() => setTab("all")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
            tab === "all"
              ? "bg-green-dark text-white shadow-xs"
              : "bg-cream/70 text-green-dark border border-cream-2 hover:bg-cream"
          }`}
        >
          <span>All Listings ({allListings.length})</span>
        </button>

        <button
          onClick={() => setTab("verified")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
            tab === "verified"
              ? "bg-green-dark text-white shadow-xs"
              : "bg-cream/70 text-green-dark border border-cream-2 hover:bg-cream"
          }`}
        >
          <span>Verified ({verified.length})</span>
        </button>

        <button
          onClick={() => setTab("rejected")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
            tab === "rejected"
              ? "bg-green-dark text-white shadow-xs"
              : "bg-cream/70 text-green-dark border border-cream-2 hover:bg-cream"
          }`}
        >
          <span>Rejected ({rejected.length})</span>
        </button>
      </div>

      {/* ── Subtitle / Description of Current Tab ──────────────────── */}
      <div className="mb-4">
        <h2 className="font-serif text-lg font-bold text-green-dark capitalize">
          {tab === "verified" && `Verified Listings (${verified.length})`}
          {tab === "all" && `All Listings (${allListings.length})`}
          {tab === "pending" && `Pending Review (${pending.length})`}
          {tab === "rejected" && `Rejected Listings (${rejected.length})`}
        </h2>
        <p className="text-xs text-muted">
          {tab === "verified" && "Listings that have been verified and are currently active."}
          {tab === "all" && "Complete list of community property submissions across all statuses."}
          {tab === "pending" && "Submitted listings awaiting HOA verification of ownership proof."}
          {tab === "rejected" && "Listings that did not pass ownership or documentation requirements."}
        </p>
      </div>

      {/* ── Listings Table ────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-cream-2 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAF8F3] border-b border-cream-2 text-[11px] font-semibold text-muted">
              <tr>
                <th
                  onClick={() => handleSort("property")}
                  className="p-4 cursor-pointer hover:text-green-dark select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Property</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("owner")}
                  className="p-4 cursor-pointer hover:text-green-dark select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Owner</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="p-4 cursor-pointer hover:text-green-dark select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("date")}
                  className="p-4 cursor-pointer hover:text-green-dark select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Listed On</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th className="p-4 text-left">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-2">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-muted">
                    <Clock className="mx-auto mb-2 h-6 w-6 text-green-mid animate-spin" />
                    <p>Loading listings…</p>
                  </td>
                </tr>
              ) : sortedList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-muted">
                    <Building2 className="mx-auto mb-2 h-10 w-10 text-muted/50" />
                    <p className="font-semibold text-green-dark text-sm">No listings found</p>
                    <p className="text-[11px] mt-0.5">There are no listings matching this filter category.</p>
                  </td>
                </tr>
              ) : (
                sortedList.map((l) => {
                  const cover =
                    l.images && l.images[0]
                      ? l.images[0]
                      : "https://picsum.photos/seed/" + l.id + "/400/300";
                  const initials = getInitials(l.ownerName);
                  const isOffMarket = l.status === "off_market";
                  const isPending = l.verificationStatus === "pending";
                  const isRejected = l.verificationStatus === "rejected";
                  const isVerified = (l.verificationStatus ?? "verified") === "verified";
                  const formattedDate = formatDate(l.createdAt, l.id);

                  return (
                    <tr
                      key={l.id}
                      className="hover:bg-cream/20 transition group"
                    >
                      {/* Property Column */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-12 w-16 flex-shrink-0 rounded-xl bg-cover bg-center border border-cream-2 shadow-xs bg-cream"
                            style={{ backgroundImage: `url(${cover})` }}
                          />
                          <div>
                            <div className="font-bold text-green-dark text-xs sm:text-sm group-hover:text-green-mid transition">
                              {l.houseName}
                            </div>
                            <div className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                              <span>
                                {l.address || `Blk ${l.blockNo} Lot ${l.lotNo}, Mabuhay Homes Phase 5`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner Column */}
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5D7285] text-white text-[11px] font-bold shadow-xs">
                            {initials}
                          </div>
                          <span className="font-medium text-green-dark text-xs">
                            {l.ownerName || "Resident"}
                          </span>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="p-4">
                        {isOffMarket ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-1 text-[11px] font-bold text-gray-700">
                            <Ban className="h-3 w-3 text-gray-500" /> Off Market
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-bg border border-danger/30 px-2.5 py-1 text-[11px] font-bold text-danger">
                            <XCircle className="h-3 w-3" /> Rejected
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 border border-gold/40 px-2.5 py-1 text-[11px] font-bold text-green-deep">
                            <Clock className="h-3 w-3 text-gold" /> Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-light/20 border border-green-light/40 px-2.5 py-1 text-[11px] font-bold text-green-dark">
                            <Check className="h-3 w-3 text-green-mid" /> Verified
                          </span>
                        )}
                      </td>

                      {/* Listed On Column */}
                      <td className="p-4 text-muted text-xs whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* Actions Column */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {/* Proof Documents Button (if present) */}
                          {l.proofDocuments && l.proofDocuments.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setDocsModalListing(l)}
                              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition shadow-2xs"
                              title="View uploaded proof of ownership documents"
                            >
                              <FileText className="h-3.5 w-3.5 text-amber-600" />
                              <span>Proof Docs ({l.proofDocuments.length})</span>
                            </button>
                          )}

                          {/* Direct Approve & Reject Buttons for Pending Listings */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                disabled={actionBusyId === l.id}
                                onClick={() => handleApprove(l)}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-[11px] font-bold shadow-xs transition disabled:opacity-50"
                                title="Approve listing and publish to live feed"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Approve Listing</span>
                              </button>

                              <button
                                type="button"
                                disabled={actionBusyId === l.id}
                                onClick={() => {
                                  setRejectTarget(l);
                                  setRejectReason("");
                                }}
                                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50"
                                title="Reject listing submission with reason"
                              >
                                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* Toggle Market Status for Verified/Off-Market listings */}
                          {!isPending && !isRejected && (
                            <button
                              type="button"
                              disabled={actionBusyId === l.id}
                              onClick={() => handleToggleMarketStatus(l)}
                              className="rounded-xl border border-cream-2 bg-white px-3 py-1.5 text-[11px] font-medium text-green-dark hover:bg-cream/60 transition shadow-2xs whitespace-nowrap"
                            >
                              {isOffMarket ? "Mark as Available" : "Mark as Off Market"}
                            </button>
                          )}

                          {/* Archive Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setArchiveTarget(l);
                              setArchiveReason("");
                            }}
                            className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3 py-1.5 text-[11px] font-medium text-green-dark hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 transition shadow-2xs"
                          >
                            <Archive className="h-3.5 w-3.5 text-muted" />
                            <span>Archive</span>
                          </button>

                          {/* More Options Dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === l.id ? null : l.id);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted hover:border-cream-2 hover:bg-cream/60 hover:text-green-dark transition"
                              title="More options"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {menuOpenId === l.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-9 z-[100] w-48 rounded-xl border border-cream-2 bg-white p-1.5 shadow-xl text-xs animate-in fade-in zoom-in-95 duration-100"
                              >
                                <Link
                                  href={`/house/${l.id}`}
                                  target="_blank"
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-green-dark hover:bg-cream text-left transition"
                                >
                                  <Eye className="h-3.5 w-3.5 text-muted" />
                                  View Public Page
                                </Link>

                                {l.proofDocuments && l.proofDocuments.length > 0 && (
                                  <button
                                    onClick={() => {
                                      setDocsModalListing(l);
                                      setMenuOpenId(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-green-dark hover:bg-cream text-left transition"
                                  >
                                    <FileText className="h-3.5 w-3.5 text-green-mid" />
                                    View Proof Documents
                                  </button>
                                )}

                                <div className="my-1 border-t border-cream-2" />

                                <button
                                  onClick={() => {
                                    handleDelete(l);
                                    setMenuOpenId(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-danger hover:bg-danger-bg text-left transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete Permanently
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary */}
        <div className="border-t border-cream-2 bg-cream/20 px-4 py-3 text-[11px] text-muted flex items-center justify-between">
          <span>
            Showing {sortedList.length} of {allListings.length} total listings
          </span>
          <span className="font-medium text-green-dark">
            Mabuhay Homes Phase 5 Verification Registry
          </span>
        </div>
      </div>

      {/* ── ARCHIVE MODAL / DRAWER (Matches Screenshot) ─────────────── */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-cream-2 bg-white p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-green-dark">
                  Archive Listing
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  This listing will be moved to the Archive and won&apos;t appear in the active community feed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                className="rounded-lg p-1 text-muted hover:bg-cream hover:text-green-dark transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Selected Property Preview Box */}
            <div className="flex items-center gap-3.5 rounded-xl border border-cream-2 bg-cream/30 p-3">
              <div
                className="h-14 w-18 flex-shrink-0 rounded-lg bg-cover bg-center border border-cream-2 bg-cream"
                style={{
                  backgroundImage: `url(${
                    archiveTarget.images && archiveTarget.images[0]
                      ? archiveTarget.images[0]
                      : "https://picsum.photos/seed/" + archiveTarget.id + "/400/300"
                  })`,
                }}
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-green-dark text-sm truncate">
                  {archiveTarget.houseName}
                </h4>
                <p className="text-[11px] text-muted truncate">
                  {archiveTarget.address || `Blk ${archiveTarget.blockNo} Lot ${archiveTarget.lotNo}, Mabuhay Homes`}
                </p>
                <p className="text-[11px] font-semibold text-green-mid mt-0.5">
                  {formatPHP(archiveTarget.price)}
                </p>
              </div>
            </div>

            {/* Archive Reason Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-green-dark flex items-center gap-1">
                Archive Reason <span className="text-danger">*</span>
              </label>
              <select
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="field text-xs bg-white"
              >
                <option value="">Select reason</option>
                <option value="Sold / Rented out">Sold / Rented out</option>
                <option value="Owner requested removal">Owner requested removal</option>
                <option value="Listing expired">Listing expired</option>
                <option value="Property no longer available">Property no longer available</option>
                <option value="Duplicate or Inactive listing">Duplicate or Inactive listing</option>
                <option value="Renovation / Off Market">Renovation / Off Market</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Info Callout */}
            <div className="flex items-center gap-2 rounded-xl bg-green-light/15 border border-green-light/30 p-3 text-xs text-green-dark">
              <Info className="h-4 w-4 text-green-mid flex-shrink-0" />
              <span>The listing will still be saved and can be restored if needed.</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={archiveBusy}
                onClick={() => setArchiveTarget(null)}
                className="flex-1 rounded-xl border border-cream-2 px-4 py-2.5 text-xs font-bold text-green-dark hover:bg-cream transition text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={archiveBusy || !archiveReason.trim()}
                onClick={handleConfirmArchive}
                className="flex-1 btn-green !py-2.5 text-xs font-bold text-white shadow-sm text-center disabled:opacity-50"
              >
                {archiveBusy ? "Archiving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECT REASON MODAL ─────────────────────────────────────── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-cream-2 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-danger">
                  Reject Listing Submission
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Provide feedback so the resident can correct and resubmit their documents.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-lg p-1 text-muted hover:bg-cream hover:text-green-dark transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-cream-2 bg-cream/30 p-3 text-xs">
              <strong className="text-green-dark">{rejectTarget.houseName}</strong>
              <div className="text-muted">Owner: {rejectTarget.ownerName}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-green-dark">
                Rejection Reason (Visible to resident) <span className="text-danger">*</span>
              </label>
              <textarea
                className="field min-h-24 text-xs"
                placeholder="E.g. 'Please upload a clearer copy of the Tax Declaration or Government ID'."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={rejectBusy}
                onClick={() => setRejectTarget(null)}
                className="flex-1 rounded-xl border border-cream-2 px-4 py-2.5 text-xs font-bold text-green-dark hover:bg-cream transition text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectBusy || !rejectReason.trim()}
                onClick={handleConfirmReject}
                className="flex-1 rounded-xl bg-danger px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition shadow-sm text-center disabled:opacity-50"
              >
                {rejectBusy ? "Rejecting…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROOF DOCUMENTS MODAL ───────────────────────────────────── */}
      {docsModalListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-cream-2 bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-cream-2 pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-green-dark">
                  Ownership Proof Documents
                </h3>
                <p className="text-xs text-muted">
                  {docsModalListing.houseName} &bull; Resident: <strong>{docsModalListing.ownerName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDocsModalListing(null)}
                className="rounded-lg p-1 text-muted hover:bg-cream hover:text-green-dark transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold text-green-dark uppercase tracking-wider">
                Attached Files ({docsModalListing.proofDocuments?.length || 0})
              </div>

              {!docsModalListing.proofDocuments || docsModalListing.proofDocuments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-cream-2 p-8 text-center text-xs text-muted">
                  No proof documents attached to this listing.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {docsModalListing.proofDocuments.map((doc, idx) => (
                    <DocThumbnail key={idx} url={doc} />
                  ))}
                </div>
              )}

              {docsModalListing.description && (
                <div className="rounded-xl bg-cream/40 p-3 text-xs text-muted mt-4">
                  <strong className="block text-green-dark mb-1">Description:</strong>
                  {docsModalListing.description}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-cream-2">
              <button
                type="button"
                onClick={() => setDocsModalListing(null)}
                className="btn-ghost text-xs px-4 py-2 font-semibold"
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
