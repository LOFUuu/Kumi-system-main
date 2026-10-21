import { NextRequest, NextResponse } from "next/server";
import {
  getReservations,
  updateReservation,
  getTransactions,
  updateTransactionById,
  deleteReservation,
  notifyAdmins,
  notifyUserByEmail,
} from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { getCancellationEligibility } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resId = Number(id);
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = body.action; // 'approve' | 'reject' | 'cancel'
  if (action !== "approve" && action !== "reject" && action !== "cancel") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const allRes = await getReservations(true);
  const reservation = allRes.find((r) => r.id === resId);
  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  const authUser = await getAuthenticatedUser(req);
  const headerRole = req.headers.get("x-user-role");
  const isAdmin = authUser?.role === "admin" || headerRole === "admin";

  // ── CANCELLATION HANDLER ──────────────────────────────────────────────────
  if (action === "cancel") {
    // Only pending or approved reservations can be cancelled
    if (reservation.status !== "pending" && reservation.status !== "approved") {
      return NextResponse.json(
        { error: `Cannot cancel a reservation that is already ${reservation.status}.` },
        { status: 400 }
      );
    }

    // Authorization & 48-hour policy check for non-admins
    if (!isAdmin) {
      const userEmail = (authUser?.email || req.headers.get("x-user-email") || "").toLowerCase().trim();
      const userName = (authUser?.fullName || req.headers.get("x-user-name") || "").toLowerCase().trim();
      const resEmail = (reservation.userEmail || "").toLowerCase().trim();
      const resName = (reservation.residentName || "").toLowerCase().trim();

      const isOwner = (userEmail && userEmail === resEmail) || (userName && userName === resName);
      if (!isOwner) {
        return NextResponse.json(
          { error: "Unauthorized: You can only cancel your own bookings." },
          { status: 403 }
        );
      }

      // Scheduled Start Time: Day session starts at 06:00 AM, Night session starts at 06:00 PM (Manila +08:00)
      const sessionTime = reservation.bookingType === "night" ? "18:00:00" : "06:00:00";
      const startIso = `${reservation.date}T${sessionTime}+08:00`;
      const eligibility = getCancellationEligibility(startIso, false);

      if (!eligibility.canCancel) {
        return NextResponse.json(
          { error: eligibility.reason || "Cancellations must be made at least 48 hours prior to the scheduled start time." },
          { status: 400 }
        );
      }
    }

    const cancelledAt = new Date().toISOString();
    const cancelledBy = isAdmin ? "admin" : (authUser?.email || reservation.userEmail || "user");
    const cancelReason = String(body.reason || (isAdmin ? "Cancelled by Administrator" : "Cancelled by User")).trim();

    const updated = await updateReservation(resId, {
      status: "cancelled",
      cancelledAt,
      cancelledBy,
      cancelReason,
    });

    // Void linked financial transaction so it does not count as active
    const txns = await getTransactions({ includeArchived: true });
    const linkedTxn = txns.find((t) => t.refType === "amenity" && t.refId === resId);
    if (linkedTxn) {
      await updateTransactionById(linkedTxn.id, {
        status: "voided",
      });
    }

    // Synchronize notifications
    if (!isAdmin) {
      // User cancelled -> Notify Admin
      notifyAdmins({
        title: "Reservation Cancelled by User",
        message: `${reservation.residentName} cancelled their booking for ${reservation.amenityName} on ${reservation.date} (${reservation.bookingType} session). The booking slot has been released.`,
        type: "reservation",
        referenceId: resId,
        link: "/admin/reservations",
        metadata: {
          amenityName: reservation.amenityName,
          date: reservation.date,
          time: reservation.bookingType === "day" ? "Day Session" : "Night Session",
          guests: reservation.paxCount || 1,
          status: "Cancelled",
          residentName: reservation.residentName,
          reason: cancelReason,
        },
      }).catch(() => {});

      // User cancelled -> Send cancellation confirmation to Resident
      if (reservation.userEmail) {
        notifyUserByEmail(reservation.userEmail, {
          title: "Booking Cancellation Confirmed",
          message: `You have cancelled your reservation for ${reservation.amenityName} on ${reservation.date} (${reservation.bookingType} session). The booking slot has been released.`,
          type: "reservation",
          referenceId: resId,
          link: "/history?tab=reservations",
          metadata: {
            amenityName: reservation.amenityName,
            date: reservation.date,
            time: reservation.bookingType === "day" ? "Day Session" : "Night Session",
            guests: reservation.paxCount || 1,
            status: "Cancelled",
            reason: cancelReason,
          },
        }).catch(() => {});
      }
    } else if (reservation.userEmail) {
      // Admin cancelled -> Notify Resident
      notifyUserByEmail(reservation.userEmail, {
        title: "Reservation Cancelled by HOA Admin",
        message: `Your booking for ${reservation.amenityName} on ${reservation.date} (${reservation.bookingType} session) was cancelled by HOA Administration. Reason: ${cancelReason}.`,
        type: "reservation",
        referenceId: resId,
        link: "/history?tab=reservations",
        metadata: {
          amenityName: reservation.amenityName,
          date: reservation.date,
          time: reservation.bookingType === "day" ? "Day Session" : "Night Session",
          guests: reservation.paxCount || 1,
          status: "Cancelled",
          reason: cancelReason,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ reservation: updated });
  }

  // ── ADMIN APPROVE / REJECT HANDLER ────────────────────────────────────────
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized: Admin privileges required to approve or decline reservations." },
      { status: 403 }
    );
  }

  if (action === "approve") {
    const existingApproved = allRes.find((r) => {
      if (r.id === resId) return false;
      if (r.amenityId !== reservation.amenityId) return false;
      if (r.date !== reservation.date) return false;
      if (r.bookingType !== reservation.bookingType) return false;
      if (r.status !== "approved") return false;
      if (r.isArchived) return false;
      return true;
    });

    if (existingApproved) {
      return NextResponse.json(
        { error: "Conflict: This slot is already booked by an approved reservation." },
        { status: 409 }
      );
    }
  }

  const newStatus = action === "approve" ? "approved" : "declined";
  const approvedAt = new Date().toISOString();

  const updated = await updateReservation(resId, {
    status: newStatus,
    approvedAt,
  });

  const txns = await getTransactions({ includeArchived: true });
  const linkedTxn = txns.find((t) => t.refType === "amenity" && t.refId === resId);
  if (linkedTxn) {
    await updateTransactionById(linkedTxn.id, {
      status: newStatus === "approved" ? "approved" : "voided",
    });
  }

  // Notify resident about approval/declination
  if (reservation.userEmail) {
    const isApprove = action === "approve";
    notifyUserByEmail(reservation.userEmail, {
      title: isApprove ? "Amenity Booking Approved! 🎉" : "Amenity Booking Declined",
      message:
        isApprove
          ? `Your reservation for ${reservation.amenityName} on ${reservation.date} (${reservation.bookingType === "day" ? "Day" : "Night"} Session) has been approved by the HOA!`
          : `Your reservation for ${reservation.amenityName} on ${reservation.date} was declined by the HOA.`,
      type: "reservation",
      referenceId: resId,
      link: "/history?tab=reservations",
      metadata: {
        amenityName: reservation.amenityName,
        date: reservation.date,
        time: reservation.bookingType === "day" ? "Day Session (8:00 AM - 5:00 PM)" : "Night Session (6:00 PM - 11:00 PM)",
        guests: reservation.paxCount || 1,
        totalAmount: reservation.totalAmount,
        status: isApprove ? "Approved" : "Declined",
      },
    }).catch(() => {});
  }

  return NextResponse.json({ reservation: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resId = Number(id);
  const result = await deleteReservation(resId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Failed to delete reservation." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
