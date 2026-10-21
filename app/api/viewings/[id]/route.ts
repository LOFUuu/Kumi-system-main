import { NextRequest, NextResponse } from "next/server";
import {
  getPropertyViewings,
  updatePropertyViewing,
  notifyAdmins,
  notifyUserByEmail,
} from "@/lib/db";
import { howaGuard, isHowaRole, requestRole } from "@/lib/role";
import { getCancellationEligibility } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

// PATCH /api/viewings/[id] — admin updates status or user/admin cancels viewing
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

  // ── CANCELLATION HANDLER (User or Admin) ───────────────────────────────────
  const isCancel =
    body.action === "cancel" ||
    body.status === "cancelled" ||
    body.status === "viewing_cancelled" ||
    body.status === "viewing_declined";

  if (isCancel) {
    // Only active (requested or scheduled) viewings can be cancelled
    if (
      !["viewing_requested", "viewing_scheduled"].includes(viewing.status as string)
    ) {
      return NextResponse.json(
        { error: `Cannot cancel a viewing that is already ${(viewing.status as string).replace(/_/g, " ")}.` },
        { status: 400 }
      );
    }

    const residentEmail = String(req.headers.get("x-user-email") || "").toLowerCase().trim();

    if (!isHowa) {
      if ((viewing.residentEmail || "").toLowerCase().trim() !== residentEmail) {
        return NextResponse.json(
          { error: "Unauthorized: You can only cancel your own viewing requests." },
          { status: 403 }
        );
      }

      // Check 48-hour policy
      const scheduledTimeStr =
        viewing.scheduledAt ||
        (viewing.preferredDate && viewing.preferredTime
          ? `${viewing.preferredDate}T${viewing.preferredTime}+08:00`
          : "");

      const eligibility = getCancellationEligibility(scheduledTimeStr, false);
      if (!eligibility.canCancel) {
        return NextResponse.json(
          { error: eligibility.reason || "Cancellations must be made at least 48 hours prior to the scheduled viewing time." },
          { status: 400 }
        );
      }
    }

    const cancelledAt = new Date().toISOString();
    const cancelledBy = isHowa ? "admin" : (residentEmail || "user");
    const cancelReason = String(body.reason || (isHowa ? "Cancelled by Administrator" : "Cancelled by User")).trim();

    const updated = await updatePropertyViewing(numericId, {
      status: "viewing_cancelled",
      cancelledAt,
      cancelledBy,
      cancelReason,
    });

    // Notify appropriate party
    if (!isHowa) {
      // User cancelled -> Notify HOA Admins
      notifyAdmins({
        title: "Property Viewing Cancelled by User",
        message: `${viewing.residentName} cancelled their viewing appointment for ${viewing.listingName} on ${viewing.preferredDate} at ${viewing.preferredTime}. Slot is now available.`,
        type: "viewing",
        referenceId: numericId,
        link: "/admin/viewings",
        metadata: {
          listingName: viewing.listingName,
          date: viewing.preferredDate,
          time: viewing.preferredTime,
          status: "Cancelled",
          residentName: viewing.residentName,
          reason: cancelReason,
        },
      }).catch(() => {});

      // User cancelled -> Notify resident with confirmation
      if (viewing.residentEmail) {
        notifyUserByEmail(viewing.residentEmail, {
          title: "Viewing Cancellation Confirmed",
          message: `You have cancelled your viewing appointment for ${viewing.listingName} on ${viewing.preferredDate} at ${viewing.preferredTime}.`,
          type: "viewing",
          referenceId: numericId,
          link: "/history?tab=viewings",
          metadata: {
            listingName: viewing.listingName,
            date: viewing.preferredDate,
            time: viewing.preferredTime,
            status: "Cancelled",
            reason: cancelReason,
          },
        }).catch(() => {});
      }
    } else if (viewing.residentEmail) {
      // Admin cancelled -> Notify Resident
      notifyUserByEmail(viewing.residentEmail, {
        title: "Viewing Appointment Cancelled by HOA",
        message: `Your viewing appointment for ${viewing.listingName} on ${viewing.preferredDate} was cancelled by the HOA Administration. Reason: ${cancelReason}.`,
        type: "viewing",
        referenceId: numericId,
        link: "/history?tab=viewings",
        metadata: {
          listingName: viewing.listingName,
          date: viewing.preferredDate,
          time: viewing.preferredTime,
          status: "Cancelled",
          reason: cancelReason,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ viewing: updated });
  }

  // ── Admin-only status transitions ──────────────────────────────────────────
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

    // Notify resident about appointment confirmation or decline
    if (viewing.residentEmail) {
      if (body.status === "viewing_scheduled") {
        notifyUserByEmail(viewing.residentEmail, {
          title: "Property Viewing Confirmed! 📅",
          message: `Your viewing appointment for ${viewing.listingName} is confirmed for ${viewing.preferredDate} at ${viewing.preferredTime}.`,
          type: "viewing",
          referenceId: numericId,
          link: "/history?tab=viewings",
          metadata: {
            listingName: viewing.listingName,
            date: viewing.preferredDate,
            time: viewing.preferredTime,
            status: "Confirmed",
          },
        }).catch(() => {});
      } else if (body.status === "viewing_declined") {
        notifyUserByEmail(viewing.residentEmail, {
          title: "Property Viewing Declined",
          message: `Your viewing request for ${viewing.listingName} on ${viewing.preferredDate} was declined. ${patch.adminNotes ? `Reason: "${patch.adminNotes}".` : ""}`,
          type: "viewing",
          referenceId: numericId,
          link: "/history?tab=viewings",
          metadata: {
            listingName: viewing.listingName,
            date: viewing.preferredDate,
            time: viewing.preferredTime,
            status: "Declined",
            reason: patch.adminNotes,
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ viewing: updated });
  }

  return NextResponse.json({ error: "Invalid status transition." }, { status: 400 });
}
