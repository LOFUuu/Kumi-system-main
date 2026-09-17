import { NextRequest, NextResponse } from "next/server";
import { getBlockedDates, isDateAvailableForPublic, getAmenity } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const amenityId = Number(searchParams.get("amenityId"));
  if (!amenityId) return NextResponse.json({ error: "amenityId required." }, { status: 400 });

  const amenity = await getAmenity(amenityId);
  if (!amenity) return NextResponse.json({ error: "Amenity not found." }, { status: 404 });

  const blocked = await getBlockedDates(amenityId);

  const checkDate = searchParams.get("date");
  const reservationType = searchParams.get("type") === "private" ? "private" : "public";
  const pax = Math.max(1, Number(searchParams.get("pax")) || 1);

  let available = !blocked.includes(checkDate ?? "");
  if (available && checkDate && reservationType === "public") {
    available = await isDateAvailableForPublic(amenityId, checkDate, pax);
  }

  return NextResponse.json({
    amenityId,
    blocked,
    available,
    maxCapacity: amenity.maxCapacity,
  });
}
