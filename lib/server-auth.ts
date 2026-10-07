import { NextRequest, NextResponse } from "next/server";
import dbConnect from "./mongoose";
import { User } from "../models";
import type { AuthUser } from "./db";
import type { User as PublicUser } from "./mock-data";

export function createSessionCookieValue(user: { id: number; email: string; role: string }): string {
  return Buffer.from(JSON.stringify({ id: user.id, email: user.email, role: user.role, time: Date.now() })).toString("base64");
}

export async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
  await dbConnect();

  // 1. Try session cookie first
  const sessionCookie = req.cookies.get("kumi_session")?.value;
  if (sessionCookie) {
    try {
      const parsed = JSON.parse(Buffer.from(sessionCookie, "base64").toString("utf-8"));
      if (parsed?.id) {
        const doc = await User.findOne({ _id: Number(parsed.id) }).lean();
        if (doc && doc.isActive !== false && !(doc as any).isArchived) {
          const { _id, __v, createdAt, updatedAt, ...rest } = doc as any;
          return { ...rest, id: _id } as AuthUser;
        }
      }
      if (parsed?.email) {
        const doc = await User.findOne({ email: String(parsed.email).toLowerCase().trim() }).lean();
        if (doc && doc.isActive !== false && !(doc as any).isArchived) {
          const { _id, __v, createdAt, updatedAt, ...rest } = doc as any;
          return { ...rest, id: _id } as AuthUser;
        }
      }
    } catch {
      /* fallback below */
    }
  }

  // 2. Try x-user-id / x-user-email headers from client, but verify in DB
  const headerId = req.headers.get("x-user-id");
  const headerEmail = req.headers.get("x-user-email");

  if (headerId && Number.isFinite(Number(headerId))) {
    const doc = await User.findOne({ _id: Number(headerId) }).lean();
    if (doc && doc.isActive !== false && !(doc as any).isArchived) {
      const { _id, __v, createdAt, updatedAt, ...rest } = doc as any;
      return { ...rest, id: _id } as AuthUser;
    }
  }

  if (headerEmail) {
    const doc = await User.findOne({ email: headerEmail.trim().toLowerCase() }).lean();
    if (doc && doc.isActive !== false && !(doc as any).isArchived) {
      const { _id, __v, createdAt, updatedAt, ...rest } = doc as any;
      return { ...rest, id: _id } as AuthUser;
    }
  }

  return null;
}

export function toPublicUser(u: AuthUser): PublicUser {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    blockNo: u.blockNo,
    lotNo: u.lotNo,
    phone: u.phone,
    cedula: u.cedula,
  };
}
