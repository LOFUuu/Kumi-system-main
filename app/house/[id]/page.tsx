"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  BedDouble,
  ShowerHead,
  Ruler,
  CheckCircle2,
  Calendar,
  Clock,
  MessageSquare,
  X,
  Eye,
  CalendarCheck,
  AlertCircle,
  ChevronRight,
  Loader2,
  Phone,
  Mail,
  Building,
  UserCheck,
  Info,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPHP, type HouseListing, type PropertyViewing } from "@/lib/mock-data";

// ── Status helpers ─────────────────────────────────────────────────────────────

type ViewingStatus = PropertyViewing["status"] | null;

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()))
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { /* empty */ }
  return dateStr;
}

function formatTime(time?: string) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

// ── Animated checkmark ──────────────────────────────────────────────────────────
function AnimatedCheck() {
  return (
    <div className="relative mx-auto h-16 w-16">
      <svg viewBox="0 0 80 80" className="h-full w-full">
        <circle
          cx="40" cy="40" r="36"
          fill="none"
          stroke="#10b981"
          strokeWidth="4"
          style={{
            strokeDasharray: 226,
            strokeDashoffset: 226,
            animation: "dash-circle 0.6s ease-out forwards",
          }}
        />
        <polyline
          points="24,40 36,52 56,28"
          fill="none"
          stroke="#10b981"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 50,
            strokeDashoffset: 50,
            animation: "dash-check 0.4s ease-out 0.5s forwards",
          }}
        />
      </svg>
      <style>{`
        @keyframes dash-circle { to { stroke-dashoffset: 0; } }
        @keyframes dash-check { to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
}

// ── Status flow indicator ───────────────────────────────────────────────────────
function StatusFlow({ current }: { current: ViewingStatus }) {
  const steps: { key: ViewingStatus; label: string }[] = [
    { key: "viewing_requested", label: "Requested" },
    { key: "viewing_scheduled", label: "Scheduled" },
    { key: "viewing_completed", label: "Completed" },
  ];
  const activeIdx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-0 mt-3">
      {steps.map((step, i) => {
        const done = i <= activeIdx && current !== "viewing_declined";
        const active = i === activeIdx && current !== "viewing_declined";
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                  done
                    ? "border-green-mid bg-green-mid"
                    : "border-cream-2 bg-white"
                } ${active ? "ring-2 ring-green-mid/30 ring-offset-1" : ""}`}
              >
                {done && <CheckCircle2 className="h-3 w-3 text-white" />}
              </div>
              <span className={`mt-1 text-[10px] font-semibold ${done ? "text-green-mid" : "text-muted"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-1 mb-4 h-0.5 w-8 transition-all duration-700 ${
                  i < activeIdx && current !== "viewing_declined" ? "bg-green-mid" : "bg-cream-2"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function HouseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const id = Number(params.id);
  const [listing, setListing] = useState<HouseListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);

  // Existing viewing for this resident + listing
  const [myViewing, setMyViewing] = useState<PropertyViewing | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);

  // Schedule Modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [scheduleVisible, setScheduleVisible] = useState(false);

  // Contact HOA Modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);

  // Viewing Details Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Schedule Form fields
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);

  // Load listing
  useEffect(() => {
    if (!Number.isFinite(id)) { setLoading(false); return; }
    api.listing(id)
      .then((data) => setListing(data))
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Load resident's existing viewing for this property
  useEffect(() => {
    if (!user || !Number.isFinite(id)) return;
    setViewingLoading(true);
    api.myViewings(id)
      .then((viewings) => {
        // Get the most recent non-declined viewing, or the most recent if all declined
        const active = viewings.find((v) =>
          ["viewing_requested", "viewing_scheduled", "viewing_completed"].includes(v.status)
        );
        setMyViewing(active ?? viewings[0] ?? null);
      })
      .catch(() => setMyViewing(null))
      .finally(() => setViewingLoading(false));
  }, [user, id]);

  // Modal open/close handlers
  const openScheduleModal = () => {
    setShowScheduleModal(true);
    setStep("form");
    setSubmitError("");
    setTimeout(() => setScheduleVisible(true), 10);
  };

  const closeScheduleModal = () => {
    setScheduleVisible(false);
    setTimeout(() => {
      setShowScheduleModal(false);
      setStep("form");
    }, 300);
  };

  const openContactModal = () => {
    setShowContactModal(true);
    setTimeout(() => setContactVisible(true), 10);
  };

  const closeContactModal = () => {
    setContactVisible(false);
    setTimeout(() => setShowContactModal(false), 300);
  };

  const openDetailsModal = () => {
    setShowDetailsModal(true);
    setTimeout(() => setDetailsVisible(true), 10);
  };

  const closeDetailsModal = () => {
    setDetailsVisible(false);
    setTimeout(() => setShowDetailsModal(false), 300);
  };

  const handleViewingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const { viewing } = await api.createViewing({
        listingId: id,
        residentName: user.fullName,
        residentEmail: user.email,
        preferredDate,
        preferredTime,
        message,
      });
      setMyViewing(viewing);
      setStep("success");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit viewing request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="section">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-green-mid" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="section">
        <div className="mx-auto max-w-md rounded-2xl border border-cream-2 bg-white p-8 text-center shadow-sm">
          <h2 className="font-serif text-2xl font-bold text-green-dark">Property Not Found</h2>
          <p className="mt-2 text-sm text-muted">
            The house listing you are looking for does not exist or is no longer available.
          </p>
          <Link href="/house-listing" className="btn-green mt-6 inline-flex w-full justify-center">
            Browse All Listings
          </Link>
        </div>
      </div>
    );
  }

  const isRent = listing.listingType === "rent";
  const images = listing.images && listing.images.length > 0
    ? listing.images
    : ["https://picsum.photos/seed/casa-1/800/600"];

  const viewingStatus = myViewing?.status ?? null;
  const canScheduleViewing = !viewingStatus || viewingStatus === "viewing_declined";
  const isViewingScheduled = viewingStatus === "viewing_scheduled";
  const isViewingRequested = viewingStatus === "viewing_requested";
  const isViewingCompleted = viewingStatus === "viewing_completed";

  // Transaction status — owner-controlled (reserved / sold_rented block viewings)
  const txStatus = (listing.transactionStatus as string) ?? "available";
  const isReserved = txStatus === "reserved";
  const isSoldRented = txStatus === "sold_rented";
  const viewingsBlocked = isReserved || isSoldRented;

  // Today's date as min for date picker
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="section">
      <Link
        href="/house-listing"
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-green-mid hover:underline"
      >
        ← Back to Listings
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div
            className="h-80 w-full rounded-2xl bg-cover bg-center transition-all duration-300 lg:h-[460px]"
            style={{ backgroundImage: `url(${images[selectedImg] || images[0]})` }}
          />
          {images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto scroll-thin pb-2">
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImg(i)}
                  className={`h-20 w-28 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    selectedImg === i ? "border-green-mid scale-105" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${src})` }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${isRent ? "badge-rent" : "badge-sale"}`}>
              {isRent ? "FOR RENT" : "FOR SALE"}
            </span>
            <span className={`badge ${listing.status === "available" ? "badge-green" : "badge-gold"}`}>
              {listing.status.toUpperCase().replace(/_/g, " ")}
            </span>
            {listing.siteVisitRecommended && (
              <span className="badge bg-amber-100 text-amber-900 border border-amber-300 font-bold flex items-center gap-1">
                <Eye className="h-3 w-3 text-amber-700" /> SITE VISIT RECOMMENDED
              </span>
            )}
          </div>

          <h1 className="mt-3 font-serif text-4xl font-bold text-green-dark">
            {listing.houseName}
          </h1>
          <div className="mt-2 flex items-center gap-1.5 text-muted">
            <MapPin className="h-4 w-4 text-green-mid" /> {listing.address}
          </div>

          <div className="mt-5 font-serif text-3xl font-bold text-green-mid">
            {formatPHP(listing.price)}
            {isRent && <span className="text-base font-normal text-muted">/mo</span>}
          </div>

          <div className="mt-5 flex gap-6 border-y border-cream-2 py-4 text-green-mid">
            <div className="flex items-center gap-2">
              <BedDouble className="h-5 w-5" />
              <div>
                <div className="text-xl font-bold">{listing.bedrooms}</div>
                <div className="text-xs text-muted">Bedrooms</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShowerHead className="h-5 w-5" />
              <div>
                <div className="text-xl font-bold">{listing.bathrooms}</div>
                <div className="text-xs text-muted">Bathrooms</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              <div>
                <div className="text-xl font-bold">{listing.sqm}</div>
                <div className="text-xs text-muted">Sqm Area</div>
              </div>
            </div>
          </div>

          <p className="mt-5 leading-relaxed text-muted whitespace-pre-line">
            {listing.description || "No specific description provided for this property."}
          </p>

          {/* ── Owner Contact Info Card ── */}
          {(listing.ownerContactNumber || listing.ownerMessengerLink) && (
            <div className="mt-5 rounded-xl border border-[#c8d8cc] bg-[#edf3ee] p-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#1a3826]">
                <Phone className="h-3.5 w-3.5" />
                Contact Owner Directly
              </div>
              <div className="space-y-1.5">
                {listing.ownerContactNumber && (
                  <a
                    href={`tel:${listing.ownerContactNumber}`}
                    className="flex items-center gap-2 text-sm font-semibold text-[#1a3826] hover:text-green-mid transition"
                  >
                    <Phone className="h-4 w-4 text-green-mid" />
                    {listing.ownerContactNumber}
                  </a>
                )}
                {listing.ownerMessengerLink && (
                  <a
                    href={listing.ownerMessengerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-semibold text-[#1a3826] hover:text-green-mid transition"
                  >
                    <MessageSquare className="h-4 w-4 text-green-mid" />
                    Message on Messenger
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ── Transaction Status Banner (Reserved / Sold) ── */}
          {viewingsBlocked && (
            <div className={`mt-5 rounded-xl border p-4 ${
              isSoldRented
                ? "border-rose-200 bg-rose-50/80"
                : "border-amber-200 bg-amber-50/80"
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className={`h-4 w-4 ${
                  isSoldRented ? "text-rose-600" : "text-amber-600"
                }`} />
                <span className={`text-sm font-bold ${
                  isSoldRented ? "text-rose-900" : "text-amber-900"
                }`}>
                  {isSoldRented
                    ? (listing.listingType === "rent" ? "Already Rented Out" : "Already Sold")
                    : "Reserved — Not Available for Viewing"}
                </span>
              </div>
              <p className={`mt-1 text-xs ${
                isSoldRented ? "text-rose-800" : "text-amber-800"
              }`}>
                {isSoldRented
                  ? "This property is no longer available. Contact the owner if you need more information."
                  : "This property is currently reserved. Property viewings are not available at this time."}
              </p>
            </div>
          )}

          {/* ── Dynamic Viewing Status Cards ── */}

          {/* STATE: Viewing Completed */}
          {user && !viewingLoading && isViewingCompleted && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm transition-all duration-500">
              <div className="flex items-start gap-3.5">
                <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-emerald-900">✓ Viewing Completed</h4>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                    Your property viewing has been completed. If you wish to proceed with the property, please coordinate directly with the owner or HOA.
                  </p>
                  <StatusFlow current="viewing_completed" />
                </div>
              </div>
            </div>
          )}

          {/* STATE: Viewing Scheduled */}
          {user && !viewingLoading && isViewingScheduled && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm transition-all duration-500">
              <div className="flex items-start gap-3.5">
                <div className="rounded-full bg-blue-100 p-2 text-blue-700">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-blue-900">📅 Viewing Scheduled</h4>
                  <p className="mt-1 text-xs leading-relaxed text-blue-800">
                    Your property viewing is scheduled for{" "}
                    <strong>
                      {myViewing?.scheduledAt
                        ? formatDate(myViewing.scheduledAt)
                        : formatDate(myViewing?.preferredDate)}{" "}
                      {myViewing?.preferredTime ? `at ${formatTime(myViewing.preferredTime)}` : ""}
                    </strong>.
                  </p>
                  <div className="mt-2.5 space-y-1 text-xs text-blue-900/80">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-blue-600" />
                      <span>📍 <strong>Location:</strong> {listing.houseName} ({listing.address})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                      <span>👤 <strong>Contact:</strong> Property Owner / HOA Office</span>
                    </div>
                  </div>
                  <StatusFlow current="viewing_scheduled" />
                </div>
              </div>
            </div>
          )}

          {/* STATE: Viewing Requested */}
          {user && !viewingLoading && isViewingRequested && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm transition-all duration-500">
              <div className="flex items-start gap-3.5">
                <div className="rounded-full bg-amber-100 p-2 text-amber-700">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-900">⏳ Viewing Requested</h4>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800">
                    Your request for{" "}
                    <strong>
                      {formatDate(myViewing?.preferredDate)} at {formatTime(myViewing?.preferredTime)}
                    </strong>{" "}
                    has been submitted. The HOA/Owner will confirm your viewing appointment shortly.
                  </p>
                  <StatusFlow current="viewing_requested" />
                </div>
              </div>
            </div>
          )}

          {/* STATE: Viewing Declined */}
          {user && !viewingLoading && viewingStatus === "viewing_declined" && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/80 p-5 shadow-sm transition-all duration-500">
              <div className="flex items-start gap-3.5">
                <div className="rounded-full bg-rose-100 p-2 text-rose-700">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-rose-900">Viewing Declined</h4>
                  <p className="mt-1 text-xs leading-relaxed text-rose-800">
                    Your viewing request was declined by the HOA. {myViewing?.adminNotes && `Reason: "${myViewing.adminNotes}".`} You may schedule another viewing with a different date or time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Action Buttons ── */}
          <div className="mt-8 flex flex-wrap gap-3">
            {!user ? (
              <button
                onClick={() => router.push(`/login?next=/house/${listing.id}&reason=viewing`)}
                className="btn-green flex-1 justify-center !py-3.5 text-sm"
              >
                Sign In to Schedule a Viewing
              </button>
            ) : viewingsBlocked ? (
              /* Property Reserved or Sold — viewings disabled */
              <>
                <button
                  disabled
                  className="btn-green flex-1 justify-center !py-3.5 text-sm opacity-40 cursor-not-allowed"
                >
                  <Eye className="h-4 w-4" />
                  Viewings Unavailable
                </button>
                <button
                  onClick={openContactModal}
                  className="btn-ghost flex-1 justify-center !py-3.5 text-sm text-green-dark border-cream-2 hover:border-green-mid"
                >
                  <Phone className="h-4 w-4" />
                  Contact HOA
                </button>
              </>
            ) : isViewingCompleted ? (
              /* Viewing Completed state -> Primary: Contact HOA, Secondary: View Viewing Details */
              <>
                <button
                  onClick={openContactModal}
                  className="btn-green flex-1 justify-center !py-3.5 text-sm"
                >
                  <Phone className="h-4 w-4" />
                  Contact HOA
                </button>
                <button
                  onClick={openDetailsModal}
                  className="btn-ghost flex-1 justify-center !py-3.5 text-sm text-green-dark border-cream-2 hover:border-green-mid"
                >
                  <Info className="h-4 w-4" />
                  View Viewing Details
                </button>
              </>
            ) : isViewingScheduled || isViewingRequested ? (
              /* Viewing Scheduled / Requested state -> Primary: View Appointment, Secondary: Contact HOA */
              <>
                <button
                  onClick={openDetailsModal}
                  className="btn-green flex-1 justify-center !py-3.5 text-sm"
                >
                  <CalendarCheck className="h-4 w-4" />
                  View Appointment
                </button>
                <button
                  onClick={openContactModal}
                  className="btn-ghost flex-1 justify-center !py-3.5 text-sm text-green-dark border-cream-2 hover:border-green-mid"
                >
                  <Phone className="h-4 w-4" />
                  Contact HOA
                </button>
              </>
            ) : (
              /* Initial state / No active viewing -> Primary: Schedule Viewing, Secondary: Contact HOA */
              <>
                <button
                  onClick={openScheduleModal}
                  className="btn-green flex-1 justify-center !py-3.5 text-sm"
                >
                  <Eye className="h-4 w-4" />
                  {viewingStatus === "viewing_declined" ? "Schedule Another Viewing" : "Schedule a Viewing"}
                </button>
                <button
                  onClick={openContactModal}
                  className="btn-ghost flex-1 justify-center !py-3.5 text-sm text-green-dark border-cream-2 hover:border-green-mid"
                >
                  <Phone className="h-4 w-4" />
                  Contact HOA
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══ Schedule Viewing Modal ══════════════════════════════════════════════ */}
      {showScheduleModal && (
        <div
          className={`fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all duration-300 ${
            scheduleVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeScheduleModal}
        >
          <div
            ref={modalRef}
            className={`w-full max-w-lg rounded-2xl bg-white shadow-2xl transition-all duration-300 ${
              scheduleVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-cream-2 p-6 pb-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-green-mid" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    Property Viewing Request
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-green-dark">
                  Schedule a Viewing
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  {listing.houseName} — Block {listing.blockNo} / Lot {listing.lotNo}
                </p>
              </div>
              <button
                onClick={closeScheduleModal}
                className="rounded-lg p-1.5 text-muted transition hover:bg-cream hover:text-green-dark"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {step === "form" ? (
                <div className="transition-all duration-300 opacity-100">
                  <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900">
                    <p className="font-semibold">Inspect the property with the Owner / HOA</p>
                    <p className="mt-0.5 opacity-85">
                      Schedule a viewing to inspect the house/unit and discuss tenancy or purchase details directly with the owner or HOA office.
                    </p>
                  </div>

                  <form onSubmit={handleViewingSubmit} className="space-y-4">
                    {/* Name & Email (read-only) */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="field-label">Your Name</label>
                        <input
                          type="text"
                          disabled
                          className="field bg-cream-2/50 text-muted"
                          value={user?.fullName || ""}
                        />
                      </div>
                      <div>
                        <label className="field-label">Contact Email</label>
                        <input
                          type="text"
                          disabled
                          className="field bg-cream-2/50 text-muted"
                          value={user?.email || ""}
                        />
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="field-label flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Preferred Date
                        </label>
                        <input
                          type="date"
                          required
                          min={today}
                          className="field"
                          value={preferredDate}
                          onChange={(e) => setPreferredDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="field-label flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Preferred Time
                        </label>
                        <select
                          required
                          className="field"
                          value={preferredTime}
                          onChange={(e) => setPreferredTime(e.target.value)}
                        >
                          <option value="">Select time</option>
                          <option value="08:00">8:00 AM</option>
                          <option value="09:00">9:00 AM</option>
                          <option value="10:00">10:00 AM</option>
                          <option value="11:00">11:00 AM</option>
                          <option value="13:00">1:00 PM</option>
                          <option value="14:00">2:00 PM</option>
                          <option value="15:00">3:00 PM</option>
                          <option value="16:00">4:00 PM</option>
                        </select>
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="field-label flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Message / Questions
                      </label>
                      <textarea
                        className="field min-h-[90px]"
                        placeholder="Any questions or requests for the owner and HOA…"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>

                    {/* Error */}
                    {submitError && (
                      <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-bg p-3 text-xs text-danger">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {submitError}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={closeScheduleModal}
                        className="btn-ghost flex-1 justify-center !py-2.5 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-green flex-1 justify-center !py-2.5 text-sm"
                      >
                        {submitting ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                        ) : (
                          <>Request Viewing <ChevronRight className="h-4 w-4" /></>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Success step */
                <div className="py-4 text-center transition-all duration-500 opacity-100">
                  <AnimatedCheck />
                  <h4 className="mt-4 font-serif text-xl font-bold text-green-dark">
                    Viewing Request Sent!
                  </h4>
                  <p className="mt-2 text-sm text-muted">
                    Your viewing request for{" "}
                    <strong className="text-green-dark">{listing.houseName}</strong> has been submitted.
                    The HOA will confirm the schedule and contact you at{" "}
                    <strong>{user?.email}</strong>.
                  </p>

                  <div className="mt-5 flex justify-center">
                    <StatusFlow current="viewing_requested" />
                  </div>

                  <div className="mt-6 flex gap-2">
                    <button
                      onClick={closeScheduleModal}
                      className="btn-ghost flex-1 justify-center !py-2.5 text-sm"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ Viewing Details Modal ══════════════════════════════════════════════ */}
      {showDetailsModal && myViewing && (
        <div
          className={`fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all duration-300 ${
            detailsVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeDetailsModal}
        >
          <div
            className={`w-full max-w-lg rounded-2xl bg-white shadow-2xl transition-all duration-300 ${
              detailsVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-cream-2 p-6 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-green-mid">
                  Viewing Appointment Details
                </span>
                <h3 className="font-serif text-xl font-bold text-green-dark">
                  {listing.houseName}
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  Block {listing.blockNo} / Lot {listing.lotNo}, {listing.address}
                </p>
              </div>
              <button
                onClick={closeDetailsModal}
                className="rounded-lg p-1.5 text-muted transition hover:bg-cream hover:text-green-dark"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="rounded-xl border border-cream-2 bg-cream/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Status:</span>
                  <span className="badge badge-green uppercase text-[11px]">
                    {myViewing.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Viewing Date:</span>
                  <span className="font-semibold text-green-dark">
                    {myViewing.scheduledAt ? formatDate(myViewing.scheduledAt) : formatDate(myViewing.preferredDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Preferred Time:</span>
                  <span className="font-semibold text-green-dark">
                    {formatTime(myViewing.preferredTime)}
                  </span>
                </div>
                {myViewing.message && (
                  <div className="border-t border-cream-2 pt-2 text-xs">
                    <span className="text-muted block font-semibold mb-0.5">Your Note:</span>
                    <span className="italic text-green-dark">&ldquo;{myViewing.message}&rdquo;</span>
                  </div>
                )}
                {myViewing.adminNotes && (
                  <div className="border-t border-cream-2 pt-2 text-xs">
                    <span className="text-muted block font-semibold mb-0.5">HOA/Owner Note:</span>
                    <span className="italic text-green-dark">&ldquo;{myViewing.adminNotes}&rdquo;</span>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-blue-600" /> HOA / Owner Coordination
                </p>
                <p className="opacity-90">
                  During the viewing, you can inspect the house and discuss lease terms directly with the owner or HOA representative.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeDetailsModal}
                  className="btn-ghost flex-1 justify-center !py-2.5 text-sm"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeDetailsModal();
                    openContactModal();
                  }}
                  className="btn-green flex-1 justify-center !py-2.5 text-sm"
                >
                  <Phone className="h-4 w-4" /> Contact HOA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Contact HOA Modal ══════════════════════════════════════════════════ */}
      {showContactModal && (
        <div
          className={`fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all duration-300 ${
            contactVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeContactModal}
        >
          <div
            className={`w-full max-w-md rounded-2xl bg-white shadow-2xl transition-all duration-300 ${
              contactVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-cream-2 p-6 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-green-mid">
                  Property & Viewing Support
                </span>
                <h3 className="font-serif text-xl font-bold text-green-dark">
                  Contact HOA / Owner
                </h3>
              </div>
              <button
                onClick={closeContactModal}
                className="rounded-lg p-1.5 text-muted transition hover:bg-cream hover:text-green-dark"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <p className="text-xs text-muted leading-relaxed">
                Have questions about <strong>{listing.houseName}</strong> or your scheduled viewing? Reach out to the Mabuhay Homes HOA Administration Office.
              </p>

              <div className="space-y-3 rounded-xl border border-cream-2 bg-cream/40 p-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-light/20 p-2 text-green-mid">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-muted font-medium">HOA Office Phone</div>
                    <div className="font-bold text-green-dark text-sm">(02) 8123-4567 / 0917-123-4567</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-light/20 p-2 text-green-mid">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-muted font-medium">HOA Email</div>
                    <div className="font-bold text-green-dark text-sm">admin@mabuhayhomes.com</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-light/20 p-2 text-green-mid">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-muted font-medium">HOA Clubhouse & Admin Office</div>
                    <div className="font-bold text-green-dark">Phase 5 Clubhouse, Mabuhay Homes</div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={closeContactModal}
                  className="btn-green w-full justify-center !py-2.5 text-sm"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
