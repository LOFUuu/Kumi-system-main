import { NextRequest, NextResponse } from "next/server";
import { getUsers, createUser } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { isHowaRole } from "@/lib/role";
import {
  validateName,
  validateEmail,
  validatePhone,
  validateBlockLot,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getUsers();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser || !isHowaRole(authUser.role)) {
    return NextResponse.json({ error: "HOWA access only" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const role = String(body.role ?? "").trim();

  const nameErr = validateName(fullName, { required: true, label: "Full name" });
  if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });

  const emailErr = validateEmail(email, { required: true });
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });

  if (!["resident", "non_resident", "counselor"].includes(role)) {
    return NextResponse.json(
      { error: "Role must be resident, non_resident, or counselor." },
      { status: 400 }
    );
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

  const existing = await getUsers();
  if (existing.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: "A resident with this email already exists" }, { status: 409 });
  }

  const user = await createUser({
    fullName,
    email,
    role: role as "resident" | "non_resident" | "counselor",
    blockNo: blockNo || undefined,
    lotNo: lotNo || undefined,
    phone: phone || undefined,
    cedula: typeof body.cedula === "string" && body.cedula ? String(body.cedula).slice(0, 4_000_000) : undefined,
  });

  return NextResponse.json({ user }, { status: 201 });
}
