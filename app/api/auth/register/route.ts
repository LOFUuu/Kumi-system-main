import { NextRequest, NextResponse } from "next/server";
import { createUser, deleteUserById, getUserByEmailForAuth, saveVerificationToken } from "@/lib/db";
import { createVerificationToken, hashPassword } from "@/lib/password";
import { sendVerificationEmail } from "@/lib/mailer";
import type { Role } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const PUBLIC_ROLES: Role[] = ["resident", "non_resident"];
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const rawRole = String(body.role ?? "").trim() as Role;
  const role: Role = PUBLIC_ROLES.includes(rawRole) ? rawRole : "resident";

  if (!fullName) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
  }

  const existing = await getUserByEmailForAuth(email);
  if (existing && existing.emailVerified !== false) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  // Email + password sign-ups must verify their address before the account is
  // usable. Google sign-ups are verified by Google itself and skip this.
  const { token, hash } = createVerificationToken();
  const expiry = new Date(Date.now() + VERIFICATION_TTL_MS);

  let userId: number;
  if (existing) {
    // Account was registered before but never verified: refresh its token and
    // re-send the link instead of erroring out.
    userId = existing.id;
    await saveVerificationToken(email, hash, expiry);
  } else {
    const user = await createUser({
      fullName,
      email,
      role: role as "resident" | "non_resident",
      passwordHash: hashPassword(password),
      address: body.address ? String(body.address).trim() : undefined,
      phone: body.phone ? String(body.phone).trim() : undefined,
      blockNo: body.blockNo ? String(body.blockNo).trim() : undefined,
      lotNo: body.lotNo ? String(body.lotNo).trim() : undefined,
      emailVerified: false,
    });
    userId = user.id;
    await saveVerificationToken(email, hash, expiry);
  }

  const origin = new URL(req.url).origin;
  const verifyUrl = `${origin}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  await sendVerificationEmail(email, verifyUrl);

  return NextResponse.json({ ok: true }, { status: existing ? 202 : 201 });
}