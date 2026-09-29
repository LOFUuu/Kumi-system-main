import { NextRequest, NextResponse } from "next/server";
import { archiveListing, unarchiveListing, getListing } from "@/lib/db";
import { requestRole } from "@/lib/role";

export const dynamic = "force-dynamic";

// POST /api/listings/[id]/archive → archive listing with optional reason
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
    }
    const idToUse = Number.isFinite(Number(id)) ? Number(id) : id;

    const existing = await getListing(idToUse);
    if (!existing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const role = requestRole(req);
    const isHowa = role === "admin" || role === "counselor";
    const requesterId = Number(req.headers.get("x-user-id") || "0");
    const isOwner = Boolean(
      requesterId &&
        (existing.uploadedBy === requesterId || existing.ownerId === requesterId)
    );

    if (!isHowa && !isOwner) {
      return NextResponse.json(
        { error: "Access denied. You can only archive your own listings." },
        { status: 403 }
      );
    }

    const archivedBy: "owner" | "admin" = isHowa ? "admin" : "owner";

    let reason = archivedBy === "owner" ? "Archived by Owner" : "Archived by Admin";
    try {
      const body = await req.json();
      if (body?.reason && typeof body.reason === "string") {
        reason = body.reason.trim();
      }
    } catch {
      // optional body
    }

    const ok = await archiveListing(idToUse, reason, archivedBy);
    if (!ok) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to archive listing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/listings/[id]/archive → unarchive listing (restore)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
    }
    const idToUse = Number.isFinite(Number(id)) ? Number(id) : id;

    const ok = await unarchiveListing(idToUse);
    if (!ok) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to restore listing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
