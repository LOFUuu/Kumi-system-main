import { NextRequest, NextResponse } from "next/server";
import { updateUserById, deleteUserById } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uiRole = req.headers.get("x-user-role") ?? "";
  if (!["admin", "counselor"].includes(uiRole)) {
    return NextResponse.json({ error: "HOWA access only" }, { status: 403 });
  }

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const user = await updateUserById(numId, body);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uiRole = req.headers.get("x-user-role") ?? "";
  if (!["admin", "counselor"].includes(uiRole)) {
    return NextResponse.json({ error: "HOWA access only" }, { status: 403 });
  }

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    await deleteUserById(numId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete user" },
      { status: 500 }
    );
  }
}
