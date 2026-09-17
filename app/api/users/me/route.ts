import { NextRequest, NextResponse } from "next/server";
import { updateUserProfile } from "@/lib/db";

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

  const role = String(body.role ?? "").trim();
  if (role && !["admin", "counselor", "resident", "non_resident"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const cedula = typeof body.cedula === "string" && body.cedula ? body.cedula.slice(0, 4_000_000) : undefined;

  const user = await updateUserProfile(email, {
    blockNo: body.blockNo ? String(body.blockNo) : undefined,
    lotNo: body.lotNo ? String(body.lotNo) : undefined,
    phone: body.phone ? String(body.phone) : undefined,
    role: role ? (role as "admin" | "counselor" | "resident" | "non_resident") : undefined,
    cedula,
  });

  return NextResponse.json({ user });
}
