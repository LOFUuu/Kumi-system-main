import { NextRequest, NextResponse } from "next/server";
import { getTransactions } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isArchivedParam = searchParams.get("isArchived");
  const includeArchivedParam = searchParams.get("includeArchived");
  const refType = searchParams.get("refType") || undefined;
  const status = searchParams.get("status") || undefined;

  const filter: Parameters<typeof getTransactions>[0] = {};

  if (isArchivedParam !== null) {
    filter.isArchived = isArchivedParam === "true";
  }
  if (includeArchivedParam === "true") {
    filter.includeArchived = true;
  }
  if (refType && refType !== "all") {
    filter.refType = refType;
  }
  if (status && status !== "all") {
    filter.status = status;
  }

  const data = await getTransactions(filter);
  return NextResponse.json(data);
}
