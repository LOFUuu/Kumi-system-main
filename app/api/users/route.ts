import { NextRequest, NextResponse } from "next/server";
import { getUsers, createUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getUsers();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const uiRole = req.headers.get("x-user-role") ?? "";
  if (!["admin", "counselor"].includes(uiRole)) {
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

  if (!fullName || !email || !["resident", "non_resident", "counselor"].includes(role)) {
    return NextResponse.json(
      { error: "fullName, a valid email, and role are required" },
      { status: 400 }
    );
  }

  const existing = await getUsers();
  if (existing.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: "A resident with this email already exists" }, { status: 409 });
  }

  const user = await createUser({
    fullName,
    email,
    role: role as "resident" | "non_resident" | "counselor",
    blockNo: body.blockNo ? String(body.blockNo) : undefined,
    lotNo: body.lotNo ? String(body.lotNo) : undefined,
    phone: body.phone ? String(body.phone) : undefined,
    cedula: typeof body.cedula === "string" && body.cedula ? String(body.cedula).slice(0, 4_000_000) : undefined,
  });

  return NextResponse.json({ user }, { status: 201 });
}
