import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
]);

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB — under Vercel's 4.5 MB serverless limit

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

  const files = formData.getAll("files") as File[];

  if (!files.length || files.every((f) => f.size === 0)) {
    return NextResponse.json(
      { error: "At least one proof document is required." },
      { status: 400 }
    );
  }

  // Validate each file
  for (const file of files) {
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.name}. Use PDF, JPG, or PNG.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File too large: ${file.name}. Max 4 MB per file.` },
        { status: 400 }
      );
    }
  }

  // Convert each file to a base64 data URL — works on Vercel (no disk write needed).
  // Data URLs are stored as-is in the proofDocuments field in MongoDB.
  const paths: string[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    paths.push(`data:${file.type};base64,${base64}`);
  }

  return NextResponse.json({ paths }, { status: 200 });
}
