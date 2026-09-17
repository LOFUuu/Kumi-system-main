import { NextRequest, NextResponse } from "next/server";
import { getUserByEmailForAuth, setUserPassword, type AuthUser } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/password";
import type { User } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

function toPublicUser(u: AuthUser): User {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    blockNo: u.blockNo,
    lotNo: u.lotNo,
    phone: u.phone,
    cedula: u.cedula,
  };
}

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await getUserByEmailForAuth(email);

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // If user has no passwordHash yet (e.g. Google-registered or seeded mock account),
  // automatically set their password using the provided password so they are never blocked from logging in!
  if (!user.passwordHash) {
    const newHash = hashPassword(password);
    await setUserPassword(email, newHash);
    user.passwordHash = newHash;
  } else if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  return NextResponse.json({ user: toPublicUser(user) });
}