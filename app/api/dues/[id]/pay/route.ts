import { NextRequest, NextResponse } from "next/server";
import { getDuesRecord, updateDuesRecord, createTransaction } from "@/lib/db";
import { computeDuesStatus } from "@/lib/dues";
import { validateAmount, validateReferenceNumber } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const amount = Number(body.amount);
  const amtErr = validateAmount(amount, { required: true, label: "Payment amount", min: 1 });
  if (amtErr) {
    return NextResponse.json({ error: amtErr }, { status: 400 });
  }

  const paymentMethod = String(body.paymentMethod || "gcash") === "cash" ? "cash" : "gcash";
  const receiptPath = body.receiptPath ? String(body.receiptPath).trim() : undefined;
  const userEmail = String(body.userEmail || "").toLowerCase().trim();
  const gcashRef = String(body.gcashRef || "").trim();

  if (paymentMethod === "gcash") {
    const refErr = validateReferenceNumber(gcashRef, { required: true, label: "GCash reference number" });
    if (refErr) {
      return NextResponse.json({ error: refErr }, { status: 400 });
    }
    if (!receiptPath) {
      return NextResponse.json({ error: "Please upload a proof of payment receipt image." }, { status: 400 });
    }
  }

  const record = await getDuesRecord(id);
  if (!record) {
    return NextResponse.json({ error: "Dues record not found." }, { status: 404 });
  }

  const paidAt = String(body.paidAt || new Date().toISOString().slice(0, 10));
  const amountPaid = record.amountPaid + amount;
  const amountDue = record.amountDue;
  const creditBalance = Math.max(0, amountPaid - amountDue);
  const status = computeDuesStatus({ dueMonth: record.dueMonth, dueDate: record.dueDate, amountDue, amountPaid, paidAt });

  await updateDuesRecord(id, { amountPaid, creditBalance, paidAt, status });

  const txn = await createTransaction({
    residentName: record.residentName,
    refType: "dues",
    refId: Number(id),
    userEmail,
    amount,
    paymentMethod: String(body.paymentMethod || "gcash") === "cash" ? "cash" : "gcash",
    gcashRef,
    receiptPath: receiptPath || undefined,
    status: "pending",
    createdAt: paidAt,
  });

  // Notify Admins and User
  const { notifyAdmins, notifyUserByEmail } = await import("@/lib/db");
  notifyAdmins({
    title: "New Dues Payment Submitted",
    message: `${record.residentName} submitted a dues payment of ₱${amount} for ${record.dueMonth} (GCash Ref: ${gcashRef || "Receipt Uploaded"}). Pending verification.`,
    type: "payment",
    referenceId: txn.id,
    link: "/admin/payments?tab=dues",
    metadata: {
      amount,
      gcashRef: gcashRef || undefined,
      residentName: record.residentName,
      month: record.dueMonth,
      status: "Pending Verification",
    },
  }).catch(() => {});

  if (userEmail) {
    notifyUserByEmail(userEmail, {
      title: "Dues Payment Submitted",
      message: `Your dues payment of ₱${amount} for ${record.dueMonth} has been submitted and is pending HOA verification.`,
      type: "payment",
      referenceId: txn.id,
      link: "/my-dues",
      metadata: {
        amount,
        gcashRef: gcashRef || undefined,
        month: record.dueMonth,
        status: "Pending Verification",
      },
    }).catch(() => {});
  }

  return NextResponse.json({
    dues: { ...record, amountPaid, creditBalance, paidAt, status },
    transactionId: txn.id,
  });
}
