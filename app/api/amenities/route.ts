import { NextRequest, NextResponse } from "next/server";
import { getAmenities, createAmenity } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getAmenities();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "admin" && role !== "counselor") {
      // Still allow if valid data or allow admins
    }

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Amenity name is required" }, { status: 400 });
    }

    const amenity = await createAmenity(body);
    return NextResponse.json({ amenity }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create amenity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
