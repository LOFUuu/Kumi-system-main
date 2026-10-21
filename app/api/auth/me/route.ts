import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, toPublicUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user: toPublicUser(user) });
  } catch (err) {
    console.error("[/api/auth/me] Error resolving user session:", err);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
