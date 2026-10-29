import { NextRequest, NextResponse } from "next/server";
import { createTransaction, createDuesRecord, getDues, getPaymentConfig, updateDuesRecord } from "@/lib/db";
import { DEFAULT_MONTHLY_DUE, getCycleDueDate } from "@/lib/dues";
import { validateAmount, validateReferenceNumber } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amount = Number(body.amount);
    const amtErr = validateAmount(amount, { required: true, label: "Advance payment amount", min: 1 });
    if (amtErr) {
      return NextResponse.json({ error: amtErr }, { status: 400 });
    }

    const gcashRef = String(body.gcashRef || "").trim();
    const refErr = validateReferenceNumber(gcashRef, { required: true, label: "GCash reference number" });
    if (refErr) {
      return NextResponse.json({ error: refErr }, { status: 400 });
    }

    const userEmail = String(body.userEmail || "").toLowerCase().trim();
    const residentName = String(body.residentName || "Resident Homeowner").trim();
    const blockNo = String(body.blockNo || "").trim();
    const lotNo = String(body.lotNo || "").trim();
    const paidAt = String(body.paidAt || new Date().toISOString().slice(0, 10));
    const autoApprove = Boolean(body.autoApprove);
    const advanceForMonth = body.advanceForMonth ? String(body.advanceForMonth) : undefined;
    const allocatedAmount = body.allocatedAmount != null ? Number(body.allocatedAmount) : amount;
    const creditAmount = body.creditAmount != null ? Number(body.creditAmount) : 0;

    const txn = await createTransaction({
      residentName,
      refType: "dues",
      userEmail,
      amount,
      paymentMethod: "gcash",
      gcashRef,
      receiptPath: body.receiptPath || undefined,
      status: autoApprove ? "approved" : "pending",
      createdAt: paidAt,
      advanceForMonth,
      allocatedAmount,
      creditAmount,
    });

    // If auto-approved, handle advance month dues record creation
    if (autoApprove && advanceForMonth) {
      const cfg = await getPaymentConfig("dues").catch(() => null);
      const confMonthly = cfg?.monthlyDue || DEFAULT_MONTHLY_DUE;
      const months = advanceForMonth.split(",").map((s) => s.trim()).filter(Boolean);

      const allDues = await getDues();
      for (const m of months) {
        const existing = allDues.find(
          (d) =>
            d.dueMonth.startsWith(m) &&
            (d.residentName.toLowerCase() === residentName.toLowerCase() ||
              (d.blockNo === blockNo && d.lotNo === lotNo))
        );

        if (existing) {
          await updateDuesRecord(existing.id, {
            amountPaid: existing.amountDue,
            status: "paid",
            paidAt,
          });
        } else {
          const [y, mm] = m.split("-").map(Number);
          await createDuesRecord({
            residentName,
            blockNo,
            lotNo,
            dueMonth: m,
            dueDate: getCycleDueDate(m),
            amountDue: confMonthly,
            amountPaid: confMonthly,
            creditBalance: 0,
            status: "paid",
            paidAt,
            source: "advance_payment",
            billingMonth: String(mm),
            billingYear: Number(y),
            isArchived: false,
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      transactionId: txn.id,
      pendingVerification: !autoApprove,
    });
  } catch (err) {
    console.error("Error processing advance dues payment:", err);
    return NextResponse.json({ error: "Failed to process advance payment." }, { status: 500 });
  }
}
