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
  PaymentConfig,
  InAppNotification,
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
  announcementCreate: (payload: { title: string; content: string; status?: string; poster?: string; category?: string }) =>
    send<{ announcement: Announcement }>("/api/announcements", "POST", payload, howaHeaders("admin")),
  announcementUpdate: (id: number, payload: Partial<Announcement>) =>
    send<{ announcement: Announcement }>(`/api/announcements/${id}`, "PATCH", payload, howaHeaders("admin")),
  announcementDelete: (id: number) =>
    send<{ ok: boolean }>(`/api/announcements/${id}`, "DELETE", undefined, howaHeaders("admin")),

  notifications: () =>
    getJSON<{ notifications: InAppNotification[]; unreadCount: number }>("/api/notifications", howaHeaders()),
  markNotificationRead: (id: number | string) =>
    send<{ success: boolean }>(`/api/notifications/${id}/read`, "POST", undefined, howaHeaders()),
  markAllNotificationsRead: () =>
    send<{ success: boolean }>("/api/notifications", "POST", undefined, howaHeaders()),
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
  importResidentMasterList: (payload: { records: any[] }) =>
    send<{
      ok: boolean;
      summary: {
        total: number;
        imported: number;
        skipped: number;
        duplicates: number;
        retroMatched: number;
        flaggedForReview: number;
      };
      message: string;
    }>("/api/admin/resident-masterlist/import", "POST", payload, howaHeaders()),
  getResidentReviewData: (userId: number | string) =>
    getJSON<{ user: any; candidates: any[] }>(`/api/admin/resident-masterlist/review?userId=${userId}`, howaHeaders()),
  reviewResident: (payload: { userId: number | string; action: "approve" | "dismiss"; masterListRecordId?: string }) =>
    send<{ ok: boolean; message: string; user?: User }>("/api/admin/resident-masterlist/review", "POST", payload, howaHeaders()),
  reservations: () => getJSON<Reservation[]>("/api/reservations"),
  archivedReservations: () => getJSON<Reservation[]>("/api/reservations/archived", howaHeaders()),
  archiveReservation: (id: number, reason?: string) =>
    send<{ ok: boolean; reservation: Reservation }>(`/api/reservations/${id}/archive`, "POST", { reason }, howaHeaders()),
  restoreReservation: (id: number) =>
    send<{ ok: boolean; reservation: Reservation }>(`/api/reservations/${id}/archive`, "DELETE", undefined, howaHeaders()),
  deleteReservation: (id: number) =>
    send<{ ok: boolean }>(`/api/reservations/${id}`, "DELETE", undefined, howaHeaders()),
  deleteReservations: (ids: number[]) =>
    send<{ ok: boolean; deletedCount: number; deletedIds: number[]; failedIds: number[] }>(
      "/api/reservations",
      "DELETE",
      { ids },
      howaHeaders()
    ),
  dues: (filter?: { isArchived?: boolean; includeArchived?: boolean }) => {
    const q = new URLSearchParams();
    if (filter?.isArchived !== undefined) q.set("archived", String(filter.isArchived));
    if (filter?.includeArchived) q.set("includeArchived", "true");
    const qs = q.toString();
    return getJSON<DuesRecord[]>(`/api/dues${qs ? `?${qs}` : ""}`);
  },
  archivedDues: () => getJSON<DuesRecord[]>("/api/dues?tab=archive"),
  archiveDues: (ids: number[], reason?: string) =>
    send<{ ok: boolean; count: number; message: string }>("/api/dues", "POST", { action: "bulk-archive", ids, reason }, howaHeaders()),
  unarchiveDues: (ids: number[]) =>
    send<{ ok: boolean; count: number; message: string }>("/api/dues", "POST", { action: "bulk-unarchive", ids }, howaHeaders()),
  transactions: (filter?: { isArchived?: boolean; includeArchived?: boolean; refType?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (filter?.isArchived !== undefined) q.set("isArchived", String(filter.isArchived));
    if (filter?.includeArchived) q.set("includeArchived", "true");
    if (filter?.refType && filter.refType !== "all") q.set("refType", filter.refType);
    if (filter?.status && filter.status !== "all") q.set("status", filter.status);
    const qs = q.toString();
    return getJSON<Transaction[]>(`/api/transactions${qs ? `?${qs}` : ""}`, howaHeaders());
  },
  archivedTransactions: (refType?: string) => {
    const q = new URLSearchParams({ isArchived: "true" });
    if (refType && refType !== "all") q.set("refType", refType);
    return getJSON<Transaction[]>(`/api/transactions?${q.toString()}`, howaHeaders());
  },
  archiveTransaction: (id: number, reason?: string) =>
    send<{ ok: boolean }>(`/api/transactions/${id}/archive`, "POST", { reason }, howaHeaders()),
  restoreTransaction: (id: number) =>
    send<{ ok: boolean }>(`/api/transactions/${id}/archive`, "DELETE", undefined, howaHeaders()),
  deleteTransaction: (id: number) =>
    send<{ ok: boolean }>(`/api/transactions/${id}`, "DELETE", undefined, howaHeaders()),

  // ── GCash / Payment Configuration ──────────────────────────────────────
  paymentConfigs: () =>
    getJSON<Record<"amenity" | "dues", PaymentConfig>>("/api/payments/config"),
  paymentConfig: (category: "amenity" | "dues") =>
    getJSON<PaymentConfig>(`/api/payments/config?category=${category}`),
  updatePaymentConfig: (category: "amenity" | "dues", payload: Partial<PaymentConfig> & { syncBoth?: boolean }) =>
    send<{ config: PaymentConfig; syncBoth?: boolean }>("/api/payments/config", "PUT", { category, ...payload }, howaHeaders()),

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


  availability: (
    amenityId: number,
    opts?: { date?: string; type?: string; pax?: number; session?: string; month?: string }
  ) => {
    const q = new URLSearchParams();
    q.set("amenityId", String(amenityId));
    if (opts?.date) q.set("date", opts.date);
    if (opts?.type) q.set("type", opts.type);
    if (opts?.session) q.set("session", opts.session);
    if (opts?.pax) q.set("pax", String(opts.pax));
    if (opts?.month) q.set("month", opts.month);
    return getJSON<{
      amenityId: number;
      maxCapacity: number;
      blocked: string[];
      available: boolean;
      datesStatus?: Record<
        string,
        {
          status: "available" | "limited" | "booked";
          remainingSlots: number;
          day: { available: boolean; remainingSlots: number; status: "available" | "limited" | "booked" };
          night: { available: boolean; remainingSlots: number; status: "available" | "limited" | "booked" };
        }
      >;
      recommendations?: Array<{
        date: string;
        dayOfWeek: string;
        formattedDate: string;
        session: "day" | "night";
        sessionLabel: string;
        sessionTime: string;
        status: "available" | "limited";
        statusLabel: string;
        remainingSlots: number;
        maxCapacity: number;
        reservationType: "public" | "private";
      }>;
      nextAvailable?: {
        date: string;
        dayOfWeek: string;
        formattedDate: string;
        session: "day" | "night";
        sessionLabel: string;
        sessionTime: string;
        status: "available" | "limited";
        statusLabel: string;
        remainingSlots: number;
        maxCapacity: number;
        reservationType: "public" | "private";
      } | null;
    }>(`/api/reservations/availability?${q.toString()}`);
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
  reviewReservation: (id: number, action: "approve" | "reject" | "cancel", reason?: string) =>
    send<{ reservation: Reservation }>(`/api/reservations/${id}`, "PATCH", { action, reason }, howaHeaders()),
  cancelReservation: (id: number, reason?: string) =>
    send<{ reservation: Reservation }>(`/api/reservations/${id}`, "PATCH", { action: "cancel", reason }, howaHeaders()),

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

  /** Fetch booked / unavailable viewing slots for a listing */
  viewingAvailability: (listingId: number) =>
    getJSON<{ date: string; time: string; status: string }[]>(
      `/api/viewings?availability=true&listingId=${listingId}`
    ),

  /** Resident: submit a new viewing request */
  createViewing: (payload: Record<string, unknown>) =>
    send<{ viewing: PropertyViewing }>("/api/viewings", "POST", payload, howaHeaders("resident")),

  /** Admin/Resident: update a viewing status */
  updateViewing: (id: number, payload: Record<string, unknown>) =>
    send<{ viewing: PropertyViewing }>(`/api/viewings/${id}`, "PATCH", payload, howaHeaders("admin")),

  /** Resident/Admin: cancel a viewing request under the 48-hour policy */
  cancelViewing: (id: number, reason?: string) =>
    send<{ viewing: PropertyViewing }>(`/api/viewings/${id}`, "PATCH", { action: "cancel", reason }, howaHeaders("resident")),

  /** Homeowner: fetch viewing requests for listings owned by current user */
  ownerViewings: (status?: string) =>
    getJSON<PropertyViewing[]>(
      `/api/viewings/owner${status ? `?status=${status}` : ""}`,
      howaHeaders("resident")
    ),

  /** Homeowner: summary metadata (hasListings, pendingCount, viewings) */
  ownerViewingsSummary: () =>
    getJSON<{
      viewings: PropertyViewing[];
      pendingCount: number;
      hasListings: boolean;
      listingCount: number;
    }>("/api/viewings/owner?summary=true", howaHeaders("resident")),

  /** Homeowner: update viewing for a listing owned by current user */
  updateOwnerViewing: (id: number, payload: Record<string, unknown>) =>
    send<{ viewing: PropertyViewing }>(
      `/api/viewings/owner/${id}`,
      "PATCH",
      payload,
      howaHeaders("resident")
    ),
};
