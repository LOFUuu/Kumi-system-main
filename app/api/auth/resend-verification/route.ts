import { NextRequest, NextResponse } from "next/server";
import { getUserByEmailForAuth, saveVerificationToken } from "@/lib/db";
import { createVerificationToken } from "@/lib/password";
import { sendVerificationEmail } from "@/lib/mailer";
import { getBaseUrl } from "@/lib/url";

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

  const origin = getBaseUrl(req);
  const verifyUrl = `${origin}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  try {
    await sendVerificationEmail(email, verifyUrl);
  } catch (err: any) {
    console.error("[ResendVerification] Failed to send verification email:", err?.message || err);
    console.log(`[ResendVerification] 🔑 Verify Link for ${email}: ${verifyUrl}`);
    return NextResponse.json(
      { error: "We couldn't send the verification email. Please check email delivery configuration and try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}