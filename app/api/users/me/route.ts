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

  const ADMIN_EMAIL = "mabuhay2000phase5@gmail.com";
  let targetRole: "admin" | "counselor" | "resident" | "non_resident" | undefined = undefined;

  const role = String(body.role ?? "").trim();
  if (role) {
    if (email === ADMIN_EMAIL) {
      targetRole = "admin";
    } else if (role === "admin" || role === "counselor") {
      return NextResponse.json(
        { error: "Administrative roles cannot be self-assigned." },
        { status: 403 }
      );
    } else if (role === "resident" || role === "non_resident") {
      targetRole = role;
    }
  }

  const cedula = typeof body.cedula === "string" && body.cedula ? body.cedula.slice(0, 4_000_000) : undefined;

  const user = await updateUserProfile(email, {
    blockNo: body.blockNo ? String(body.blockNo) : undefined,
    lotNo: body.lotNo ? String(body.lotNo) : undefined,
    phone: body.phone ? String(body.phone) : undefined,
    role: targetRole,
    cedula,
  });

  return NextResponse.json({ user });
}
