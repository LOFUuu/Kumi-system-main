"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import {
  Check,
  QrCode,
  Upload,
  X,
  Receipt,
  FileText,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Clock,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPHP, type GcashPayment, type Reservation } from "@/lib/mock-data";

function ConfirmBody() {
  const searchParams = useSearchParams();
  const resId = Number(searchParams.get("res"));
  const intent = searchParams.get("intent") || "";

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [payment, setPayment] = useState<GcashPayment | null>(null);
  const [paymentPlaceholder, setPaymentPlaceholder] = useState(false);
  const [gcashRef, setGcashRef] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [action, setAction] = useState("");
  const [step, setStep] = useState<"form" | "review">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullReceipt, setShowFullReceipt] = useState(false);

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(String(reader.result));
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview("");
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview("");
  };

  useEffect(() => {
    if (!resId) return;
    api
      .reservations()
      .then((list) => {
        const found = list.find((r) => r.id === resId);
        if (found) {
          setReservation(found);
          if (found.receiptPath && !receiptPreview) {
            setReceiptPreview(found.receiptPath);
          }
          if (found.gcashRef && !gcashRef) {
            setGcashRef(found.gcashRef);
          }
        }
      })
      .catch(() => {});
  }, [resId]);

  useEffect(() => {
    if (!intent) return;
    api
      .payment(intent)
      .then((p) => {
        setPayment(p.payment);
        setPaymentPlaceholder(true);
        if (p.payment?.status === "paid" && p.payment.gcashRef) {
          setGcashRef(p.payment.gcashRef);
        }
      })
      .catch(() => {});
  }, [intent]);

  if (!reservation) {
    return (
      <div className="section">
        <p className="text-muted">Loading confirmation…</p>
      </div>
    );
  }

  const paid = payment?.status === "paid";

  /** Step 1: validate fields, then transition to Review Step */
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intent) return;
    if (!gcashRef.trim() && !receiptFile && !reservation?.receiptPath) {
      setAction("Please provide a GCash Reference Number or upload a receipt before proceeding.");
      return;
    }
    setAction("");
    setStep("review");
  };

  /** Step 2: user clicks "Confirm & Submit Payment →" on the review page */
  const confirmPayment = async () => {
    if (!intent || !reservation || isSubmitting) return;
    setIsSubmitting(true);
    setAction("");

    try {
      let uploadedReceiptPath: string | undefined = reservation.receiptPath;

      if (receiptFile) {
        // Pass intentId so the upload route saves the receipt directly to MongoDB.
        // This avoids re-sending the large base64 string in the confirm step's JSON body.
        const fd = new FormData();
        fd.append("file", receiptFile);
        fd.append("intentId", intent);
        const uploadRes = await fetch("/api/payments/upload", {
          method: "POST",
          cache: "no-store",
          body: fd,
        });
        const uploadJson = await uploadRes.json().catch(() => null);
        if (!uploadRes.ok) {
          throw new Error((uploadJson as any)?.error || `Upload failed (${uploadRes.status})`);
        }
        uploadedReceiptPath = (uploadJson as any).path;
      }

      // Confirm the payment — only send gcashRef (short string), NOT the base64 data URL,
      // to avoid hitting the JSON body size limit.
      const res = await fetch(`/api/payments/${intent}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gcashRef: gcashRef.trim(),
          receiptPath: receiptFile ? undefined : uploadedReceiptPath,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((json as any)?.error || `Confirmation failed (${res.status})`);
      }

      setPayment(json.payment);
      if (uploadedReceiptPath) {
        setReservation((prev) => (prev ? { ...prev, receiptPath: uploadedReceiptPath, gcashRef } : null));
      }
    } catch (err: unknown) {
      setAction(err instanceof Error ? err.message : "Could not confirm payment. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const rows: [string, string][] = [
    ["Amenity", reservation.amenityName],
    ["Name", reservation.residentName],
    ["Phone", reservation.phone || "—"],
    ["Date", reservation.date],
    ["Session", reservation.bookingType === "day" ? "Day (6AM–6PM)" : "Night (6PM–10PM)"],
    ["Reservation Type", reservation.reservationType],
    ["Persons", String(reservation.paxCount)],
    ["Status", reservation.status],
  ];

  return (
    <div className="section">
      {/* ── Full Receipt Modal (Optional Zoom View) ────────────────── */}
      {showFullReceipt && (receiptPreview || reservation?.receiptPath) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowFullReceipt(false)}
        >
          <div className="relative max-w-2xl w-full bg-white rounded-2xl p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-cream-2">
              <span className="font-bold text-sm text-green-dark">Receipt Preview</span>
              <button
                onClick={() => setShowFullReceipt(false)}
                className="p-1 rounded-lg text-muted hover:bg-cream hover:text-green-dark"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 max-h-[80vh] overflow-auto flex items-center justify-center">
              <img
                src={receiptPreview || reservation?.receiptPath}
                alt="Full Receipt"
                className="max-w-full max-h-[70vh] object-contain rounded-xl border"
              />
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-xl rounded-3xl border border-green-light/40 bg-white p-0 shadow-sm overflow-hidden">
        {/* ── HEADER CARD ─────────────────────────────────────────── */}
        <div className="bg-green-mid p-8 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
            {paid ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-300" />
            ) : step === "review" ? (
              <ShieldCheck className="h-7 w-7 text-amber-200" />
            ) : (
              <QrCode className="h-7 w-7 text-white" />
            )}
          </div>
          <h2 className="font-serif text-2xl font-bold">
            {paid
              ? "Payment Submitted Successfully!"
              : step === "review"
              ? "Review Your Payment & Reservation"
              : "Complete Payment"}
          </h2>
          <p className="mt-1 text-sm text-green-light max-w-md mx-auto">
            {paid
              ? "Your payment is recorded and your reservation is pending HOA verification."
              : step === "review"
              ? "Please review your reservation and payment details before confirming."
              : "Scan the QR code with GCash or use the number below to send your downpayment."}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* ════════════════════════════════════════════════════════ */}
          {/* STATE 1: SUCCESS PAGE (AFTER FINAL SUBMISSION)           */}
          {/* ════════════════════════════════════════════════════════ */}
          {paid && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                <div className="text-xs text-emerald-900 leading-relaxed">
                  <p className="font-bold text-sm text-emerald-950 mb-0.5">Status: Pending Verification</p>
                  Downpayment recorded. Your reservation is now pending HOA approval. The admin will review your receipt and approve your booking.
                </div>
              </div>

              {/* Booking Summary */}
              <div className="rounded-2xl border border-cream-2 bg-cream/30 p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Reservation Summary</h3>
                <dl className="divide-y divide-cream-2">
                  {rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between py-2 text-sm">
                      <dt className="text-muted">{k}</dt>
                      <dd className="font-semibold text-green-dark capitalize">{v}</dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2 text-sm">
                    <dt className="text-muted">Downpayment Paid</dt>
                    <dd className="font-bold text-green-mid">{formatPHP(reservation.downpayment)}</dd>
                  </div>
                  {gcashRef && (
                    <div className="flex items-center justify-between py-2 text-sm">
                      <dt className="text-muted">GCash Ref #</dt>
                      <dd className="font-mono font-bold text-green-dark">{gcashRef}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Uploaded Receipt Preview */}
              {(receiptPreview || reservation.receiptPath) && (
                <div className="rounded-2xl border border-cream-2 bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-green-mid" />
                      <span className="text-xs font-bold text-green-dark">Uploaded Receipt:</span>
                    </div>
                    <button
                      onClick={() => setShowFullReceipt(true)}
                      className="text-xs font-semibold text-green-mid hover:underline flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Full Image
                    </button>
                  </div>
                  <div
                    onClick={() => setShowFullReceipt(true)}
                    className="relative rounded-xl border border-cream-2 overflow-hidden bg-cream/40 cursor-pointer group flex items-center justify-center p-2"
                  >
                    <img
                      src={receiptPreview || reservation.receiptPath}
                      alt="Uploaded receipt"
                      className="max-h-56 object-contain rounded-lg group-hover:scale-105 transition duration-200"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <Link href="/history" className="btn-green flex-1 text-center !py-3 text-sm font-bold">
                  View in History →
                </Link>
                <Link href="/reservation" className="btn-ghost flex-1 text-center !py-3 text-sm">
                  Book Another
                </Link>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/* STATE 2: STEP 1 - PAYMENT INPUT FORM                      */}
          {/* ════════════════════════════════════════════════════════ */}
          {!paid && step === "form" && (
            <div className="space-y-6">
              {/* Summary Accordion/Card */}
              <div className="rounded-2xl border border-cream-2 bg-cream/30 p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Booking Summary</h3>
                <dl className="divide-y divide-cream-2">
                  {rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between py-2 text-sm">
                      <dt className="text-muted">{k}</dt>
                      <dd className="font-semibold text-green-dark capitalize">{v}</dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2 text-sm">
                    <dt className="text-muted">Downpayment Required</dt>
                    <dd className="font-bold text-green-mid">{formatPHP(reservation.downpayment)} (GCash)</dd>
                  </div>
                  <div className="flex items-center justify-between py-2 text-sm">
                    <dt className="text-muted">Total Amount</dt>
                    <dd className="font-serif text-base font-bold text-green-dark">{formatPHP(reservation.totalAmount)}</dd>
                  </div>
                </dl>
              </div>

              {/* QR Code Section */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 text-center">
                {payment && (
                  <>
                    <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-sm">
                      <QRCode value={payment.qrPayload} size={170} />
                    </div>
                    <div className="mt-4 font-serif text-2xl font-bold tracking-[3px] text-blue-600">0917 123 4567</div>
                    <div className="text-xs font-semibold text-muted">MABUHAY HOMES HOA — Scan to Pay</div>
                    {paymentPlaceholder && (
                      <p className="mt-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700">
                        Demo QR — real GCash merchant QR replaces this when gateway is connected
                      </p>
                    )}
                    <p className="mt-3 text-sm text-muted">
                      Pay exactly <strong className="text-green-mid">{formatPHP(reservation.downpayment)}</strong> in the GCash app.
                    </p>
                  </>
                )}

                {/* Form fields */}
                <form onSubmit={handleProceedToReview} className="mt-5 space-y-4 text-left">
                  <div>
                    <label className="field-label">GCash Reference Number</label>
                    <input
                      className="field"
                      value={gcashRef}
                      onChange={(e) => setGcashRef(e.target.value)}
                      placeholder="e.g. 1002 9384 7561"
                    />
                  </div>

                  <div>
                    <label className="field-label">Attach Proof of Payment (Receipt Screenshot)</label>
                    {!receiptFile && !receiptPreview ? (
                      <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-white p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition group">
                        <Upload className="h-5 w-5 text-blue-500 group-hover:scale-110 transition" />
                        <span className="mt-1 text-xs font-bold text-green-dark">Click to upload receipt</span>
                        <span className="text-[10px] text-muted">JPG, PNG, WEBP, or PDF up to 4MB</span>
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
                              <p className="text-xs font-bold text-green-dark truncate">
                                {receiptFile?.name || "Payment Receipt"}
                              </p>
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                                <Check className="h-3 w-3" /> Receipt attached
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

                  {action && <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{action}</p>}

                  <button type="submit" className="btn-green w-full !py-3.5 text-sm font-bold flex items-center justify-center gap-2">
                    Review & Confirm Reservation <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════ */}
          {/* STATE 3: STEP 2 - CONFIRMATION / REVIEW PAGE             */}
          {/* ════════════════════════════════════════════════════════ */}
          {!paid && step === "review" && (
            <div className="space-y-6">
              {/* Section 1: Reservation Details */}
              <div className="rounded-2xl border border-cream-2 bg-cream/30 p-5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-cream-2">
                  <Clock className="h-4 w-4 text-green-mid" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-green-dark">1. Reservation Details</h3>
                </div>
                <dl className="divide-y divide-cream-2/80 text-sm">
                  {rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between py-2">
                      <dt className="text-muted text-xs">{k}</dt>
                      <dd className="font-semibold text-green-dark capitalize text-xs">{v}</dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-muted text-xs">Total Amount</dt>
                    <dd className="font-serif text-sm font-bold text-green-dark">{formatPHP(reservation.totalAmount)}</dd>
                  </div>
                </dl>
              </div>

              {/* Section 2: Payment Details */}
              <div className="rounded-2xl border border-cream-2 bg-white p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-cream-2">
                  <Receipt className="h-4 w-4 text-green-mid" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-green-dark">2. Payment Submitted Details</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-cream/50 p-3">
                    <span className="text-muted block text-[11px]">Payment Method</span>
                    <span className="font-bold text-green-dark text-sm mt-0.5 block">GCash</span>
                  </div>
                  <div className="rounded-xl bg-cream/50 p-3">
                    <span className="text-muted block text-[11px]">Downpayment Amount</span>
                    <span className="font-bold text-green-mid text-sm mt-0.5 block">{formatPHP(reservation.downpayment)}</span>
                  </div>
                  <div className="col-span-2 rounded-xl bg-cream/50 p-3 flex justify-between items-center">
                    <div>
                      <span className="text-muted block text-[11px]">GCash Reference Number</span>
                      <span className="font-mono font-bold text-green-dark text-sm mt-0.5 block">
                        {gcashRef.trim() || "(No reference number typed)"}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold text-[10px]">
                      Pending Verification
                    </span>
                  </div>
                </div>

                {/* Receipt Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-green-dark">Proof of Payment Preview:</span>
                    {(receiptPreview || reservation.receiptPath) && (
                      <button
                        onClick={() => setShowFullReceipt(true)}
                        className="text-[11px] font-semibold text-green-mid hover:underline flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" /> Click to enlarge
                      </button>
                    )}
                  </div>
                  {receiptPreview || reservation.receiptPath ? (
                    <div
                      onClick={() => setShowFullReceipt(true)}
                      className="relative rounded-xl border border-cream-2 overflow-hidden bg-cream/40 p-2 cursor-pointer group flex items-center justify-center"
                    >
                      <img
                        src={receiptPreview || reservation.receiptPath}
                        alt="GCash Receipt Preview"
                        className="max-h-48 object-contain rounded-lg group-hover:scale-105 transition duration-200"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-3 text-center text-xs text-amber-800">
                      No receipt screenshot attached.
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Confirmation Notice */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span>Please review your information carefully before submitting.</span>
                </div>
                <p className="text-[11px] text-amber-800 pl-6 leading-relaxed">
                  Once submitted, your payment and reservation will be sent for verification. The HOA admin will review your receipt and update your booking status.
                </p>
              </div>

              {/* Action Error Message */}
              {action && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
                  {action}
                </p>
              )}

              {/* Section 4: Confirmation Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  disabled={isSubmitting}
                  className="btn-ghost flex-1 !py-3 text-sm font-semibold flex items-center justify-center gap-2 order-2 sm:order-1"
                >
                  <ArrowLeft className="h-4 w-4" /> ← Back & Edit
                </button>
                <button
                  type="button"
                  onClick={confirmPayment}
                  disabled={isSubmitting}
                  className="btn-green flex-1 !py-3.5 text-sm font-bold flex items-center justify-center gap-2 order-1 sm:order-2"
                >
                  {isSubmitting ? (
                    <span>Submitting Payment...</span>
                  ) : (
                    <>
                      Confirm & Submit Payment <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="section"><p className="text-muted">Loading…</p></div>}>
      <ConfirmBody />
    </Suspense>
  );
}
