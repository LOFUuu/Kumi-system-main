// Client-side helpers to call the Mongo-backed API routes.
// These are safe to import in client components (they only use fetch).

import type {
  HouseListing,
  Amenity,
  Announcement,
  User,
  Reservation,
  DuesRecord,
  Transaction,
  GcashPayment,
  PropertyViewing,
} from "./mock-data";

/** Error thrown by API helpers — carries an optional machine-readable `code`. */
export class ApiError extends Error {
  code?: string;
  email?: string;
  constructor(message: string, code?: string, email?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.email = email;
  }
}

async function getJSON<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(url, { cache: "no-store", headers });
  if (!res.ok) throw new ApiError(`Request failed: ${url} (${res.status})`);
  return res.json() as Promise<T>;
}

async function send<T>(url: string, method: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json", ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (json as any)?.error || `Request failed: ${url} (${res.status})`;
    const code = (json as any)?.code as string | undefined;
    const email = (json as any)?.email as string | undefined;
    throw new ApiError(message, code, email);
  }
  return json as T;
}

function howaHeaders(fallbackRole = "admin"): Record<string, string> {
  if (typeof window === "undefined") return { "x-user-role": fallbackRole };
  const saved = localStorage.getItem("mh_user");
  const headers: Record<string, string> = { "x-user-role": fallbackRole };
  if (saved) {
    try {
      const u = JSON.parse(saved) as { role?: string; email?: string; id?: number };
      if (u.role) headers["x-user-role"] = u.role;
      if (u.email) headers["x-user-email"] = u.email;
      if (u.id) headers["x-user-id"] = String(u.id);
    } catch { /* empty */ }
  }
  return headers;
}


export const api = {
  // ── Listings ─────────────────────────────────────────────────────────────
  /** Public feed — only verified listings */
  listingsVerified: () =>
    getJSON<HouseListing[]>("/api/listings?verificationStatus=verified"),
  /** All listings — for admin panel / my listings */
  listings: (status?: string) =>
    getJSON<HouseListing[]>(`/api/listings${status ? `?status=${status}` : ""}`, howaHeaders()),
  listing: (id: number | string) => getJSON<HouseListing>(`/api/listings/${id}`),
  masterIndex: () => getJSON<{ blockNo: string; lotNo: string }[]>("/api/listings/master-index"),

  /** Upload proof-of-ownership documents. Returns { paths: string[] } */
  uploadListingDocs: async (files: FileList | File[]): Promise<{ paths: string[] }> => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    const res = await fetch("/api/listings/upload", {
      method: "POST",
      cache: "no-store",
      body: fd,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const message = (json as any)?.error || `Upload failed (${res.status})`;
      throw new Error(message);
    }
    return json as { paths: string[] };
  },

  /** Create a listing (any authenticated user). proofDocuments are required. */
  listingCreate: (payload: Record<string, unknown>) =>
    send<{ listing: HouseListing }>("/api/listings", "POST", payload, howaHeaders()),

  listingUpdate: (id: number, payload: Record<string, unknown>) =>
    send<{ listing: HouseListing }>(`/api/listings/${id}`, "PATCH", payload, howaHeaders()),

  listingDelete: (id: number) =>
    send<{ ok: boolean }>(`/api/listings/${id}`, "DELETE", undefined, howaHeaders()),

  archivedListings: () => getJSON<HouseListing[]>("/api/listings/archived"),
  listingArchive: (id: number, reason?: string) =>
    send<{ ok: boolean }>(`/api/listings/${id}/archive`, "POST", { reason }, howaHeaders()),
  listingUnarchive: (id: number) =>
    send<{ ok: boolean }>(`/api/listings/${id}/archive`, "DELETE", undefined, howaHeaders()),

  /** Admin: approve or reject a pending listing */
  reviewListing: (id: number, action: "approve" | "reject", rejectionReason?: string) =>
    send<{ listing: HouseListing }>(
      `/api/listings/${id}`,
      "PATCH",
      { action, rejectionReason },
      howaHeaders()
    ),

  /** Resident: resubmit a rejected listing with new proof documents */
  resubmitListing: (id: number, proofDocuments: string[]) =>
    send<{ listing: HouseListing }>(
      `/api/listings/${id}`,
      "PATCH",
      { proofDocuments },
      howaHeaders()
    ),


  amenities: () => getJSON<Amenity[]>("/api/amenities"),
  archivedAmenities: () => getJSON<Amenity[]>("/api/amenities/archived"),
  amenityCreate: (payload: Partial<Amenity>) =>
    send<{ amenity: Amenity }>("/api/amenities", "POST", payload, howaHeaders()),
  amenityUpdate: (id: number, payload: Partial<Amenity>) =>
    send<{ amenity: Amenity }>(`/api/amenities/${id}`, "PATCH", payload, howaHeaders()),
  amenityDelete: (id: number) =>
    send<{ ok: boolean }>(`/api/amenities/${id}`, "DELETE", undefined, howaHeaders()),
  amenityArchive: (id: number) =>
    send<{ ok: boolean }>(`/api/amenities/${id}/archive`, "POST", undefined, howaHeaders()),
  amenityUnarchive: (id: number) =>
    send<{ ok: boolean }>(`/api/amenities/${id}/archive`, "DELETE", undefined, howaHeaders()),

  announcements: (active = false) =>
    getJSON<Announcement[]>(`/api/announcements${active ? "?active=true" : ""}`),
  users: () => getJSON<User[]>("/api/users"),
  userCreate: (payload: Record<string, unknown>) =>
    send<{ user: User }>("/api/users", "POST", payload, howaHeaders()),
  userUpdate: (id: number, payload: Record<string, unknown>) =>
    send<{ user: User }>(`/api/users/${id}`, "PATCH", payload, howaHeaders()),
  userDelete: (id: number) =>
    send<{ ok: boolean }>(`/api/users/${id}`, "DELETE", undefined, howaHeaders()),
  archivedUsers: () => getJSON<User[]>("/api/users/archived"),
  userArchive: (id: number, reason?: string) =>
    send<{ ok: boolean }>(`/api/users/${id}/archive`, "POST", { reason }, howaHeaders()),
  userUnarchive: (id: number) =>
    send<{ ok: boolean }>(`/api/users/${id}/archive`, "DELETE", undefined, howaHeaders()),
  updateProfile: (payload: Record<string, unknown>) =>
    send<{ user: User }>("/api/users/me", "PATCH", payload, howaHeaders()),
  reservations: () => getJSON<Reservation[]>("/api/reservations"),
  dues: () => getJSON<DuesRecord[]>("/api/dues"),
  transactions: () => getJSON<Transaction[]>("/api/transactions"),
  importDues: (records: any[]) =>
    send<{
      ok: boolean;
      summary: {
        total: number;
        imported: number;
        updated: number;
        skipped: number;
        duplicates: number;
      };
      message: string;
    }>("/api/dues/import", "POST", { records }, howaHeaders()),
  generateDues: (dueMonth?: string) =>
    send<{ ok: boolean; createdCount: number; dues: DuesRecord[] }>("/api/dues", "POST", { action: "generate", dueMonth }, howaHeaders()),
  createDue: (payload: Record<string, unknown>) =>
    send<{ ok: boolean; record: DuesRecord }>("/api/dues", "POST", payload, howaHeaders()),
  transactionUpdate: (id: number, payload: Record<string, unknown>) =>
    send<{ transaction: Transaction }>(`/api/transactions/${id}`, "PATCH", payload, howaHeaders()),


  availability: (amenityId: number, opts?: { date?: string; type?: string; pax?: number }) => {
    const q = new URLSearchParams();
    q.set("amenityId", String(amenityId));
    if (opts?.date) q.set("date", opts.date);
    if (opts?.type) q.set("type", opts.type);
    if (opts?.pax) q.set("pax", String(opts.pax));
    return getJSON<{ blocked: string[]; available: boolean; maxCapacity: number; amenityId: number }>(
      `/api/reservations/availability?${q.toString()}`
    );
  },

  createReservation: (payload: Record<string, unknown>) =>
    send<
      {
        reservation: Reservation;
        transactionId: number;
        payment: GcashPayment;
        paymentPlaceholder: boolean;
      }
    >("/api/reservations", "POST", payload),
  reviewReservation: (id: number, action: "approve" | "reject") =>
    send<{ reservation: Reservation }>(`/api/reservations/${id}`, "PATCH", { action }),

  uploadPaymentReceipt: async (file: File): Promise<{ path: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/payments/upload", {
      method: "POST",
      cache: "no-store",
      body: fd,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const message = (json as any)?.error || `Upload failed (${res.status})`;
      throw new Error(message);
    }
    return json as { path: string };
  },

  payment: (intentId: string) =>
    getJSON<{ transactionId: number; amount: number; payment: GcashPayment | null }>(
      `/api/payments/${intentId}`
    ),
  confirmPayment: (intentId: string, gcashRef: string, receiptPath?: string) =>
    send<{ transactionId: number; payment: GcashPayment | null }>(
      `/api/payments/${intentId}/confirm`,
      "POST",
      { gcashRef, receiptPath }
    ),

  payDues: (id: number, payload: Record<string, unknown>) =>
    send<{ dues: DuesRecord; transactionId: number }>(`/api/dues/${id}/pay`, "POST", payload),

  login: (email: string, password: string) =>
    send<{ user: User }>("/api/auth/login", "POST", { email, password }),
  register: (payload: Record<string, unknown>) =>
    send<{ ok: boolean }>("/api/auth/register", "POST", payload),
  verifyEmail: (token: string, email: string) =>
    send<{ ok: boolean }>("/api/auth/verify-email", "POST", { token, email }),
  resendVerification: (email: string) =>
    send<{ ok: boolean }>("/api/auth/resend-verification", "POST", { email }),
  forgotPassword: (email: string) =>
    send<{ ok: boolean }>("/api/auth/forgot-password", "POST", { email }),
  resetPassword: (token: string, email: string, newPassword: string) =>
    send<{ ok: boolean }>("/api/auth/reset-password", "POST", { token, email, newPassword }),

  // ── Property Viewings ──────────────────────────────────────────────────
  /** Admin: fetch all viewing requests */
  viewings: (status?: string) =>
    getJSON<PropertyViewing[]>(
      `/api/viewings${status ? `?status=${status}` : ""}`,
      howaHeaders("admin")
    ),

  /** Resident: fetch their own viewing requests (optionally filtered by listing) */
  myViewings: (listingId?: number) =>
    getJSON<PropertyViewing[]>(
      `/api/viewings/my${listingId ? `?listingId=${listingId}` : ""}`,
      howaHeaders("resident")
    ),

  /** Resident: submit a new viewing request */
  createViewing: (payload: Record<string, unknown>) =>
    send<{ viewing: PropertyViewing }>("/api/viewings", "POST", payload, howaHeaders("resident")),

  /** Admin/Resident: update a viewing status */
  updateViewing: (id: number, payload: Record<string, unknown>) =>
    send<{ viewing: PropertyViewing }>(`/api/viewings/${id}`, "PATCH", payload, howaHeaders("admin")),
};
