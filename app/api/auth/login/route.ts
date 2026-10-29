import { NextRequest, NextResponse } from "next/server";
import { getUserByEmailForAuth, type AuthUser } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSessionCookieValue } from "@/lib/server-auth";
import type { User } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

function toPublicUser(u: AuthUser): User {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    blockNo: u.blockNo,
    lotNo: u.lotNo,
    phone: u.phone,
    cedula: u.cedula,
  };
}

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  let user: AuthUser | null = null;
  try {
    user = await getUserByEmailForAuth(email);
  } catch (dbErr: any) {
    console.error("[Login] Database query error:", dbErr);
    return NextResponse.json(
      { error: "Database service temporarily unavailable. Please check your connection and try again." },
      { status: 503 }
    );
  }

  if (!user) {
    // Check if the resident exists in the HOA Resident Master List, but hasn't registered / set up an account password yet
    try {
      const { ResidentMasterList } = await import("@/models");
      const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const masterRecord = await ResidentMasterList.findOne({
        email: { $regex: new RegExp(`^\\s*${escaped}\\s*$`, "i") },
      }).lean();

      if (masterRecord) {
        return NextResponse.json(
          {
            error: `Hello ${masterRecord.fullName}, your administrative record is verified in the Resident Master List! However, you have not set up your portal login password yet. Please click 'Create Account' to complete registration and activate your resident access.`,
            isMasterListResident: true,
            email,
          },
          { status: 403 }
        );
      }
    } catch (e) {
      console.warn("[Login] ResidentMasterList check warning:", (e as Error)?.message);
    }

    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if ((user as any).isArchived) {
    return NextResponse.json(
      { error: "This account has been archived. Please contact the administration." },
      { status: 403 }
    );
  }

  if (user.isActive === false) {
    return NextResponse.json(
      { error: "This account has been deactivated. Please contact the administration." },
      { status: 403 }
    );
  }

  // Google-registered accounts or accounts without a password set MUST sign in via Google or use password reset.
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "This account uses Google Sign-In or has no password set. Please sign in with Google or request a password reset." },
      { status: 401 }
    );
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Auto-verify account upon successful login if not already verified
  if (user.emailVerified === false) {
    const { setEmailVerified } = await import("@/lib/db");
    setEmailVerified(email, true).catch(() => {});
    user.emailVerified = true;
  }

  // Default seed admin bootstrapping (preserves all existing admin accounts without restricting succession)
  const DEFAULT_ADMIN_EMAIL = "mabuhay2000phase5@gmail.com";
  if (email === DEFAULT_ADMIN_EMAIL && user.role !== "admin") {
    const { updateUserById } = await import("@/lib/db");
    const updated = await updateUserById(user.id, { role: "admin" });
    if (updated) {
      user.role = "admin";
    }
  }

  const publicUser = toPublicUser(user);
  const res = NextResponse.json({ user: publicUser });

  res.cookies.set("kumi_session", createSessionCookieValue(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return res;
}