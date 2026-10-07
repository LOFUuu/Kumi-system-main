import { NextRequest, NextResponse } from "next/server";
import { getUserByEmailForAuth, type AuthUser } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSessionCookieValue } from "@/lib/server-auth";
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

  // AUTH-ISSUE-02 FIX: Do NOT automatically set or accept passwords for accounts without a passwordHash.
  // Google-registered accounts or accounts without a password set MUST sign in via Google or use password reset.
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "This account uses Google Sign-In or has no password set. Please sign in with Google or request a password reset." },
      { status: 401 }
    );
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const ADMIN_EMAIL = "mabuhay2000phase5@gmail.com";
  if (email === ADMIN_EMAIL && user.role !== "admin") {
    const { updateUserById } = await import("@/lib/db");
    const updated = await updateUserById(user.id, { role: "admin" });
    if (updated) {
      user.role = "admin";
    }
  }

  const publicUser = toPublicUser(user);
  const res = NextResponse.json({ user: publicUser });

  res.cookies.set("kumi_session", createSessionCookieValue(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return res;
}