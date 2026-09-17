import { NextResponse } from "next/server";
import { getTransactions } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getTransactions();
  return NextResponse.json(data);
}
