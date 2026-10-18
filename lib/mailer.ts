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
import { google } from "googleapis";

// ─── Resend HTTP API (Primary for Vercel / Cloud deployments) ────────────────

async function sendViaResend(opts: {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set.");
  }

  // Resend free tier requires 'onboarding@resend.dev' or a custom verified domain
  const verifiedSender = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const fromHeader = opts.from.includes("<") && process.env.RESEND_FROM_EMAIL
    ? opts.from
    : `"Mabuhay Homes Community Portal" <${verifiedSender}>`;

  const payload: Record<string, unknown> = {
    from: fromHeader,
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
    let detail = body;
    try {
      const parsed = JSON.parse(body);
      if (parsed.message) detail = parsed.message;
    } catch {}

    if (res.status === 403 && (detail.includes("testing emails") || detail.includes("verify a domain"))) {
      throw new Error(
        `Resend Sandbox Restriction: Resend free tier only allows sending to your own registered email address. To send to all users (like ${opts.to}), verify a domain at resend.com/domains or use BREVO_API_KEY in Vercel (which sends to all emails without needing a domain).`
      );
    }

    throw new Error(`Resend API error (${res.status}): ${detail}`);
  }
}

// ─── Brevo HTTP API (Alternative Cloud provider) ──────────────────────────────

async function sendViaBrevo(opts: {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}): Promise<void> {
  const apiKey = (
    process.env.BREVO_API_KEY ||
    process.env.SENDINBLUE_API_KEY ||
    process.env.NEXT_PUBLIC_BREVO_API_KEY ||
    ""
  ).trim();
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not set.");
  }

  const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || "kumicarry@gmail.com").trim();
  const senderName = "Mabuhay Homes Community Portal";

  const payload: Record<string, unknown> = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: opts.to.trim() }],
    subject: opts.subject,
    ...(opts.html ? { htmlContent: opts.html } : {}),
    ...(opts.text ? { textContent: opts.text } : {}),
    ...(opts.replyTo ? { replyTo: { email: opts.replyTo } } : {}),
  };

  // Try Brevo HTTP API first
  let httpErrDetail = "";
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return;
    }

    const body = await res.text();
    httpErrDetail = body;
    try {
      const parsed = JSON.parse(body);
      if (parsed.message) httpErrDetail = parsed.message;
    } catch {}
  } catch (fetchErr: any) {
    httpErrDetail = fetchErr?.message || String(fetchErr);
  }

  // If HTTP API was rejected or key is an SMTP key (xsmtpsib-...), try Brevo SMTP Relay
  try {
    const brevoTransporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: senderEmail,
        pass: apiKey,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });

    await brevoTransporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: opts.to,
      subject: opts.subject,
      ...(opts.text ? { text: opts.text } : {}),
      ...(opts.html ? { html: opts.html } : {}),
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });
    return;
  } catch (smtpErr: any) {
    const smtpMsg = smtpErr?.message || String(smtpErr);
    throw new Error(
      `Brevo API failed (${httpErrDetail}) & Brevo SMTP failed (${smtpMsg})`
    );
  }
}

// ─── Gmail API via OAuth2 (Production & Local) ──────────────────────────────

async function sendViaGmailAPI(opts: SendMailOptions): Promise<void> {
  const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail API credentials (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN) are not set.");
  }

  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "https://developers.google.com/oauthplayground"
  );
  oAuth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

  // Use nodemailer to generate the raw email string
  const transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: "windows",
  });

  const info = await transporter.sendMail(opts);
  let rawMessage = info.message;
  
  if (!Buffer.isBuffer(rawMessage) && typeof rawMessage !== "string") {
    const chunks = [];
    for await (const chunk of rawMessage as any) {
      chunks.push(chunk);
    }
    rawMessage = Buffer.concat(chunks);
  }

  // Gmail API requires base64url encoding
  const encodedMessage = Buffer.from(rawMessage as Buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("invalid_grant") || msg.includes("expired or revoked")) {
      throw new Error(
        "Google Gmail API token has expired. (Refresh tokens generated in OAuth Playground expire after 7 days if the Google Cloud OAuth app is in Testing mode. To fix, re-generate GMAIL_REFRESH_TOKEN or set OAuth Publishing Status to 'In production')."
      );
    }
    throw new Error(`Gmail API error: ${msg}`);
  }
}

// ─── Nodemailer SMTP fallback (local dev) ─────────────────────────────────────

async function sendViaNodemailer(options: SendMailOptions): Promise<void> {
  const user = process.env.EMAIL_USER;
  const rawPass = process.env.EMAIL_PASS;
  if (!user || !rawPass) {
    throw new Error("EMAIL_USER / EMAIL_PASS not set for SMTP transport.");
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
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 8000,
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
  const nmOpts: SendMailOptions = {
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    ...(opts.text ? { text: opts.text } : {}),
    ...(opts.html ? { html: opts.html } : {}),
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
  };

  const transportErrors: string[] = [];

  // 1. Brevo HTTP API (Priority #1: newly configured active provider, sends to all domains on free tier)
  const brevoApiKey = (
    process.env.BREVO_API_KEY ||
    process.env.SENDINBLUE_API_KEY ||
    process.env.NEXT_PUBLIC_BREVO_API_KEY ||
    ""
  ).trim();
  if (brevoApiKey) {
    try {
      console.log(`[Mailer] Sending via Brevo HTTP API → ${opts.to}`);
      await sendViaBrevo(opts);
      return;
    } catch (brevoErr: any) {
      const msg = brevoErr?.message || String(brevoErr);
      console.warn("[Mailer] Brevo attempt failed, trying fallback:", msg);
      transportErrors.push(`Brevo: ${msg}`);
    }
  } else {
    transportErrors.push("Brevo: BREVO_API_KEY is not set or not accessible in this environment (Check Vercel Environment Variables: ensure Production, Preview, and Development are all checked)");
  }

  // 2. Gmail REST API via OAuth2 (Sends to all recipients using verified Google account)
  const hasGmailApi =
    Boolean(process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID) &&
    Boolean(process.env.GMAIL_REFRESH_TOKEN);
  if (hasGmailApi) {
    try {
      console.log(`[Mailer] Sending via Gmail REST API → ${opts.to}`);
      await sendViaGmailAPI(nmOpts);
      return;
    } catch (gmailErr: any) {
      const msg = gmailErr?.message || String(gmailErr);
      console.warn("[Mailer] Gmail API attempt failed, trying fallback:", msg);
      transportErrors.push(`Gmail API: ${msg}`);
    }
  }

  // 3. Resend HTTP API (Vercel-compatible; free tier sandbox limited to registered account)
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`[Mailer] Sending via Resend HTTP API → ${opts.to}`);
      await sendViaResend(opts);
      return;
    } catch (resendErr: any) {
      const msg = resendErr?.message || String(resendErr);
      console.warn("[Mailer] Resend attempt failed, trying fallback:", msg);
      transportErrors.push(msg);
    }
  }

  // 4. SMTP Transport (Gmail SMTP for local dev / servers with open outbound ports)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      console.log(`[Mailer] Sending via SMTP → ${opts.to}`);
      await sendViaNodemailer(nmOpts);
      return;
    } catch (smtpErr: any) {
      const msg = smtpErr?.message || String(smtpErr);
      console.warn("[Mailer] SMTP attempt failed:", msg);
      transportErrors.push(`SMTP: ${msg}`);
    }
  }

  if (transportErrors.length > 0) {
    // Show ALL transport errors so the user can see what went wrong with each provider
    throw new Error(transportErrors.join(" | "));
  }

  throw new Error(
    "No working email transport configured. Please set BREVO_API_KEY or RESEND_API_KEY in Vercel settings (recommended for production) or EMAIL_USER and EMAIL_PASS."
  );
}

// ─── From-address helper ──────────────────────────────────────────────────────

function fromAddress(label = "Mabuhay Homes Community Portal"): string {
  const addr =
    process.env.RESEND_FROM_EMAIL ||
    process.env.BREVO_SENDER_EMAIL ||
    process.env.GMAIL_USER ||
    process.env.EMAIL_USER ||
    "noreply@mabuhayhomes.com";
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
  if (
    !process.env.RESEND_API_KEY &&
    !process.env.BREVO_API_KEY &&
    !process.env.SENDINBLUE_API_KEY &&
    !process.env.GMAIL_CLIENT_ID &&
    !process.env.EMAIL_USER
  ) {
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
  if (
    !process.env.RESEND_API_KEY &&
    !process.env.BREVO_API_KEY &&
    !process.env.SENDINBLUE_API_KEY &&
    !process.env.GMAIL_CLIENT_ID &&
    !process.env.EMAIL_USER
  ) {
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