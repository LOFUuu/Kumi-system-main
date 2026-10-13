import { NextRequest, NextResponse } from "next/server";
import { archiveTransaction, unarchiveTransaction } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/transactions/[id]/archive → Archive transaction (soft delete)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "admin" && role !== "counselor") {
      return NextResponse.json(
        { error: "Access denied. Only administrators can archive transactions." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 });
    }

    let reason: string | undefined;
    try {
      const body = await req.json();
      if (body?.reason) reason = String(body.reason).trim();
    } catch {
      // JSON body is optional
    }

    const archivedBy = req.headers.get("x-user-email") || "Admin";
    const ok = await archiveTransaction(numId, reason, archivedBy);
    if (!ok) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: numId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to archive transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/transactions/[id]/archive → Restore transaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "admin" && role !== "counselor") {
      return NextResponse.json(
        { error: "Access denied. Only administrators can restore transactions." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
      return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 });
    }

    const ok = await unarchiveTransaction(numId);
    if (!ok) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: numId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to restore transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
