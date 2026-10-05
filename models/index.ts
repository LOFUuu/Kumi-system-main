import mongoose, { Schema, model, models } from "mongoose";
import type {
  HouseListing,
  Amenity as AmenityType,
  Announcement as AnnouncementType,
  User as UserType,
  Reservation as ReservationType,
  DuesRecord as DuesType,
  Transaction as TransactionType,
  PropertyViewing as PropertyViewingType,
} from "../lib/mock-data";

const listingSchema = new Schema<HouseListing>(
  {
    _id: { type: Number },
    houseName: { type: String, required: true },
    address: { type: String, required: true },
    blockNo: String,
    lotNo: String,
    price: { type: Number, required: true },
    listingType: { type: String, enum: ["sale", "rent"], required: true },
    bedrooms: Number,
    bathrooms: Number,
    sqm: Number,
    status: { type: String, enum: ["available", "reserved", "sold", "off_market"], default: "available", required: true },
    transactionStatus: { type: String, enum: ["available", "reserved", "sold_rented", "sold"], default: "available" },
    ownerContactNumber: { type: String, default: "" },
    ownerMessengerLink: { type: String, default: "" },
    description: String,
    ownerId: Number,
    ownerName: String,
    images: [String],
    lat: Number,
    lng: Number,
    // ── Ownership verification ──────────────────────────────────────────────
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    proofDocuments: { type: [String], default: [] },
    rejectionReason: { type: String, default: null },
    uploadedBy: { type: Number, default: null },
    showOnMap: { type: Boolean, default: true },
    siteVisitRecommended: { type: Boolean, default: false },
    // ── Archiving ───────────────────────────────────────────────────────────
    isArchived: { type: Boolean, default: false },
    archiveReason: { type: String, default: null },
    archivedBy: { type: String, default: null },
    archivedAt: { type: String, default: null },
  } as any,
  { timestamps: true }
);


const amenitySchema = new Schema<AmenityType>(
  {
    _id: { type: Number },
    name: { type: String, required: true },
    description: String,
    maxCapacity: { type: Number, default: 50 },
    rateWalkin: { type: Number, default: 0 },
    rateWhole: { type: Number, default: 0 },
    ratePrivate: { type: Number, default: 0 },
    downpayment: { type: Number, default: 200 },
    downpaymentPrivate: { type: Number, default: 500 },
    isActive: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
    image: String,
    lat: Number,
    lng: Number,
  } as any,
  { timestamps: true }
);

const announcementSchema = new Schema<AnnouncementType>(
  {
    _id: { type: Number },
    title: { type: String, required: true },
    content: String,
    postDate: String,
    status: { type: String, enum: ["active", "archived"], required: true },
    poster: String,
  } as any,
  { timestamps: true }
);

const userSchema = new Schema<UserType>(
  {
    _id: { type: Number },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ["admin", "counselor", "resident", "non_resident"], required: true },
    isActive: { type: Boolean, default: true },
    address: String,
    blockNo: String,
    lotNo: String,
    phone: String,
    gender: String,
    householdMembers: Number,
    householdHead: String,
    password: String,
    passwordHash: String,
    resetToken: String,
    resetTokenExpiry: Date,
    emailVerified: Boolean,
    verificationToken: String,
    verificationTokenExpiry: Date,
    cedula: String,
    // ── Archiving ───────────────────────────────────────────────────────────
    isArchived: { type: Boolean, default: false },
    archiveReason: { type: String, default: null },
    archivedAt: { type: String, default: null },
  } as any,
  { timestamps: true }
);

const reservationSchema = new Schema<ReservationType>(
  {
    _id: { type: Number },
    amenityId: Number,
    amenityName: String,
    residentName: String,
    phone: String,
    bookingType: { type: String, enum: ["day", "night"], required: true },
    reservationType: { type: String, enum: ["public", "private"], required: true },
    date: String,
    paxCount: { type: Number, default: 1 },
    downpayment: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "approved", "declined"], required: true },
    notes: String,
    userEmail: String,
    approvedAt: String,
    gcashRef: String,
    receiptPath: String,
  } as any,
  { timestamps: true }
);

const duesSchema = new Schema<DuesType>(
  {
    _id: { type: Number },
    residentId: { type: Number, index: true },
    residentName: { type: String, required: true, index: true },
    blockNo: String,
    lotNo: String,
    dueMonth: { type: String, required: true, index: true },
    dueDate: String,
    amountDue: { type: Number, default: 100 },
    amountPaid: { type: Number, default: 0 },
    paidAt: String,
    creditBalance: { type: Number, default: 0 },
    status: { type: String, enum: ["paid", "unpaid", "delayed", "advance", "on_time"], required: true },
    source: { type: String, enum: ["imported", "system", "manual"], default: "system" },
    billingMonth: String,
    billingYear: Number,
  } as any,
  { timestamps: true }
);

duesSchema.index({ residentName: 1, dueMonth: 1 }, { unique: false });

const transactionSchema = new Schema<TransactionType>(
  {
    _id: { type: Number },
    residentName: String,
    refType: { type: String, enum: ["amenity", "dues", "listing"] },
    refId: Number,
    userEmail: String,
    amount: Number,
    paymentMethod: { type: String, enum: ["cash", "gcash"], default: "gcash" },
    gcashRef: String,
    receiptPath: String,
    status: { type: String, enum: ["approved", "pending", "voided"], required: true },
    createdAt: String,
    payment: {
      provider: { type: String, default: "gcash" },
      intentId: String,
      qrPayload: String,
      status: { type: String, enum: ["awaiting_payment", "paid", "expired", "failed"], default: "awaiting_payment" },
      paidAt: String,
      gcashRef: String,
    },
  } as any,
  { timestamps: true }
);

const propertyViewingSchema = new Schema<PropertyViewingType>(
  {
    _id: { type: Number },
    listingId: { type: Number, required: true, index: true },
    listingName: { type: String, required: true },
    residentName: { type: String, required: true },
    residentEmail: { type: String, required: true, index: true },
    preferredDate: { type: String, required: true },
    preferredTime: { type: String, required: true },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["viewing_requested", "viewing_scheduled", "viewing_completed", "viewing_declined"],
      default: "viewing_requested",
      required: true,
    },
    adminNotes: { type: String, default: "" },
    scheduledAt: { type: String, default: null },
  } as any,
  { timestamps: true }
);

// Clear cached models in dev if schema path for transactionStatus is missing
if (models.Listing && !(models.Listing.schema as any).path("transactionStatus")) delete (models as any).Listing;
if (models.Amenity && !(models.Amenity.schema as any).path("isArchived")) delete (models as any).Amenity;
if (models.User && !(models.User.schema as any).path("isArchived")) delete (models as any).User;

export const Listing = (models.Listing as mongoose.Model<HouseListing>) || model<HouseListing>("Listing", listingSchema);
export const Amenity = (models.Amenity as mongoose.Model<AmenityType>) || model<AmenityType>("Amenity", amenitySchema);
export const Announcement = (models.Announcement as mongoose.Model<AnnouncementType>) || model<AnnouncementType>("Announcement", announcementSchema);
export const User = (models.User as mongoose.Model<UserType>) || model<UserType>("User", userSchema);
export const Reservation = (models.Reservation as mongoose.Model<ReservationType>) || model<ReservationType>("Reservation", reservationSchema);
export const DuesRecord = (models.DuesRecord as mongoose.Model<DuesType>) || model<DuesType>("DuesRecord", duesSchema);
export const Transaction = (models.Transaction as mongoose.Model<TransactionType>) || model<TransactionType>("Transaction", transactionSchema);
export const PropertyViewing = (models.PropertyViewing as mongoose.Model<PropertyViewingType>) || model<PropertyViewingType>("PropertyViewing", propertyViewingSchema);
