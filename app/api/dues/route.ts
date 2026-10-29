import { NextRequest, NextResponse } from "next/server";
import {
  getDues,
  getArchivedDues,
  archiveDuesRecords,
  unarchiveDuesRecords,
  deleteDuesRecords,
  generateMonthlyDues,
  createDuesRecord,
} from "@/lib/db";
import { computeDuesStatus, creditFor, getCycleDueDate, DEFAULT_MONTHLY_DUE } from "@/lib/dues";
import { requestRole, isHowaRole } from "@/lib/role";
import { getAuthenticatedUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  const { searchParams } = new URL(req.url);
  const isArchived =
    searchParams.get("archived") === "true" ||
    searchParams.get("tab") === "archive" ||
    searchParams.get("tab") === "archived";

  const data = isArchived ? await getArchivedDues() : await getDues();

  // If user is admin or counselor, return full ledger
  if (user && isHowaRole(user.role)) {
    return NextResponse.json(data);
  }

  // If user is resident or non-resident, restrict to their own records only (Privacy Protection)
  if (user) {
    const rawName = (user.fullName || "").trim().toLowerCase();
    const userIdStr = user.id != null ? String(user.id).trim() : "";
    const userBlock = user.blockNo ? String(user.blockNo).trim().toLowerCase() : "";
    const userLot = user.lotNo ? String(user.lotNo).trim().toLowerCase() : "";

    const userDues = data.filter((d: any) => {
      const idMatch = userIdStr && d.residentId != null && String(d.residentId).trim() === userIdStr;
      const nameMatch = rawName && d.residentName && d.residentName.trim().toLowerCase() === rawName;
      const blockLotMatch =
        userBlock &&
        userLot &&
        d.blockNo &&
        d.lotNo &&
        String(d.blockNo).trim().toLowerCase() === userBlock &&
        String(d.lotNo).trim().toLowerCase() === userLot;
      return idMatch || nameMatch || blockLotMatch;
    });
    return NextResponse.json(userDues);
  }

  // Unauthenticated requests cannot read dues records
  return NextResponse.json([]);
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

    // Bulk Permanent Delete Action
    if (body.action === "bulk-delete" || body.action === "delete") {
      if (!user || !isHowaRole(user.role)) {
        return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
      }
      const ids = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
      if (ids.length === 0) {
        return NextResponse.json({ error: "No records specified to delete." }, { status: 400 });
      }
      const res = await deleteDuesRecords(ids);
      return NextResponse.json({ ok: true, count: res.count, message: `Permanently deleted ${res.count} dues record(s).` });
    }

    // Unarchive all records for a specific month
    if (body.action === "unarchive-month" && body.dueMonth) {
      const monthStr = String(body.dueMonth).slice(0, 7);
      const { DuesRecord } = await import("@/models");
      const res = await DuesRecord.updateMany(
        { dueMonth: { $regex: new RegExp(`^${monthStr}`) }, isArchived: true } as any,
        { $set: { isArchived: false, archivedAt: null, archiveReason: null, archivedBy: null } } as any
      );
      return NextResponse.json({
        ok: true,
        count: res.modifiedCount,
        message: `Restored ${res.modifiedCount} dues record(s) for ${body.dueMonth} to active ledger.`,
      });
    }

    // Trigger generation for specific month
    if (body.action === "generate") {
      const customAmount = body.amountDue ? Number(body.amountDue) : undefined;
      const result = await generateMonthlyDues(body.dueMonth, customAmount);
      const data = await getDues();
      return NextResponse.json({ ok: true, createdCount: result.createdCount, dues: data });
    }

    // Controlled demo cycle reset for demonstration
    if (body.action === "reset-demo") {
      if (!user || !isHowaRole(user.role)) {
        return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
      }
      const { resetResidentDemoCycle } = await import("@/lib/db");
      const customAmount = body.amountDue ? Number(body.amountDue) : undefined;
      const result = await resetResidentDemoCycle(
        body.residentIdentifier || user.fullName,
        body.targetMonth,
        customAmount
      );
      const data = await getDues();
      return NextResponse.json({ ok: true, result, dues: data });
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

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || !isHowaRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
    }

    let ids: number[] = [];
    const { searchParams } = new URL(req.url);
    const paramId = searchParams.get("id");
    const paramIds = searchParams.get("ids");

    if (paramId) {
      ids = [Number(paramId)];
    } else if (paramIds) {
      ids = paramIds.split(",").map(Number).filter((n) => !isNaN(n));
    } else {
      const body = await req.json().catch(() => null);
      if (body) {
        ids = Array.isArray(body.ids) ? body.ids.map(Number) : body.id ? [Number(body.id)] : [];
      }
    }

    ids = ids.filter((n) => !isNaN(n) && n > 0);
    if (ids.length === 0) {
      return NextResponse.json({ error: "No dues records specified to delete." }, { status: 400 });
    }

    const res = await deleteDuesRecords(ids);
    return NextResponse.json({
      ok: true,
      count: res.count,
      message: `Permanently deleted ${res.count} dues record(s).`,
    });
  } catch (err) {
    console.error("Error deleting dues record(s):", err);
    return NextResponse.json({ error: "Failed to delete dues record(s)." }, { status: 500 });
  }
}

