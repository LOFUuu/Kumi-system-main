import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { PropertyViewing } from "@/models";
import type { PropertyViewing as PropertyViewingType } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

function serializeViewing(doc: any): PropertyViewingType {
  if (!doc) return doc;
  const { _id, __v, createdAt, updatedAt, ...rest } = doc;
  return { ...rest, id: _id, createdAt } as PropertyViewingType;
}

// GET /api/viewings/my — resident fetches their own viewings
// Optionally filter by ?listingId=X to get the viewing for a specific property
export async function GET(req: NextRequest) {
  const residentEmail = String(req.headers.get("x-user-email") || "").trim();
  if (!residentEmail) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId");

  const query: Record<string, any> = { residentEmail };
  if (listingId) query.listingId = Number(listingId);

  const docs = await PropertyViewing.find(query).sort({ _id: -1 }).lean();
  return NextResponse.json(docs.map(serializeViewing));
}
