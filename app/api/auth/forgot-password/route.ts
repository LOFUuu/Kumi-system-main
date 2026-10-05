import { NextRequest, NextResponse } from "next/server";
import { getUserByEmailForAuth, savePasswordResetToken } from "@/lib/db";
import { createResetToken } from "@/lib/password";
import { sendPasswordResetEmail, sendGoogleOnlyAccountEmail } from "@/lib/mailer";

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

  // Always respond identically whether or not the account exists so the
  // endpoint can't be used to probe which emails are registered (enumeration).
  const user = await getUserByEmailForAuth(email);
  if (user) {
    // Detect Google-only accounts: they were created via Google Sign-In and
    // have no passwordHash set.  We cannot reset what we don't own — tell
    // the user to recover via Google instead of leaving them confused later.
    const isGoogleOnly = !user.passwordHash;

    if (isGoogleOnly) {
      // Send a friendly "use Google" notification rather than a reset link.
      try {
        await sendGoogleOnlyAccountEmail(email, user.fullName || "");
      } catch (err) {
        console.error("Failed to send Google-only account email:", err);
        // Still respond OK — we don't leak whether the account exists.
      }
    } else {
      // Standard email/password account — generate a secure one-time token.
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
  }

  return NextResponse.json({ ok: true });
}