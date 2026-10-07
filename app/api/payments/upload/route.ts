import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB — keeps us under Vercel's 4.5 MB serverless body limit

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
  // The data URL is stored as-is in the receiptPath field in MongoDB.
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  return NextResponse.json({ path: dataUrl }, { status: 200 });
}

