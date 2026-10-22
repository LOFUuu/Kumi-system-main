import { NextRequest, NextResponse } from "next/server";
import { getAnnouncements, createAnnouncement } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { validateText, firstError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";
  const data = await getAnnouncements(activeOnly);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || (user.role !== "admin" && user.role !== "counselor")) {
    return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  const status = body.status === "archived" ? "archived" : "active";
  const category = String(body.category || "Community").trim();
  const poster = String(body.poster || user.fullName || "HOA Admin").trim();

  const err = firstError(
    validateText(title, "Announcement title", { minLength: 3, maxLength: 200, required: true }),
    validateText(content, "Announcement content", { minLength: 5, maxLength: 10000, required: true }),
    validateText(category, "Category", { maxLength: 50, required: false }),
    validateText(poster, "Poster", { maxLength: 100, required: false })
  );
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  try {
    const created = await createAnnouncement({
      title,
      content,
      status,
      category,
      poster,
    });
    return NextResponse.json({ announcement: created, success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create announcement." }, { status: 500 });
  }
}
