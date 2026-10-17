import { NextRequest, NextResponse } from "next/server";
import {
  getReservations,
  updateReservation,
  getTransactions,
  updateTransactionById,
  deleteReservation,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resId = Number(id);
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = body.action; // 'approve' | 'reject'
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const allRes = await getReservations(true);
  const reservation = allRes.find((r) => r.id === resId);
  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  if (action === "approve") {
    const existingApproved = allRes.find((r) => {
      if (r.id === resId) return false;
      if (r.amenityId !== reservation.amenityId) return false;
      if (r.date !== reservation.date) return false;
      if (r.bookingType !== reservation.bookingType) return false;
      if (r.status !== "approved") return false;
      if (r.isArchived) return false;
      return true;
    });

    if (existingApproved) {
      return NextResponse.json(
        { error: "Conflict: This slot is already booked by an approved reservation." },
        { status: 409 }
      );
    }
  }

  const newStatus = action === "approve" ? "approved" : "declined";
  const approvedAt = new Date().toISOString();

  const updated = await updateReservation(resId, {
    status: newStatus,
    approvedAt,
  });

  const txns = await getTransactions({ includeArchived: true });
  const linkedTxn = txns.find((t) => t.refType === "amenity" && t.refId === resId);
  if (linkedTxn) {
    await updateTransactionById(linkedTxn.id, {
      status: newStatus === "approved" ? "approved" : "voided",
    });
  }

  return NextResponse.json({ reservation: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resId = Number(id);
  const result = await deleteReservation(resId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Failed to delete reservation." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
