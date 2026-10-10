/**
 * lib/mailer.ts
 *
 * Dual-mode mailer:
 *   - Production (Vercel): Uses Resend HTTP API (RESEND_API_KEY env var).
 *     Vercel serverless blocks outbound SMTP ports, so HTTP-based email is
 *     the only reliable option in production.
 *   - Local development: Falls back to nodemailer + Gmail SMTP if RESEND_API_KEY
 *     is absent (your existing EMAIL_USER / EMAIL_PASS still work locally).
 *
 * One-time Vercel setup:
 *   1. Go to https://resend.com and create a free account
 *   2. Dashboard → API Keys → Create API Key → copy it
 *   3. Vercel Dashboard → Your Project → Settings → Environment Variables
 *      Add:  RESEND_API_KEY = re_xxxxxxxxxxxx
 *      Add:  RESEND_FROM_EMAIL = onboarding@resend.dev   (free test sender,
 *            or your own verified domain address once you verify a domain)
 *   4. Redeploy (Vercel auto-deploys on next git push to main)
 */

import nodemailer from "nodemailer";
import type { SendMailOptions } from "nodemailer";

// ─── Resend HTTP API (production) ────────────────────────────────────────────

async function sendViaResend(opts: {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");

  const payload: Record<string, unknown> = {
    from: opts.from,
    to: [opts.to],
    subject: opts.subject,
    ...(opts.text ? { text: opts.text } : {}),
    ...(opts.html ? { html: opts.html } : {}),
    ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

// ─── Nodemailer SMTP fallback (local dev) ─────────────────────────────────────

async function sendViaNodemailer(options: SendMailOptions): Promise<void> {
  const user = process.env.EMAIL_USER;
  const rawPass = process.env.EMAIL_PASS;
  if (!user || !rawPass) {
    throw new Error("EMAIL_USER / EMAIL_PASS not set for local SMTP fallback.");
  }
  const pass = rawPass.replace(/\s+/g, "");
  const configs = [
    { host: "smtp.gmail.com", port: 465 as const, secure: true },
    { host: "smtp.gmail.com", port: 587 as const, secure: false, requireTLS: true },
  ];
  let lastErr: unknown;
  for (const cfg of configs) {
    try {
      const t = nodemailer.createTransport({
        ...cfg,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      await t.sendMail(options);
      return;
    } catch (err) {
      lastErr = err;
      console.warn(`[Mailer] SMTP ${cfg.port} failed:`, (err as Error)?.message);
    }
  }
  throw lastErr;
}

// ─── Unified sendMail (auto-selects transport) ────────────────────────────────

async function sendMail(opts: {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    console.log(`[Mailer] Sending via Resend → ${opts.to}`);
    await sendViaResend(opts);
  } else {
    console.log(`[Mailer] Sending via SMTP (local) → ${opts.to}`);
    const nmOpts: SendMailOptions = {
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      ...(opts.text ? { text: opts.text } : {}),
      ...(opts.html ? { html: opts.html } : {}),
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    };
    await sendViaNodemailer(nmOpts);
  }
}

// ─── From-address helper ──────────────────────────────────────────────────────

function fromAddress(label = "Mabuhay Homes Community Portal"): string {
  // Resend free tier: use onboarding@resend.dev until you verify your own domain.
  // Once verified, set RESEND_FROM_EMAIL to your domain address.
  const addr =
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_USER ||
    "onboarding@resend.dev";
  return `"${label}" <${addr}>`;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendMail({
    from: fromAddress(),
    to,
    subject: "Reset your Mabuhay Homes password",
    text:
      `We received a request to reset the password for your Mabuhay Homes community ` +
      `account. Open the link below to choose a new password. It expires in 1 hour.\n\n` +
      `${resetUrl}\n\n` +
      `If you didn't request this, you can safely ignore this email — your password will not change.`,
    html:
      `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1b2a1e">` +
      `<h2 style="color:#123f2a">Reset your Mabuhay Homes password</h2>` +
      `<p>We received a request to reset the password for your community account. ` +
      `Click the button below to choose a new password. The link expires in <strong>1 hour</strong>.</p>` +
      `<p style="text-align:center;margin:28px 0">` +
      `<a href="${resetUrl}" style="background:#1c6b3c;color:#fff;text-decoration:none;` +
      `padding:12px 22px;border-radius:8px;font-weight:bold;display:inline-block">Reset password</a>` +
      `</p>` +
      `<p>If the button doesn't work, copy and paste this link into your browser:</p>` +
      `<p style="word-break:break-all;color:#555">${resetUrl}</p>` +
      `<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0" />` +
      `<p style="color:#888;font-size:12px">If you didn't request this, ignore this email — your password will not change.</p>` +
      `</div>`,
  });
}

export async function sendGoogleOnlyAccountEmail(to: string, name: string): Promise<void> {
  const displayName = name ? `, ${name.split(" ")[0]}` : "";
  await sendMail({
    from: fromAddress(),
    to,
    subject: "Mabuhay Homes – Password Reset Request",
    text:
      `Hi${displayName},\n\n` +
      `We received a password reset request for your Mabuhay Homes account.\n\n` +
      `Your account uses "Continue with Google" to sign in, so there is no separate ` +
      `application password to reset.\n\n` +
      `To access your account, simply use the "Continue with Google" button on the ` +
      `login page and sign in with your Google account.\n\n` +
      `If you need to change your Google account password, please visit:\n` +
      `https://myaccount.google.com/security\n\n` +
      `If you didn't request this, you can safely ignore this email.`,
    html:
      `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1b2a1e">` +
      `<h2 style="color:#123f2a">Mabuhay Homes – Password Reset Request</h2>` +
      `<p>Hi${displayName},</p>` +
      `<p>We received a password reset request for your Mabuhay Homes account.</p>` +
      `<div style="background:#f0faf4;border-left:4px solid #1c6b3c;padding:14px 18px;border-radius:6px;margin:20px 0">` +
      `<strong>Your account uses Google Sign-In.</strong><br>` +
      `There is no separate application password to reset — you sign in using ` +
      `<em>"Continue with Google"</em>.` +
      `</div>` +
      `<p>To access your account, click <strong>Continue with Google</strong> on the login page.</p>` +
      `<p>If you need to change your <strong>Google account password</strong>, visit:</p>` +
      `<p style="text-align:center;margin:24px 0">` +
      `<a href="https://myaccount.google.com/security" style="background:#4285F4;color:#fff;text-decoration:none;` +
      `padding:12px 22px;border-radius:8px;font-weight:bold;display:inline-block">Manage Google Account</a>` +
      `</p>` +
      `<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0" />` +
      `<p style="color:#888;font-size:12px">If you didn't request this, ignore this email — your account is safe.</p>` +
      `</div>`,
  });
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  if (!process.env.RESEND_API_KEY && !process.env.EMAIL_USER) {
    console.warn(`[Mailer] No transport configured. Verification link for ${to}: ${verifyUrl}`);
    return;
  }
  await sendMail({
    from: fromAddress(),
    to,
    subject: "Verify your Mabuhay Homes account",
    text:
      `Thanks for signing up for the Mabuhay Homes community portal. ` +
      `Open the link below to verify your email address and activate your account. ` +
      `The link expires in 24 hours.\n\n${verifyUrl}\n\n` +
      `If you didn't sign up, you can ignore this email.`,
    html:
      `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1b2a1e">` +
      `<h2 style="color:#123f2a">Verify your Mabuhay Homes account</h2>` +
      `<p>Thanks for signing up for the community portal. Click the button below to ` +
      `verify your email address and activate your account. The link expires in <strong>24 hours</strong>.</p>` +
      `<p style="text-align:center;margin:28px 0">` +
      `<a href="${verifyUrl}" style="background:#1c6b3c;color:#fff;text-decoration:none;` +
      `padding:12px 22px;border-radius:8px;font-weight:bold;display:inline-block">Verify email</a>` +
      `</p>` +
      `<p>If the button doesn't work, copy and paste this link into your browser:</p>` +
      `<p style="word-break:break-all;color:#555">${verifyUrl}</p>` +
      `<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0" />` +
      `<p style="color:#888;font-size:12px">If you didn't sign up, ignore this email.</p>` +
      `</div>`,
  });
}

export async function sendContactEmail(data: {
  fullName: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<void> {
  const recipient =
    process.env.ADMIN_EMAIL ||
    process.env.EMAIL_USER ||
    process.env.RESEND_FROM_EMAIL;
  if (!recipient) throw new Error("No admin recipient configured (ADMIN_EMAIL / EMAIL_USER / RESEND_FROM_EMAIL).");

  await sendMail({
    from: fromAddress("Mabuhay Homes Contact Form"),
    to: recipient,
    replyTo: `"${data.fullName}" <${data.email}>`,
    subject: `[Contact HOA] ${data.subject || "New Inquiry from " + data.fullName}`,
    text:
      `New Contact HOA Submission:\n\n` +
      `Name: ${data.fullName}\n` +
      `Email: ${data.email}\n` +
      `Subject: ${data.subject || "N/A"}\n\n` +
      `Message:\n${data.message}\n`,
    html:
      `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1b2a1e;padding:20px;border:1px solid #e2e8f0;border-radius:8px">` +
      `<h2 style="color:#123f2a">New Contact HOA Submission</h2>` +
      `<p><strong>From:</strong> ${data.fullName} (&lt;${data.email}&gt;)</p>` +
      `<p><strong>Subject:</strong> ${data.subject || "N/A"}</p>` +
      `<hr style="border:none;border-top:1px solid #eee;margin:16px 0" />` +
      `<p style="white-space:pre-wrap">${data.message}</p>` +
      `</div>`,
  });
}

export interface AdminListingNotificationPayload {
  listingId: number | string;
  houseName: string;
  propertyAddress: string;
  ownerName: string;
  ownerContact?: string;
  status: string;
  actionRequired: string;
}

export async function sendAdminListingNotificationEmail(
  payload: AdminListingNotificationPayload
): Promise<void> {
  const to =
    process.env.ADMIN_EMAIL ||
    process.env.EMAIL_USER ||
    process.env.RESEND_FROM_EMAIL;
  if (!to) {
    console.log("[Mailer] No admin recipient configured. Skipping listing notification.");
    return;
  }

  await sendMail({
    from: fromAddress("Mabuhay Homes Security & Verification"),
    to,
    subject: `[Action Required] Listing Verification: ${payload.houseName}`,
    text:
      `A listing requires admin validation/review.\n\n` +
      `Listing ID: ${payload.listingId}\n` +
      `Property: ${payload.houseName}\n` +
      `Address: ${payload.propertyAddress}\n` +
      `Owner/Submitter: ${payload.ownerName} (${payload.ownerContact || "N/A"})\n` +
      `Current Status: ${payload.status}\n` +
      `Required Action: ${payload.actionRequired}\n\n` +
      `Please log into the Admin Portal to review submitted proof documents and validate the listing.`,
    html:
      `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1b2a1e;border:1px solid #e2e8f0;border-radius:12px;padding:24px;background:#fafafa">` +
      `<h2 style="color:#123f2a;margin-top:0">HOA Listing Validation &amp; Security Alert</h2>` +
      `<p>A listing submission or update requires HOA administrator review and ownership validation.</p>` +
      `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">` +
      `<tr><td style="padding:6px 0;color:#666"><strong>Listing ID:</strong></td><td>${payload.listingId}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#666"><strong>Property:</strong></td><td><strong>${payload.houseName}</strong></td></tr>` +
      `<tr><td style="padding:6px 0;color:#666"><strong>Address:</strong></td><td>${payload.propertyAddress}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#666"><strong>Owner / Submitter:</strong></td><td>${payload.ownerName} ${payload.ownerContact ? `(${payload.ownerContact})` : ""}</td></tr>` +
      `<tr><td style="padding:6px 0;color:#666"><strong>Current Status:</strong></td><td><span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-weight:bold;font-size:12px">${payload.status}</span></td></tr>` +
      `<tr><td style="padding:6px 0;color:#666"><strong>Required Action:</strong></td><td style="color:#b91c1c;font-weight:bold">${payload.actionRequired}</td></tr>` +
      `</table>` +
      `<p style="margin-top:20px;text-align:center">` +
      `<a href="/admin/listings" style="background:#123f2a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:bold;display:inline-block">Open Admin Verification Registry</a>` +
      `</p>` +
      `<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0" />` +
      `<p style="color:#888;font-size:11px">This automated security notification was sent by the Mabuhay Homes Community Portal.</p>` +
      `</div>`,
  });
}

export async function sendNewsletterWelcomeEmail(to: string): Promise<void> {
  if (!process.env.RESEND_API_KEY && !process.env.EMAIL_USER) {
    console.warn(`[Mailer] No transport configured. Skipping welcome email for ${to}`);
    return;
  }

  await sendMail({
    from: fromAddress(),
    to,
    subject: "Welcome to Mabuhay Homes Newsletter!",
    text:
      `Thank you for subscribing to the Mabuhay Homes 2000 Phase 5 Newsletter!\n\n` +
      `You will now receive regular updates, official HOA announcements, upcoming community events, and house listing updates directly in your inbox.\n\n` +
      `Best regards,\n` +
      `Mabuhay Homes HOA Team`,
    html:
      `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1b2a1e;padding:24px;border:1px solid #e8f3ec;border-radius:12px;background:#ffffff">` +
      `<h2 style="color:#123f2a;margin-top:0">Welcome to Mabuhay Homes Newsletter! 🎉</h2>` +
      `<p>Thank you for subscribing to the <strong>Mabuhay Homes 2000 Phase 5</strong> community newsletter!</p>` +
      `<p>You will now receive official community announcements, HOA updates, upcoming events, and property listing alerts right in your inbox.</p>` +
      `<div style="background:#e8f3ec;padding:16px;border-radius:8px;margin:20px 0;color:#123f2a">` +
      `<strong>Community Hub Quick Links:</strong>` +
      `<ul style="margin:8px 0 0 0;padding-left:20px">` +
      `<li>House Listings &amp; Available Homes</li>` +
      `<li>Amenity Reservations</li>` +
      `<li>Monthly Dues Tracking</li>` +
      `</ul>` +
      `</div>` +
      `<hr style="border:none;border-top:1px solid #eee;margin:24px 0" />` +
      `<p style="color:#666;font-size:12px;margin-bottom:0">Mabuhay Homes 2000 Phase 5 HOA • Community Portal</p>` +
      `</div>`,
  });
}