import { NextRequest, NextResponse } from "next/server";
import { getListings, getPropertyViewings, updatePropertyViewing } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { isHowaRole } from "@/lib/role";

export const dynamic = "force-dynamic";

// PATCH /api/viewings/owner/[id] — homeowner updates viewing status for their listing
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid viewing ID." }, { status: 400 });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const allViewings = await getPropertyViewings();
  const viewing = allViewings.find((v) => v.id === numericId);
  if (!viewing) {
    return NextResponse.json({ error: "Viewing not found." }, { status: 404 });
  }

  // Verify ownership of the listing associated with this viewing
  const allListings = await getListings();
  const listing = allListings.find((l) => l.id === viewing.listingId);
  const isOwner = Boolean(
    listing &&
      user.id &&
      (listing.uploadedBy === user.id || listing.ownerId === user.id)
  );
  const isHowa = isHowaRole(user.role);

  if (!isOwner && !isHowa) {
    return NextResponse.json(
      { error: "You are not authorized to update this viewing request." },
      { status: 403 }
    );
  }

  const validStatuses = ["viewing_scheduled", "viewing_completed", "viewing_declined"];
  if (!body.status || !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status transition." }, { status: 400 });
  }

  const patch: Record<string, any> = { status: body.status };
  if (body.adminNotes !== undefined) patch.adminNotes = String(body.adminNotes).trim();
  if (body.scheduledAt !== undefined) patch.scheduledAt = body.scheduledAt;

  const updated = await updatePropertyViewing(numericId, patch);

  // Notify requester and admins
  const { notifyUserByEmail, notifyAdmins } = await import("@/lib/db");
  const listingName = viewing.listingName || listing?.houseName || "Property";

  if (viewing.residentEmail) {
    if (body.status === "viewing_scheduled") {
      notifyUserByEmail(viewing.residentEmail, {
        title: "Property Viewing Confirmed! 📅",
        message: `Your viewing appointment for ${listingName} is confirmed for ${viewing.preferredDate} at ${viewing.preferredTime}.`,
        type: "viewing",
        referenceId: numericId,
        link: "/history?tab=viewings",
        metadata: {
          listingName,
          date: viewing.preferredDate,
          time: viewing.preferredTime,
          status: "Confirmed",
        },
      }).catch(() => {});

      notifyAdmins({
        title: "Property Viewing Scheduled by Owner",
        message: `Owner confirmed the viewing appointment for ${listingName} with ${viewing.residentName} on ${viewing.preferredDate} at ${viewing.preferredTime}.`,
        type: "viewing",
        referenceId: numericId,
        link: "/admin/viewings",
        metadata: {
          listingName,
          date: viewing.preferredDate,
          time: viewing.preferredTime,
          status: "Confirmed",
          residentName: viewing.residentName,
        },
      }).catch(() => {});
    } else if (body.status === "viewing_completed") {
      notifyUserByEmail(viewing.residentEmail, {
        title: "Property Viewing Completed ✅",
        message: `Your property viewing for ${listingName} has been marked completed by the property owner.`,
        type: "viewing",
        referenceId: numericId,
        link: "/history?tab=viewings",
        metadata: {
          listingName,
          date: viewing.preferredDate,
          time: viewing.preferredTime,
          status: "Completed",
        },
      }).catch(() => {});

      notifyAdmins({
        title: "Property Viewing Completed",
        message: `Viewing for ${listingName} with ${viewing.residentName} on ${viewing.preferredDate} was marked completed.`,
        type: "viewing",
        referenceId: numericId,
        link: "/admin/viewings",
        metadata: {
          listingName,
          date: viewing.preferredDate,
          time: viewing.preferredTime,
          status: "Completed",
          residentName: viewing.residentName,
        },
      }).catch(() => {});
    } else if (body.status === "viewing_declined") {
      notifyUserByEmail(viewing.residentEmail, {
        title: "Property Viewing Declined",
        message: `Your viewing request for ${listingName} on ${viewing.preferredDate} was declined by the property owner.${patch.adminNotes ? ` Reason: "${patch.adminNotes}".` : ""}`,
        type: "viewing",
        referenceId: numericId,
        link: "/history?tab=viewings",
        metadata: {
          listingName,
          date: viewing.preferredDate,
          time: viewing.preferredTime,
          status: "Declined",
          reason: patch.adminNotes,
        },
      }).catch(() => {});

      notifyAdmins({
        title: "Property Viewing Declined by Owner",
        message: `Owner declined viewing request for ${listingName} by ${viewing.residentName}.${patch.adminNotes ? ` Reason: "${patch.adminNotes}"` : ""}`,
        type: "viewing",
        referenceId: numericId,
        link: "/admin/viewings",
        metadata: {
          listingName,
          date: viewing.preferredDate,
          time: viewing.preferredTime,
          status: "Declined",
          residentName: viewing.residentName,
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ viewing: updated });
}
