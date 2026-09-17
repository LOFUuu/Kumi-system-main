import { NextRequest, NextResponse } from "next/server";
import { getUserByEmailForAuth, savePasswordResetToken } from "@/lib/db";
import { createResetToken } from "@/lib/password";
import { sendPasswordResetEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Respond identically whether or not the account exists so the endpoint
  // can't be used to probe which emails are registered.
  const user = await getUserByEmailForAuth(email);
  if (user) {
    const { token, hash } = createResetToken();
    await savePasswordResetToken(email, hash, new Date(Date.now() + RESET_TOKEN_TTL_MS));

    const resetUrl = `${req.nextUrl.origin}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (err) {
      console.error("Failed to send password-reset email:", err);
      return NextResponse.json(
        { error: "The reset email could not be sent. Please check the email settings and try again." },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}