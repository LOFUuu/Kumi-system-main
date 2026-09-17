import { NextRequest, NextResponse } from "next/server";
import { archiveAmenity, unarchiveAmenity } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/amenities/[id]/archive → archive (soft-delete)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
      return NextResponse.json({ error: "Invalid amenity ID" }, { status: 400 });
    }
    const ok = await archiveAmenity(numId);
    if (!ok) {
      return NextResponse.json({ error: "Amenity not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to archive amenity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/amenities/[id]/archive → unarchive (restore)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
      return NextResponse.json({ error: "Invalid amenity ID" }, { status: 400 });
    }
    const ok = await unarchiveAmenity(numId);
    if (!ok) {
      return NextResponse.json({ error: "Amenity not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to restore amenity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
