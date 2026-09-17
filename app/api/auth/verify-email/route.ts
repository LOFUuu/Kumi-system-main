import { NextRequest, NextResponse } from "next/server";
import { clearVerificationToken, getUserByEmailForAuth, setEmailVerified } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { token?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!token || !email) {
    return NextResponse.json({ error: "This verification link is invalid or incomplete." }, { status: 400 });
  }

  const user = await getUserByEmailForAuth(email);

  if (!user) {
    return NextResponse.json({ error: "This verification link is invalid." }, { status: 400 });
  }
  if (user.emailVerified === true) {
    return NextResponse.json({ ok: true }); // already verified — treat as success
  }
  if (!user.verificationToken || !user.verificationTokenExpiry) {
    return NextResponse.json(
      { error: "This verification link is invalid or has already been used." },
      { status: 400 }
    );
  }
  if (new Date(user.verificationTokenExpiry).getTime() < Date.now()) {
    await clearVerificationToken(email);
    return NextResponse.json(
      { error: "This verification link has expired. Please register again to receive a new one." },
      { status: 400 }
    );
  }
  if (!verifyPassword(token, user.verificationToken)) {
    return NextResponse.json({ error: "This verification link is invalid." }, { status: 400 });
  }

  await setEmailVerified(email, true);
  return NextResponse.json({ ok: true });
}