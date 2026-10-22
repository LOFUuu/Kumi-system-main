import { NextRequest, NextResponse } from "next/server";
import { getPaymentByIntent, updateTransactionById, updateReservation } from "@/lib/db";
import { validateReferenceNumber } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Allow up to 10 MB JSON body — needed because receiptPath may be a base64 data URL
export const maxDuration = 30;

// Marks a payment intent as "paid" using the GCash reference number the user
// supplies after completing the payment in the GCash app.
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

  const txn = await getPaymentByIntent(intentId);
  if (!txn) {
    return NextResponse.json({ error: "Payment intent not found." }, { status: 404 });
  }

  const finalReceiptPath = receiptPath || txn.receiptPath;
  const finalGcashRef = gcashRef || txn.gcashRef;

  const refErr = validateReferenceNumber(finalGcashRef, { required: true, label: "GCash reference number" });
  if (refErr) {
    return NextResponse.json({ error: refErr }, { status: 400 });
  }
  if (!finalReceiptPath) {
    return NextResponse.json({ error: "Please upload a proof of payment receipt image." }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const currentPayment = txn.payment || ({} as any);
  const updatedPayment = {
    ...currentPayment,
    status: "paid",
    paidAt: today,
    ...(gcashRef ? { gcashRef } : {}),
  };

  const updatePayload: Record<string, unknown> = {
    payment: updatedPayment,
    status: "pending", // awaiting admin review/approval of receipt
  };
  if (gcashRef) {
    updatePayload.gcashRef = gcashRef;
  }
  if (receiptPath) {
    updatePayload.receiptPath = receiptPath;
  }

  await updateTransactionById(txn.id, updatePayload);

  // If this transaction references an amenity reservation, update that reservation too
  if (txn.refType === "amenity" && txn.refId) {
    const resUpdate: Record<string, unknown> = {};
    if (gcashRef) resUpdate.gcashRef = gcashRef;
    if (receiptPath) resUpdate.receiptPath = receiptPath;
    if (Object.keys(resUpdate).length > 0) {
      await updateReservation(txn.refId, resUpdate);
    }
  }

  // Trigger Notifications for Payment Submission
  const { notifyAdmins, notifyUserByEmail } = await import("@/lib/db");
  const amountStr = txn.amount ? `₱${txn.amount}` : "payment";
  const purpose = txn.refType === "amenity" ? "Amenity Reservation" : "HOA Payment";

  notifyAdmins({
    title: "New Payment Submitted for Verification",
    message: `${txn.residentName || "User"} submitted a GCash payment (${amountStr}${gcashRef ? `, Ref: ${gcashRef}` : ""}) for ${purpose}. Pending HOA review.`,
    type: "payment",
    referenceId: txn.id,
    link: "/admin/payments",
    metadata: {
      amount: txn.amount,
      gcashRef: gcashRef || undefined,
      residentName: txn.residentName,
      refType: txn.refType,
      status: "Pending Verification",
    },
  }).catch(() => {});

  if (txn.userEmail) {
    notifyUserByEmail(txn.userEmail, {
      title: "Payment Submitted - Pending Verification",
      message: `Your GCash payment of ${amountStr}${gcashRef ? ` (Ref: ${gcashRef})` : ""} for ${purpose} has been received and is pending HOA verification.`,
      type: "payment",
      referenceId: txn.id,
      link: "/history?tab=payments",
      metadata: {
        amount: txn.amount,
        gcashRef: gcashRef || undefined,
        status: "Pending Verification",
      },
    }).catch(() => {});
  }

  const updated = await getPaymentByIntent(intentId);
  return NextResponse.json({ transactionId: txn.id, payment: updated?.payment ?? null });
}
