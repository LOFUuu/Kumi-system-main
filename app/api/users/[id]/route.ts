import { NextRequest, NextResponse } from "next/server";
import { updateUserById, deleteUserById } from "@/lib/db";
import { howaGuardAsync } from "@/lib/role";
import {
  validateName,
  validateEmail,
  validatePhone,
  validateBlockLot,
  validateNumber,
  validateText,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guardErr = await howaGuardAsync(req);
  if (guardErr) {
    return NextResponse.json({ error: guardErr }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }
  const idToUse = Number.isFinite(Number(id)) ? Number(id) : id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.fullName !== undefined) {
    const name = String(body.fullName || "").trim();
    const nameErr = validateName(name, { required: true, label: "Full name" });
    if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });
    body.fullName = name;
  }

  if (body.email !== undefined) {
    const email = String(body.email || "").trim().toLowerCase();
    const emailErr = validateEmail(email, { required: true });
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });
    body.email = email;
  }

  if (body.phone !== undefined && body.phone !== null) {
    const phone = String(body.phone || "").trim();
    if (phone) {
      const phoneErr = validatePhone(phone, { label: "Phone number" });
      if (phoneErr) return NextResponse.json({ error: phoneErr }, { status: 400 });
      body.phone = phone;
    } else {
      body.phone = null;
    }
  }

  if (body.blockNo !== undefined && body.blockNo !== null) {
    const block = String(body.blockNo || "").trim();
    if (block) {
      const bErr = validateBlockLot(block, { label: "Block No." });
      if (bErr) return NextResponse.json({ error: bErr }, { status: 400 });
      body.blockNo = block;
    } else {
      body.blockNo = null;
    }
  }

  if (body.lotNo !== undefined && body.lotNo !== null) {
    const lot = String(body.lotNo || "").trim();
    if (lot) {
      const lErr = validateBlockLot(lot, { label: "Lot No." });
      if (lErr) return NextResponse.json({ error: lErr }, { status: 400 });
      body.lotNo = lot;
    } else {
      body.lotNo = null;
    }
  }

  if (body.householdMembers !== undefined) {
    const mErr = validateNumber(body.householdMembers, { label: "Household members", integer: true, min: 1, max: 50 });
    if (mErr) return NextResponse.json({ error: mErr }, { status: 400 });
    body.householdMembers = Number(body.householdMembers);
  }

  if (body.householdHead !== undefined && body.householdHead !== null) {
    const head = String(body.householdHead || "").trim();
    if (head) {
      const headErr = validateName(head, { label: "Household head" });
      if (headErr) return NextResponse.json({ error: headErr }, { status: 400 });
      body.householdHead = head;
    }
  }

  if (body.address !== undefined && body.address !== null) {
    const addr = String(body.address || "").trim();
    if (addr) {
      const addrErr = validateText(addr, { label: "Address", max: 300 });
      if (addrErr) return NextResponse.json({ error: addrErr }, { status: 400 });
      body.address = addr;
    }
  }

  try {
    const user = await updateUserById(idToUse, body);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guardErr = await howaGuardAsync(req);
  if (guardErr) {
    return NextResponse.json({ error: guardErr }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }
  const idToUse = Number.isFinite(Number(id)) ? Number(id) : id;

  try {
    await deleteUserById(idToUse);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete user" },
      { status: 500 }
    );
  }
}
