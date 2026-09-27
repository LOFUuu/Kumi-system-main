import { NextRequest, NextResponse } from "next/server";
import { getDues, generateMonthlyDues } from "@/lib/db";
import { DuesRecord } from "@/models";
import { computeDuesStatus, creditFor, getCycleDueDate, DEFAULT_MONTHLY_DUE } from "@/lib/dues";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getDues();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Trigger generation for specific month
    if (body.action === "generate") {
      const result = await generateMonthlyDues(body.dueMonth);
      const data = await getDues();
      return NextResponse.json({ ok: true, createdCount: result.createdCount, dues: data });
    }

    // Manual single record creation
    const residentName = String(body.residentName || "").trim();
    const dueMonth = String(body.dueMonth || "").trim();
    if (!residentName || !dueMonth) {
      return NextResponse.json({ error: "Resident name and due month are required." }, { status: 400 });
    }

    const amountDue = Number(body.amountDue) || DEFAULT_MONTHLY_DUE;
    const amountPaid = Number(body.amountPaid) || 0;
    const dueDate = body.dueDate || getCycleDueDate(dueMonth);
    const paidAt = body.paidAt || (amountPaid > 0 ? new Date().toISOString().slice(0, 10) : undefined);
    const creditBalance = creditFor(amountDue, amountPaid);
    const status = body.status || computeDuesStatus({ dueMonth, dueDate, amountDue, amountPaid, paidAt });

    const maxDoc = await DuesRecord.findOne().sort({ _id: -1 }).select({ _id: 1 }).lean() as any;
    const newId = (maxDoc?._id ?? 0) + 1;

    const doc = await DuesRecord.create({
      _id: newId,
      residentId: body.residentId,
      residentName,
      blockNo: body.blockNo || "",
      lotNo: body.lotNo || "",
      dueMonth,
      dueDate,
      amountDue,
      amountPaid,
      paidAt,
      creditBalance,
      status,
      source: "manual",
      billingMonth: body.billingMonth,
      billingYear: body.billingYear,
    } as any);

    return NextResponse.json({ ok: true, record: doc });
  } catch (err) {
    console.error("Error creating due record:", err);
    return NextResponse.json({ error: "Failed to process dues request." }, { status: 500 });
  }
}
