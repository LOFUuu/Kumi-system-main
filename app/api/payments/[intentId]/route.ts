import { NextRequest, NextResponse } from "next/server";
import { getPaymentByIntent } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ intentId: string }> }
) {
  const { intentId } = await params;
  if (!intentId) {
    return NextResponse.json({ error: "Missing intent id." }, { status: 400 });
  }

  const txn = await getPaymentByIntent(intentId);
  if (!txn) {
    return NextResponse.json({ error: "Payment intent not found." }, { status: 404 });
  }

  return NextResponse.json({
    transactionId: txn.id,
    amount: txn.amount,
    payment: txn.payment ?? null,
    reference: {
      amenity: txn.refType === "amenity" ? { id: txn.refId } : undefined,
    },
  });
}
