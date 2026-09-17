import { NextRequest, NextResponse } from "next/server";
import { getAmenity, updateAmenity, deleteAmenity } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "Invalid amenity ID" }, { status: 400 });
  }

  const amenity = await getAmenity(numId);
  if (!amenity) {
    return NextResponse.json({ error: "Amenity not found" }, { status: 404 });
  }

  return NextResponse.json({ amenity });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
      return NextResponse.json({ error: "Invalid amenity ID" }, { status: 400 });
    }

    const body = await req.json();
    const updated = await updateAmenity(numId, body);
    if (!updated) {
      return NextResponse.json({ error: "Amenity not found" }, { status: 404 });
    }

    return NextResponse.json({ amenity: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update amenity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    const ok = await deleteAmenity(numId);
    if (!ok) {
      return NextResponse.json({ error: "Amenity not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete amenity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
