import { NextRequest, NextResponse } from "next/server";
import { getListing, getPropertyViewings, createPropertyViewing } from "@/lib/db";
import { isHowaRole, requestRole } from "@/lib/role";

export const dynamic = "force-dynamic";

// GET /api/viewings — admin: all viewings; resident: not used here (see /my)
export async function GET(req: NextRequest) {
  const role = requestRole(req);
  if (!isHowaRole(role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");
  let docs = await getPropertyViewings();
  if (statusFilter) {
    docs = docs.filter((d) => d.status === statusFilter);
  }
  return NextResponse.json(docs);
}

// POST /api/viewings — resident submits a viewing request
export async function POST(req: NextRequest) {
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
  const existingList = await getPropertyViewings({ residentEmail, listingId });
  const existing = existingList.find((v) =>
    ["viewing_requested", "viewing_scheduled"].includes(v.status)
  );

  if (existing) {
    return NextResponse.json(
      { error: "You already have an active viewing request for this property." },
      { status: 409 }
    );
  }

  const viewing = await createPropertyViewing({
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
  });

  return NextResponse.json({ viewing }, { status: 201 });
}
