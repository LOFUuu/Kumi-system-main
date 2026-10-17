import { NextRequest, NextResponse } from "next/server";
import { getPropertyViewings, updatePropertyViewing } from "@/lib/db";
import { howaGuard, isHowaRole, requestRole } from "@/lib/role";

export const dynamic = "force-dynamic";

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

  const allViewings = await getPropertyViewings();
  const viewing = allViewings.find((v) => v.id === numericId);
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

    const updated = await updatePropertyViewing(numericId, patch);
    return NextResponse.json({ viewing: updated });
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
    const updated = await updatePropertyViewing(numericId, { status: "viewing_declined" });
    return NextResponse.json({ viewing: updated });
  }

  return NextResponse.json({ error: "Invalid status transition." }, { status: 400 });
}
