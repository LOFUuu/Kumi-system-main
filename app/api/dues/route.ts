import { NextResponse } from "next/server";
import { getDues } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getDues();
  return NextResponse.json(data);
}
