import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { PropertyViewing } from "@/models";
import { howaGuard, isHowaRole, requestRole } from "@/lib/role";
import type { PropertyViewing as PropertyViewingType } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

function serializeViewing(doc: any): PropertyViewingType {
  if (!doc) return doc;
  const { _id, __v, createdAt, updatedAt, ...rest } = doc;
  return { ...rest, id: _id, createdAt } as PropertyViewingType;
}

// PATCH /api/viewings/[id] — admin updates viewing status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid viewing ID." }, { status: 400 });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  await dbConnect();

  const viewing = await PropertyViewing.findOne({ _id: numericId }).lean();
  if (!viewing) {
    return NextResponse.json({ error: "Viewing not found." }, { status: 404 });
  }

  const role = requestRole(req);
  const isHowa = isHowaRole(role);

  // Admin-only status transitions
  const validAdminStatuses = ["viewing_scheduled", "viewing_completed", "viewing_declined"];
  if (body.status && validAdminStatuses.includes(body.status)) {
    const denied = howaGuard(req);
    if (denied) return NextResponse.json({ error: denied }, { status: 403 });

    const patch: Record<string, any> = { status: body.status };
    if (body.adminNotes !== undefined) patch.adminNotes = String(body.adminNotes).trim();
    if (body.scheduledAt !== undefined) patch.scheduledAt = body.scheduledAt;

    await PropertyViewing.updateOne({ _id: numericId } as any, { $set: patch } as any);
    const updated = await PropertyViewing.findOne({ _id: numericId }).lean();
    return NextResponse.json({ viewing: serializeViewing(updated) });
  }

  // Resident cancels their own viewing request (only if viewing_requested)
  if (body.status === "viewing_declined" && !isHowa) {
    const residentEmail = String(req.headers.get("x-user-email") || "").trim();
    if ((viewing as any).residentEmail !== residentEmail) {
      return NextResponse.json({ error: "You can only cancel your own viewing requests." }, { status: 403 });
    }
    if (!["viewing_requested"].includes((viewing as any).status)) {
      return NextResponse.json({ error: "Only pending viewing requests can be cancelled." }, { status: 400 });
    }
    await PropertyViewing.updateOne({ _id: numericId } as any, { $set: { status: "viewing_declined" } } as any);
    const updated = await PropertyViewing.findOne({ _id: numericId }).lean();
    return NextResponse.json({ viewing: serializeViewing(updated) });
  }

  return NextResponse.json({ error: "Invalid status transition." }, { status: 400 });
}
