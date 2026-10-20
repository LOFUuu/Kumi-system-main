import { NextRequest, NextResponse } from "next/server";
import { getPropertyViewings, updatePropertyViewing } from "@/lib/db";
import { howaGuard, isHowaRole, requestRole } from "@/lib/role";

export const dynamic = "force-dynamic";

// PATCH /api/viewings/[id] — admin updates viewing status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid viewing ID." }, { status: 400 });
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

  const role = requestRole(req);
  const isHowa = isHowaRole(role);

  // Admin-only status transitions
  const validAdminStatuses = ["viewing_requested", "viewing_scheduled", "viewing_completed", "viewing_declined"];
  if (body.status && validAdminStatuses.includes(body.status)) {
    const denied = howaGuard(req);
    if (denied) return NextResponse.json({ error: denied }, { status: 403 });

    const patch: Record<string, any> = { status: body.status };
    if (body.adminNotes !== undefined) patch.adminNotes = String(body.adminNotes).trim();

    // Preserve existing schedule unless explicitly provided
    if (body.scheduledAt !== undefined && body.scheduledAt !== "") {
      patch.scheduledAt = body.scheduledAt;
    } else if (body.status === "viewing_scheduled" && !viewing.scheduledAt) {
      // If confirming schedule without custom datetime, default to preferred date and time
      patch.scheduledAt = viewing.preferredDate && viewing.preferredTime
        ? `${viewing.preferredDate}T${viewing.preferredTime}`
        : new Date().toISOString();
    }

    // If rescheduling to a specific slot, validate availability
    if (patch.scheduledAt && typeof patch.scheduledAt === "string" && patch.scheduledAt.includes("T")) {
      const targetDate = patch.scheduledAt.split("T")[0];
      const targetTime = patch.scheduledAt.split("T")[1].slice(0, 5);
      const allForListing = await getPropertyViewings({ listingId: viewing.listingId });
      const conflict = allForListing.find(
        (v) =>
          v.id !== numericId &&
          ["viewing_requested", "viewing_scheduled", "viewing_completed"].includes(v.status) &&
          v.preferredDate === targetDate &&
          v.preferredTime === targetTime
      );
      if (conflict) {
        return NextResponse.json(
          { error: "This date and time are currently unavailable. Please select another available schedule." },
          { status: 409 }
        );
      }
    }

    const updated = await updatePropertyViewing(numericId, patch);
    return NextResponse.json({ viewing: updated });
  }

  // Resident cancels their own viewing request (only if viewing_requested)
  if (body.status === "viewing_declined" && !isHowa) {
    const residentEmail = String(req.headers.get("x-user-email") || "").trim();
    if ((viewing as any).residentEmail !== residentEmail) {
      return NextResponse.json({ error: "You can only cancel your own viewing requests." }, { status: 403 });
    }
    if (!["viewing_requested"].includes((viewing as any).status)) {
      return NextResponse.json({ error: "Only pending viewing requests can be cancelled." }, { status: 400 });
    }
    const updated = await updatePropertyViewing(numericId, { status: "viewing_declined" });
    return NextResponse.json({ viewing: updated });
  }

  return NextResponse.json({ error: "Invalid status transition." }, { status: 400 });
}
