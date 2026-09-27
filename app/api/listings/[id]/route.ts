import { NextRequest, NextResponse } from "next/server";
import { getListing } from "@/lib/db";
import { Listing } from "@/models";
import { howaGuard, requestRole } from "@/lib/role";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getListing(id);
  if (!data) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  return NextResponse.json(data);
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
      await Listing.updateOne(
        { _id: numericId } as any,
        {
          $set: {
            verificationStatus: "verified",
            rejectionReason: null,
          },
        } as any
      );
    } else {
      // reject
      const reason = String(body.rejectionReason || "").trim();
      if (!reason) {
        return NextResponse.json(
          { error: "A rejection reason is required." },
          { status: 400 }
        );
      }
      await Listing.updateOne(
        { _id: numericId } as any,
        {
          $set: {
            verificationStatus: "rejected",
            rejectionReason: reason,
          },
        } as any
      );
    }

    const updated = await getListing(numericId);
    return NextResponse.json({ listing: updated });
  }

  // ── Resubmit (listing owner resubmits with new/updated docs) ────────────
  if (body.proofDocuments && !isHowa) {
    // Verify the requester owns this listing
    if (requesterId && existing.uploadedBy !== requesterId) {
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

    await Listing.updateOne(
      { _id: numericId } as any,
      {
        $set: {
          verificationStatus: "pending",
          proofDocuments: newDocs,
          rejectionReason: null,
        },
      } as any
    );

    const updated = await getListing(numericId);
    return NextResponse.json({ listing: updated });
  }

  // ── Standard status / field update (Owner or Admin) ─────────────────────
  const isOwner = Boolean(requesterId && existing.uploadedBy === requesterId);

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
    patch.ownerContactNumber = String(body.ownerContactNumber || "").trim();
  }
  if (body.ownerMessengerLink !== undefined) {
    patch.ownerMessengerLink = String(body.ownerMessengerLink || "").trim();
  }

  // General field patches
  for (const k of ["price", "listingType", "bedrooms", "bathrooms", "sqm", "description", "houseName", "images"] as const) {
    if (body[k] !== undefined) {
      patch[k] = k === "listingType" ? (body[k] === "rent" ? "rent" : "sale") : body[k];
    }
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

  await Listing.updateOne({ _id: numericId } as any, { $set: patch } as any);
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

  await Listing.deleteOne({ _id: numericId } as any);
  return NextResponse.json({ ok: true });
}
