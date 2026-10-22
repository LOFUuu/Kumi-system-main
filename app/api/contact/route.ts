import { NextRequest, NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/mailer";
import { validateName, validateEmail, validateText } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();

  const nameErr = validateName(fullName, { required: true, label: "Full name" });
  if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });

  const emailErr = validateEmail(email, { required: true });
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });

  if (subject) {
    const subErr = validateText(subject, { label: "Subject", max: 150 });
    if (subErr) return NextResponse.json({ error: subErr }, { status: 400 });
  }

  const msgErr = validateText(message, { required: true, label: "Message", max: 3000, multiline: true });
  if (msgErr) return NextResponse.json({ error: msgErr }, { status: 400 });

  try {
    await sendContactEmail({ fullName, email, subject, message });
    return NextResponse.json({ ok: true, message: "Thank you! Your message has been sent to the HOA." });
  } catch (err: any) {
    console.error("[Contact API] Failed to send email:", err);
    return NextResponse.json(
      { error: "Could not deliver email to the HOA at this time. Please check your email configuration or try again later." },
      { status: 502 }
    );
  }
}
