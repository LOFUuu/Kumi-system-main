import { NextRequest, NextResponse } from "next/server";
import { getPaymentConfig, getPaymentConfigs, upsertPaymentConfig } from "@/lib/db";
import { validatePhone, validateName } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/payments/config?category=amenity|dues
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    if (category === "amenity" || category === "dues") {
      const config = await getPaymentConfig(category);
      return NextResponse.json(config);
    }

    const configs = await getPaymentConfigs();
    return NextResponse.json(configs);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load payment configuration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/payments/config — Admin only
export async function PUT(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "admin" && role !== "counselor") {
      return NextResponse.json(
        { error: "Access denied. Only administrators can update payment configuration." },
        { status: 403 }
      );
    }

    let body: Record<string, any>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const category = body.category;
    if (category !== "amenity" && category !== "dues") {
      return NextResponse.json(
        { error: "Invalid category. Must be 'amenity' or 'dues'." },
        { status: 400 }
      );
    }

    const accountName = String(body.accountName || "").trim();
    const nameErr = validateName(accountName, { required: true, label: "GCash account name" });
    if (nameErr) {
      return NextResponse.json({ error: nameErr }, { status: 400 });
    }

    const accountNumber = String(body.accountNumber || "").trim();
    const phoneErr = validatePhone(accountNumber, { required: true, label: "GCash mobile number" });
    if (phoneErr) {
      return NextResponse.json({ error: phoneErr }, { status: 400 });
    }

    const adminUser = req.headers.get("x-user-email") || "Admin";

    const payload = {
      accountName,
      accountNumber,
      qrCodeUrl: typeof body.qrCodeUrl === "string" ? body.qrCodeUrl.trim() : "",
      instructions: typeof body.instructions === "string" ? body.instructions.trim() : "",
      isActive: body.isActive !== false,
      updatedBy: adminUser,
    };

    const updated = await upsertPaymentConfig(category, payload);

    // If the admin chose to sync to both categories, update the other category too
    if (body.syncBoth) {
      const otherCategory = category === "amenity" ? "dues" : "amenity";
      await upsertPaymentConfig(otherCategory, payload);
    }

    return NextResponse.json({ config: updated, syncBoth: Boolean(body.syncBoth) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update payment configuration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
