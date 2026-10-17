import { NextRequest, NextResponse } from "next/server";
import { getPaymentByIntent, updateTransactionById } from "@/lib/db";

export const dynamic = "force-dynamic";

// Payment provider webhook endpoint.
//
// When a real GCash gateway (PayMongo / xendit / GCash business API) is
// configured, the provider POSTs an event here once a payment succeeds. This
// handler marks the matching transaction.payment as paid automatically, so
// no manual reference entry is needed.
//
// For now no provider is configured, so this returns 501. The booking flow
// instead uses /api/payments/[intentId]/confirm (manual reference entry) as
// the placeholder.
export async function POST(req: NextRequest) {
  const provider = process.env.GCASH_PROVIDER;

  if (!provider) {
    return NextResponse.json(
      { error: "No payment provider configured. Manual confirmation is active." },
      { status: 501 }
    );
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Provider-agnostic mapping: expect either { intent_id } directly or in an
  // event payload (e.g. PayMongo data.attributes.metadata.intentId).
  const intentId = String(
    body?.intent_id ||
      body?.intentId ||
      body?.data?.attributes?.metadata?.intentId ||
      ""
  ).trim();

  if (!intentId) {
    return NextResponse.json({ error: "Missing intent id." }, { status: 400 });
  }

  const existing = await getPaymentByIntent(intentId);
  if (!existing) {
    return NextResponse.json({ error: "Payment intent not found." }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const gcashRef = String(body?.gcash_ref || body?.attributes?.reference_number || "").trim();
  const currentPayment = existing.payment || ({} as any);

  await updateTransactionById(existing.id, {
    payment: {
      ...currentPayment,
      status: "paid",
      paidAt: today,
      ...(gcashRef ? { gcashRef } : {}),
    },
    ...(gcashRef ? { gcashRef } : {}),
  });

  return NextResponse.json({ received: true, intentId });
}
