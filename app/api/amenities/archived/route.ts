import { NextResponse } from "next/server";
import { getArchivedAmenities } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getArchivedAmenities();
  return NextResponse.json(data);
}
