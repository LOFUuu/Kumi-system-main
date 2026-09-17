import { NextRequest, NextResponse } from "next/server";
import {
  clearPasswordResetToken,
  getUserByEmailForAuth,
  setUserPassword,
} from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { token?: string; email?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const email = String(body.email ?? "").trim().toLowerCase();
  const newPassword = String(body.newPassword ?? "");

  if (!token || !email) {
    return NextResponse.json({ error: "This reset link is invalid or incomplete." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters long." }, { status: 400 });
  }

  const user = await getUserByEmailForAuth(email);

  if (!user?.resetToken || !user.resetTokenExpiry) {
    return NextResponse.json(
      { error: "This reset link is invalid or has already been used." },
      { status: 400 }
    );
  }

  if (new Date(user.resetTokenExpiry).getTime() < Date.now()) {
    await clearPasswordResetToken(email);
    return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
  }

  if (!verifyPassword(token, user.resetToken)) {
    return NextResponse.json({ error: "This reset link is invalid." }, { status: 400 });
  }

  await setUserPassword(email, hashPassword(newPassword));
  return NextResponse.json({ ok: true });
}