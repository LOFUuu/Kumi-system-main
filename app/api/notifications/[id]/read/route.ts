import { NextRequest, NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const success = await markNotificationRead(id, user.id);
  return NextResponse.json({ success });
}
