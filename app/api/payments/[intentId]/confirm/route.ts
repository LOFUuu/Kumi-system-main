import { NextRequest, NextResponse } from "next/server";
import { getPaymentByIntent } from "@/lib/db";
import { Transaction } from "@/models";

export const dynamic = "force-dynamic";

// Marks a payment intent as "paid" using the GCash reference number the user
// supplies after completing the payment in the GCash app.
//
// This is the manual confirmation step that stands in for a live provider
// webhook until a real GCash gateway is connected. With a real provider, the
// webhook (/api/payments/webhook) would perform this update automatically and
// this endpoint would become the "refresh status" path.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ intentId: string }> }
) {
  const { intentId } = await params;
  if (!intentId) {
    return NextResponse.json({ error: "Missing intent id." }, { status: 400 });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const gcashRef = String(body.gcashRef || "").trim();
  const receiptPath = body.receiptPath ? String(body.receiptPath).trim() : undefined;
  if (!gcashRef && !receiptPath) {
    return NextResponse.json({ error: "Please enter your GCash reference number or upload a receipt." }, { status: 400 });
  }

  const txn = await getPaymentByIntent(intentId);
  if (!txn) {
    return NextResponse.json({ error: "Payment intent not found." }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const updatePayload: Record<string, unknown> = {
    "payment.status": "paid",
    "payment.paidAt": today,
  };
  if (gcashRef) {
    updatePayload.gcashRef = gcashRef;
    updatePayload["payment.gcashRef"] = gcashRef;
  }
  if (receiptPath) {
    updatePayload.receiptPath = receiptPath;
  }

  await Transaction.updateOne(
    { "payment.intentId": intentId } as any,
    { $set: updatePayload } as any
  );

  // If this transaction references an amenity reservation, update that reservation too
  if (txn.refType === "amenity" && txn.refId) {
    const resUpdate: Record<string, unknown> = {};
    if (gcashRef) resUpdate.gcashRef = gcashRef;
    if (receiptPath) resUpdate.receiptPath = receiptPath;
    if (Object.keys(resUpdate).length > 0) {
      const { Reservation } = await import("@/models");
      await Reservation.updateOne({ _id: txn.refId } as any, { $set: resUpdate } as any);
    }
  }

  const updated = await getPaymentByIntent(intentId);
  return NextResponse.json({ transactionId: txn.id, payment: updated?.payment ?? null });
}
