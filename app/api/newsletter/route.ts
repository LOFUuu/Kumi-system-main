import { NextRequest, NextResponse } from "next/server";
import { sendNewsletterWelcomeEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// In-memory / DB subscription handler
const subscribers = new Set<string>();

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (subscribers.has(email)) {
    return NextResponse.json(
      { message: "This email address is already subscribed to our newsletter." },
      { status: 200 }
    );
  }

  subscribers.add(email);

  // Send real welcome email to the subscriber via Nodemailer
  let emailSent = false;
  try {
    await sendNewsletterWelcomeEmail(email);
    emailSent = true;
  } catch (err) {
    console.error("[Newsletter Mailer Error]:", err);
  }

  if (emailSent) {
    return NextResponse.json(
      { message: "Thank you for subscribing! A welcome email has been sent to your inbox." },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { message: "Thank you for subscribing to our newsletter!" },
    { status: 200 }
  );
}

