import { NextRequest, NextResponse } from "next/server";
import { getListings, getMasterIndex, createListing } from "@/lib/db";
import { requestRole } from "@/lib/role";
import { sendAdminListingNotificationEmail } from "@/lib/mailer";
import type { VerificationStatus } from "@/lib/mock-data";
import {
  validatePhone,
  validateBlockLot,
  validateAmount,
  validateNumber,
  validateText,
  validateUrl,
} from "@/lib/validation";

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

  const role = requestRole(req);
  const isAuthorizedRole = role === "admin" || role === "counselor" || role === "resident";
  const userId = Number(req.headers.get("x-user-id") || "0");
  const userEmail = String(req.headers.get("x-user-email") || "").toLowerCase().trim();

  // If resident or HOA admin, return full addresses
  if (isAuthorizedRole) {
    return NextResponse.json(data);
  }

  // Non-resident / guest: check if they have scheduled viewings for any listings
  let scheduledListingIds = new Set<number>();
  if (userEmail) {
    try {
      const { getPropertyViewings } = await import("@/lib/db");
      const userViewings = await getPropertyViewings({ residentEmail: userEmail });
      userViewings
        .filter((v) => v.status === "viewing_scheduled" || v.status === "viewing_completed")
        .forEach((v) => scheduledListingIds.add(v.listingId));
    } catch {
      // Continue with empty scheduled set if query fails
    }
  }

  // Mask exact block, lot, and specific address for unauthorized users
  const maskedData = data.map((l) => {
    const isOwner = Boolean(userId && (l.uploadedBy === userId || l.ownerId === userId));
    const hasScheduledViewing = scheduledListingIds.has(l.id);

    if (isOwner || hasScheduledViewing) {
      return l;
    }

    const isBlockLotName = /^block\s+\w+\s*-\s*lot\s+\w+$/i.test(l.houseName.trim());
    return {
      ...l,
      address: "Mabuhay Homes Phase 5, Dasmariñas, Cavite",
      blockNo: undefined,
      lotNo: undefined,
      houseName: isBlockLotName ? "Phase 5 Residential Property" : l.houseName,
    };
  });

  return NextResponse.json(maskedData);
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

  const blockErr = validateBlockLot(blockNo, { required: true, label: "Block No." });
  if (blockErr) return NextResponse.json({ error: blockErr }, { status: 400 });

  const lotErr = validateBlockLot(lotNo, { required: true, label: "Lot No." });
  if (lotErr) return NextResponse.json({ error: lotErr }, { status: 400 });

  const priceErr = validateAmount(price, { required: true, label: "Price", min: 100 });
  if (priceErr) return NextResponse.json({ error: priceErr }, { status: 400 });

  const phoneErr = validatePhone(ownerContactNumber, {
    required: role !== "admin" && role !== "counselor",
    label: "Owner contact number",
  });
  if (phoneErr) return NextResponse.json({ error: phoneErr }, { status: 400 });

  if (ownerMessengerLink) {
    const urlErr = validateUrl(ownerMessengerLink, { label: "Messenger / Facebook link" });
    if (urlErr) return NextResponse.json({ error: urlErr }, { status: 400 });
  }

  if (body.bedrooms !== undefined) {
    const bedErr = validateNumber(body.bedrooms, { label: "Bedrooms", integer: true, min: 0, max: 50 });
    if (bedErr) return NextResponse.json({ error: bedErr }, { status: 400 });
  }

  if (body.bathrooms !== undefined) {
    const bathErr = validateNumber(body.bathrooms, { label: "Bathrooms", integer: true, min: 0, max: 50 });
    if (bathErr) return NextResponse.json({ error: bathErr }, { status: 400 });
  }

  if (body.sqm !== undefined) {
    const sqmErr = validateNumber(body.sqm, { label: "Area (sqm)", min: 1, max: 10000 });
    if (sqmErr) return NextResponse.json({ error: sqmErr }, { status: 400 });
  }

  if (body.houseName) {
    const titleErr = validateText(body.houseName, { label: "Listing title", max: 120 });
    if (titleErr) return NextResponse.json({ error: titleErr }, { status: 400 });
  }

  if (body.description) {
    const descErr = validateText(body.description, { label: "Description", max: 3000, multiline: true });
    if (descErr) return NextResponse.json({ error: descErr }, { status: 400 });
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

  // Caller's identity from headers (set by the client from localStorage) or body payload
  const headerUserId = Number(req.headers.get("x-user-id") || "0");
  const bodyOwnerId = Number(body.ownerId || "0");
  const uploadedById = headerUserId || bodyOwnerId || undefined;
  const ownerName = String(body.ownerName || "").trim() || "HOA";

  // Admin/counselor listings are auto-verified; resident submissions start as pending.
  const isHowa = role === "admin" || role === "counselor";
  const verificationStatus: VerificationStatus = isHowa ? "verified" : "pending";

  const address = `Lot ${lotNo}, Block ${blockNo}, Mabuhay Homes Phase 5`;

  const docs = {
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
    images: Array.isArray(body.images)
      ? body.images.filter((s: unknown) => typeof s === "string" && Boolean(s.trim()))
      : typeof body.images === "string" && Boolean(body.images.trim())
      ? [body.images.trim()]
      : [],
    lat: 14.3441,
    lng: 120.9791,
    // Verification fields
    verificationStatus,
    proofDocuments,
    rejectionReason: null,
    uploadedBy: uploadedById ?? null,
    showOnMap: body.showOnMap !== undefined ? Boolean(body.showOnMap) : true,
  };

  const created = await createListing(docs as any);

  // Send security email notification to Admin asynchronously so listing upload is never delayed or blocked
  if (verificationStatus === "pending") {
    sendAdminListingNotificationEmail({
      listingId: created.id,
      houseName: docs.houseName,
      propertyAddress: address,
      ownerName,
      ownerContact: ownerContactNumber,
      status: "Pending Ownership Validation",
      actionRequired: "Review proof of ownership documents and validate listing",
    }).catch((err) => {
      console.warn("[Mailer] Background admin notification error:", err?.message || err);
    });
  }

  return NextResponse.json({ listing: created }, { status: 201 });
}
