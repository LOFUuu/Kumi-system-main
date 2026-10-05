import { NextRequest, NextResponse } from "next/server";
import { getListings, getMasterIndex, getNextId } from "@/lib/db";
import { Listing } from "@/models";
import { requestRole } from "@/lib/role";
import { sendAdminListingNotificationEmail } from "@/lib/mailer";
import type { VerificationStatus } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

// GET /api/listings
// Public callers pass ?verificationStatus=verified to see only approved listings.
// Admin/counselor callers omit the param to see everything.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const verificationStatus =
    (searchParams.get("verificationStatus") as VerificationStatus) ?? undefined;

  const data = await getListings({
    ...(status ? { status: status as any } : {}),
    ...(verificationStatus ? { verificationStatus } : {}),
  });
  return NextResponse.json(data);
}

// POST /api/listings
// Any authenticated user (resident, admin, counselor) may submit a listing.
// Listings require at least one proof document and start as "pending".
export async function POST(req: NextRequest) {
  const role = requestRole(req);
  if (!role) {
    return NextResponse.json(
      { error: "Access denied. You must be signed in to submit a listing." },
      { status: 403 }
    );
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const blockNo = String(body.blockNo || "").trim();
  const lotNo = String(body.lotNo || "").trim();
  const price = Number(body.price);
  const type = (body.listingType === "rent" ? "rent" : "sale") as "sale" | "rent";
  const ownerContactNumber = String(body.ownerContactNumber || "").trim();
  const ownerMessengerLink = String(body.ownerMessengerLink || "").trim();

  if (!blockNo || !lotNo || !Number.isFinite(price) || price <= 0) {
    return NextResponse.json(
      { error: "Block, lot, and a valid price are required." },
      { status: 400 }
    );
  }

  if (!ownerContactNumber) {
    return NextResponse.json(
      { error: "Owner contact number is required." },
      { status: 400 }
    );
  }

  // Require at least one proof document
  const proofDocuments: string[] = Array.isArray(body.proofDocuments)
    ? body.proofDocuments.filter((p: unknown) => typeof p === "string" && p.trim())
    : [];

  if (proofDocuments.length === 0) {
    return NextResponse.json(
      {
        error:
          "At least one proof of ownership document is required (land title, tax declaration, lease contract, or utility bill).",
      },
      { status: 400 }
    );
  }

  const master = await getMasterIndex();
  const unitExists = master.some((u) => u.blockNo === blockNo && u.lotNo === lotNo);
  if (!unitExists) {
    return NextResponse.json(
      {
        error:
          "That block/lot is not in the resident master index. Register the resident/unit first.",
      },
      { status: 400 }
    );
  }

  // Caller's identity from headers (set by the client from localStorage) or body payload
  const headerUserId = Number(req.headers.get("x-user-id") || "0");
  const bodyOwnerId = Number(body.ownerId || "0");
  const uploadedById = headerUserId || bodyOwnerId || undefined;
  const ownerName = String(body.ownerName || "").trim() || "HOA";

  // Admin/counselor listings are auto-verified; resident submissions start as pending.
  const isHowa = role === "admin" || role === "counselor";
  const verificationStatus: VerificationStatus = isHowa ? "verified" : "pending";

  const id = await getNextId(Listing);
  const address = `Lot ${lotNo}, Block ${blockNo}, Mabuhay Homes Phase 5`;

  const docs = {
    _id: id,
    houseName: body.houseName
      ? String(body.houseName).trim()
      : `Block ${blockNo} - Lot ${lotNo}`,
    address,
    blockNo,
    lotNo,
    price,
    listingType: type,
    bedrooms: Number(body.bedrooms) || 0,
    bathrooms: Number(body.bathrooms) || 0,
    sqm: Number(body.sqm) || 0,
    status: "available",
    transactionStatus: "available",
    ownerContactNumber,
    ownerMessengerLink,
    description: String(body.description || ""),
    ownerId: bodyOwnerId || uploadedById || 0,
    ownerName,
    images: String(body.images || "")
      ? String(body.images)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    lat: 14.3049,
    lng: 120.98636,
    // Verification fields
    verificationStatus,
    proofDocuments,
    rejectionReason: null,
    uploadedBy: uploadedById ?? null,
    showOnMap: body.showOnMap !== undefined ? Boolean(body.showOnMap) : true,
  };

  await Listing.create(docs as any);

  // Send security email notification to Admin if submission needs validation
  if (verificationStatus === "pending") {
    try {
      await sendAdminListingNotificationEmail({
        listingId: id,
        houseName: docs.houseName,
        propertyAddress: address,
        ownerName,
        ownerContact: ownerContactNumber,
        status: "Pending Ownership Validation",
        actionRequired: "Review proof of ownership documents and validate listing",
      });
    } catch (err) {
      console.error("[Mailer] Failed to send admin listing notification:", err);
    }
  }

  return NextResponse.json({ listing: { ...docs, id } }, { status: 201 });
}
