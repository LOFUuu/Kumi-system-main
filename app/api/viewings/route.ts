import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { PropertyViewing } from "@/models";
import { getListing } from "@/lib/db";
import { isHowaRole, requestRole } from "@/lib/role";
import type { PropertyViewing as PropertyViewingType } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

function serializeViewing(doc: any): PropertyViewingType {
  if (!doc) return doc;
  const { _id, __v, createdAt, updatedAt, ...rest } = doc;
  return { ...rest, id: _id, createdAt } as PropertyViewingType;
}

function getNextViewingId(): Promise<number> {
  return PropertyViewing.findOne({}).sort({ _id: -1 }).lean().then(last => last ? (last as any)._id + 1 : 1);
}

// GET /api/viewings — admin: all viewings; resident: not used here (see /my)
export async function GET(req: NextRequest) {
  await dbConnect();
  const role = requestRole(req);
  if (!isHowaRole(role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");
  const query: Record<string, any> = {};
  if (statusFilter) query.status = statusFilter;

  const docs = await PropertyViewing.find(query).sort({ _id: -1 }).lean();
  return NextResponse.json(docs.map(serializeViewing));
}

// POST /api/viewings — resident submits a viewing request
export async function POST(req: NextRequest) {
  await dbConnect();
  const role = requestRole(req);
  if (!role) {
    return NextResponse.json({ error: "You must be signed in to request a viewing." }, { status: 401 });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const listingId = Number(body.listingId);
  if (!Number.isFinite(listingId)) {
    return NextResponse.json({ error: "A valid listing ID is required." }, { status: 400 });
  }

  const listing = await getListing(listingId);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const residentEmail = String(req.headers.get("x-user-email") || body.residentEmail || "").trim();
  const residentName = String(req.headers.get("x-user-name") || body.residentName || "").trim();

  if (!residentEmail) {
    return NextResponse.json({ error: "Resident email is required." }, { status: 400 });
  }

  const preferredDate = String(body.preferredDate || "").trim();
  const preferredTime = String(body.preferredTime || "").trim();

  if (!preferredDate || !preferredTime) {
    return NextResponse.json(
      { error: "Preferred date and time are required." },
      { status: 400 }
    );
  }

  // Check if this resident already has an active (non-declined) viewing for this listing
  const existing = await PropertyViewing.findOne({
    listingId,
    residentEmail,
    status: { $in: ["viewing_requested", "viewing_scheduled"] },
  }).lean();

  if (existing) {
    return NextResponse.json(
      { error: "You already have an active viewing request for this property." },
      { status: 409 }
    );
  }

  const id = await getNextViewingId();
  const doc = {
    _id: id,
    listingId,
    listingName: listing.houseName,
    residentName: residentName || "Resident",
    residentEmail,
    preferredDate,
    preferredTime,
    message: String(body.message || "").trim(),
    status: "viewing_requested",
    adminNotes: "",
    scheduledAt: null,
  };

  await PropertyViewing.create(doc as any);
  return NextResponse.json({ viewing: serializeViewing({ ...doc, createdAt: new Date().toISOString() }) }, { status: 201 });
}
