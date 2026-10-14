import { NextRequest, NextResponse } from "next/server";
import { archiveReservation, unarchiveReservation } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/reservations/[id]/archive → archive reservation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
      return NextResponse.json({ error: "Invalid reservation ID" }, { status: 400 });
    }

    let reason: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.reason === "string") {
        reason = body.reason.trim();
      }
    } catch {
      // Reason is optional
    }

    const updated = await archiveReservation(numId, reason);
    if (!updated) {
      return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, reservation: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to archive reservation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/reservations/[id]/archive → unarchive / restore reservation
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
      return NextResponse.json({ error: "Invalid reservation ID" }, { status: 400 });
    }

    const result = await unarchiveReservation(numId);
    if (!result.ok) {
      // Conflict or validation error
      return NextResponse.json(
        { error: result.error || "Failed to restore reservation." },
        { status: result.error?.includes("conflict") || result.error?.includes("occupied") ? 409 : 400 }
      );
    }
    return NextResponse.json({ ok: true, reservation: result.reservation });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to restore reservation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
