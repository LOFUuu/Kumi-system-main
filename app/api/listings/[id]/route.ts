import { NextRequest, NextResponse } from "next/server";
import { getListing, updateListing, deleteListing } from "@/lib/db";
import { howaGuard, requestRole } from "@/lib/role";
import {
  validatePhone,
  validateBlockLot,
  validateAmount,
  validateNumber,
  validateText,
  validateUrl,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getListing(id);
  if (!data) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const role = requestRole(req);
  const isAuthorizedRole = role === "admin" || role === "counselor" || role === "resident";
  const userId = Number(req.headers.get("x-user-id") || "0");
  const userEmail = String(req.headers.get("x-user-email") || "").toLowerCase().trim();

  // If resident or HOA admin, return full address
  if (isAuthorizedRole) {
    return NextResponse.json(data);
  }

  // Check if caller is owner
  const isOwner = Boolean(userId && (data.uploadedBy === userId || data.ownerId === userId));
  if (isOwner) {
    return NextResponse.json(data);
  }

  // Check if non-resident has a confirmed scheduled viewing for this listing
  let hasScheduledViewing = false;
  if (userEmail) {
    try {
      const { getPropertyViewings } = await import("@/lib/db");
      const userViewings = await getPropertyViewings({ residentEmail: userEmail, listingId: data.id });
      hasScheduledViewing = userViewings.some(
        (v) => v.status === "viewing_scheduled" || v.status === "viewing_completed"
      );
    } catch {}
  }

  if (hasScheduledViewing) {
    return NextResponse.json(data);
  }

  // Mask exact block and lot for non-residents without confirmed viewing
  const isBlockLotName = /^block\s+\w+\s*-\s*lot\s+\w+$/i.test(data.houseName.trim());
  const maskedListing = {
    ...data,
    address: "Mabuhay Homes Phase 5, Dasmariñas, Cavite",
    blockNo: undefined,
    lotNo: undefined,
    houseName: isBlockLotName ? "Phase 5 Residential Property" : data.houseName,
  };

  return NextResponse.json(maskedListing);
}

// PATCH /api/listings/[id]
// Supports two modes:
//   1. Verification review (HOWA only): { action: "approve" } | { action: "reject", rejectionReason: "..." }
//   2. Status / field update (HOWA only): { status: "available" | "reserved" | "sold", ...fields }
//   3. Resubmit (listing owner): { proofDocuments: [...] } — re-opens pending state
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const existing = await getListing(numericId);
  if (!existing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  const role = requestRole(req);
  const isHowa = role === "admin" || role === "counselor";
  const requesterId = Number(req.headers.get("x-user-id") || "0");

  // ── Verification review (HOWA only) ─────────────────────────────────────
  if (body.action === "approve" || body.action === "reject") {
    const denied = howaGuard(req);
    if (denied) return NextResponse.json({ error: denied }, { status: 403 });

    if (body.action === "approve") {
      await updateListing(numericId, {
        verificationStatus: "verified",
        rejectionReason: null,
      });
    } else {
      // reject
      const reason = String(body.rejectionReason || "").trim();
      if (!reason) {
        return NextResponse.json(
          { error: "A rejection reason is required." },
          { status: 400 }
        );
      }
      await updateListing(numericId, {
        verificationStatus: "rejected",
        rejectionReason: reason,
      });
    }

    const updated = await getListing(numericId);
    return NextResponse.json({ listing: updated });
  }

  // ── Resubmit (listing owner resubmits with new/updated docs) ────────────
  if (body.proofDocuments && !isHowa) {
    // Verify the requester owns this listing
    if (requesterId && existing.uploadedBy !== requesterId && existing.ownerId !== requesterId) {
      return NextResponse.json(
        { error: "You can only resubmit your own listings." },
        { status: 403 }
      );
    }
    if (existing.verificationStatus !== "rejected") {
      return NextResponse.json(
        { error: "Only rejected listings can be resubmitted." },
        { status: 400 }
      );
    }

    const newDocs: string[] = Array.isArray(body.proofDocuments)
      ? body.proofDocuments.filter((p: unknown) => typeof p === "string" && p.trim())
      : [];

    if (!newDocs.length) {
      return NextResponse.json(
        { error: "At least one proof document is required to resubmit." },
        { status: 400 }
      );
    }

    await updateListing(numericId, {
      verificationStatus: "pending",
      proofDocuments: newDocs,
      rejectionReason: null,
    });

    const updated = await getListing(numericId);
    return NextResponse.json({ listing: updated });
  }

  // ── Standard status / field update (Owner or Admin) ─────────────────────
  const isOwner = Boolean(
    requesterId &&
      (existing.uploadedBy === requesterId || existing.ownerId === requesterId)
  );

  if (!isHowa && !isOwner) {
    return NextResponse.json(
      { error: "Access denied. You can only edit your own listings." },
      { status: 403 }
    );
  }

  // Non-admin (resident owner) attempting to touch admin-only verification or marketplace visibility status
  if (!isHowa && (body.verificationStatus || body.status)) {
    return NextResponse.json(
      { error: "Access denied. Ownership verification and marketplace visibility status are managed by HOA administrators." },
      { status: 403 }
    );
  }

  const patch: Record<string, any> = {};

  // Admin marketplace visibility status (Available ↔ Off Market)
  if (isHowa && body.status) {
    const status = String(body.status);
    if (!["available", "reserved", "sold", "off_market"].includes(status)) {
      return NextResponse.json({ error: "Invalid marketplace status." }, { status: 400 });
    }
    patch.status = status;
  }

  // Owner transaction status (For Sale/Rent ↔ Reserved ↔ Sold/Rented Out)
  if (body.transactionStatus !== undefined) {
    const txStatus = String(body.transactionStatus);
    if (!["available", "reserved", "sold_rented", "sold"].includes(txStatus)) {
      return NextResponse.json({ error: "Invalid transaction status." }, { status: 400 });
    }
    patch.transactionStatus = txStatus;
  }

  if (body.ownerContactNumber !== undefined) {
    const contact = String(body.ownerContactNumber || "").trim();
    if (contact) {
      const phoneErr = validatePhone(contact, { label: "Owner contact number" });
      if (phoneErr) return NextResponse.json({ error: phoneErr }, { status: 400 });
    }
    patch.ownerContactNumber = contact;
  }
  if (body.ownerMessengerLink !== undefined) {
    const link = String(body.ownerMessengerLink || "").trim();
    if (link) {
      const urlErr = validateUrl(link, { label: "Messenger / Facebook link" });
      if (urlErr) return NextResponse.json({ error: urlErr }, { status: 400 });
    }
    patch.ownerMessengerLink = link;
  }

  if (body.siteVisitRecommended !== undefined) {
    patch.siteVisitRecommended = Boolean(body.siteVisitRecommended);
  }

  if (body.price !== undefined) {
    const priceErr = validateAmount(body.price, { label: "Price", min: 100 });
    if (priceErr) return NextResponse.json({ error: priceErr }, { status: 400 });
    patch.price = Number(body.price);
  }

  if (body.bedrooms !== undefined) {
    const bedErr = validateNumber(body.bedrooms, { label: "Bedrooms", integer: true, min: 0, max: 50 });
    if (bedErr) return NextResponse.json({ error: bedErr }, { status: 400 });
    patch.bedrooms = Number(body.bedrooms);
  }

  if (body.bathrooms !== undefined) {
    const bathErr = validateNumber(body.bathrooms, { label: "Bathrooms", integer: true, min: 0, max: 50 });
    if (bathErr) return NextResponse.json({ error: bathErr }, { status: 400 });
    patch.bathrooms = Number(body.bathrooms);
  }

  if (body.sqm !== undefined) {
    const sqmErr = validateNumber(body.sqm, { label: "Area (sqm)", min: 1, max: 10000 });
    if (sqmErr) return NextResponse.json({ error: sqmErr }, { status: 400 });
    patch.sqm = Number(body.sqm);
  }

  if (body.houseName !== undefined) {
    const title = String(body.houseName || "").trim();
    if (title) {
      const titleErr = validateText(title, { label: "Listing title", max: 120 });
      if (titleErr) return NextResponse.json({ error: titleErr }, { status: 400 });
    }
    patch.houseName = title;
  }

  if (body.description !== undefined) {
    const desc = String(body.description || "").trim();
    if (desc) {
      const descErr = validateText(desc, { label: "Description", max: 3000, multiline: true });
      if (descErr) return NextResponse.json({ error: descErr }, { status: 400 });
    }
    patch.description = desc;
  }

  if (body.listingType !== undefined) {
    patch.listingType = body.listingType === "rent" ? "rent" : "sale";
  }

  if (body.images !== undefined) {
    patch.images = body.images;
  }

  // Re-verification Business Rule for Owners:
  // If owner edits proof-sensitive fields (price, blockNo, lotNo, houseName, proofDocuments), reset verificationStatus back to "pending".
  if (!isHowa && isOwner) {
    const sensitiveFieldsChanged =
      (body.price !== undefined && body.price !== existing.price) ||
      (body.blockNo !== undefined && body.blockNo !== existing.blockNo) ||
      (body.lotNo !== undefined && body.lotNo !== existing.lotNo) ||
      (body.houseName !== undefined && body.houseName !== existing.houseName) ||
      (body.proofDocuments !== undefined && Array.isArray(body.proofDocuments));

    if (sensitiveFieldsChanged) {
      patch.verificationStatus = "pending";
    }
  }

  await updateListing(numericId, patch);
  const updated = await getListing(numericId);
  return NextResponse.json({ listing: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = howaGuard(req);
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const existing = await getListing(numericId);
  if (!existing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  await deleteListing(numericId);
  return NextResponse.json({ ok: true });
}
