import { NextRequest, NextResponse } from "next/server";
import {
  getReservations,
  getAmenity,
  getBlockedDates,
  isDateAvailableForPublic,
  getPaymentConfig,
  createReservation,
  createTransaction,
  deleteReservation,
} from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { createPayment } from "@/lib/payment";
import {
  getBookingTotal,
  type Reservation as ReservationType,
} from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const RESIDENT_ROLES = ["resident"];

export async function GET() {
  const data = await getReservations();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const amenityId = Number(body.amenityId);
  const amenity = await getAmenity(amenityId);
  if (!amenity || !amenity.isActive) {
    return NextResponse.json({ error: "Amenity not found or inactive." }, { status: 404 });
  }

  const residentName = String(body.residentName || "").trim();
  const bookingType = body.bookingType === "night" ? "night" : "day";
  const reservationType = body.reservationType === "private" ? "private" : "public";
  const date = String(body.date || "");
  const pax = Math.max(1, Number(body.paxCount) || 1);
  const notes = String(body.notes || "").trim();
  const gcashRef = String(body.gcashRef || "").trim();
  const receiptPath = body.receiptPath ? String(body.receiptPath).trim() : undefined;
  const phone = String(body.phone || "").trim();

  if (!residentName || !date) {
    return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
  }

  const today = new Date();
  const selected = new Date(date + "T00:00:00");
  today.setHours(0, 0, 0, 0);
  if (selected < today) {
    return NextResponse.json({ error: "Booking date must be today or a future date." }, { status: 400 });
  }

  const userEmail = String(body.userEmail || "").trim().toLowerCase();

  // Prevent duplicate same-slot active (pending or approved) reservation for the same account
  const allRes = await getReservations();
  const existingDuplicate = allRes.find((r) => {
    if (r.amenityId !== amenityId || r.date !== date || r.bookingType !== bookingType) return false;
    if (r.status !== "pending" && r.status !== "approved") return false;
    if (r.isArchived) return false;
    if (userEmail) {
      return (r.userEmail || "").toLowerCase() === userEmail;
    }
    return (r.residentName || "").toLowerCase() === residentName.toLowerCase();
  });

  if (existingDuplicate) {
    return NextResponse.json(
      { error: "You already have an active (pending or approved) reservation for this amenity, date, and session." },
      { status: 409 }
    );
  }

  if (reservationType === "private") {
    const blocked = await getBlockedDates(amenityId);
    if (blocked.includes(date)) {
      return NextResponse.json({ error: "The selected date is fully booked. Please choose another date." }, { status: 409 });
    }
  } else {
    const available = await isDateAvailableForPublic(amenityId, date, pax);
    if (!available) {
      return NextResponse.json({ error: "The selected date is fully booked. Please choose another date." }, { status: 409 });
    }
  }

  const role = String(body.role || "non_resident");
  const isResident = RESIDENT_ROLES.includes(role);
  const totalAmount = getBookingTotal(amenity, bookingType, reservationType, pax, isResident);
  const downpayment =
    reservationType === "private" ? amenity.downpaymentPrivate : amenity.downpayment;

  const reservation = await createReservation({
    amenityId,
    amenityName: amenity.name,
    residentName,
    phone,
    bookingType,
    reservationType,
    date,
    paxCount: pax,
    downpayment,
    totalAmount,
    status: "pending",
    notes,
    userEmail: userEmail || undefined,
    gcashRef: gcashRef || undefined,
    receiptPath: receiptPath || undefined,
  });

  const amenityGcash = await getPaymentConfig("amenity");
  const { payment, placeholder } = createPayment(downpayment, amenityGcash.accountNumber);
  if (gcashRef) {
    payment.gcashRef = gcashRef;
    payment.status = "paid";
    payment.paidAt = new Date().toISOString().slice(0, 10);
  }

  const createdTxn = await createTransaction({
    residentName,
    refType: "amenity",
    refId: reservation.id,
    userEmail: reservation.userEmail,
    amount: downpayment,
    paymentMethod: "gcash",
    gcashRef: gcashRef || undefined,
    receiptPath: receiptPath || undefined,
    status: "pending",
    createdAt: new Date().toISOString().slice(0, 10),
    payment,
  });

  return NextResponse.json(
    { reservation, transactionId: createdTxn.id, payment, paymentPlaceholder: placeholder },
    { status: 201 }
  );
}

export async function DELETE(req: NextRequest) {
  // Authorization check: verify admin session or admin role
  const user = await getAuthenticatedUser(req);
  const headerRole = req.headers.get("x-user-role");
  const isAdmin = user?.role === "admin" || headerRole === "admin";
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized. Admin privileges required to delete reservations." },
      { status: 403 }
    );
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.map(Number).filter(Number.isFinite)
    : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "No valid reservation IDs provided for bulk deletion." },
      { status: 400 }
    );
  }

  const deletedIds: number[] = [];
  const failedIds: number[] = [];

  for (const id of ids) {
    try {
      const res = await deleteReservation(id);
      if (res.ok) {
        deletedIds.push(id);
      } else {
        failedIds.push(id);
      }
    } catch {
      failedIds.push(id);
    }
  }

  return NextResponse.json({
    ok: deletedIds.length > 0,
    deletedCount: deletedIds.length,
    deletedIds,
    failedIds,
  });
}

