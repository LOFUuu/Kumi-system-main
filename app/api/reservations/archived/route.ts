import { NextResponse } from "next/server";
import { getArchivedReservations } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getArchivedReservations();
  return NextResponse.json(data);
}
