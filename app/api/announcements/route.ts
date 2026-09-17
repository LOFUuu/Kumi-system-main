import { NextResponse } from "next/server";
import { getAnnouncements } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";
  const data = await getAnnouncements(activeOnly);
  return NextResponse.json(data);
}
