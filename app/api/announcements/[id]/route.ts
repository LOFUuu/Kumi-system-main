import { NextRequest, NextResponse } from "next/server";
import { updateAnnouncement, deleteAnnouncement } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { validateText, firstError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user || (user.role !== "admin" && user.role !== "counselor")) {
    return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
  }

  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const updateData: any = {};
  if (body.title !== undefined) updateData.title = String(body.title).trim();
  if (body.content !== undefined) updateData.content = String(body.content).trim();
  if (body.status !== undefined) updateData.status = body.status === "archived" ? "archived" : "active";
  if (body.category !== undefined) updateData.category = String(body.category).trim();
  if (body.poster !== undefined) updateData.poster = String(body.poster).trim();

  const err = firstError(
    updateData.title !== undefined ? validateText(updateData.title, "Announcement title", { minLength: 3, maxLength: 200 }) : null,
    updateData.content !== undefined ? validateText(updateData.content, "Announcement content", { minLength: 5, maxLength: 10000 }) : null,
    updateData.category !== undefined ? validateText(updateData.category, "Category", { maxLength: 50, required: false }) : null,
    updateData.poster !== undefined ? validateText(updateData.poster, "Poster", { maxLength: 100, required: false }) : null
  );
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  try {
    const updated = await updateAnnouncement(id, updateData);
    if (!updated) {
      return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
    }
    return NextResponse.json({ announcement: updated, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update announcement." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user || (user.role !== "admin" && user.role !== "counselor")) {
    return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
  }

  const { id } = await params;
  try {
    const success = await deleteAnnouncement(id);
    if (!success) {
      return NextResponse.json({ error: "Announcement not found or already deleted." }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Announcement deleted successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to delete announcement." }, { status: 500 });
  }
}
