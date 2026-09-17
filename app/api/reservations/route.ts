import { NextRequest, NextResponse } from "next/server";
import {
  getReservations,
  getAmenity,
  getBlockedDates,
  isDateAvailableForPublic,
  getNextId,
} from "@/lib/db";
import { Reservation, Transaction } from "@/models";
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

  const id = await getNextId(Reservation);
  const reservation: ReservationType = {
    id,
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
    userEmail: String(body.userEmail || "") || undefined,
    gcashRef: gcashRef || undefined,
    receiptPath: receiptPath || undefined,
  };
  await Reservation.create({
    _id: id,
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
    userEmail: reservation.userEmail,
    gcashRef: gcashRef || undefined,
    receiptPath: receiptPath || undefined,
  } as any);

  const txnId = await getNextId(Transaction);
  const { payment, placeholder } = createPayment(downpayment);
  if (gcashRef) {
    payment.gcashRef = gcashRef;
    payment.status = "paid";
    payment.paidAt = new Date().toISOString().slice(0, 10);
  }
  await Transaction.create({
    _id: txnId,
    residentName,
    refType: "amenity",
    refId: id,
    userEmail: reservation.userEmail,
    amount: downpayment,
    paymentMethod: "gcash",
    gcashRef: gcashRef || undefined,
    receiptPath: receiptPath || undefined,
    status: "pending",
    createdAt: new Date().toISOString().slice(0, 10),
    payment,
  } as any);

  return NextResponse.json(
    { reservation, transactionId: txnId, payment, paymentPlaceholder: placeholder },
    { status: 201 }
  );
}
