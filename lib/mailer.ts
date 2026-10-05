import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const user = process.env.EMAIL_USER;
  const rawPass = process.env.EMAIL_PASS;
  if (!user || !rawPass) {
    throw new Error("EMAIL_USER/EMAIL_PASS are not configured in environment variables.");
  }
  const pass = rawPass.replace(/\s+/g, "");
  
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const user = process.env.EMAIL_USER;
  if (!user) throw new Error("EMAIL_USER is not configured");

  await getTransporter().sendMail({
    from: `"Mabuhay Homes Community Portal" <${user}>`,
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

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const user = process.env.EMAIL_USER;
  if (!user) throw new Error("EMAIL_USER is not configured");

  await getTransporter().sendMail({
    from: `"Mabuhay Homes Community Portal" <${user}>`,
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
  const user = process.env.EMAIL_USER;
  if (!user) {
    console.log("[Mailer] EMAIL_USER not configured. Skipping admin email notification for listing:", payload.listingId);
    return;
  }

  const to = process.env.ADMIN_EMAIL || user;

  await getTransporter().sendMail({
    from: `"Mabuhay Homes Security & Verification" <${user}>`,
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