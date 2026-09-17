import { NextResponse } from "next/server";
import { getMasterIndex } from "@/lib/db";

export const dynamic = "force-dynamic";

// Master index of registered home/unit lots (block + lot) that HOA listings
// must reference. Exposed so the listing form can offer a dropdown instead of
// free-form property naming.
export async function GET() {
  const units = await getMasterIndex();
  return NextResponse.json(units);
}
