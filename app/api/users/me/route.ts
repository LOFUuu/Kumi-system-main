import { NextRequest, NextResponse } from "next/server";
import { updateUserProfile } from "@/lib/db";
import { validatePhone, validateBlockLot } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const email = req.headers.get("x-user-email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Unable to identify the logged-in user" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const DEFAULT_ADMIN_EMAIL = "mabuhay2000phase5@gmail.com";
  let targetRole: "admin" | "counselor" | "resident" | "non_resident" | undefined = undefined;

  const role = String(body.role ?? "").trim();
  if (role) {
    const { getUserByEmailForAuth } = await import("@/lib/db");
    const existingUser = await getUserByEmailForAuth(email);
    const isCurrentAdmin = existingUser?.role === "admin" || email === DEFAULT_ADMIN_EMAIL;

    if (isCurrentAdmin) {
      if (role === "admin" || role === "counselor" || role === "resident" || role === "non_resident") {
        targetRole = role as any;
      }
    } else if (role === "admin" || role === "counselor") {
      return NextResponse.json(
        { error: "Administrative roles cannot be self-assigned." },
        { status: 403 }
      );
    } else if (role === "resident" || role === "non_resident") {
      targetRole = role;
    }
  }

  const phone = body.phone !== undefined ? String(body.phone).trim() : undefined;
  if (phone) {
    const phoneErr = validatePhone(phone, { label: "Phone number" });
    if (phoneErr) return NextResponse.json({ error: phoneErr }, { status: 400 });
  }

  const blockNo = body.blockNo !== undefined ? String(body.blockNo).trim() : undefined;
  if (blockNo) {
    const bErr = validateBlockLot(blockNo, { label: "Block No." });
    if (bErr) return NextResponse.json({ error: bErr }, { status: 400 });
  }

  const lotNo = body.lotNo !== undefined ? String(body.lotNo).trim() : undefined;
  if (lotNo) {
    const lErr = validateBlockLot(lotNo, { label: "Lot No." });
    if (lErr) return NextResponse.json({ error: lErr }, { status: 400 });
  }

  const cedula = typeof body.cedula === "string" && body.cedula ? body.cedula.slice(0, 4_000_000) : undefined;

  const user = await updateUserProfile(email, {
    blockNo: blockNo || undefined,
    lotNo: lotNo || undefined,
    phone: phone || undefined,
    role: targetRole,
    cedula,
  });

  return NextResponse.json({ user });
}
