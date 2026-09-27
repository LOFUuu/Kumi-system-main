import { NextResponse } from "next/server";
import { getArchivedListings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getArchivedListings();
  return NextResponse.json(data);
}
