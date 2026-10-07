import type { NextRequest } from "next/server";
import { getAuthenticatedUser } from "./server-auth";

// HOWA roles are allowed to manage the listing registry. Residents and
// non-residents are read-only.
export const HOWA_ROLES = ["admin", "counselor"] as const;

export type HowaRole = (typeof HOWA_ROLES)[number];

export function isHowaRole(role: string): boolean {
  if (!role) return false;
  const r = role.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return (
    r === "admin" ||
    r === "superadmin" ||
    r === "counselor" ||
    r === "howa" ||
    r === "staff" ||
    r === "boardmember" ||
    (HOWA_ROLES as readonly string[]).includes(role)
  );
}

// Synchronous header reader (fallback)
export function requestRole(req: NextRequest | Request): string {
  return req.headers.get("x-user-role") ?? "";
}

// Server-authenticated role retriever: NEVER trusts client x-user-role header.
// Always verifies session cookie / user identity against MongoDB.
export async function getAuthenticatedRole(req: NextRequest): Promise<string> {
  const user = await getAuthenticatedUser(req);
  return user?.role ?? "";
}

// Returns an error message if not permitted, or null if allowed.
export async function howaGuardAsync(req: NextRequest): Promise<string | null> {
  const role = await getAuthenticatedRole(req);
  if (!isHowaRole(role)) {
    return "Only HOWA administrators may perform this action.";
  }
  return null;
}

export function howaGuard(req: NextRequest | Request): string | null {
  const role = requestRole(req);
  if (!isHowaRole(role)) {
    return "Only HOWA administrators may perform this action.";
  }
  return null;
}
