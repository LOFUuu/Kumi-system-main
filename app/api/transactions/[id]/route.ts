import { NextRequest, NextResponse } from "next/server";
import { getTransactionById, updateTransactionById, deleteTransaction } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const txn = await getTransactionById(id);
  if (!txn) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(txn);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const allowed: Record<string, unknown> = {};
    if (body.status !== undefined) allowed.status = body.status;
    if (body.receiptPath !== undefined) allowed.receiptPath = body.receiptPath;

    const updated = await updateTransactionById(numId, allowed as any);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Notify user of payment verification status update
    if (body.status && updated.userEmail) {
      const { notifyUserByEmail } = await import("@/lib/db");
      const amountStr = updated.amount ? `₱${updated.amount}` : "payment";
      const purpose = updated.refType === "amenity" ? "Amenity Reservation" : "HOA Dues";

      if (body.status === "completed") {
        notifyUserByEmail(updated.userEmail, {
          title: "Payment Verified & Approved! 💳",
          message: `Your ${purpose} payment of ${amountStr} has been verified and approved by HOA Administration.`,
          type: "payment",
          referenceId: updated.id,
          link: "/history?tab=payments",
          metadata: {
            amount: updated.amount,
            refType: updated.refType,
            status: "Completed",
          },
        }).catch(() => {});
      } else if (body.status === "void" || body.status === "voided") {
        notifyUserByEmail(updated.userEmail, {
          title: "Payment Verification Notice",
          message: `Your ${purpose} payment of ${amountStr} could not be verified by HOA Administration. Please coordinate with the HOA office.`,
          type: "payment",
          referenceId: updated.id,
          link: "/history?tab=payments",
          metadata: {
            amount: updated.amount,
            refType: updated.refType,
            status: "Voided",
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ transaction: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/[id] — Permanently delete archived transaction (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "admin" && role !== "counselor") {
      return NextResponse.json(
        { error: "Access denied. Only administrators can permanently delete transactions." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
      return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 });
    }

    const ok = await deleteTransaction(numId);
    if (!ok) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deletedId: numId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to permanently delete transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

