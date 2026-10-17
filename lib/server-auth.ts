import { NextRequest, NextResponse } from "next/server";
import dbConnect from "./mongoose";
import { User } from "../models";
import type { AuthUser } from "./db";
import type { User as PublicUser } from "./mock-data";
import { isOnlineMode } from "./db-router";
import { getUserByIdMariaDB, getUserByEmailForAuthMariaDB } from "./mariadb-service";

export function createSessionCookieValue(user: { id: number; email: string; role: string }): string {
  return Buffer.from(JSON.stringify({ id: user.id, email: user.email, role: user.role, time: Date.now() })).toString("base64");
}

export async function getAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
    } catch {
      // fallback to offline
    }
  }

  const findUser = async (filter: { id?: number; email?: string }): Promise<AuthUser | null> => {
    if (online) {
      try {
        const query: any = {};
        if (filter.id) query._id = Number(filter.id);
        if (filter.email) query.email = String(filter.email).toLowerCase().trim();
        const doc = await User.findOne(query).lean();
        if (doc && doc.isActive !== false && !(doc as any).isArchived) {
          const { _id, __v, createdAt, updatedAt, ...rest } = doc as any;
          return { ...rest, id: _id } as AuthUser;
        }
      } catch (err) {
        // failed online, try local
      }
    }
    // Offline local database lookup
    if (filter.id) {
      const u = await getUserByIdMariaDB(filter.id);
      if (u && u.isActive !== false && !u.isArchived) {
        return u as AuthUser;
      }
    }
    if (filter.email) {
      const u = await getUserByEmailForAuthMariaDB(filter.email);
      if (u && u.isActive !== false && !u.isArchived) {
        return u as AuthUser;
      }
    }
    return null;
  };

  // 1. Try session cookie first
  const sessionCookie = req.cookies.get("kumi_session")?.value;
  if (sessionCookie) {
    try {
      const parsed = JSON.parse(Buffer.from(sessionCookie, "base64").toString("utf-8"));
      if (parsed?.id) {
        const u = await findUser({ id: Number(parsed.id) });
        if (u) return u;
      }
      if (parsed?.email) {
        const u = await findUser({ email: String(parsed.email).toLowerCase().trim() });
        if (u) return u;
      }
    } catch {
      /* fallback below */
    }
  }

  // 2. Try x-user-id / x-user-email headers from client, but verify in DB
  const headerId = req.headers.get("x-user-id");
  const headerEmail = req.headers.get("x-user-email");

  if (headerId && Number.isFinite(Number(headerId))) {
    const u = await findUser({ id: Number(headerId) });
    if (u) return u;
  }

  if (headerEmail) {
    const u = await findUser({ email: headerEmail.trim().toLowerCase() });
    if (u) return u;
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
