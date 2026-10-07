import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Transaction, Reservation } from "@/models";

export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB — under Vercel's 4.5 MB serverless body limit

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must be multipart/form-data." },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  // Optional: intentId allows the upload to immediately persist receiptPath in MongoDB
  // so the confirm step never needs to carry the large base64 string in its JSON body.
  const intentId = (formData.get("intentId") as string | null) || "";

  if (!file || file.size === 0) {
    return NextResponse.json(
      { error: "Payment receipt image is required." },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `File type not supported: ${file.type}. Please upload a JPG, PNG, WEBP, or PDF receipt.` },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File is too large: ${Math.round(file.size / (1024 * 1024))}MB. Max 4MB allowed.` },
      { status: 400 }
    );
  }

  // Convert to base64 data URL — works on Vercel (no disk write needed).
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  // If intentId is provided, persist the receiptPath directly to MongoDB now.
  // This avoids sending the large base64 string again in the confirm step's JSON body.
  if (intentId) {
    try {
      await dbConnect();
      const txn = await Transaction.findOne({ "payment.intentId": intentId } as any).lean();
      if (txn) {
        await Transaction.updateOne(
          { "payment.intentId": intentId } as any,
          { $set: { receiptPath: dataUrl } } as any
        );
        // Also update the linked reservation if one exists
        if ((txn as any).refType === "amenity" && (txn as any).refId) {
          await Reservation.updateOne(
            { _id: (txn as any).refId } as any,
            { $set: { receiptPath: dataUrl } } as any
          );
        }
      }
    } catch {
      // Non-fatal — still return the path so client can proceed
    }
  }

  return NextResponse.json({ path: dataUrl }, { status: 200 });
}
