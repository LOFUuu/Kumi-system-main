import { NextRequest, NextResponse } from "next/server";
import { Reservation, Transaction } from "@/models";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resId = Number(id);
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = body.action; // 'approve' | 'reject'
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const reservation = await Reservation.findOne({ _id: resId } as any);
  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  const newStatus = action === "approve" ? "approved" : "declined";

  reservation.status = newStatus;
  reservation.approvedAt = new Date().toISOString();
  await reservation.save();

  await Transaction.updateOne(
    { refType: "amenity", refId: resId },
    { $set: { status: newStatus === "approved" ? "approved" : "voided" } }
  );

  const updated = (await Reservation.findById(resId).lean()) as any;
  const {
    _id,
    __v: version,
    createdAt: created,
    updatedAt: modified,
    ...rest
  } = updated;
  void version;
  void created;
  void modified;
  return NextResponse.json({ reservation: { ...rest, id: _id } });
}
