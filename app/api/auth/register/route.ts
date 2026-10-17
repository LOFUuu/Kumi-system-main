import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByEmailForAuth, saveVerificationToken, updateUserById, setUserPassword } from "@/lib/db";
import { createVerificationToken, hashPassword } from "@/lib/password";
import { validatePassword } from "@/lib/password-validation";
import { sendVerificationEmail } from "@/lib/mailer";
import { createSessionCookieValue } from "@/lib/server-auth";
import { getBaseUrl } from "@/lib/url";
import type { Role } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const PUBLIC_ROLES: Role[] = ["resident", "non_resident"];
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const rawRole = String(body.role ?? "").trim() as Role;
    const role: Role = PUBLIC_ROLES.includes(rawRole) ? rawRole : "resident";

    if (!fullName) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    // Validate password confirmation if provided
    if (body.confirm !== undefined && String(body.confirm) !== password) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return NextResponse.json(
        { error: pwCheck.error || "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existing = await getUserByEmailForAuth(email);
    if (existing && existing.passwordHash) {
      return NextResponse.json({ error: "An account with this email already exists. Please log in." }, { status: 409 });
    }

    let user: any;
    if (existing) {
      // User existed without password (e.g. created by admin or Google): set password and activate
      await setUserPassword(email, hashPassword(password));
      user = await updateUserById(existing.id, {
        fullName: fullName || existing.fullName,
        emailVerified: true,
        isActive: true,
        address: body.address ? String(body.address).trim() : existing.address,
        phone: body.phone ? String(body.phone).trim() : existing.phone,
      });
      if (!user) user = existing;
    } else {
      user = await createUser({
        fullName,
        email,
        role: role as "resident" | "non_resident",
        passwordHash: hashPassword(password),
        address: body.address ? String(body.address).trim() : undefined,
        phone: body.phone ? String(body.phone).trim() : undefined,
        blockNo: body.blockNo ? String(body.blockNo).trim() : undefined,
        lotNo: body.lotNo ? String(body.lotNo).trim() : undefined,
        emailVerified: true,
      });
    }

    // Attempt to save token and send verification email in background without blocking or failing signup
    try {
      const { token, hash } = createVerificationToken();
      const expiry = new Date(Date.now() + VERIFICATION_TTL_MS);
      saveVerificationToken(email, hash, expiry).catch(() => {});
      const origin = getBaseUrl(req);
      const verifyUrl = `${origin}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
      sendVerificationEmail(email, verifyUrl).catch((err: any) => {
        console.warn("[Register] Verification email notification skipped:", err?.message || err);
      });
    } catch {
      // Non-blocking
    }

    const publicUser = {
      id: user?.id,
      fullName: user?.fullName || fullName,
      email: user?.email || email,
      role: user?.role || role,
      isActive: true,
      blockNo: user?.blockNo,
      lotNo: user?.lotNo,
      phone: user?.phone,
      cedula: user?.cedula,
    };

    const res = NextResponse.json({ ok: true, user: publicUser }, { status: 201 });

    if (user?.id) {
      res.cookies.set("kumi_session", createSessionCookieValue(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    return res;
  } catch (err: any) {
    console.error("[Register] Error creating account:", err);
    const raw = err?.message ?? "";
    const isTechnical =
      /ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|socket|getaddrinfo|connect\s/i.test(raw) ||
      /MongoServerError|MongooseError|mysql|mariadb|PROTOCOL_/i.test(raw);
    const safeMessage = isTechnical
      ? "We're having trouble connecting right now. Please try again in a moment."
      : raw || "Failed to create account. Please try again.";
    return NextResponse.json(
      { error: safeMessage },
      { status: 500 }
    );
  }
}