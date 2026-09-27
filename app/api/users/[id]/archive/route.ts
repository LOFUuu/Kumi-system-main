import { NextRequest, NextResponse } from "next/server";
import { archiveUser, unarchiveUser } from "@/lib/db";

export const dynamic = "force-dynamic";

/** POST /api/users/[id]/archive — Archive a resident */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    const idToUse = Number.isFinite(Number(id)) ? Number(id) : id;

    let reason = "Archived by Admin";
    try {
      const body = await req.json();
      if (body?.reason && typeof body.reason === "string") {
        reason = body.reason.trim();
      }
    } catch {
      // optional body
    }

    const ok = await archiveUser(idToUse, reason);
    if (!ok) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to archive user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/users/[id]/archive — Restore (unarchive) a resident */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    const idToUse = Number.isFinite(Number(id)) ? Number(id) : id;

    const ok = await unarchiveUser(idToUse);
    if (!ok) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to restore user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
