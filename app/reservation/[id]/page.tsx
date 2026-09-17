"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Lock, Check, Upload, Image as ImageIcon, X, Smartphone, Receipt, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { buildPlaceholderQR } from "@/lib/payment";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import {
  formatPHP,
  getBookingTotal,
  getRate,
  type Amenity,
} from "@/lib/mock-data";

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

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    api.amenities().then((list) => {
      const a = list.find((x) => x.id === id);
      setNotFound(!a);
      if (a) setAmenity(a);
    });
    api.availability(id).then((r) => setBlocked(r.blocked)).catch(() => {});
  }, [id]);

  const rate = amenity ? getRate(amenity, bookingType, isResident) : 0;
  const total = amenity
    ? getBookingTotal(amenity, bookingType, reservationType, pax, isResident)
    : 0;
  const downpayment = amenity
    ? (reservationType === "private" ? amenity.downpaymentPrivate : amenity.downpayment)
    : 0;

  const dateBlocked = blocked.includes(date);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?next=${next}&reason=book`);
      return;
    }
    if (!amenity) return;
    if (dateBlocked) {
      setError("The selected date is fully booked. Please pick another date.");
      return;
    }
    setSubmitting(true);
    try {
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

        {error && (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-5">
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

          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Booking Details</h3>

            <div>
              <label className="field-label">Reservation Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setReservationType("public")}
                  className={`rounded-xl border-2 p-3 text-left transition ${reservationType === "public" ? "border-green-mid bg-green-light/10" : "border-cream-2"}`}>
                  <div className="text-sm font-bold text-green-dark">Public</div>
                  <div className="text-xs text-muted">Per head · resident gets 20% off</div>
                </button>
                <button type="button" onClick={() => setReservationType("private")}
                  className={`rounded-xl border-2 p-3 text-left transition ${reservationType === "private" ? "border-gold bg-gold/10" : "border-cream-2"}`}>
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
                    className={`rounded-xl border-2 p-3 text-left transition ${bookingType === s ? "border-green-mid bg-green-light/10" : "border-cream-2"}`}>
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
              <label className="field-label">Booking Date * — pick an available day</label>
              <AvailabilityCalendar
                blocked={blocked}
                selected={date}
                onSelect={(iso) => {
                  setDate(iso);
                  setError("");
                }}
              />
              <p className="mt-1 text-xs text-muted">
                Red dates are locked (fully booked or a private reservation). Selected: <strong className="text-green-mid">{date}</strong>
              </p>
              {dateBlocked && (
                <p className="mt-1 text-[11px] font-semibold text-danger">This date is fully booked. Pick another.</p>
              )}
            </div>

            <div>
              <label className="field-label">Number of Persons *</label>
              <input type="number" className="field" min={1} max={amenity.maxCapacity} value={pax}
                onChange={(e) => setPax(Number(e.target.value) || 1)} />
              <p className="mt-1 text-xs text-muted">Max {amenity.maxCapacity} pax</p>
            </div>

            <div>
              <label className="field-label">Additional Notes</label>
              <textarea className="field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special requests, group details…" />
            </div>
          </div>

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

          <div className="card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
              Downpayment — GCash Only · {reservationType === "private" ? "Private" : "Public"}
            </h3>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
              <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-sm">
                <QRCode value={buildPlaceholderQR(downpayment)} size={150} />
              </div>
              <div className="mt-3 font-serif text-2xl font-bold tracking-[3px] text-blue-600">0917 123 4567</div>
              <div className="text-xs font-semibold text-muted">MABUHAY HOMES HOA — Scan to Pay</div>
              <p className="mt-1 inline-block rounded-full bg-blue-100 px-3 py-0.5 text-[10px] font-semibold text-blue-700">
                Demo QR — live GCash QR replaces this when the gateway is connected
              </p>
              <p className="mt-3 text-[11px] text-muted">
                Amount updates automatically with your reservation type, session, and pax.
                Send exactly <strong className="text-green-mid">{formatPHP(downpayment)}</strong> now, or upload your receipt and enter your reference number below.
              </p>
            </div>

            {/* Payment Proof / Receipt Upload Area */}
            <div className="rounded-2xl border border-cream-2 bg-cream/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="h-4 w-4 text-green-mid" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-green-dark">
                  Proof of Payment (GCash Receipt)
                </h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="field-label">GCash Reference Number (Optional if paying now)</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      className="field pl-9"
                      value={gcashRef}
                      onChange={(e) => setGcashRef(e.target.value)}
                      placeholder="e.g. 1002 9384 7561"
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">Upload Receipt Screenshot / Photo</label>
                  
                  {!receiptFile ? (
                    <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-cream-2 bg-white p-5 cursor-pointer hover:border-green-mid hover:bg-green-light/5 transition group">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream group-hover:bg-green-light/20 text-muted group-hover:text-green-mid transition">
                        <Upload className="h-5 w-5" />
                      </div>
                      <span className="mt-2 text-xs font-bold text-green-dark">Click to upload receipt image</span>
                      <span className="text-[11px] text-muted mt-0.5">JPG, PNG, WEBP, or PDF up to 10MB</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleReceiptChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="rounded-xl border border-cream-2 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {receiptPreview ? (
                            <img
                              src={receiptPreview}
                              alt="Receipt Preview"
                              className="h-14 w-14 rounded-lg object-cover border border-cream-2 flex-shrink-0"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-cream flex-shrink-0">
                              <FileText className="h-6 w-6 text-muted" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-green-dark truncate">{receiptFile.name}</p>
                            <p className="text-[10px] text-muted">{Math.round(receiptFile.size / 1024)} KB · Receipt Attached</p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 mt-0.5">
                              <Check className="h-3 w-3" /> Ready to submit
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeReceipt}
                          className="rounded-lg p-1.5 text-muted hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Remove receipt"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isResident && reservationType === "public" && (
              <p className="flex items-center gap-1 text-xs font-semibold text-green-mid"><Check className="h-3.5 w-3.5" /> 20% resident discount applied to your rate.</p>
            )}
          </div>

          <button type="submit" disabled={submitting} className="btn-gold w-full !py-3.5 text-[15px]">
            {submitting ? "Uploading & Submitting…" : "Review & Confirm Reservation →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="section"><p className="text-muted">Loading…</p></div>}>
      <BookingForm />
    </Suspense>
  );
}
