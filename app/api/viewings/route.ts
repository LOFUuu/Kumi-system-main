import { NextRequest, NextResponse } from "next/server";
import { getListing, getPropertyViewings, createPropertyViewing, notifyAdmins, notifyUserByEmail } from "@/lib/db";
import { isHowaRole, requestRole } from "@/lib/role";
import { validateEmail, validateName, validateText } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/viewings — admin: all viewings; resident availability query: ?availability=true&listingId=X
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId");
  const availabilityOnly = searchParams.get("availability") === "true";

  if (availabilityOnly && listingId) {
    const docs = await getPropertyViewings({ listingId: Number(listingId) });
    const unavailableSlots = docs
      .filter((d) => ["viewing_requested", "viewing_scheduled", "viewing_completed"].includes(d.status))
      .map((d) => ({
        date: d.preferredDate,
        time: d.preferredTime,
        status: d.status,
      }));
    return NextResponse.json(unavailableSlots);
  }

  const role = requestRole(req);
  if (!isHowaRole(role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const statusFilter = searchParams.get("status");
  let docs = await getPropertyViewings(listingId ? { listingId: Number(listingId) } : undefined);
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

  const emailErr = validateEmail(residentEmail, "Resident email");
  if (emailErr) {
    return NextResponse.json({ error: emailErr }, { status: 400 });
  }

  const nameErr = validateName(residentName, "Resident name", { required: false });
  if (nameErr) {
    return NextResponse.json({ error: nameErr }, { status: 400 });
  }

  const msgErr = validateText(body.message, "Message", { maxLength: 1000, required: false });
  if (msgErr) {
    return NextResponse.json({ error: msgErr }, { status: 400 });
  }

  const preferredDate = String(body.preferredDate || "").trim();
  const preferredTime = String(body.preferredTime || "").trim();

  if (!preferredDate || !preferredTime) {
    return NextResponse.json(
      { error: "Preferred date and time are required." },
      { status: 400 }
    );
  }

  // 1. Check if this resident already has an active (non-declined) viewing for this listing
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

  // 2. Check if the slot already has a Pending or Approved reservation by another user
  const allViewingsForListing = await getPropertyViewings({ listingId });
  const slotConflict = allViewingsForListing.find(
    (v) =>
      ["viewing_requested", "viewing_scheduled", "viewing_completed"].includes(v.status) &&
      v.preferredDate === preferredDate &&
      v.preferredTime === preferredTime
  );

  if (slotConflict) {
    return NextResponse.json(
      { error: "This date and time are currently unavailable. Please select another available schedule." },
      { status: 409 }
    );
  }

  try {
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

    notifyAdmins({
      title: "New Property Viewing Request",
      message: `${residentName || "Resident"} requested a viewing for ${listing.houseName} on ${preferredDate} at ${preferredTime}.`,
      type: "viewing",
      referenceId: viewing.id,
      link: "/admin/viewings",
      metadata: {
        listingName: listing.houseName,
        date: preferredDate,
        time: preferredTime,
        residentName: residentName || "Resident",
        status: "Requested",
      },
    }).catch(() => {});

    // Notify Resident about submitted viewing request
    if (residentEmail) {
      notifyUserByEmail(residentEmail, {
        title: "Property Viewing Request Submitted",
        message: `Your property viewing request for ${listing.houseName} on ${preferredDate} at ${preferredTime} has been submitted and is waiting for confirmation.`,
        type: "viewing",
        referenceId: viewing.id,
        link: "/history?tab=viewings",
        metadata: {
          listingName: listing.houseName,
          date: preferredDate,
          time: preferredTime,
          status: "Pending",
        },
      }).catch(() => {});
    }

    // Notify listing owner if this property is listed by a resident
    const ownerUserId = listing.uploadedBy || listing.ownerId;
    if (ownerUserId) {
      try {
        const { getUserById } = await import("@/lib/db");
        const ownerUser = await getUserById(ownerUserId);
        if (ownerUser && ownerUser.email && ownerUser.email.toLowerCase() !== residentEmail.toLowerCase()) {
          notifyUserByEmail(ownerUser.email, {
            title: "New Viewing Request for Your Property",
            message: `${residentName || "A prospective buyer/tenant"} requested a viewing for ${listing.houseName} on ${preferredDate} at ${preferredTime}. Please review in your listings tab.`,
            type: "viewing",
            referenceId: viewing.id,
            link: `/my-listings?tab=viewings&listingId=${listing.id}`,
            metadata: {
              listingName: listing.houseName,
              date: preferredDate,
              time: preferredTime,
              residentName: residentName || "Prospective Client",
              status: "Requested",
            },
          }).catch(() => {});
        }
      } catch {}
    }

    return NextResponse.json({ viewing }, { status: 201 });
  } catch (err: any) {
    const msg = err?.message || "Failed to submit viewing request.";
    return NextResponse.json(
      { error: msg.includes("unavailable") ? "This date and time are currently unavailable. Please select another available schedule." : msg },
      { status: 409 }
    );
  }
}
