import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
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

  const file = (formData.get("file") || formData.get("image")) as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json(
      { error: "No image file provided." },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME.has(file.type.toLowerCase())) {
    return NextResponse.json(
      { error: `File type not allowed: ${file.name}. Use JPG, PNG, WEBP, or GIF.` },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large: ${file.name}. Max 4 MB per image.` },
      { status: 400 }
    );
  }

  // Convert to base64 data URL — works on Vercel (no disk write needed).
  // The data URL is stored as-is in the amenity image field in MongoDB.
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  // Return both 'url' (for amenities page) and 'path' (for consistency)
  return NextResponse.json({ url: dataUrl, path: dataUrl }, { status: 200 });
}
