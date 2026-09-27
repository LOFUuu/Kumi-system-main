import { NextResponse } from "next/server";
import { getArchivedUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getArchivedUsers();
  return NextResponse.json(data);
}
