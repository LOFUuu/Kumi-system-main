import { NextRequest, NextResponse } from "next/server";
import { importDuesRecords } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = Array.isArray(body.records) ? body.records : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: "No records provided to import." }, { status: 400 });
    }

    const result = await importDuesRecords(rows);
    return NextResponse.json({
      ok: true,
      summary: result,
      message: `Successfully processed ${result.total} records (${result.imported} new, ${result.updated} updated, ${result.duplicates} existing matched).`,
    });
  } catch (err: any) {
    console.error("Error importing dues records:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to import dues records." },
      { status: 500 }
    );
  }
}
