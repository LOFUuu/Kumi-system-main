import dbConnect from "./mongoose";
import {
  Listing,
  Amenity,
  Announcement,
  User,
  Reservation,
  DuesRecord,
  Transaction,
} from "../models";
import type {
  HouseListing,
  Amenity as AmenityType,
  Announcement as AnnouncementType,
  User as UserType,
  Reservation as ReservationType,
  DuesRecord as DuesType,
  Transaction as TransactionType,
} from "./mock-data";

// Convert a Mongoose doc (lean) to a plain object that matches the existing
// app interfaces: expose the numeric _id we seeded as `id` and drop internals
// plus credentials/security fields so they never leak to the client.
function serialize<T>(doc: any): T {
  if (doc == null) return doc;
  const { _id, __v, createdAt, updatedAt, password, passwordHash, resetToken, resetTokenExpiry, emailVerified, verificationToken, verificationTokenExpiry, ...rest } = doc;
  return { ...rest, id: _id } as T;
}

// Auth-flavored serializer: keeps passwordHash + reset/verification fields for
// the server-side login / password-reset / email-verification flows.
export interface AuthUser extends UserType {
  passwordHash?: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
  emailVerified?: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
}

function serializeAuth(doc: any): AuthUser {
  if (doc == null) return doc;
  const { _id, __v, createdAt, updatedAt, ...rest } = doc;
  return { ...rest, id: _id } as AuthUser;
}

export async function getListings(filter?: {
  status?: HouseListing["status"];
  verificationStatus?: HouseListing["verificationStatus"];
}): Promise<HouseListing[]> {
  await dbConnect();
  const query: Record<string, unknown> = {};
  if (filter?.status) query.status = filter.status;
  if (filter?.verificationStatus) {
    if (filter.verificationStatus === "verified") {
      // Matches explicitly verified listings and legacy database listings,
      // while strictly hiding pending and rejected listings from the public feed.
      query.verificationStatus = { $nin: ["pending", "rejected"] };
    } else {
      query.verificationStatus = filter.verificationStatus;
    }
  }
  const docs = await Listing.find(query).lean();
  return docs.map((d) => serialize<HouseListing>(d));
}

export async function getListing(id: number | string): Promise<HouseListing | null> {
  await dbConnect();
  const doc = await Listing.findOne({ _id: Number(id) } as any).lean();
  return doc ? serialize<HouseListing>(doc) : null;
}

export async function getListingsByOwner(uploadedBy: number): Promise<HouseListing[]> {
  await dbConnect();
  const docs = await Listing.find({ uploadedBy } as any).lean();
  return docs.map((d) => serialize<HouseListing>(d));
}


export async function getAmenities(): Promise<AmenityType[]> {
  await dbConnect();
  const docs = await Amenity.find({ $or: [{ isArchived: false }, { isArchived: { $exists: false } }] }).lean();
  return docs.map((d) => serialize<AmenityType>(d));
}

export async function getArchivedAmenities(): Promise<AmenityType[]> {
  await dbConnect();
  const docs = await Amenity.find({ isArchived: true }).lean();
  return docs.map((d) => serialize<AmenityType>(d));
}

export async function getAmenity(id: number | string): Promise<AmenityType | null> {
  await dbConnect();
  const doc = await Amenity.findOne({ _id: Number(id) } as any);
  return doc ? serialize<AmenityType>(doc.toObject()) : null;
}

export async function createAmenity(data: Partial<AmenityType>): Promise<AmenityType> {
  await dbConnect();
  const id = await getNextId(Amenity);
  const doc = (await Amenity.create({
    _id: id,
    name: data.name ?? "New Amenity",
    description: data.description ?? "",
    maxCapacity: Number(data.maxCapacity) || 50,
    rateWalkin: Number(data.rateWalkin) || 0,
    rateWhole: Number(data.rateWhole) || 0,
    ratePrivate: Number(data.ratePrivate) || 0,
    downpayment: Number(data.downpayment) || 200,
    downpaymentPrivate: Number(data.downpaymentPrivate) || 500,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    image: data.image || "https://picsum.photos/seed/amenity/800/600",
    lat: Number(data.lat) || 14.303,
    lng: Number(data.lng) || 120.988,
  } as any)) as any;
  const plain = doc?.toObject ? doc.toObject() : doc;
  return serialize<AmenityType>(plain);
}

export async function updateAmenity(
  id: number | string,
  data: Partial<AmenityType>
): Promise<AmenityType | null> {
  await dbConnect();
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  if (data.maxCapacity !== undefined) update.maxCapacity = Number(data.maxCapacity);
  if (data.rateWalkin !== undefined) update.rateWalkin = Number(data.rateWalkin);
  if (data.rateWhole !== undefined) update.rateWhole = Number(data.rateWhole);
  if (data.ratePrivate !== undefined) update.ratePrivate = Number(data.ratePrivate);
  if (data.downpayment !== undefined) update.downpayment = Number(data.downpayment);
  if (data.downpaymentPrivate !== undefined) update.downpaymentPrivate = Number(data.downpaymentPrivate);
  if (data.isActive !== undefined) update.isActive = Boolean(data.isActive);
  if (data.image !== undefined) update.image = data.image;
  if (data.lat !== undefined) update.lat = Number(data.lat);
  if (data.lng !== undefined) update.lng = Number(data.lng);

  const doc = await Amenity.findOneAndUpdate(
    { _id: Number(id) } as any,
    { $set: update },
    { new: true }
  ).lean();
  return doc ? serialize<AmenityType>(doc) : null;
}

export async function deleteAmenity(id: number | string): Promise<boolean> {
  await dbConnect();
  const res = await Amenity.deleteOne({ _id: Number(id) } as any);
  return res.deletedCount > 0;
}

export async function archiveAmenity(id: number | string): Promise<boolean> {
  await dbConnect();
  const res = await Amenity.updateOne({ _id: Number(id) } as any, { $set: { isArchived: true } });
  return res.modifiedCount > 0;
}

export async function unarchiveAmenity(id: number | string): Promise<boolean> {
  await dbConnect();
  const res = await Amenity.updateOne({ _id: Number(id) } as any, { $set: { isArchived: false } });
  return res.modifiedCount > 0;
}

// Compute the set of dates that are already blocked for an amenity.
// - A private approved reservation blocks the entire day.
// - A public approved reservation blocks the day once booked pax >= capacity.
export async function getBlockedDates(amenityId: number): Promise<string[]> {
  await dbConnect();

  const [privateDates, publicGroups, amenity] = await Promise.all([
    Reservation.find({ amenityId, reservationType: "private", status: "approved" })
      .distinct("date"),
    Reservation.aggregate<{ _id: string; pax: number }>([
      { $match: { amenityId, reservationType: "public", status: "approved" } },
      { $group: { _id: "$date", pax: { $sum: "$paxCount" } } },
    ]),
    Amenity.findOne({ _id: Number(amenityId) } as any),
  ]);

  const capacity = amenity?.maxCapacity ?? 0;
  const publicFull = publicGroups
    .filter((g) => g._id && g.pax >= capacity)
    .map((g) => g._id);

  return Array.from(new Set([...privateDates, ...publicFull])).filter(Boolean);
}

// True if `date` is available for a new public booking with the given pax.
export async function isDateAvailableForPublic(
  amenityId: number,
  date: string,
  pax: number
): Promise<boolean> {
  await dbConnect();
  const blocked = await getBlockedDates(amenityId);
  if (blocked.includes(date)) return false;

  const [amenity, approvedPaxDoc] = await Promise.all([
    Amenity.findOne({ _id: Number(amenityId) } as any),
    Reservation.aggregate<{ pax: number }>([
      { $match: { amenityId, reservationType: "public", status: "approved", date } },
      { $group: { _id: null, pax: { $sum: "$paxCount" } } },
    ]),
  ]);
  const used = approvedPaxDoc[0]?.pax ?? 0;
  return used + Math.max(1, pax) <= (amenity?.maxCapacity ?? 0);
}

export async function getNextId(collection: any): Promise<number> {
  await dbConnect();
  const max = await collection.findOne().sort({ _id: -1 }).select({ _id: 1 }).lean();
  return (max?._id ?? 0) + 1;
}

export async function getAnnouncements(activeOnly = false): Promise<AnnouncementType[]> {
  await dbConnect();
  const filter: Record<string, string> = {};
  if (activeOnly) filter.status = "active";
  const docs = await Announcement.find(filter as any).lean();
  return docs.map((d) => serialize<AnnouncementType>(d));
}

export async function getUsers(): Promise<UserType[]> {
  await dbConnect();
  const docs = await User.find()
    .select("-password -passwordHash -resetToken -resetTokenExpiry -verificationToken -verificationTokenExpiry")
    .lean();
  return docs.map((d: any) => ({
    ...serialize<UserType>(d),
    emailVerified: d.emailVerified,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
  }));
}

// Full user lookup (incl. password/reset fields) for server-side auth only.
export async function getUserByEmailForAuth(email: string): Promise<AuthUser | null> {
  await dbConnect();
  const doc = await User.findOne({ email: email.toLowerCase() }).lean();
  return serializeAuth(doc);
}

export async function savePasswordResetToken(
  email: string,
  tokenHash: string,
  expiry: Date
): Promise<void> {
  await dbConnect();
  await User.updateOne(
    { email: email.toLowerCase() },
    { $set: { resetToken: tokenHash, resetTokenExpiry: expiry } }
  );
}

export async function clearPasswordResetToken(email: string): Promise<void> {
  await dbConnect();
  await User.updateOne(
    { email: email.toLowerCase() },
    { $set: { resetToken: null, resetTokenExpiry: null } }
  );
}

export async function setUserPassword(email: string, passwordHash: string): Promise<void> {
  await dbConnect();
  await User.updateOne(
    { email: email.toLowerCase() },
    { $set: { passwordHash, resetToken: null, resetTokenExpiry: null } }
  );
}

export async function saveVerificationToken(
  email: string,
  tokenHash: string,
  expiry: Date
): Promise<void> {
  await dbConnect();
  await User.updateOne(
    { email: email.toLowerCase() },
    { $set: { verificationToken: tokenHash, verificationTokenExpiry: expiry } }
  );
}

export async function clearVerificationToken(email: string): Promise<void> {
  await dbConnect();
  await User.updateOne(
    { email: email.toLowerCase() },
    { $set: { verificationToken: null, verificationTokenExpiry: null } }
  );
}

export async function setEmailVerified(email: string, verified = true): Promise<void> {
  await dbConnect();
  await User.updateOne(
    { email: email.toLowerCase() },
    {
      $set: {
        emailVerified: verified,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    }
  );
}

export async function deleteUserById(id: number): Promise<void> {
  await dbConnect();
  await User.deleteOne({ _id: id });
}

export async function createUser(data: {
  fullName: string;
  email: string;
  role: UserType["role"];
  address?: string;
  blockNo?: string;
  lotNo?: string;
  phone?: string;
  cedula?: string;
  passwordHash?: string;
  emailVerified?: boolean;
}): Promise<UserType> {
  await dbConnect();
  const id = await getNextId(User);
  const doc = await User.create({
    _id: id,
    fullName: data.fullName,
    email: data.email,
    role: data.role,
    isActive: true,
    address: data.address || undefined,
    blockNo: data.blockNo || undefined,
    lotNo: data.lotNo || undefined,
    phone: data.phone || undefined,
    cedula: data.cedula || undefined,
    passwordHash: data.passwordHash || undefined,
    emailVerified: data.emailVerified,
  } as any);
  return serialize<UserType>(doc);
}

export async function updateUserProfile(
  email: string,
  data: {
    address?: string;
    blockNo?: string;
    lotNo?: string;
    phone?: string;
    role?: UserType["role"];
    cedula?: string;
  }
): Promise<UserType> {
  await dbConnect();
  const existing = await User.findOne({ email }).lean();

  if (!existing) {
    const id = await getNextId(User);
    const doc = await User.create({
      _id: id,
      fullName: email.split("@")[0] || "Resident",
      email,
      role: data.role ?? "resident",
      isActive: true,
      address: data.address,
      blockNo: data.blockNo,
      lotNo: data.lotNo,
      phone: data.phone,
      cedula: data.cedula,
    } as any);
    return serialize<UserType>(doc);
  }

  const update: Record<string, unknown> = {};
  if (data.address !== undefined) update.address = data.address || null;
  if (data.blockNo !== undefined) update.blockNo = data.blockNo || null;
  if (data.lotNo !== undefined) update.lotNo = data.lotNo || null;
  if (data.phone !== undefined) update.phone = data.phone || null;
  if (data.role !== undefined) update.role = data.role;
  if (data.cedula !== undefined) update.cedula = data.cedula || null;

  const doc = await User.findOneAndUpdate({ email }, update as any, { new: true }).lean();
  return serialize<UserType>(doc);
}

export async function updateUserById(
  id: number | string,
  data: Partial<UserType>
): Promise<UserType | null> {
  await dbConnect();
  const update: Record<string, unknown> = {};
  if (data.fullName !== undefined) update.fullName = data.fullName;
  if (data.email !== undefined) update.email = data.email.toLowerCase().trim();
  if (data.role !== undefined) update.role = data.role;
  if (data.isActive !== undefined) update.isActive = Boolean(data.isActive);
  if (data.address !== undefined) update.address = data.address || null;
  if (data.blockNo !== undefined) update.blockNo = data.blockNo || null;
  if (data.lotNo !== undefined) update.lotNo = data.lotNo || null;
  if (data.phone !== undefined) update.phone = data.phone || null;
  if (data.gender !== undefined) update.gender = data.gender || null;
  if (data.householdMembers !== undefined) update.householdMembers = Number(data.householdMembers) || 1;
  if (data.householdHead !== undefined) update.householdHead = data.householdHead || null;
  if (data.cedula !== undefined) update.cedula = data.cedula || null;
  if (data.emailVerified !== undefined) update.emailVerified = Boolean(data.emailVerified);

  const doc = await User.findOneAndUpdate(
    { _id: Number(id) } as any,
    { $set: update },
    { new: true }
  ).lean();
  return doc
    ? {
        ...serialize<UserType>(doc),
        emailVerified: (doc as any).emailVerified,
        createdAt: (doc as any).createdAt ? new Date((doc as any).createdAt).toISOString() : undefined,
      }
    : null;
}

// Master index of registered home/unit lots (blockNo + lotNo) drawn from the
// resident registry. Listings must reference a unit in this index rather than
// a free-form name, per the HOA governance model.
export async function getMasterIndex(): Promise<{ blockNo: string; lotNo: string }[]> {
  await dbConnect();
  const docs = await User.find({
    blockNo: { $exists: true, $ne: "" },
    lotNo: { $exists: true, $ne: "" },
  } as any)
    .select({ blockNo: 1, lotNo: 1, _id: 0 })
    .lean();
  const seen = new Set<string>();
  const units: { blockNo: string; lotNo: string }[] = [];
  for (const d of docs as any[]) {
    const key = `${String(d.blockNo)}|${String(d.lotNo)}`;
    if (!seen.has(key)) {
      seen.add(key);
      units.push({ blockNo: String(d.blockNo), lotNo: String(d.lotNo) });
    }
  }
  return units;
}

export async function getReservations(): Promise<ReservationType[]> {
  await dbConnect();
  const docs = await Reservation.find().lean();
  return docs.map((d) => serialize<ReservationType>(d));
}

export async function getDues(): Promise<DuesType[]> {
  await dbConnect();
  const docs = await DuesRecord.find().lean();
  return docs.map((d) => serialize<DuesType>(d));
}

export async function getDuesRecord(id: number | string): Promise<DuesType | null> {
  await dbConnect();
  const doc = await DuesRecord.findOne({ _id: Number(id) } as any).lean();
  return doc ? serialize<DuesType>(doc) : null;
}

export async function getTransactions(): Promise<TransactionType[]> {
  await dbConnect();
  const docs = await Transaction.find().lean();
  return docs.map((d) => serialize<TransactionType>(d));
}

export async function getTransactionById(id: number | string): Promise<TransactionType | null> {
  await dbConnect();
  const doc = await Transaction.findOne({ _id: Number(id) } as any).lean();
  return doc ? serialize<TransactionType>(doc) : null;
}

export async function getPaymentByIntent(intentId: string): Promise<TransactionType | null> {
  await dbConnect();
  const doc = await Transaction.findOne({ "payment.intentId": intentId } as any).lean();
  return doc ? serialize<TransactionType>(doc) : null;
}

export async function updateTransactionById(
  id: number | string,
  patch: Partial<Pick<TransactionType, "status" | "receiptPath">>
): Promise<TransactionType | null> {
  await dbConnect();
  const doc = await Transaction.findOneAndUpdate(
    { _id: Number(id) } as any,
    { $set: patch },
    { new: true }
  ).lean();
  return doc ? serialize<TransactionType>(doc) : null;
}
