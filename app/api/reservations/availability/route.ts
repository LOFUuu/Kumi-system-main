import { NextRequest, NextResponse } from "next/server";
import { getAmenity, getReservations } from "@/lib/db";
import type { Reservation as ReservationType } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const amenityId = Number(searchParams.get("amenityId"));
  if (!amenityId) {
    return NextResponse.json({ error: "amenityId required." }, { status: 400 });
  }

  const amenity = await getAmenity(amenityId);
  if (!amenity || !amenity.isActive) {
    return NextResponse.json({ error: "Amenity not found or inactive." }, { status: 404 });
  }

  const checkDate = searchParams.get("date");
  const reqType: "public" | "private" =
    searchParams.get("type") === "private" ? "private" : "public";
  const reqSession: "day" | "night" =
    searchParams.get("session") === "night" ? "night" : "day";
  const reqPax = Math.max(1, Number(searchParams.get("pax")) || 1);

  // Fetch all active, non-archived reservations for this amenity
  const allRes = await getReservations(false);
  const amenityReservations = allRes.filter(
    (r) =>
      r.amenityId === amenityId &&
      (r.status === "approved" || r.status === "pending")
  );

  const now = new Date();
  const todayStr = toISO(now);
  const currentHour = now.getHours();

  // Helper to evaluate a specific date and session
  const evaluateSlot = (
    dateStr: string,
    session: "day" | "night"
  ): {
    available: boolean;
    remainingSlots: number;
    status: "available" | "limited" | "booked";
    isPrivateBooked?: boolean;
    reason?: string;
  } => {
    if (dateStr < todayStr) {
      return { available: false, remainingSlots: 0, status: "booked", reason: "past" };
    }
    if (dateStr === todayStr) {
      if (session === "day" && currentHour >= 18) {
        return { available: false, remainingSlots: 0, status: "booked", reason: "cutoff" };
      }
      if (session === "night" && currentHour >= 22) {
        return { available: false, remainingSlots: 0, status: "booked", reason: "cutoff" };
      }
    }

    const sessionRes = amenityReservations.filter(
      (r) => r.date === dateStr && r.bookingType === session
    );

    // If an approved or pending private reservation exists, slot is fully locked
    const hasPrivate = sessionRes.some((r) => r.reservationType === "private");
    if (hasPrivate) {
      return {
        available: false,
        remainingSlots: 0,
        status: "booked",
        isPrivateBooked: true,
        reason: "private_locked",
      };
    }

    const publicPax = sessionRes
      .filter((r) => r.reservationType === "public")
      .reduce((sum, r) => sum + (r.paxCount || 1), 0);

    const remaining = Math.max(0, amenity.maxCapacity - publicPax);

    if (reqType === "private") {
      // Private reservation requires whole venue exclusivity
      if (publicPax > 0 || sessionRes.length > 0) {
        return {
          available: false,
          remainingSlots: 0,
          status: "booked",
          reason: "public_overlap",
        };
      }
      return {
        available: true,
        remainingSlots: amenity.maxCapacity,
        status: "available",
      };
    } else {
      // Public reservation
      if (remaining < reqPax) {
        return {
          available: false,
          remainingSlots: remaining,
          status: "booked",
          reason: "insufficient_capacity",
        };
      }
      const isLimited = remaining <= Math.max(5, Math.floor(amenity.maxCapacity * 0.25));
      return {
        available: true,
        remainingSlots: remaining,
        status: isLimited ? "limited" : "available",
      };
    }
  };

  // Build calendar datesStatus map for 60 days
  const datesStatus: Record<
    string,
    {
      status: "available" | "limited" | "booked";
      remainingSlots: number;
      day: ReturnType<typeof evaluateSlot>;
      night: ReturnType<typeof evaluateSlot>;
    }
  > = {};

  const blockedList: string[] = [];
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

  for (let i = 0; i < 90; i++) {
    const cur = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dStr = toISO(cur);

    const dayEval = evaluateSlot(dStr, "day");
    const nightEval = evaluateSlot(dStr, "night");

    const preferredEval = reqSession === "day" ? dayEval : nightEval;
    const alternateEval = reqSession === "day" ? nightEval : dayEval;

    let overall: "available" | "limited" | "booked" = preferredEval.status;
    if (overall === "booked" && alternateEval.available) {
      overall = "limited"; // Alternate session is still available on this day
    }

    if (!dayEval.available && !nightEval.available && dStr >= todayStr) {
      blockedList.push(dStr);
    }

    datesStatus[dStr] = {
      status: overall,
      remainingSlots: preferredEval.remainingSlots,
      day: dayEval,
      night: nightEval,
    };
  }

  // Generate 4 Airline-style Recommendations
  interface Recommendation {
    date: string;
    dayOfWeek: string;
    formattedDate: string;
    session: "day" | "night";
    sessionLabel: string;
    sessionTime: string;
    status: "available" | "limited";
    statusLabel: string;
    remainingSlots: number;
    maxCapacity: number;
    reservationType: "public" | "private";
  }

  const recommendations: Recommendation[] = [];

  for (let offset = 0; offset < 60; offset++) {
    if (recommendations.length >= 4) break;

    const targetDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const dateStr = toISO(targetDate);

    if (dateStr < todayStr) continue;

    const prefEval = evaluateSlot(dateStr, reqSession);
    const altSession: "day" | "night" = reqSession === "day" ? "night" : "day";
    const altEval = evaluateSlot(dateStr, altSession);

    const dayName = WEEKDAYS[targetDate.getDay()];
    const fmtDate = `${MONTH_NAMES_SHORT[targetDate.getMonth()]} ${targetDate.getDate()}, ${targetDate.getFullYear()}`;

    // Prefer user's selected session
    if (prefEval.available) {
      recommendations.push({
        date: dateStr,
        dayOfWeek: dayName,
        formattedDate: fmtDate,
        session: reqSession,
        sessionLabel: reqSession === "day" ? "Day Session" : "Night Session",
        sessionTime: reqSession === "day" ? "6:00 AM – 6:00 PM" : "6:00 PM – 10:00 PM",
        status: prefEval.status === "limited" ? "limited" : "available",
        statusLabel: prefEval.status === "limited" ? "Limited Slots" : "Available",
        remainingSlots: prefEval.remainingSlots,
        maxCapacity: amenity.maxCapacity,
        reservationType: reqType,
      });
    } else if (altEval.available) {
      // Suggest the alternate eligible session if requested session is unavailable
      recommendations.push({
        date: dateStr,
        dayOfWeek: dayName,
        formattedDate: fmtDate,
        session: altSession,
        sessionLabel: altSession === "day" ? "Day Session" : "Night Session",
        sessionTime: altSession === "day" ? "6:00 AM – 6:00 PM" : "6:00 PM – 10:00 PM",
        status: altEval.status === "limited" ? "limited" : "available",
        statusLabel: altEval.status === "limited" ? "Limited Slots" : "Available",
        remainingSlots: altEval.remainingSlots,
        maxCapacity: amenity.maxCapacity,
        reservationType: reqType,
      });
    }
  }

  const nextAvailable = recommendations.length > 0 ? recommendations[0] : null;

  // Single date check for form validation
  let isTargetAvailable = true;
  if (checkDate) {
    const targetEval = evaluateSlot(checkDate, reqSession);
    isTargetAvailable = targetEval.available;
  }

  return NextResponse.json({
    amenityId,
    maxCapacity: amenity.maxCapacity,
    blocked: Array.from(new Set(blockedList)),
    available: isTargetAvailable,
    datesStatus,
    recommendations,
    nextAvailable,
  });
}
