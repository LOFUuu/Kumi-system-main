"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Check, QrCode, Upload, X, Receipt, FileText, AlertCircle } from "lucide-react";
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
    api.reservations().then((list) => {
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
    }).catch(() => {});
  }, [resId]);

  useEffect(() => {
    if (!intent) return;
    api.payment(intent).then((p) => {
      setPayment(p.payment);
      setPaymentPlaceholder(true);
      if (p.payment?.status === "paid" && p.payment.gcashRef) {
        setGcashRef(p.payment.gcashRef);
      }
    }).catch(() => {});
  }, [intent]);

  if (!reservation) {
    return (
      <div className="section">
        <p className="text-muted">Loading confirmation…</p>
      </div>
    );
  }

  const paid = payment?.status === "paid";
  const readyForReview = paid;

  /** Step 1: validate fields, then show the confirmation modal */
  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intent) return;
    if (!gcashRef.trim() && !receiptFile && !reservation?.receiptPath) {
      setAction("Please provide a GCash Reference Number or upload a receipt.");
      return;
    }
    setAction("");
    setShowConfirmModal(true);
  };

  /** Step 2: user clicked "Yes, Confirm" inside the modal → actually submit */
  const confirmPayment = async () => {
    if (!intent || !reservation) return;
    setShowConfirmModal(false);
    setAction("Uploading & submitting…");
    try {
      let uploadedReceiptPath: string | undefined = reservation.receiptPath;
      if (receiptFile) {
        const uploadRes = await api.uploadPaymentReceipt(receiptFile);
        uploadedReceiptPath = uploadRes.path;
      }

      const res = await api.confirmPayment(intent, gcashRef.trim(), uploadedReceiptPath);
      setPayment(res.payment);
      setAction("");
      if (uploadedReceiptPath) {
        setReservation((prev) => prev ? { ...prev, receiptPath: uploadedReceiptPath, gcashRef } : null);
      }
    } catch (err: unknown) {
      setAction(err instanceof Error ? err.message : "Could not confirm payment. Try again.");
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
      {/* ── Confirmation Modal ───────────────────────────────────── */}
      {showConfirmModal && reservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-green-dark">Confirm Payment Submission</h3>
                <p className="mt-0.5 text-xs text-muted">Please review the details before finalizing.</p>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-cream/60 divide-y divide-cream-2 text-sm">
              {gcashRef.trim() && (
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-muted">GCash Ref #</span>
                  <span className="font-bold text-green-dark">{gcashRef.trim()}</span>
                </div>
              )}
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-muted">Amount</span>
                <span className="font-bold text-green-mid">{formatPHP(reservation.downpayment)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-muted">Receipt</span>
                <span className="font-semibold text-green-dark">
                  {receiptFile ? receiptFile.name : (reservation.receiptPath ? "Previously uploaded" : "None")}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted">
              Once submitted, the HOA admin will review your payment. Make sure all details are correct.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-ghost flex-1 !py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                className="btn-green flex-1 !py-2.5 text-sm font-bold"
              >
                Yes, Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-xl rounded-3xl border border-green-light/40 bg-white p-0 shadow-sm">
        <div className="rounded-t-3xl bg-green-mid p-8 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
            {payment ? <QrCode className="h-7 w-7" /> : <Check className="h-7 w-7" />}
          </div>
          <h2 className="font-serif text-2xl font-bold">
            {paid ? "Payment Received" : payment ? "Complete Payment" : "Request Submitted"}
          </h2>
          <p className="mt-1 text-sm text-green-light">
            {paid
              ? "Your payment is recorded and your reservation is pending HOA approval."
              : payment
                ? "Scan the QR with GCash to pay your downpayment."
                : "This reservation is pending until you complete the GCash downpayment."}
          </p>
        </div>

        <div className="p-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Booking Summary</h3>
          <dl className="divide-y divide-cream-2">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold text-green-dark capitalize">{v}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between py-2.5 text-sm">
              <dt className="text-muted">Downpayment</dt>
              <dd className="font-bold text-green-mid">{formatPHP(reservation.downpayment)} (GCash)</dd>
            </div>
            <div className="flex items-center justify-between py-2.5 text-sm">
              <dt className="text-muted">Total</dt>
              <dd className="font-serif text-lg font-bold text-green-dark">{formatPHP(reservation.totalAmount)}</dd>
            </div>
          </dl>

          {payment && !paid && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-center">
              <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-sm">
                <QRCode value={payment.qrPayload} size={180} />
              </div>
              <div className="mt-4 font-serif text-2xl font-bold tracking-[3px] text-blue-600">0917 123 4567</div>
              <div className="text-xs font-semibold text-muted">MABUHAY HOMES HOA — Scan to Pay</div>
              {paymentPlaceholder && (
                <p className="mt-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700">
                  Demo QR — real GCash merchant QR replaces this when the gateway is connected
                </p>
              )}
              <p className="mt-3 text-sm text-muted">
                Pay exactly <strong className="text-green-mid">{formatPHP(reservation.downpayment)}</strong> in the GCash app.
              </p>

              <form onSubmit={handleSubmitClick} className="mt-4 space-y-3 text-left">
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
                      <span className="text-[10px] text-muted">JPG, PNG, WEBP, or PDF up to 10MB</span>
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

                {action && <p className="text-sm font-semibold text-green-mid">{action}</p>}
                <button type="submit" className="btn-green w-full !py-3 text-sm">
                  I&apos;ve Paid — Submit Confirmation
                </button>
              </form>
            </div>
          )}

          {readyForReview && (
            <div className="mt-5 space-y-3">
              <div className="flex gap-2 rounded-xl bg-green-light/20 p-4 text-xs text-muted">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-mid" />
                <span>Downpayment recorded. Your reservation is now <b className="text-green-dark">pending HOA approval</b>. The HOA admin will review your receipt and approve your booking.</span>
              </div>
              {reservation.receiptPath && (
                <div className="rounded-xl border border-cream-2 bg-cream/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="h-4 w-4 text-green-mid" />
                    <span className="text-xs font-bold text-green-dark">Uploaded Receipt:</span>
                  </div>
                  <img
                    src={reservation.receiptPath}
                    alt="Uploaded receipt"
                    className="max-h-48 rounded-lg border border-cream-2 object-contain bg-white"
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Link href="/history" className="btn-green flex-1 text-center !py-2.5 text-sm font-bold">
              View in History →
            </Link>
            <Link href="/reservation" className="btn-ghost flex-1 !py-2.5 text-sm">
              Book Another
            </Link>
          </div>
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
