import { NextRequest, NextResponse } from "next/server";
import { getPropertyViewings } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/viewings/my — resident fetches their own viewings
// Optionally filter by ?listingId=X to get the viewing for a specific property
export async function GET(req: NextRequest) {
  const residentEmail = String(req.headers.get("x-user-email") || "").trim();
  if (!residentEmail) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId");

  const docs = await getPropertyViewings({
    residentEmail,
    ...(listingId ? { listingId: Number(listingId) } : {}),
  });
  return NextResponse.json(docs);
}
