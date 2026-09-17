// GCash payment adapter.
//
// This is the single seam where a real GCash gateway plugs in. Right now it
// issues a PLACEHOLDER payment intent + QR payload so the full
// booking → payment-intent → payment-confirmation flow can be built and tested
// before real merchant credentials are available.
//
// To go live, replace `createPayment` with a call to your provider
// (e.g. PayMongo GCash e-wallet source, xendit, or the GCash business API),
// which returns a real, scannable-for-money QR string. The rest of the app
// (transaction.payment.qrPayload, status, intentId…) does not change.
//
// Note: this placeholder QR does NOT move real money and is marked as such.

import type { GcashPayment } from "./mock-data";

export const HOAGCashNumber = "0917 123 4567";

export interface CreatePaymentResult {
  payment: GcashPayment;
  placeholder: boolean;
}

// Build the placeholder QR payload for a given amount. Client-safe (no Node
// APIs), so the booking form can render a live-updating QR before submitting.
export function buildPlaceholderQR(amount: number, gcashNumber: string = HOAGCashNumber): string {
  return JSON.stringify({
    placeholder_gcash_qr: true,
    gcash_number: gcashNumber.replace(/\s+/g, ""),
    amount: Math.round(amount * 100) / 100,
    note: "PLACEHOLDER — replace with your live GCash merchant QR.",
  });
}

export function createPayment(amount: number, gcashNumber: string = HOAGCashNumber): CreatePaymentResult {
  const intentId = "txn_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const payload = buildPlaceholderQR(amount, gcashNumber);
  const parsed = JSON.parse(payload) as Record<string, unknown>;
  parsed.intent_id = intentId;

  return {
    payment: {
      provider: "gcash",
      intentId,
      qrPayload: JSON.stringify(parsed),
      status: "awaiting_payment",
    },
    placeholder: true,
  };
}
