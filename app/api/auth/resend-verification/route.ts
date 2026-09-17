import { NextRequest, NextResponse } from "next/server";
import { getUserByEmailForAuth, saveVerificationToken } from "@/lib/db";
import { createVerificationToken } from "@/lib/password";
import { sendVerificationEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await getUserByEmailForAuth(email);

  // Always return ok so we don't reveal which addresses exist.
  if (!user || user.emailVerified === true) {
    return NextResponse.json({ ok: true });
  }

  const { token, hash } = createVerificationToken();
  const expiry = new Date(Date.now() + VERIFICATION_TTL_MS);
  await saveVerificationToken(email, hash, expiry);

  const origin = new URL(req.url).origin;
  const verifyUrl = `${origin}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  try {
    await sendVerificationEmail(email, verifyUrl);
  } catch {
    return NextResponse.json(
      { error: "We couldn't send the verification email. Please try again in a moment." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}