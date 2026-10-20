import { NextRequest, NextResponse } from "next/server";
import { getUserNotifications, markAllNotificationsRead } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await getUserNotifications({ id: user.id, email: user.email });
  return NextResponse.json({ notifications, unreadCount: notifications.filter((n) => !n.isRead).length });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await markAllNotificationsRead({ id: user.id, email: user.email });
  return NextResponse.json({ success: true });
}
