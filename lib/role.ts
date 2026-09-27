import type { NextRequest } from "next/server";

// HOWA roles are allowed to manage the listing registry. Residents and
// non-residents are read-only.
export const HOWA_ROLES = ["admin", "counselor"] as const;

export type HowaRole = (typeof HOWA_ROLES)[number];

// NOTE: this app uses client-side mock auth (no real server session), so the
// role is passed by the client via the `x-user-role` header and validated here.
// Replace with a real session/JWT check when server-side auth is introduced.
export function requestRole(req: NextRequest | Request): string {
  return req.headers.get("x-user-role") ?? "";
}

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

// Returns an error message if not permitted, or null if allowed.
export function howaGuard(req: NextRequest | Request): string | null {
  const role = requestRole(req);
  if (!isHowaRole(role)) {
    return "Only HOWA administrators may perform this action.";
  }
  return null;
}
