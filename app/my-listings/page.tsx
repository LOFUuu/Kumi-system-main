"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Upload,
  X,
  RefreshCw,
  LogIn,
  Lock,
  Lightbulb,
  Plus,
  BedDouble,
  ShowerHead,
  Ruler,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatPHP, type HouseListing, type VerificationStatus } from "@/lib/mock-data";

const ACCEPTED = ".pdf,.jpg,.jpeg,.png";
type FilterTab = "all" | "pending" | "verified" | "rejected";

function StatusPill({ status }: { status: VerificationStatus }) {
  if (status === "verified") {
    return (
      <span className="rounded-full bg-green-light/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-green-dark">
        Verified
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="rounded-full bg-danger-bg border border-danger/30 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-danger">
        Rejected
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gold/25 border border-gold/40 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-green-deep">
      Pending Verification
    </span>
  );
}

function ResubmitModal({
  listing,
  onClose,
  onSuccess,
}: {
  listing: HouseListing;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const added = Array.from(e.target.files ?? []);
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...added.filter((f) => !names.has(f.name))];
    });
    e.target.value = "";
  };

  const submit = async () => {
    if (!files.length) {
      setErr("Please upload at least one document to resubmit.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const { paths } = await api.uploadListingDocs(files);
      await api.resubmitListing(listing.id, paths);
      onSuccess();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Resubmit failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-cream-2 pb-3">
          <div>
            <h3 className="font-serif text-xl font-bold text-green-dark">
              Edit &amp; Resubmit Listing
            </h3>
            <p className="text-xs text-muted">{listing.houseName}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-green-dark">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="my-4 rounded-xl border border-danger/30 bg-danger-bg p-3.5 text-xs text-danger">
          <strong className="block mb-1">Rejection Reason from Moderator:</strong>
          <span className="italic">
            &ldquo;{listing.rejectionReason || "Uploaded documents were unclear or invalid."}&rdquo;
          </span>
        </div>

        <div className="space-y-3">
          <label className="field-label">Upload Replacement Ownership Documents</label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-green-mid/40 bg-cream/50 py-4 text-xs font-semibold text-green-mid hover:border-green-mid"
          >
            <Upload className="h-4 w-4" /> Click to upload updated document (PDF, JPG, PNG)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            className="hidden"
            onChange={addFiles}
          />

          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center justify-between rounded-lg border border-cream-2 bg-white px-3 py-2 text-xs"
                >
                  <span className="flex items-center gap-2 truncate text-green-dark">
                    <FileText className="h-3.5 w-3.5 text-green-mid" />
                    {f.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles((p) => p.filter((x) => x.name !== f.name))}
                    className="text-muted hover:text-danger ml-2"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {err && <p className="text-xs text-danger font-semibold">{err}</p>}
        </div>

        <div className="flex gap-2 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost flex-1 justify-center !py-2.5 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="btn-green flex-1 justify-center !py-2.5 text-xs disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${busy ? "animate-spin" : ""}`} />
            {busy ? "Submitting…" : "Resubmit for Review"}
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
  const [resubmitTarget, setResubmitTarget] = useState<HouseListing | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<number | null>(null);

  const load = () => {
    api
      .listings()
      .then((all) => {
        const mine = all.filter(
          (l) =>
            (user?.id && l.uploadedBy === user.id) ||
            l.ownerName === user?.fullName
        );
        setListings(mine);
      })
      .catch(() => setListings([]));
  };

  useEffect(() => {
    if (user && user.role !== "non_resident") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return (
      <div className="section">
        <div className="mx-auto max-w-md rounded-2xl border border-cream-2 bg-white p-8 text-center shadow-sm">
          <LogIn className="mx-auto h-10 w-10 text-green-mid" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-green-dark">
            Sign in to view your listings
          </h2>
          <p className="mt-2 text-sm text-muted">
            You must be signed in as a resident to manage your property listings.
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

  if (user.role === "non_resident") {
    return (
      <div className="section">
        <div className="mx-auto max-w-md rounded-2xl border border-gold/30 bg-gold/5 p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-gold" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-green-dark">
            Resident access only
          </h2>
          <p className="mt-2 text-sm text-muted">
            Only verified homeowners and registered residents can post and manage property listings.
          </p>
          <button
            onClick={() => router.push("/house-listing")}
            className="btn-green mt-6 inline-flex w-full justify-center"
          >
            Browse House Listings
          </button>
        </div>
      </div>
    );
  }

  const filtered = listings.filter((l) => {
    const status = l.verificationStatus ?? "verified";
    if (tab === "pending") return status === "pending";
    if (tab === "verified") return status === "verified";
    if (tab === "rejected") return status === "rejected";
    return true;
  });

  return (
    <div className="section">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-3xl font-bold text-green-dark sm:text-4xl">
            My Listings
          </h1>
          <p className="text-sm text-muted">
            Manage your submitted properties and track verification status.
          </p>
        </div>
        <Link href="/add-listing" className="btn-green !text-white flex items-center gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" /> Create New Listing
        </Link>
      </div>

      {/* Tabs matching Section 2 */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-cream-2 bg-cream p-1">
        {(
          [
            { key: "all", label: "All Listings", count: listings.length },
            {
              key: "pending",
              label: "Pending Verification",
              count: listings.filter((l) => (l.verificationStatus ?? "verified") === "pending").length,
            },
            {
              key: "verified",
              label: "Verified",
              count: listings.filter((l) => (l.verificationStatus ?? "verified") === "verified").length,
            },
            {
              key: "rejected",
              label: "Rejected",
              count: listings.filter((l) => l.verificationStatus === "rejected").length,
            },
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
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
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
            const status: VerificationStatus = l.verificationStatus ?? "verified";
            const cover = l.images && l.images[0] ? l.images[0] : "https://picsum.photos/seed/home/600/400";
            const isExpanded = expandedDetails === l.id;

            return (
              <div
                key={l.id}
                className="overflow-hidden rounded-2xl border border-cream-2 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Horizontal Card Layout matching Section 2 */}
                <div className="flex flex-col sm:flex-row">
                  <div
                    className="h-48 w-full sm:h-auto sm:w-64 flex-shrink-0 bg-cover bg-center"
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
                        <StatusPill status={status} />
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

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-cream-2 pt-3 text-[11px] text-muted">
                      <span>Status: <strong className="capitalize text-green-dark">{l.status}</strong></span>
                      <div className="flex gap-2">
                        <Link href={`/house/${l.id}`} className="font-semibold text-green-mid hover:underline">
                          View Listing →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Notice Banner matching Section 2 */}
                {status === "pending" && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-gold/40 bg-gold/10 px-5 py-3.5 text-xs text-green-deep">
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-4 w-4 text-gold-muted flex-shrink-0" />
                      <div>
                        <strong>Pending Verification:</strong> Your listing is under review. You will be notified once our team has verified your documents.
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedDetails(isExpanded ? null : l.id)}
                      className="btn-ghost !px-3 !py-1 text-xs font-semibold"
                    >
                      {isExpanded ? "Hide Details" : "View Details"}
                    </button>
                  </div>
                )}

                {status === "rejected" && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-danger/30 bg-danger-bg px-5 py-3.5 text-xs text-danger">
                    <div className="flex items-start gap-2.5">
                      <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Rejected:</strong> Reason: {l.rejectionReason || "The uploaded document is not clear. Please re-upload a clear copy of your proof of ownership."}
                      </div>
                    </div>
                    <button
                      onClick={() => setResubmitTarget(l)}
                      className="rounded-xl border border-danger bg-white px-4 py-1.5 text-xs font-bold text-danger hover:bg-danger hover:text-white transition shadow-xs flex-shrink-0"
                    >
                      Edit &amp; Resubmit
                    </button>
                  </div>
                )}

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-t border-cream-2 bg-cream/20 p-5 text-xs space-y-3">
                    <p className="text-muted leading-relaxed">{l.description || "No description provided."}</p>
                    {l.proofDocuments && l.proofDocuments.length > 0 && (
                      <div>
                        <strong className="block text-green-dark mb-1.5">Submitted Proof Documents:</strong>
                        <div className="flex flex-wrap gap-2">
                          {l.proofDocuments.map((doc, idx) => (
                            <a
                              key={idx}
                              href={doc}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-cream-2 bg-white px-3 py-1.5 text-green-mid hover:underline shadow-xs"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {doc.split("/").pop()}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tip Banner matching Section 2 */}
      <div className="mt-8 flex items-center gap-2.5 rounded-2xl border border-cream-2 bg-cream p-4 text-xs text-green-deep">
        <Lightbulb className="h-4 w-4 text-gold flex-shrink-0" />
        <span>
          <strong>Tip:</strong> Make sure the document shows your name and property details clearly. Contact HOA administration if you have questions regarding land titles or deed transfers.
        </span>
      </div>

      {resubmitTarget && (
        <ResubmitModal
          listing={resubmitTarget}
          onClose={() => setResubmitTarget(null)}
          onSuccess={() => {
            setResubmitTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}
