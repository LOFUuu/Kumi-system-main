import { NextRequest, NextResponse } from "next/server";
import { getUsers, createUser, setEmailVerified, updateUserById } from "@/lib/db";

export const dynamic = "force-dynamic";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const ADMIN_EMAIL = "mabuhay2000phase5@gmail.com";

interface GoogleProfile {
  aud?: string;
  iss?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  exp?: string | number;
}

export async function POST(req: NextRequest) {
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "Google Sign-In is not configured on the server." },
      { status: 500 }
    );
  }

  let body: { credential?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const credential = typeof body.credential === "string" ? body.credential : "";
  if (!credential) {
    return NextResponse.json({ error: "Missing Google credential" }, { status: 400 });
  }

  let profile: GoogleProfile;
  try {
    const res = await fetch(`${TOKEN_INFO_URL}?id_token=${encodeURIComponent(credential)}`);
    if (!res.ok) {
      return NextResponse.json({ error: "Invalid Google credential" }, { status: 401 });
    }
    profile = await res.json();
  } catch {
    return NextResponse.json({ error: "Unable to verify Google credential" }, { status: 502 });
  }

  // The credential must be issued for our OAuth client.
  if (profile.aud !== GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "Google credential was issued for another client" },
      { status: 401 }
    );
  }

  if (profile.exp && Number(profile.exp) * 1000 < Date.now()) {
    return NextResponse.json({ error: "Google credential has expired" }, { status: 401 });
  }

  const verified = profile.email_verified === true || profile.email_verified === "true";
  const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
  if (!verified || !email) {
    return NextResponse.json(
      { error: "A verified Google email is required to sign in" },
      { status: 401 }
    );
  }

  const isAdminEmail = email === ADMIN_EMAIL;

  // Find-or-create the portal user tied to this email. Google verifies the
  // address itself, so these accounts are immediately email-verified — and any
  // account registered by password that was still unverified gets auto-verified
  // here, since signing in via Google proves ownership of the inbox.
  const users = await getUsers();
  let user = users.find((u) => u.email.trim().toLowerCase() === email);
  if (!user) {
    const fullName = profile.name?.trim() || email.split("@")[0] || "Resident";
    const assignedRole = isAdminEmail ? "admin" : "non_resident";
    user = await createUser({ fullName, email, role: assignedRole, emailVerified: true });
  } else {
    // If this is the authorized admin email, ensure the user role is updated to admin
    if (isAdminEmail && user.role !== "admin") {
      const updated = await updateUserById(user.id, { role: "admin" });
      if (updated) {
        user = updated;
      } else {
        user.role = "admin";
      }
    }
    // Proves ownership of the inbox, so a pending password sign-up becomes
    // immediately usable.
    await setEmailVerified(email, true);
  }

  return NextResponse.json({ user });
}