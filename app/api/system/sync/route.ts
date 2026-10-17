import { NextRequest, NextResponse } from "next/server";
import { getSyncStatus, syncPendingToAtlas } from "@/lib/sync-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getSyncStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to get sync status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await syncPendingToAtlas();
    const status = await getSyncStatus();
    return NextResponse.json({ ...result, status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to trigger sync" }, { status: 500 });
  }
}
