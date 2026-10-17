import { NextRequest, NextResponse } from "next/server";
import { getDuesRecord, updateDuesRecord, createTransaction } from "@/lib/db";
import { computeDuesStatus } from "@/lib/dues";

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

  const amount = Math.max(0, Number(body.amount) || 0);
  if (amount <= 0) {
    return NextResponse.json({ error: "Enter a valid payment amount." }, { status: 400 });
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

  const receiptPath = body.receiptPath ? String(body.receiptPath).trim() : undefined;
  const txn = await createTransaction({
    residentName: record.residentName,
    refType: "dues",
    refId: Number(id),
    userEmail: String(body.userEmail || ""),
    amount,
    paymentMethod: String(body.paymentMethod || "gcash") === "cash" ? "cash" : "gcash",
    gcashRef: String(body.gcashRef || ""),
    receiptPath: receiptPath || undefined,
    status: "pending",
    createdAt: paidAt,
  });

  return NextResponse.json({
    dues: { ...record, amountPaid, creditBalance, paidAt, status },
    transactionId: txn.id,
  });
}
