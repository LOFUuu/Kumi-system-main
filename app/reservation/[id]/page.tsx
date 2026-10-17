"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";
import QRCode from "react-qr-code";
import {
  Lock,
  Check,
  Upload,
  Image as ImageIcon,
  X,
  Smartphone,
  Receipt,
  FileText,
  Sparkles,
  Compass,
  CalendarDays,
  CheckCircle2,
  Clock,
  Users as UsersIcon,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { buildPlaceholderQR, HOAGCashNumber } from "@/lib/payment";
import AvailabilityCalendar, { CalendarDateStatus } from "@/components/AvailabilityCalendar";
import {
  formatPHP,
  getBookingTotal,
  getRate,
  type Amenity,
  type PaymentConfig,
} from "@/lib/mock-data";

interface RecommendationCard {
  date: string;
  dayOfWeek: string;
  formattedDate: string;
  session: "day" | "night";
  sessionLabel: string;
  sessionTime: string;
  status: "available" | "limited";
  statusLabel: string;
  remainingSlots: number;
  maxCapacity: number;
  reservationType: "public" | "private";
}

function BookingForm() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const id = Number(params.id);
  const initialTypeParam = searchParams.get("type") === "private" ? "private" : "public";

  const [amenity, setAmenity] = useState<Amenity | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [datesStatus, setDatesStatus] = useState<Record<string, CalendarDateStatus>>({});
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
  const [nextAvailable, setNextAvailable] = useState<RecommendationCard | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [findingNext, setFindingNext] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const [reservationType, setReservationType] = useState<"public" | "private">(initialTypeParam);
  const [bookingType, setBookingType] = useState<"day" | "night">("day");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pax, setPax] = useState(1);
  const [notes, setNotes] = useState("");
  const [gcashRef, setGcashRef] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gcashConfig, setGcashConfig] = useState<PaymentConfig | null>(null);

  const isResident = user?.role === "resident";

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Receipt image must be under 10MB.");
      return;
    }
    setReceiptFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(String(reader.result));
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview("");
    }
    setError("");
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview("");
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?next=${next}&reason=book`);
    }
  }, [loading, user, router]);

  // Load amenity details and payment configs
  useEffect(() => {
    if (!Number.isFinite(id)) return;
    api.amenities().then((list) => {
      const a = list.find((x) => x.id === id);
      setNotFound(!a);
      if (a) setAmenity(a);
    });
    api.paymentConfig("amenity").then(setGcashConfig).catch(() => {});
  }, [id]);

  // Fetch real availability & airline-style recommendations based on active selections
  useEffect(() => {
    if (!Number.isFinite(id)) return;
    setLoadingAvailability(true);
    api
      .availability(id, {
        type: reservationType,
        session: bookingType,
        pax,
      })
      .then((res) => {
        setBlocked(res.blocked || []);
        if (res.datesStatus) {
          setDatesStatus(res.datesStatus as Record<string, CalendarDateStatus>);
        }
        if (res.recommendations) {
          setRecommendations(res.recommendations as RecommendationCard[]);
        }
        if (res.nextAvailable !== undefined) {
          setNextAvailable((res.nextAvailable as RecommendationCard) || null);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoadingAvailability(false);
      });
  }, [id, reservationType, bookingType, pax]);

  const rate = amenity ? getRate(amenity, bookingType, isResident) : 0;
  const total = amenity
    ? getBookingTotal(amenity, bookingType, reservationType, pax, isResident)
    : 0;
  const downpayment = amenity
    ? (reservationType === "private" ? amenity.downpaymentPrivate : amenity.downpayment)
    : 0;

  const currentDateStatus = datesStatus[date];
  const dateBlocked = currentDateStatus
    ? currentDateStatus.status === "booked"
    : blocked.includes(date);

  // Handle selecting a recommended date card
  const handleSelectRecommendation = (rec: RecommendationCard) => {
    setDate(rec.date);
    setBookingType(rec.session);
    setError("");
    setFeedbackMsg(`Selected recommended slot: ${rec.formattedDate} (${rec.sessionLabel})`);
    setTimeout(() => setFeedbackMsg(""), 4000);
  };

  // Find Next Available Date button handler
  const handleFindNextAvailable = () => {
    setFindingNext(true);
    setError("");
    api
      .availability(id, {
        type: reservationType,
        session: bookingType,
        pax,
      })
      .then((res) => {
        const next = (res.nextAvailable as RecommendationCard) || res.recommendations?.[0];
        if (next) {
          setDate(next.date);
          setBookingType(next.session);
          setFeedbackMsg(
            `Found and selected nearest available date: ${next.formattedDate} (${next.sessionLabel})`
          );
          setTimeout(() => setFeedbackMsg(""), 4000);
        } else {
          setError(
            "No eligible open dates found within the next 60 days for this party size. Please try reducing the number of persons or switching session."
          );
        }
      })
      .catch(() => {
        setError("Unable to find available dates at this moment. Please try again.");
      })
      .finally(() => {
        setFindingNext(false);
      });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?next=${next}&reason=book`);
      return;
    }
    if (!amenity) return;

    // Strict revalidation before submitting
    setSubmitting(true);
    try {
      const recheck = await api.availability(amenity.id, {
        date,
        type: reservationType,
        session: bookingType,
        pax,
      });

      if (!recheck.available) {
        setError(
          "The selected date and session is no longer available. Please select another date."
        );
        if (recheck.datesStatus) {
          setDatesStatus(recheck.datesStatus as Record<string, CalendarDateStatus>);
        }
        if (recheck.recommendations) {
          setRecommendations(recheck.recommendations as RecommendationCard[]);
        }
        setSubmitting(false);
        return;
      }

      let uploadedReceiptPath: string | undefined = undefined;
      if (receiptFile) {
        const uploadRes = await api.uploadPaymentReceipt(receiptFile);
        uploadedReceiptPath = uploadRes.path;
      }

      const res = await api.createReservation({
        amenityId: amenity.id,
        residentName: name || user?.fullName || "Resident",
        phone: phone || user?.phone || "",
        bookingType,
        reservationType,
        date,
        paxCount: pax,
        notes,
        role: user?.role || "non_resident",
        userEmail: user?.email,
        gcashRef: gcashRef.trim() || undefined,
        receiptPath: uploadedReceiptPath,
      });
      router.push(
        `/reservation/${amenity.id}/confirm?res=${res.reservation.id}&intent=${res.payment.intentId}`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="section"><p className="text-muted">Loading…</p></div>;
  }

  if (!user) {
    return (
      <div className="section">
        <div className="mx-auto max-w-md rounded-2xl border border-gold/30 bg-gold/5 p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-gold" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-green-dark">Sign in required</h2>
          <p className="mt-2 text-sm text-muted">
            You need to be logged in to book an amenity reservation.
            Redirecting you to the login page…
          </p>
          <Link href="/login" className="btn-gold mt-6 inline-flex w-full justify-center">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="section">
        <p className="text-muted">Amenity not found. <Link href="/reservation" className="text-green-mid underline">Back to amenities</Link></p>
      </div>
    );
  }
  if (!amenity) {
    return <div className="section"><p className="text-muted">Loading…</p></div>;
  }

  return (
    <div className="section">
      <Link href="/reservation" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-green-mid">
        ← Back to amenities
      </Link>

      <div className="mx-auto max-w-3xl">
        <h2 className="font-serif text-3xl font-bold text-green-dark">Book {amenity.name}</h2>
        <p className="mt-1 text-muted">
          {amenity.description} · {formatPHP(downpayment)} downpayment via GCash required
        </p>

        {feedbackMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger-bg px-4 py-3 text-sm font-semibold text-danger animate-in fade-in">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-5">
          {/* User information card */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Your Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label">Full Name *</label>
                <input className="field" required value={name || user?.fullName || ""} onChange={(e) => setName(e.target.value)} placeholder="Juan dela Cruz" />
              </div>
              <div>
                <label className="field-label">Phone</label>
                <input className="field" value={phone || user?.phone || ""} onChange={(e) => setPhone(e.target.value)} placeholder="09XX XXX XXXX" />
              </div>
            </div>
          </div>

          {/* Booking details card */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Booking Details</h3>

            <div>
              <label className="field-label">Reservation Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setReservationType("public")}
                  className={`rounded-xl border-2 p-3 text-left transition ${reservationType === "public" ? "border-green-mid bg-green-light/10" : "border-cream-2 hover:border-green-light/40"}`}>
                  <div className="text-sm font-bold text-green-dark">Public</div>
                  <div className="text-xs text-muted">Per head · resident gets 20% off</div>
                </button>
                <button type="button" onClick={() => setReservationType("private")}
                  className={`rounded-xl border-2 p-3 text-left transition ${reservationType === "private" ? "border-gold bg-gold/10" : "border-cream-2 hover:border-gold/40"}`}>
                  <div className="text-sm font-bold text-green-dark">Private</div>
                  <div className="text-xs text-muted">Whole venue flat rate</div>
                </button>
              </div>
            </div>

            <div>
              <label className="field-label">Session *</label>
              <div className="grid grid-cols-2 gap-3">
                {(["day", "night"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setBookingType(s)}
                    className={`rounded-xl border-2 p-3 text-left transition ${bookingType === s ? "border-green-mid bg-green-light/10" : "border-cream-2 hover:border-green-light/40"}`}>
                    <div className="text-sm font-bold text-green-dark capitalize">{s === "day" ? "Day Session" : "Night Session"}</div>
                    <div className="text-xs text-muted">{s === "day" ? "6:00 AM – 6:00 PM" : "6:00 PM – 10:00 PM"}</div>
                    <div className="mt-1 text-sm font-extrabold text-gold-muted">
                      {reservationType === "private" ? formatPHP(amenity.ratePrivate) + " flat" : formatPHP(rate) + "/head"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="field-label">Number of Persons *</label>
              <input
                type="number"
                className="field"
                min={1}
                max={amenity.maxCapacity}
                value={pax}
                onChange={(e) => setPax(Math.max(1, Math.min(amenity.maxCapacity, Number(e.target.value) || 1)))}
              />
              <p className="mt-1 text-xs text-muted">Max {amenity.maxCapacity} pax for {amenity.name}</p>
            </div>

            {/* AIRLINE-STYLE RECOMMENDED AVAILABLE DATES */}
            <div className="pt-2 border-t border-cream-2">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-serif text-sm font-bold text-green-dark sm:text-base">
                      Recommended Available Dates
                    </h4>
                  </div>
                  <p className="text-[11px] text-muted">
                    Instant suggestions matching your {reservationType} preference and {pax} pax.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFindNextAvailable}
                  disabled={findingNext}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 transition disabled:opacity-60"
                >
                  <Compass className="h-3.5 w-3.5 text-emerald-600" />
                  {findingNext ? "Searching..." : "Find Next Available Date"}
                </button>
              </div>

              {loadingAvailability ? (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="h-28 animate-pulse rounded-2xl border border-cream-2 bg-cream/40 p-3"
                    />
                  ))}
                </div>
              ) : recommendations.length === 0 ? (
                <div className="rounded-2xl border border-cream-2 bg-cream/30 p-4 text-center text-xs text-muted">
                  No direct openings found in the immediate dates for {pax} pax. Use the calendar below to explore upcoming months.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4">
                  {recommendations.map((rec) => {
                    const isCardSelected = rec.date === date && rec.session === bookingType;
                    return (
                      <button
                        key={`${rec.date}-${rec.session}`}
                        type="button"
                        onClick={() => handleSelectRecommendation(rec)}
                        className={`group flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 ${
                          isCardSelected
                            ? "border-emerald-600 bg-emerald-50/90 shadow-sm ring-2 ring-emerald-600/30"
                            : "border-cream-2 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-xs"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold uppercase tracking-wider text-muted">
                              {rec.dayOfWeek}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                rec.status === "limited"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {rec.statusLabel}
                            </span>
                          </div>
                          <div className="mt-1 font-serif text-base font-bold text-green-dark">
                            {rec.formattedDate}
                          </div>
                          <div className="mt-0.5 text-xs font-semibold text-emerald-700">
                            {rec.sessionLabel}
                          </div>
                          <div className="text-[10px] text-muted">{rec.sessionTime}</div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-cream-2/80 pt-2 text-[11px]">
                          <span className="text-[10px] text-muted truncate max-w-[85px]">
                            {reservationType === "private"
                              ? "Whole Venue"
                              : `${rec.remainingSlots} slots left`}
                          </span>
                          <span className="font-bold text-green-mid group-hover:underline">
                            {isCardSelected ? "Selected ✓" : "Book →"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Smart Availability Calendar */}
            <div className="pt-2 border-t border-cream-2">
              <label className="field-label mb-2 flex items-center justify-between">
                <span>Booking Date * — pick an available day</span>
                <span className="text-[11px] font-normal text-muted">
                  Selected: <strong className="text-green-mid">{date}</strong>
                </span>
              </label>
              <AvailabilityCalendar
                blocked={blocked}
                datesStatus={datesStatus}
                selected={date}
                onSelect={(iso) => {
                  setDate(iso);
                  setError("");
                }}
              />
              {dateBlocked && (
                <p className="mt-2 text-xs font-semibold text-danger flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  This date and session is fully booked or locked. Please select another slot from the recommendations above.
                </p>
              )}
            </div>

            <div>
              <label className="field-label">Additional Notes</label>
              <textarea className="field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special requests, group details…" />
            </div>
          </div>

          {/* Pricing summary */}
          <div className={`flex items-center justify-between rounded-2xl p-5 text-white ${reservationType === "private" ? "bg-gold-muted" : "bg-green-mid"}`}>
            <div>
              <div className="text-sm opacity-90">
                {reservationType === "private"
                  ? `Private — ${bookingType === "day" ? "Day" : "Night"} Session (Flat Rate)`
                  : `${pax} person${pax > 1 ? "s" : ""} × ${bookingType === "day" ? "Day" : "Night"} (${formatPHP(rate)}/head)`}
              </div>
              <div className="text-[11px] opacity-75">+ {formatPHP(downpayment)} downpayment required to confirm</div>
            </div>
            <div className="font-serif text-3xl font-bold">{formatPHP(total)}</div>
          </div>

          {/* GCash downpayment instructions */}
          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
              Downpayment — GCash Only · {reservationType === "private" ? "Private" : "Public"}
            </h3>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
              <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-sm">
                {gcashConfig?.qrCodeUrl ? (
                  <img
                    src={gcashConfig.qrCodeUrl}
                    alt="GCash QR Code"
                    className="h-[150px] w-[150px] object-contain mx-auto rounded-lg"
                  />
                ) : (
                  <QRCode value={buildPlaceholderQR(downpayment)} size={150} />
                )}
              </div>
              <p className="mt-2 text-xs font-bold text-blue-900">
                Scan via GCash App · Send exactly {formatPHP(downpayment)}
              </p>
              <p className="text-[11px] text-blue-700">
                Account: {gcashConfig?.accountName || "Mabuhay Homes HOA"} · {gcashConfig?.accountNumber || HOAGCashNumber}
              </p>
            </div>

            <div>
              <label className="field-label">GCash Reference Number (Optional at booking)</label>
              <input
                className="field"
                value={gcashRef}
                onChange={(e) => setGcashRef(e.target.value)}
                placeholder="13-digit reference from receipt e.g. 1002345678901"
              />
            </div>

            <div>
              <label className="field-label">Upload GCash Receipt Screenshot (Optional)</label>
              <div className="flex items-center gap-3">
                <label className="btn-secondary cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Choose File
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleReceiptChange}
                  />
                </label>
                {receiptFile && (
                  <button
                    type="button"
                    onClick={removeReceipt}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              {receiptPreview && (
                <div className="mt-3 relative w-36 h-36 rounded-xl overflow-hidden border border-cream-2 shadow-sm">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || dateBlocked}
            className="btn-primary w-full py-4 text-center text-base font-bold shadow-md hover:shadow-lg transition disabled:opacity-50"
          >
            {submitting ? "Processing Reservation..." : `Proceed with Reservation · ${formatPHP(downpayment)} Downpayment`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ReservationPage() {
  return (
    <Suspense fallback={<div className="section"><p className="text-muted">Loading…</p></div>}>
      <BookingForm />
    </Suspense>
  );
}
