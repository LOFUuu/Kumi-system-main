import { NextRequest, NextResponse } from "next/server";
import { getTransactionById, updateTransactionById } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const txn = await getTransactionById(id);
  if (!txn) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(txn);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const allowed: Record<string, unknown> = {};
    if (body.status !== undefined) allowed.status = body.status;
    if (body.receiptPath !== undefined) allowed.receiptPath = body.receiptPath;

    const updated = await updateTransactionById(numId, allowed as any);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ transaction: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
