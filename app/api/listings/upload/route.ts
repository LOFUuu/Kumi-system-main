import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
]);

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

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

  // Validate
  for (const file of files) {
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.name}. Use PDF, JPG, or PNG.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File too large: ${file.name}. Max 5 MB per file.` },
        { status: 400 }
      );
    }
  }

  // Ensure upload directory exists
  const uploadDir = path.join(process.cwd(), "public", "uploads", "listing-docs");
  await mkdir(uploadDir, { recursive: true });

  const paths: string[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop() ?? "bin";
    // Safe filename: timestamp + sanitised original name
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 60);
    const filename = `${Date.now()}-${safeName}`;
    const absPath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absPath, buffer);

    paths.push(`/uploads/listing-docs/${filename}`);
  }

  return NextResponse.json({ paths }, { status: 200 });
}
