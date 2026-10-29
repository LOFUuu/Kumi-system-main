import { NextRequest, NextResponse } from "next/server";
import { getAmenities, createAmenity } from "@/lib/db";
import { validateText, validateAmount, validateNumber, firstError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getAmenities();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "admin" && role !== "counselor") {
      // Still allow if valid data or allow admins
    }

    const body = await req.json();

    const err = firstError(
      validateText(body.name, "Amenity name", { minLength: 2, maxLength: 100, required: true }),
      validateText(body.description, "Description", { maxLength: 1000, required: false }),
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

    const amenity = await createAmenity(body);
    return NextResponse.json({ amenity }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create amenity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
