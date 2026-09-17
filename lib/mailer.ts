import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    throw new Error("EMAIL_USER/EMAIL_PASS are not configured");
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
  }
  return transporter;
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