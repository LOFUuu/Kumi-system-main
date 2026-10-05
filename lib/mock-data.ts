// ============================================================
// Mock data layer — stands in for the SQL database for now.
// Replace these with real API/DB calls later.
// ============================================================

export type Role = "admin" | "counselor" | "resident" | "non_resident";

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  address?: string;
  blockNo?: string;
  lotNo?: string;
  phone?: string;
  cedula?: string;
  gender?: string;
  householdMembers?: number;
  householdHead?: string;
  emailVerified?: boolean;
  createdAt?: string;
  // Archive
  isArchived?: boolean;
  archiveReason?: string;
  archivedAt?: string;
}

export const MOCK_USERS: User[] = [
  { id: 1, fullName: "admin", email: "admin@mabuhay.com", role: "admin", isActive: true },
  { id: 2, fullName: "Ana Counselor", email: "counselor@mabuhay.com", role: "counselor", isActive: true },
  { id: 3, fullName: "Maria Santos", email: "maria@email.com", role: "resident", isActive: true, blockNo: "B-12", lotNo: "34" },
  { id: 4, fullName: "Jose Reyes", email: "jose@email.com", role: "resident", isActive: true, blockNo: "C-03", lotNo: "11" },
  { id: 5, fullName: "Linda Cruz", email: "linda@email.com", role: "resident", isActive: true, blockNo: "A-21", lotNo: "7" },
  { id: 8, fullName: "Lofu Tsikaruz", email: "lofu@gmail.com", role: "non_resident", isActive: true },
];

export type VerificationStatus = "pending" | "verified" | "rejected";
export type TransactionStatus = "available" | "reserved" | "sold";

export interface HouseListing {
  id: number;
  houseName: string;
  address: string;
  blockNo: string; // master-index unit block (must come from the resident/master registry)
  lotNo: string;   // master-index unit lot (must come from the resident/master registry)
  price: number;
  listingType: "sale" | "rent";
  bedrooms: number;
  bathrooms: number;
  sqm: number;
  status: "available" | "reserved" | "sold" | "off_market";
  transactionStatus?: TransactionStatus; // "available" (For Rent/Sale), "reserved" (Reserved), "sold" (Sold / Rented Out)
  ownerContactNumber?: string;           // Phone / Mobile number of listing owner
  ownerMessengerLink?: string;           // Messenger / Facebook link of listing owner
  description: string;
  ownerId: number;
  ownerName: string;
  images: string[];
  lat: number;
  lng: number;
  // ── Ownership verification ────────────────────────────────────────────────
  verificationStatus: VerificationStatus;
  proofDocuments: string[];       // relative paths to uploaded proof files
  rejectionReason?: string;       // set by admin when rejecting; shown to resident
  uploadedBy?: number;            // resident user ID who submitted the listing
  showOnMap?: boolean;            // resident preference: show property on community map
  siteVisitRecommended?: boolean; // admin recommendation for property site visit
  isArchived?: boolean;           // archived listings are hidden from public feed
  archiveReason?: string;         // reason for archiving the listing
  archivedBy?: "owner" | "admin" | null;
  archivedAt?: string;
  createdAt?: string;
}

const img = (seed: string) => `https://picsum.photos/seed/${seed}/800/600`;

export const MOCK_LISTINGS: HouseListing[] = [
  {
    id: 101,
    houseName: "Casa Verde",
    address: "Lot 12, Block B, Mabuhay Homes Phase 5",
    blockNo: "B",
    lotNo: "12",
    price: 5_800_000,
    listingType: "sale",
    bedrooms: 3,
    bathrooms: 2,
    sqm: 120,
    status: "available",
    description:
      "Spacious family home with a garden and garage. Walking distance to the clubhouse and playground.",
    ownerId: 3,
    ownerName: "Maria Santos",
    images: [img("casa-verde-1"), img("casa-verde-2"), img("casa-verde-3")],
    lat: 14.3049,
    lng: 120.98636,
    verificationStatus: "verified",
    proofDocuments: [],
    uploadedBy: 3,
  },
  {
    id: 102,
    houseName: "The Maple Residence",
    address: "Lot 7, Block A, Mabuhay Homes Phase 5",
    blockNo: "A",
    lotNo: "7",
    price: 22_000,
    listingType: "rent",
    bedrooms: 2,
    bathrooms: 1,
    sqm: 75,
    status: "available",
    description: "Cozy two-bedroom unit, freshly painted, pet-friendly with a small backyard.",
    ownerId: 4,
    ownerName: "Jose Reyes",
    images: [img("maple-1"), img("maple-2")],
    lat: 14.30554,
    lng: 120.9894,
    verificationStatus: "verified",
    proofDocuments: [],
    uploadedBy: 4,
  },
  {
    id: 103,
    houseName: "Sunlight Villa",
    address: "Lot 21, Block A, Mabuhay Homes Phase 5",
    blockNo: "A",
    lotNo: "21",
    price: 6_450_000,
    listingType: "sale",
    bedrooms: 4,
    bathrooms: 3,
    sqm: 160,
    status: "available",
    description: "Modern villa with natural lighting, open kitchen, and a rooftop terrace.",
    ownerId: 5,
    ownerName: "Linda Cruz",
    images: [img("sunlight-1"), img("sunlight-2"), img("sunlight-3")],
    lat: 14.3025,
    lng: 120.9906,
    verificationStatus: "verified",
    proofDocuments: [],
    uploadedBy: 5,
  },
  {
    id: 104,
    houseName: "Narra House",
    address: "Lot 34, Block B, Mabuhay Homes Phase 5",
    blockNo: "B",
    lotNo: "34",
    price: 19_500,
    listingType: "rent",
    bedrooms: 3,
    bathrooms: 2,
    sqm: 95,
    status: "reserved",
    description: "Corner lot property with mature narra trees and a quiet neighborhood.",
    ownerId: 3,
    ownerName: "Maria Santos",
    images: [img("narra-1"), img("narra-2")],
    lat: 14.3017,
    lng: 120.98764,
    verificationStatus: "verified",
    proofDocuments: [],
    uploadedBy: 3,
  },
];

export interface Announcement {
  id: number;
  title: string;
  content: string;
  postDate: string;
  status: "active" | "archived";
  poster: string;
}

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 1,
    title: "Water Interruption on Friday",
    content:
      "There will be a scheduled water interruption this Friday from 8:00 AM to 2:00 PM due to mainline maintenance. Please store enough water in advance.",
    postDate: "2026-08-20",
    status: "active",
    poster: "Ana Counselor",
  },
  {
    id: 2,
    title: "Community Clean-up Drive",
    content:
      "Join our quarterly clean-up drive this weekend! Meet at the clubhouse at 7:00 AM. Gloves and trash bags will be provided.",
    postDate: "2026-08-18",
    status: "active",
    poster: "Super Admin",
  },
  {
    id: 3,
    title: "New Amenity Booking Policy",
    content:
      "Starting next month, amenity reservations must be made at least 24 hours in advance. Cancellations within 12 hours will incur a fee.",
    postDate: "2026-08-15",
    status: "active",
    poster: "Ana Counselor",
  },
];

export interface Amenity {
  id: number;
  name: string;
  description: string;
  maxCapacity: number;
  rateWalkin: number; // public — per head, day session
  rateWhole: number; // public — per head, night session
  ratePrivate: number; // private — flat rate (day or night)
  downpayment: number; // public downpayment
  downpaymentPrivate: number; // private downpayment
  isActive: boolean;
  isArchived?: boolean; // soft-delete flag — archived amenities are hidden from public
  image: string;
  lat: number;
  lng: number;
}

// Resident discount applied to public (per-head) rates.
export const RESIDENT_DISCOUNT = 0.2;

export const MOCK_AMENITIES: Amenity[] = [
  {
    id: 1,
    name: "Swimming Pool",
    description: "Community swimming pool. Max 50 persons. Lifeguard on duty.",
    maxCapacity: 50,
    rateWalkin: 100,
    rateWhole: 100,
    ratePrivate: 1000,
    downpayment: 200,
    downpaymentPrivate: 500,
    isActive: true,
    image: "/images/amenities/pool.jpg",
    lat: 14.3037,
    lng: 120.9886,
  },
  {
    id: 2,
    name: "Covered Court",
    description: "Multi-purpose covered court for basketball and badminton.",
    maxCapacity: 50,
    rateWalkin: 100,
    rateWhole: 100,
    ratePrivate: 400,
    downpayment: 200,
    downpaymentPrivate: 300,
    isActive: true,
    image: "/images/amenities/court.jpg",
    lat: 14.3029,
    lng: 120.987,
  },
];

export interface Reservation {
  id: number;
  amenityId: number;
  amenityName: string;
  residentName: string;
  phone?: string;
  bookingType: "day" | "night";
  reservationType: "public" | "private";
  date: string;
  paxCount: number;
  downpayment: number;
  totalAmount: number;
  status: "pending" | "approved" | "declined";
  notes?: string;
  userEmail?: string;
  approvedAt?: string;
  gcashRef?: string;
  receiptPath?: string;
}

export const MOCK_RESERVATIONS: Reservation[] = [
  { id: 1, amenityId: 1, amenityName: "Swimming Pool", residentName: "Maria Santos", bookingType: "day", reservationType: "public", date: "2026-08-30", paxCount: 1, downpayment: 200, totalAmount: 100, status: "pending" },
  { id: 2, amenityId: 1, amenityName: "Swimming Pool", residentName: "Jose Reyes", bookingType: "night", reservationType: "public", date: "2026-08-29", paxCount: 4, downpayment: 200, totalAmount: 400, status: "approved" },
  { id: 3, amenityId: 2, amenityName: "Covered Court", residentName: "Linda Cruz", bookingType: "day", reservationType: "public", date: "2026-09-02", paxCount: 10, downpayment: 200, totalAmount: 1000, status: "approved" },
];

export type DuesStatus = "unpaid" | "on_time" | "paid" | "advance" | "delayed";

export interface DuesRecord {
  id: number;
  residentId?: number;
  residentName: string;
  blockNo: string;
  lotNo: string;
  dueMonth: string;       // billing cycle, e.g. "2026-08" or "2026-09"
  dueDate: string;        // fixed monthly due date, ISO, e.g. "2026-09-30" or "2026-08-05"
  amountDue: number;
  amountPaid: number;
  paidAt?: string;        // ISO date the last payment was recorded
  creditBalance: number;  // overpayment carried over to the next cycle
  status: DuesStatus;
  source?: "imported" | "system" | "manual";
  billingMonth?: string;  // e.g. "September" or "2026-09"
  billingYear?: number;   // e.g. 2026
}

export const MOCK_DUES: DuesRecord[] = [
  { id: 1, residentId: 3, residentName: "Maria Santos", blockNo: "B-12", lotNo: "34", dueMonth: "2026-08", dueDate: "2026-08-05", amountDue: 100, amountPaid: 100, paidAt: "2026-08-02", creditBalance: 0, status: "on_time", source: "system", billingMonth: "August", billingYear: 2026 },
  { id: 2, residentId: 4, residentName: "Jose Reyes", blockNo: "C-03", lotNo: "11", dueMonth: "2026-08", dueDate: "2026-08-05", amountDue: 100, amountPaid: 0, creditBalance: 0, status: "unpaid", source: "system", billingMonth: "August", billingYear: 2026 },
  { id: 3, residentId: 5, residentName: "Linda Cruz", blockNo: "A-21", lotNo: "7", dueMonth: "2026-07", dueDate: "2026-07-05", amountDue: 100, amountPaid: 50, paidAt: "2026-07-14", creditBalance: 0, status: "delayed", source: "system", billingMonth: "July", billingYear: 2026 },
  { id: 4, residentId: 6, residentName: "Pedro Luna", blockNo: "D-09", lotNo: "22", dueMonth: "2026-08", dueDate: "2026-08-05", amountDue: 100, amountPaid: 200, paidAt: "2026-07-25", creditBalance: 100, status: "advance", source: "system", billingMonth: "August", billingYear: 2026 },
];

export interface GcashPayment {
  provider: "gcash";
  intentId: string;
  qrPayload: string;
  status: "awaiting_payment" | "paid" | "expired" | "failed";
  paidAt?: string;
  gcashRef?: string;
}

export interface Transaction {
  id: number;
  residentName: string;
  refType: "amenity" | "dues" | "listing";
  refId: number;
  userEmail?: string;
  amount: number;
  paymentMethod: "cash" | "gcash";
  gcashRef?: string;
  receiptPath?: string;
  status: "pending" | "approved" | "voided";
  createdAt: string;
  payment?: GcashPayment;
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 1, residentName: "Maria Santos", refType: "dues", refId: 0, amount: 350, paymentMethod: "cash", status: "approved", createdAt: "2026-08-10" },
  { id: 2, residentName: "Linda Cruz", refType: "amenity", refId: 3, amount: 200, paymentMethod: "gcash", status: "approved", createdAt: "2026-08-12" },
  { id: 3, residentName: "Jose Reyes", refType: "dues", refId: 0, amount: 350, paymentMethod: "gcash", status: "pending", createdAt: "2026-08-14" },
];

// ── Property Viewings ──────────────────────────────────────────────────────
export type ViewingStatus =
  | "viewing_requested"
  | "viewing_scheduled"
  | "viewing_completed"
  | "viewing_declined";

export interface PropertyViewing {
  id: number;
  listingId: number;
  listingName: string;
  residentName: string;
  residentEmail: string;
  preferredDate: string;   // ISO date string e.g. "2026-10-05"
  preferredTime: string;   // e.g. "10:00"
  message?: string;
  status: ViewingStatus;
  adminNotes?: string;     // set by HOA when scheduling or declining
  scheduledAt?: string;    // ISO date — when HOA confirms the exact schedule
  createdAt?: string;
}

export const formatPHP = (n: number) =>
  "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Compute the discounted per-head rate for a public booking. Residents get a
// flat 20% discount; non-residents pay the full rate.
export const getRate = (amenity: Amenity, bookingType: "day" | "night", isResident: boolean) => {
  const base = bookingType === "night" ? amenity.rateWhole : amenity.rateWalkin;
  return isResident ? Math.round(base * (1 - RESIDENT_DISCOUNT)) : base;
};

// Total payable for a booking — private is a flat rate, public is per head × pax.
export const getBookingTotal = (
  amenity: Amenity,
  bookingType: "day" | "night",
  reservationType: "public" | "private",
  pax: number,
  isResident: boolean
) =>
  reservationType === "private"
    ? amenity.ratePrivate
    : getRate(amenity, bookingType, isResident) * Math.max(1, pax);
