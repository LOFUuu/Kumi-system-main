import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

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
      { error: `File too large: ${file.name}. Max 10 MB per image.` },
      { status: 400 }
    );
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "amenity-photos");
  await mkdir(uploadDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  const filename = `${Date.now()}-${safeName}`;
  const absPath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buffer);

  const url = `/uploads/amenity-photos/${filename}`;

  return NextResponse.json({ url }, { status: 200 });
}
