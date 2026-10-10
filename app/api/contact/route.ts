import { NextRequest, NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/mailer";

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

  if (!fullName || !email || !message) {
    return NextResponse.json(
      { error: "Full name, email, and message are required." },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

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
