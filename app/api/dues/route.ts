import { NextRequest, NextResponse } from "next/server";
import {
  getDues,
  getArchivedDues,
  archiveDuesRecords,
  unarchiveDuesRecords,
  generateMonthlyDues,
  createDuesRecord,
} from "@/lib/db";
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

  const { searchParams } = new URL(req.url);
  const isArchived =
    searchParams.get("archived") === "true" ||
    searchParams.get("tab") === "archive" ||
    searchParams.get("tab") === "archived";

  const data = isArchived ? await getArchivedDues() : await getDues();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    // Bulk Archive Action
    if (body.action === "bulk-archive" || body.action === "archive") {
      const ids = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
      if (ids.length === 0) {
        return NextResponse.json({ error: "No records specified to archive." }, { status: 400 });
      }
      const res = await archiveDuesRecords(ids, body.reason, user?.fullName || "Admin");
      return NextResponse.json({ ok: true, count: res.count, message: `Archived ${res.count} dues record(s).` });
    }

    // Bulk Unarchive / Restore Action
    if (body.action === "bulk-unarchive" || body.action === "unarchive") {
      const ids = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
      if (ids.length === 0) {
        return NextResponse.json({ error: "No records specified to restore." }, { status: 400 });
      }
      const res = await unarchiveDuesRecords(ids);
      return NextResponse.json({ ok: true, count: res.count, message: `Restored ${res.count} dues record(s) to ledger.` });
    }

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
      isArchived: false,
    });

    return NextResponse.json({ ok: true, record: doc });
  } catch (err) {
    console.error("Error processing due request:", err);
    return NextResponse.json({ error: "Failed to process dues request." }, { status: 500 });
  }
}
