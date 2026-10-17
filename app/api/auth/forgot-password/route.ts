import { NextRequest, NextResponse } from "next/server";
import { getUserByEmailForAuth, savePasswordResetToken } from "@/lib/db";
import { createResetToken } from "@/lib/password";
import { sendPasswordResetEmail, sendGoogleOnlyAccountEmail } from "@/lib/mailer";
import { getBaseUrl } from "@/lib/url";

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

  try {
    // Look up user safely across active database
    const user = await getUserByEmailForAuth(email);
    if (user) {
      // If user signed up via Google and has no password hash set
      if (!user.passwordHash && !user.resetToken) {
        try {
          await sendGoogleOnlyAccountEmail(email, user.fullName || "Resident");
          return NextResponse.json({ ok: true });
        } catch {
          // If sending Google notice fails, proceed with standard reset link so they can establish a password
        }
      }

      const { token, hash } = createResetToken();
      await savePasswordResetToken(email, hash, new Date(Date.now() + RESET_TOKEN_TTL_MS));

      const origin = getBaseUrl(req);
      const resetUrl = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (err: any) {
        console.error("[ForgotPassword] Failed to send password-reset email:", err?.message || err);
        console.log(`[ForgotPassword] 🔑 Password Reset Link for ${email}: ${resetUrl}`);
        return NextResponse.json(
          {
            error:
              "The reset email could not be sent. Please check email delivery configuration (e.g. RESEND_API_KEY or BREVO_API_KEY in Vercel settings) and try again.",
          },
          { status: 502 }
        );
      }
    }
  } catch (err: any) {
    console.error("[ForgotPassword] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unable to process password reset at this moment. Please try again shortly." },
      { status: 500 }
    );
  }

  // Always respond ok: true even if account does not exist to prevent email enumeration
  return NextResponse.json({ ok: true });
}