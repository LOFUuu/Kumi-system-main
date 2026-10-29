import { NextRequest, NextResponse } from "next/server";
import { getAmenity, updateAmenity, deleteAmenity } from "@/lib/db";
import { validateText, validateAmount, validateNumber, firstError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "Invalid amenity ID" }, { status: 400 });
  }

  const amenity = await getAmenity(numId);
  if (!amenity) {
    return NextResponse.json({ error: "Amenity not found" }, { status: 404 });
  }

  return NextResponse.json({ amenity });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
      return NextResponse.json({ error: "Invalid amenity ID" }, { status: 400 });
    }

    const body = await req.json();

    const err = firstError(
      body.name !== undefined ? validateText(body.name, "Amenity name", { minLength: 2, maxLength: 100 }) : null,
      body.description !== undefined ? validateText(body.description, "Description", { maxLength: 1000, required: false }) : null,
      body.maxCapacity !== undefined ? validateNumber(body.maxCapacity, "Max capacity", { min: 1, max: 10000, integer: true }) : null,
      body.rateWalkin !== undefined ? validateAmount(body.rateWalkin, "Day session rate") : null,
      body.rateWhole !== undefined ? validateAmount(body.rateWhole, "Night session rate") : null,
      body.ratePrivate !== undefined ? validateAmount(body.ratePrivate, "Private flat rate") : null,
      body.basePrice !== undefined ? validateAmount(body.basePrice, "Base fee") : null,
      body.pricePerPerson !== undefined ? validateAmount(body.pricePerPerson, "Price per person") : null,
      body.extraGuestFee !== undefined ? validateAmount(body.extraGuestFee, "Extra guest fee") : null,
      body.downpayment !== undefined ? validateAmount(body.downpayment, "Downpayment") : null,
      body.downpaymentPrivate !== undefined ? validateAmount(body.downpaymentPrivate, "Downpayment (private)") : null,
      body.includedGuests !== undefined ? validateNumber(body.includedGuests, "Included guests", { min: 1, max: 10000, integer: true }) : null
    );

    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const updated = await updateAmenity(numId, body);
    if (!updated) {
      return NextResponse.json({ error: "Amenity not found" }, { status: 404 });
    }

    return NextResponse.json({ amenity: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update amenity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
      return NextResponse.json({ error: "Invalid amenity ID" }, { status: 400 });
    }

    const ok = await deleteAmenity(numId);
    if (!ok) {
      return NextResponse.json({ error: "Amenity not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete amenity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
