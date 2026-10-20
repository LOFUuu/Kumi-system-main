import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

  // Save to disk in public/uploads/amenity-photos/ to avoid multi-megabyte base64 in MongoDB
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "amenity-photos");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    const staticUrl = `/uploads/amenity-photos/${filename}`;
    return NextResponse.json({ url: staticUrl, path: staticUrl }, { status: 200 });
  } catch {
    // Fallback to base64 data URL if filesystem is read-only
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;
    return NextResponse.json({ url: dataUrl, path: dataUrl }, { status: 200 });
  }
}
