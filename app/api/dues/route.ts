import { NextRequest, NextResponse } from "next/server";
import { getDues, generateMonthlyDues, createDuesRecord } from "@/lib/db";
import { computeDuesStatus, creditFor, getCycleDueDate, DEFAULT_MONTHLY_DUE } from "@/lib/dues";
import { requestRole } from "@/lib/role";
import { getAuthenticatedUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const role = requestRole(req);
  if (role === "non_resident") {
    return NextResponse.json([]);
  }
  const user = await getAuthenticatedUser(req);
  if (user && user.role === "non_resident") {
    return NextResponse.json([]);
  }

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

    const doc = await createDuesRecord({
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
    });

    return NextResponse.json({ ok: true, record: doc });
  } catch (err) {
    console.error("Error creating due record:", err);
    return NextResponse.json({ error: "Failed to process dues request." }, { status: 500 });
  }
}
