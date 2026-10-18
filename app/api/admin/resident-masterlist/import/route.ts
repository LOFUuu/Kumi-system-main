import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { ResidentMasterList } from "@/models";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { isHowaRole } from "@/lib/role";
import { normalizeResidentName, retroactiveMatchAllNonResidents } from "@/lib/name-matcher";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

interface ImportRecordInput {
  fullName: string;
  block?: string;
  lot?: string;
  email?: string;
  phone?: string;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Role verification: Admin only
    const authUser = await getAuthenticatedUser(req);
    if (!authUser || !isHowaRole(authUser.role)) {
      return NextResponse.json(
        { error: "Unauthorized. Admin privileges are required to import the resident master list." },
        { status: 403 }
      );
    }

    await dbConnect();

    let records: ImportRecordInput[] = [];
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided in form data." }, { status: 400 });
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        return NextResponse.json({ error: "The provided spreadsheet contains no sheets." }, { status: 400 });
      }

      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[firstSheet]);
      const nameCol = String(formData.get("nameColumn") || "").trim();
      const blockCol = String(formData.get("blockColumn") || "").trim();
      const lotCol = String(formData.get("lotColumn") || "").trim();
      const emailCol = String(formData.get("emailColumn") || "").trim();
      const phoneCol = String(formData.get("phoneColumn") || "").trim();

      records = rawJson.map((row) => {
        let fullName = "";
        if (nameCol && row[nameCol]) {
          fullName = String(row[nameCol]).trim();
        } else {
          // Auto-detect fallback
          for (const key of Object.keys(row)) {
            const k = key.toLowerCase().trim();
            if (["name", "full name", "resident", "homeowner", "resident name", "owner"].includes(k)) {
              fullName = String(row[key]).trim();
              break;
            }
          }
        }

        return {
          fullName,
          block: blockCol && row[blockCol] ? String(row[blockCol]).trim() : undefined,
          lot: lotCol && row[lotCol] ? String(row[lotCol]).trim() : undefined,
          email: emailCol && row[emailCol] ? String(row[emailCol]).trim() : undefined,
          phone: phoneCol && row[phoneCol] ? String(row[phoneCol]).trim() : undefined,
        };
      });
    } else {
      const body = await req.json().catch(() => ({}));
      records = Array.isArray(body.records) ? body.records : [];
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: "No records found to import. Please check your file." },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;
    let duplicates = 0;

    const seenInBatch = new Set<string>();
    const toInsert: Array<{
      fullName: string;
      normalizedName: string;
      block?: string;
      lot?: string;
      email?: string;
      phone?: string;
      status: "unclaimed";
      importedBy: string;
      importedAt: Date;
    }> = [];

    // Pre-fetch all existing records in residentmasterlist to quickly check duplicates
    const existingRecords = await ResidentMasterList.find({})
      .select("normalizedName block lot")
      .lean();

    const existingKeys = new Set<string>();
    existingRecords.forEach((r: any) => {
      existingKeys.add(`${r.normalizedName}|${r.block || ""}|${r.lot || ""}`);
    });

    for (const r of records) {
      const rawName = String(r.fullName || "").trim();
      const norm = normalizeResidentName(rawName);

      if (!rawName || !norm) {
        skipped++;
        continue;
      }

      const dedupeKey = `${norm}|${r.block || ""}|${r.lot || ""}`;

      // Check within current batch
      if (seenInBatch.has(dedupeKey)) {
        duplicates++;
        continue;
      }
      seenInBatch.add(dedupeKey);

      // Check against existing database collection
      if (existingKeys.has(dedupeKey)) {
        duplicates++;
        continue;
      }

      existingKeys.add(dedupeKey);
      toInsert.push({
        fullName: rawName,
        normalizedName: norm,
        block: r.block ? String(r.block).trim() : undefined,
        lot: r.lot ? String(r.lot).trim() : undefined,
        email: r.email ? String(r.email).trim().toLowerCase() : undefined,
        phone: r.phone ? String(r.phone).trim() : undefined,
        status: "unclaimed",
        importedBy: authUser.email || "admin",
        importedAt: new Date(),
      });
    }

    if (toInsert.length > 0) {
      await ResidentMasterList.insertMany(toInsert);
      imported = toInsert.length;
    }

    // 5. Retroactive match: any existing non-resident users whose name matches a master list record become resident
    const retroResult = await retroactiveMatchAllNonResidents(authUser.email || "admin");

    return NextResponse.json({
      ok: true,
      summary: {
        total: records.length,
        imported,
        skipped,
        duplicates,
        retroMatched: retroResult.promoted,
        flaggedForReview: retroResult.flaggedForReview,
      },
      message: `Imported ${imported} master list records (${duplicates} duplicates skipped, ${skipped} empty rows skipped). Promoted ${retroResult.promoted} existing non-residents to residents.`,
    });
  } catch (err: any) {
    console.error("[ResidentMasterList] Import error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to import resident master list." },
      { status: 500 }
    );
  }
}
