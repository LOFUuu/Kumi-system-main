"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  FileText,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  HelpCircle,
  Trash2,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPHP, type HouseListing, type VerificationStatus } from "@/lib/mock-data";

type Tab = "pending" | "all" | "verified" | "rejected";

function DocThumbnail({ url }: { url: string }) {
  const filename = url.split("/").pop() || "Document.pdf";
  const isPdf = filename.toLowerCase().endsWith(".pdf");
  const isImg = /\.(jpg|jpeg|png)$/i.test(filename);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center justify-between rounded-xl border border-cream-2 bg-cream/50 p-3 text-center transition hover:border-green-mid hover:bg-white hover:shadow-sm"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white shadow-xs group-hover:scale-105 transition">
        {isPdf ? (
          <div className="flex flex-col items-center">
            <FileText className="h-7 w-7 text-danger" />
            <span className="text-[9px] font-bold uppercase text-danger">PDF</span>
          </div>
        ) : isImg ? (
          <div
            className="h-full w-full rounded-lg bg-cover bg-center"
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

function PendingReviewCard({
  listing,
  onReviewed,
}: {
  listing: HouseListing;
  onReviewed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [msg, setMsg] = useState("");

  const cover = listing.images && listing.images[0] ? listing.images[0] : "https://picsum.photos/seed/property/600/400";
  const docs = listing.proofDocuments || [];

  const handleApprove = async () => {
    setBusy(true);
    setMsg("");
    try {
      await api.reviewListing(listing.id, "approve");
      onReviewed();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Approval failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setMsg("Please provide a reason for rejecting the listing.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await api.reviewListing(listing.id, "reject", rejectReason.trim());
      onReviewed();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Rejection failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleRequestInfo = async () => {
    const reason = rejectReason.trim() || "Please upload clearer or additional proof of ownership documents.";
    setBusy(true);
    setMsg("");
    try {
      await api.reviewListing(listing.id, "reject", reason);
      onReviewed();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-cream-2 bg-white shadow-sm transition hover:shadow-md">
      {/* Header Info matching Section 3 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cream-2 bg-cream/40 p-5">
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-20 flex-shrink-0 rounded-xl bg-cover bg-center shadow-xs"
            style={{ backgroundImage: `url(${cover})` }}
          />
          <div>
            <h3 className="font-serif text-xl font-bold text-green-dark">
              {listing.houseName}
            </h3>
            <p className="text-xs text-muted">
              Block {listing.blockNo}, Lot {listing.lotNo}, Mabuhay Homes &bull; <strong className="text-green-dark">Resident: {listing.ownerName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-serif text-xl font-bold text-green-mid">
              {formatPHP(listing.price)}
              {listing.listingType === "rent" && <span className="text-xs font-normal text-muted">/mo</span>}
            </div>
            <span className="text-[11px] text-muted capitalize">{listing.listingType}</span>
          </div>
          <span className="rounded-full bg-gold/25 border border-gold/40 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-green-deep">
            Pending
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Uploaded Documents Gallery (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-green-dark">
                Uploaded Proof Documents ({docs.length})
              </span>
              <span className="text-[11px] text-muted">Click to view/verify</span>
            </div>

            {docs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-cream-2 p-6 text-center text-xs text-muted">
                No documents were attached to this submission.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {docs.map((d, i) => (
                  <DocThumbnail key={i} url={d} />
                ))}
              </div>
            )}

            {listing.description && (
              <div className="rounded-xl bg-cream/40 p-3 text-xs text-muted">
                <strong className="block text-green-dark mb-0.5">Description:</strong>
                {listing.description}
              </div>
            )}
          </div>

          {/* Resident Information Box */}
          <div className="rounded-xl border border-cream-2 bg-cream/30 p-4 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-green-dark block border-b border-cream-2 pb-1.5">
              Resident Information
            </span>

            <div className="space-y-1.5 text-xs">
              <div>
                <span className="text-muted block text-[10px] uppercase">Name</span>
                <strong className="text-green-dark">{listing.ownerName}</strong>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase">Registered Address</span>
                <span className="text-green-deep">Block {listing.blockNo}, Lot {listing.lotNo}, Phase 5</span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase">Specs</span>
                <span className="text-green-deep">{listing.bedrooms} Beds &bull; {listing.bathrooms} Baths &bull; {listing.sqm} sqm</span>
              </div>
            </div>
          </div>
        </div>

        {msg && (
          <div className="rounded-xl bg-danger-bg p-3 text-xs font-semibold text-danger">
            {msg}
          </div>
        )}

        {/* Verification Action Box matching Section 3 */}
        <div className="border-t border-cream-2 pt-4">
          <div className="mb-3">
            <label className="field-label">
              Rejection / Clarification Reason (Shown to resident if rejected)
            </label>
            <textarea
              className="field min-h-16 text-xs"
              placeholder="Enter reason for rejection or additional requirements (e.g. 'Please upload a clearer copy of your Tax Declaration')."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={handleApprove}
              className="btn-green flex items-center gap-2 !py-2.5 text-xs font-bold shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4" /> Approve Listing (Make Public)
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={handleReject}
              className="rounded-xl border border-danger/40 bg-danger-bg px-4 py-2.5 text-xs font-bold text-danger hover:bg-danger hover:text-white transition shadow-xs"
            >
              <XCircle className="h-4 w-4 inline mr-1" /> Reject Listing
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={handleRequestInfo}
              className="btn-ghost !py-2.5 text-xs font-semibold"
            >
              <HelpCircle className="h-4 w-4 inline mr-1" /> Request More Info
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminListingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("pending");
  const [allListings, setAllListings] = useState<HouseListing[]>([]);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const isHowa = user?.role === "admin" || user?.role === "counselor";

  const load = () =>
    api
      .listings()
      .then(setAllListings)
      .catch(() => setAllListings([]));

  useEffect(() => {
    load();
  }, []);

  const pending = allListings.filter((l) => l.verificationStatus === "pending");
  const verified = allListings.filter((l) => (l.verificationStatus ?? "verified") === "verified");
  const rejected = allListings.filter((l) => l.verificationStatus === "rejected");

  const remove = async (l: HouseListing) => {
    if (!confirm(`Permanently remove "${l.houseName}" (Block ${l.blockNo} / Lot ${l.lotNo})?`)) return;
    setBusyId(l.id);
    setMsg("");
    try {
      await api.listingDelete(l.id);
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-green-dark">
            Listings &amp; Ownership Verification
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Review submitted proof documents and manage live community listings.
          </p>
        </div>
        <Link href="/add-listing" className="btn-green !text-white flex items-center gap-1.5 text-xs">
          <Plus className="h-4 w-4" /> Add Listing
        </Link>
      </div>

      {/* Tabs matching Section 3 */}
      <div className="mb-6 flex gap-1 rounded-xl border border-cream-2 bg-cream p-1 w-fit overflow-x-auto">
        <button
          onClick={() => setTab("pending")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            tab === "pending" ? "bg-white text-green-dark shadow-xs" : "text-muted hover:text-green-dark"
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> Pending Review
          {pending.length > 0 && (
            <span className="rounded-full bg-gold/80 px-2 py-0.5 text-[10px] font-extrabold text-green-deep">
              {pending.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab("all")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            tab === "all" ? "bg-white text-green-dark shadow-xs" : "text-muted hover:text-green-dark"
          }`}
        >
          All Listings ({allListings.length})
        </button>

        <button
          onClick={() => setTab("verified")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            tab === "verified" ? "bg-white text-green-dark shadow-xs" : "text-muted hover:text-green-dark"
          }`}
        >
          Verified ({verified.length})
        </button>

        <button
          onClick={() => setTab("rejected")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            tab === "rejected" ? "bg-white text-green-dark shadow-xs" : "text-muted hover:text-green-dark"
          }`}
        >
          Rejected ({rejected.length})
        </button>
      </div>

      {msg && (
        <div className="mb-4 rounded-xl bg-danger-bg p-3 text-xs font-semibold text-danger">
          {msg}
        </div>
      )}

      {/* ── PENDING TAB ────────────────────────────────────────────── */}
      {tab === "pending" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-green-dark">
              Pending Listings ({pending.length})
            </h2>
            <span className="text-xs text-muted">
              Verify proof of ownership before approving to the public feed.
            </span>
          </div>

          {pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-cream-2 bg-white p-16 text-center text-muted">
              <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-light" />
              <strong className="block text-green-dark font-serif text-lg">All Caught Up!</strong>
              <p className="text-xs mt-1">There are no pending house listings awaiting review right now.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((l) => (
                <PendingReviewCard key={l.id} listing={l} onReviewed={load} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TABLE VIEW FOR ALL / VERIFIED / REJECTED ────────────────── */}
      {tab !== "pending" && (
        <div className="overflow-hidden rounded-2xl border border-cream-2 bg-white shadow-xs">
          <table className="w-full text-xs">
            <thead className="bg-cream text-left text-muted uppercase tracking-wider">
              <tr>
                <th className="p-4">Property</th>
                <th className="p-4">Block / Lot</th>
                <th className="p-4">Owner</th>
                <th className="p-4">Type</th>
                <th className="p-4">Price</th>
                <th className="p-4">Verification</th>
                {isHowa && <th className="p-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {(tab === "verified" ? verified : tab === "rejected" ? rejected : allListings).map((l) => (
                <tr key={l.id} className="border-t border-cream-2 hover:bg-cream/20">
                  <td className="p-4">
                    <div className="font-semibold text-green-dark">{l.houseName}</div>
                    <div className="text-[11px] text-muted">{l.address}</div>
                  </td>
                  <td className="p-4 font-medium">
                    Block {l.blockNo} / Lot {l.lotNo}
                  </td>
                  <td className="p-4 font-medium">{l.ownerName}</td>
                  <td className="p-4 capitalize">{l.listingType}</td>
                  <td className="p-4 font-bold text-green-mid">{formatPHP(l.price)}</td>
                  <td className="p-4">
                    {l.verificationStatus === "rejected" ? (
                      <span className="rounded-full bg-danger-bg border border-danger/30 px-2.5 py-0.5 text-[10px] font-bold text-danger">
                        Rejected
                      </span>
                    ) : l.verificationStatus === "pending" ? (
                      <span className="rounded-full bg-gold/25 border border-gold/40 px-2.5 py-0.5 text-[10px] font-bold text-green-deep">
                        Pending
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-light/20 px-2.5 py-0.5 text-[10px] font-bold text-green-dark">
                        Verified
                      </span>
                    )}
                  </td>
                  {isHowa && (
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {l.verificationStatus === "pending" && (
                          <button
                            onClick={() => api.reviewListing(l.id, "approve").then(load)}
                            className="rounded-lg bg-green-dark px-2.5 py-1 text-[11px] font-bold text-white hover:bg-green-mid"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => remove(l)}
                          disabled={busyId === l.id}
                          className="rounded-lg border border-danger/30 p-1 text-danger hover:bg-danger-bg"
                          title="Delete Listing"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
