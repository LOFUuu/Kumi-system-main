import mongoose from "mongoose";
import dbConnect from "./mongoose";
import {
  Listing,
  Amenity,
  Announcement,
  User,
  Reservation,
  DuesRecord,
  Transaction,
  PropertyViewing,
  PaymentConfig,
} from "../models";
import { isOnlineMode } from "./db-router";
import * as maria from "./mariadb-service";
import { mariaQuery } from "./mariadb";
import type {
  HouseListing,
  Amenity as AmenityType,
  Announcement as AnnouncementType,
  User as UserType,
  Reservation as ReservationType,
  DuesRecord as DuesType,
  Transaction as TransactionType,
  PropertyViewing as PropertyViewingType,
  PaymentConfig as PaymentConfigType,
} from "./mock-data";
import {
  DEFAULT_MONTHLY_DUE,
  getCurrentDueMonth,
  getCycleDueDate,
  prevDueMonth,
  computeDuesStatus,
  creditFor,
  MONTH_NAMES,
} from "./dues";

function normalizeImages(imgs: any): string[] {
  if (!imgs) return [];
  const list = Array.isArray(imgs) ? imgs : typeof imgs === "string" ? [imgs] : [];
  const result: string[] = [];
  for (let i = 0; i < list.length; i++) {
    const curr = String(list[i] || "").trim();
    if (!curr) continue;
    if (/^data:image\/[a-zA-Z]+;base64$/i.test(curr) && i + 1 < list.length) {
      result.push(curr + "," + String(list[i + 1]).trim());
      i++;
    } else {
      result.push(curr);
    }
  }
  return result;
}

function serialize<T>(doc: any): T {
  if (doc == null) return doc;
  const { _id, __v, createdAt, updatedAt, password, passwordHash, resetToken, resetTokenExpiry, emailVerified, verificationToken, verificationTokenExpiry, ...rest } = doc;
  if (rest.images) {
    rest.images = normalizeImages(rest.images);
  }
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
  includeArchived?: boolean;
  isArchived?: boolean;
}): Promise<HouseListing[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const query: Record<string, unknown> = {};

      if (filter?.isArchived !== undefined) {
        query.isArchived = filter.isArchived;
      } else if (!filter?.includeArchived) {
        query.$or = [{ isArchived: false }, { isArchived: { $exists: false } }];
      }

      if (filter?.status) query.status = filter.status;
      if (filter?.verificationStatus) {
        if (filter.verificationStatus === "verified") {
          query.verificationStatus = { $nin: ["pending", "rejected"] };
        } else {
          query.verificationStatus = filter.verificationStatus;
        }
      }
      const docs = await Listing.find(query).sort({ createdAt: -1, _id: -1 }).lean();
      return docs.map((d: any) => ({
        ...serialize<HouseListing>(d),
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
      }));
    } catch (e) {
      // fallback to offline
    }
  }
  return maria.getListingsMariaDB(filter);
}

export async function getArchivedListings(): Promise<HouseListing[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const docs = await Listing.find({
        $or: [{ isArchived: true }, { isArchived: "true" }, { isArchived: 1 }],
      } as any)
        .sort({ updatedAt: -1, _id: -1 })
        .lean();
      return docs.map((d: any) => ({
        ...serialize<HouseListing>(d),
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
      }));
    } catch (e) {}
  }
  return maria.getListingsMariaDB({ isArchived: true });
}

export async function archiveListing(
  id: number | string,
  reason?: string,
  archivedBy: "owner" | "admin" = "admin"
): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const numId = Number(id);
      const filter = Number.isFinite(numId)
        ? { $or: [{ _id: numId }, { _id: String(id) }, { id: numId }] }
        : { _id: id };
      const res = await Listing.updateOne(
        filter as any,
        {
          $set: {
            isArchived: true,
            archiveReason: reason || (archivedBy === "owner" ? "Archived by Owner" : "Archived by Admin"),
            archivedBy,
            archivedAt: new Date().toISOString(),
          },
        }
      );
      maria.updateListingMariaDB(id, {
        isArchived: true,
        archiveReason: reason || (archivedBy === "owner" ? "Archived by Owner" : "Archived by Admin"),
        archivedBy,
      }).catch(() => {});
      return res.matchedCount > 0 || res.modifiedCount > 0;
    } catch (e) {}
  }
  const updated = await maria.updateListingMariaDB(id, {
    isArchived: true,
    archiveReason: reason || (archivedBy === "owner" ? "Archived by Owner" : "Archived by Admin"),
    archivedBy,
  });
  return Boolean(updated);
}

export async function unarchiveListing(id: number | string): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const numId = Number(id);
      const filter = Number.isFinite(numId)
        ? { $or: [{ _id: numId }, { _id: String(id) }, { id: numId }] }
        : { _id: id };
      const res = await Listing.updateOne(
        filter as any,
        {
          $set: {
            isArchived: false,
            archiveReason: null,
            archivedAt: null,
          },
        }
      );
      maria.updateListingMariaDB(id, { isArchived: false, archiveReason: null }).catch(() => {});
      return res.matchedCount > 0 || res.modifiedCount > 0;
    } catch (e) {}
  }
  const updated = await maria.updateListingMariaDB(id, { isArchived: false, archiveReason: null });
  return Boolean(updated);
}

export async function getListing(id: number | string): Promise<HouseListing | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const numId = Number(id);
      const filter = Number.isFinite(numId)
        ? { $or: [{ _id: numId }, { _id: String(id) }, { id: numId }] }
        : { _id: id };
      const doc = await Listing.findOne(filter as any).lean();
      if (doc) {
        return {
          ...serialize<HouseListing>(doc),
          createdAt: (doc as any).createdAt ? new Date((doc as any).createdAt).toISOString() : undefined,
        };
      }
    } catch (e) {}
  }
  return maria.getListingMariaDB(id);
}

export async function createListing(data: any): Promise<HouseListing> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const id = data._id || data.id || (await getNextId(Listing));
      const created = await Listing.create({ ...data, _id: id });
      const plain = (created as any)?.toObject ? (created as any).toObject() : created;
      const res = serialize<HouseListing>(plain);
      maria.createListingMariaDB({ ...res, id: res.id || id }).catch(() => {});
      return res;
    } catch (e) {}
  }
  return maria.createListingMariaDB(data);
}

export async function updateListing(id: number | string, data: any): Promise<HouseListing | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const numId = Number(id);
      const doc = await Listing.findOneAndUpdate({ _id: numId } as any, { $set: data }, { new: true }).lean();
      maria.updateListingMariaDB(id, data).catch(() => {});
      if (doc) return serialize<HouseListing>(doc);
    } catch (e) {}
  }
  return maria.updateListingMariaDB(id, data);
}

export async function deleteListing(id: number | string): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const numId = Number(id);
      await Listing.deleteOne({ _id: numId } as any);
      mariaQuery(`DELETE FROM listings WHERE id = ?`, [numId]).catch(() => {});
      return true;
    } catch (e) {}
  }
  await mariaQuery(`DELETE FROM listings WHERE id = ?`, [Number(id)]);
  return true;
}

export async function getListingsByOwner(uploadedBy: number): Promise<HouseListing[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const docs = await Listing.find({ uploadedBy, $or: [{ isArchived: false }, { isArchived: { $exists: false } }] } as any)
        .sort({ createdAt: -1, _id: -1 })
        .lean();
      return docs.map((d: any) => ({
        ...serialize<HouseListing>(d),
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
      }));
    } catch (e) {}
  }
  return maria.getListingsMariaDB({ status: undefined }).then(l => l.filter(x => x.uploadedBy === uploadedBy));
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

  const nonArchived = {
    $or: [
      { isArchived: false },
      { isArchived: "false" },
      { isArchived: 0 },
      { isArchived: { $exists: false } },
    ],
  };

  const [approvedDates, publicGroups, amenity] = await Promise.all([
    Reservation.find({ amenityId, reservationType: "private", status: "approved", ...nonArchived } as any)
      .distinct("date"),
    Reservation.aggregate<{ _id: string; pax: number }>([
      { $match: { amenityId, reservationType: "public", status: "approved", ...nonArchived } },
      { $group: { _id: "$date", pax: { $sum: "$paxCount" } } },
    ]),
    Amenity.findOne({ _id: Number(amenityId) } as any),
  ]);

  const capacity = amenity?.maxCapacity ?? 0;
  const publicFull = publicGroups
    .filter((g) => g._id && g.pax >= capacity)
    .map((g) => g._id);

  return Array.from(new Set([...approvedDates, ...publicFull])).filter(Boolean);
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

  const nonArchived = {
    $or: [
      { isArchived: false },
      { isArchived: "false" },
      { isArchived: 0 },
      { isArchived: { $exists: false } },
    ],
  };

  const [amenity, approvedPaxDoc] = await Promise.all([
    Amenity.findOne({ _id: Number(amenityId) } as any),
    Reservation.aggregate<{ pax: number }>([
      { $match: { amenityId, reservationType: "public", status: "approved", date, ...nonArchived } },
      { $group: { _id: null, pax: { $sum: "$paxCount" } } },
    ]),
  ]);
  const used = approvedPaxDoc[0]?.pax ?? 0;
  return used + Math.max(1, pax) <= (amenity?.maxCapacity ?? 0);
}

export async function getNextId(collection: any): Promise<number> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const max = await collection.findOne().sort({ _id: -1 }).select({ _id: 1 }).lean();
      return (max?._id ?? 0) + 1;
    } catch {
      // fallback to MariaDB
    }
  }
  const name = String(collection?.modelName || "").toLowerCase();
  const tableMap: Record<string, string> = {
    listing: "listings",
    amenity: "amenities",
    announcement: "announcements",
    user: "users",
    reservation: "reservations",
    duesrecord: "dues",
    transaction: "transactions",
    propertyviewing: "property_viewings",
  };
  const table = tableMap[name] || "listings";
  const rows = await mariaQuery<any[]>(`SELECT MAX(id) as maxId FROM \`${table}\``);
  return (rows[0]?.maxId || 0) + 1;
}

export async function getAnnouncements(activeOnly = false): Promise<AnnouncementType[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const filter: Record<string, string> = {};
      if (activeOnly) filter.status = "active";
      const docs = await Announcement.find(filter as any).lean();
      return docs.map((d) => serialize<AnnouncementType>(d));
    } catch (e) {}
  }
  return maria.getAnnouncementsMariaDB(activeOnly);
}

function userFilter(id: number | string) {
  const numId = Number(id);
  const conditions: any[] = [];
  if (Number.isFinite(numId)) {
    conditions.push({ _id: numId });
    conditions.push({ id: numId });
  }
  conditions.push({ _id: String(id) });
  conditions.push({ id: String(id) });
  if (typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)) {
    try {
      conditions.push({ _id: new mongoose.Types.ObjectId(id) });
    } catch {
      // Ignore if invalid
    }
  }
  return { $or: conditions };
}

export async function getUsers(): Promise<UserType[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const docs = await User.find({
        $or: [{ isArchived: false }, { isArchived: "false" }, { isArchived: 0 }, { isArchived: { $exists: false } }],
      } as any)
        .select("-password -passwordHash -resetToken -resetTokenExpiry -verificationToken -verificationTokenExpiry")
        .lean();
      return docs.map((d: any) => ({
        ...serialize<UserType>(d),
        emailVerified: d.emailVerified,
        isArchived: d.isArchived === true || d.isArchived === "true" || d.isArchived === 1,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
      }));
    } catch (e) {}
  }
  return maria.getUsersMariaDB();
}

export async function getArchivedUsers(): Promise<UserType[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const docs = await User.find({
        $or: [{ isArchived: true }, { isArchived: "true" }, { isArchived: 1 }],
      } as any)
        .select("-password -passwordHash -resetToken -resetTokenExpiry -verificationToken -verificationTokenExpiry")
        .sort({ updatedAt: -1, _id: -1 })
        .lean();
      return docs.map((d: any) => ({
        ...serialize<UserType>(d),
        emailVerified: d.emailVerified,
        isArchived: true,
        archiveReason: d.archiveReason ?? null,
        archivedAt: d.archivedAt ?? null,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
      }));
    } catch (e) {}
  }
  return maria.getArchivedUsersMariaDB();
}

export async function archiveUser(id: number | string, reason?: string): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const filter = userFilter(id);
      const res = await User.updateOne(
        filter as any,
        {
          $set: {
            isArchived: true,
            archiveReason: reason || "Archived by Admin",
            archivedAt: new Date().toISOString(),
            isActive: false,
          },
        },
        { strict: false }
      );
      maria.archiveUserMariaDB(id, reason).catch(() => {});
      return res.matchedCount > 0 || res.modifiedCount > 0;
    } catch (e) {}
  }
  return maria.archiveUserMariaDB(id, reason);
}

export async function unarchiveUser(id: number | string): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const filter = userFilter(id);
      const res = await User.updateOne(
        filter as any,
        {
          $set: {
            isArchived: false,
            archiveReason: null,
            archivedAt: null,
            isActive: true,
          },
        },
        { strict: false }
      );
      maria.unarchiveUserMariaDB(id).catch(() => {});
      return res.matchedCount > 0 || res.modifiedCount > 0;
    } catch (e) {}
  }
  return maria.unarchiveUserMariaDB(id);
}

// Full user lookup (incl. password/reset fields) for server-side auth only.
export async function getUserByEmailForAuth(email: string): Promise<AuthUser | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const doc = await User.findOne({ email: email.toLowerCase() }).lean();
      if (doc) return serializeAuth(doc);
    } catch (e) {}
  }
  return maria.getUserByEmailForAuthMariaDB(email);
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

export async function deleteUserById(id: number | string): Promise<void> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const filter = userFilter(id);
      await User.deleteOne(filter as any);
      maria.deleteUserByIdMariaDB(id).catch(() => {});
      return;
    } catch (e) {}
  }
  await maria.deleteUserByIdMariaDB(id);
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
  const online = await isOnlineMode();
  if (online) {
    try {
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
      const res = serialize<UserType>(doc);
      maria.createUserMariaDB({ ...data, id }).catch(() => {});
      return res;
    } catch (e) {}
  }
  return maria.createUserMariaDB(data);
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
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const update: Record<string, unknown> = {};
      if (data.fullName !== undefined) update.fullName = data.fullName;
      if (data.email !== undefined) update.email = data.email.toLowerCase().trim();
      if (data.role !== undefined) update.role = data.role;
      if (data.isActive !== undefined) update.isActive = Boolean(data.isActive);
      if (data.isArchived !== undefined) update.isArchived = Boolean(data.isArchived);
      if (data.archiveReason !== undefined) update.archiveReason = data.archiveReason;
      if (data.archivedAt !== undefined) update.archivedAt = data.archivedAt;
      if (data.address !== undefined) update.address = data.address || null;
      if (data.blockNo !== undefined) update.blockNo = data.blockNo || null;
      if (data.lotNo !== undefined) update.lotNo = data.lotNo || null;
      if (data.phone !== undefined) update.phone = data.phone || null;
      if (data.gender !== undefined) update.gender = data.gender || null;
      if (data.householdMembers !== undefined) update.householdMembers = Number(data.householdMembers) || 1;
      if (data.householdHead !== undefined) update.householdHead = data.householdHead || null;
      if (data.cedula !== undefined) update.cedula = data.cedula || null;
      if (data.emailVerified !== undefined) update.emailVerified = Boolean(data.emailVerified);

      const filter = userFilter(id);
      const doc = await User.findOneAndUpdate(
        filter as any,
        { $set: update },
        { new: true }
      ).lean();
      maria.updateUserByIdMariaDB(id, data).catch(() => {});
      if (doc) {
        return {
          ...serialize<UserType>(doc),
          emailVerified: (doc as any).emailVerified,
          createdAt: (doc as any).createdAt ? new Date((doc as any).createdAt).toISOString() : undefined,
        };
      }
    } catch (e) {}
  }
  return maria.updateUserByIdMariaDB(id, data);
}

// Master index of registered home/unit lots (blockNo + lotNo) drawn from the
// resident registry. Listings must reference a unit in this index rather than
// a free-form name, per the HOA governance model.
export async function getMasterIndex(): Promise<{ blockNo: string; lotNo: string }[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
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
    } catch (e) {}
  }
  const users = await maria.getUsersMariaDB();
  const seen = new Set<string>();
  const units: { blockNo: string; lotNo: string }[] = [];
  for (const u of users) {
    if (u.blockNo && u.lotNo) {
      const key = `${u.blockNo}|${u.lotNo}`;
      if (!seen.has(key)) {
        seen.add(key);
        units.push({ blockNo: u.blockNo, lotNo: u.lotNo });
      }
    }
  }
  return units;
}

export async function getReservations(includeArchived = false): Promise<ReservationType[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const filter = includeArchived
        ? {}
        : {
            $or: [
              { isArchived: false },
              { isArchived: "false" },
              { isArchived: 0 },
              { isArchived: { $exists: false } },
            ],
          };
      const docs = await Reservation.find(filter as any).sort({ _id: -1 }).lean();
      return docs.map((d) => serialize<ReservationType>(d));
    } catch (e) {}
  }
  return maria.getReservationsMariaDB();
}

export async function getArchivedReservations(): Promise<ReservationType[]> {
  await dbConnect();
  const docs = await Reservation.find({
    $or: [{ isArchived: true }, { isArchived: "true" }, { isArchived: 1 }],
  } as any)
    .sort({ archivedAt: -1, _id: -1 })
    .lean();
  return docs.map((d) => serialize<ReservationType>(d));
}

export async function archiveReservation(
  id: number | string,
  reason?: string
): Promise<ReservationType | null> {
  await dbConnect();
  const resId = Number(id);
  const now = new Date().toISOString();
  const doc = await Reservation.findOneAndUpdate(
    { _id: resId } as any,
    {
      $set: {
        isArchived: true,
        archivedAt: now,
        archiveReason: reason || "Archived by Administrator",
      },
    },
    { new: true }
  ).lean();
  return doc ? serialize<ReservationType>(doc) : null;
}

export async function unarchiveReservation(
  id: number | string
): Promise<{ ok: boolean; error?: string; reservation?: ReservationType }> {
  await dbConnect();
  const resId = Number(id);
  const reservation = await Reservation.findOne({ _id: resId } as any);
  if (!reservation) {
    return { ok: false, error: "Reservation not found." };
  }

  // If the reservation was previously approved, check for slot conflicts before restoring!
  if (reservation.status === "approved") {
    const nonArchived = {
      $or: [
        { isArchived: false },
        { isArchived: "false" },
        { isArchived: 0 },
        { isArchived: { $exists: false } },
      ],
    };

    let conflictQuery: any = {
      _id: { $ne: resId },
      amenityId: reservation.amenityId,
      date: reservation.date,
      status: "approved",
      ...nonArchived,
    };

    if (reservation.reservationType !== "private") {
      conflictQuery = {
        _id: { $ne: resId },
        amenityId: reservation.amenityId,
        date: reservation.date,
        status: "approved",
        ...nonArchived,
        $or: [
          { reservationType: "private" },
          { bookingType: reservation.bookingType },
        ],
      };
    }

    const conflict = await Reservation.findOne(conflictQuery as any);
    if (conflict) {
      return {
        ok: false,
        error: `Slot conflict: Amenity "${reservation.amenityName}" on ${reservation.date} (${reservation.bookingType} session) is already occupied by active approved reservation #${conflict._id} (${conflict.residentName}).`,
      };
    }

    if (reservation.reservationType === "public") {
      const available = await isDateAvailableForPublic(
        reservation.amenityId,
        reservation.date,
        reservation.paxCount
      );
      if (!available) {
        return {
          ok: false,
          error: `Capacity exceeded: Amenity "${reservation.amenityName}" has reached full capacity for ${reservation.date}.`,
        };
      }
    }
  }

  reservation.isArchived = false;
  reservation.archivedAt = null as any;
  reservation.archiveReason = null as any;
  await reservation.save();

  const updated = (await Reservation.findById(resId).lean()) as any;
  return { ok: true, reservation: serialize<ReservationType>(updated) };
}

export async function deleteReservation(
  id: number | string
): Promise<{ ok: boolean; error?: string }> {
  await dbConnect();
  const resId = Number(id);
  const reservation = await Reservation.findOne({ _id: resId } as any);
  if (!reservation) {
    return { ok: false, error: "Reservation not found." };
  }

  // Preserve financial audit trail by marking linked transaction status as voided
  await Transaction.updateMany(
    { refType: "amenity", refId: resId },
    { $set: { status: "voided" } }
  );

  await Reservation.deleteOne({ _id: resId } as any);
  return { ok: true };
}

export async function generateMonthlyDues(targetMonth?: string): Promise<{ createdCount: number }> {
  await dbConnect();
  const currentMonth = targetMonth || getCurrentDueMonth();
  const [yStr, mStr] = currentMonth.split("-");
  const billingYear = parseInt(yStr, 10);
  const monthNum = parseInt(mStr, 10);
  const billingMonth = MONTH_NAMES[monthNum - 1] || "Current Month";
  const dueDate = getCycleDueDate(currentMonth);

  // Find all active, non-archived residents
  const activeResidents = await User.find({
    role: { $in: ["resident", "counselor", "admin"] },
    isActive: { $ne: false },
    $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
  } as any).lean();

  let createdCount = 0;
  const previousMonth = prevDueMonth(currentMonth);

  for (const res of activeResidents as any[]) {
    // 1. Protection against duplicates: check if record already exists for this resident and month
    const existing = await DuesRecord.findOne({
      $or: [
        { residentId: res._id, dueMonth: currentMonth },
        { residentName: res.fullName, dueMonth: currentMonth },
      ],
    } as any).lean();

    if (existing) {
      continue; // Record exists, do not duplicate!
    }

    // 2. Check previous month for any carried credit
    const prevRecord = await DuesRecord.findOne({
      $or: [
        { residentId: res._id, dueMonth: previousMonth },
        { residentName: res.fullName, dueMonth: previousMonth },
      ],
    } as any)
      .sort({ _id: -1 })
      .lean();

    const carriedCredit = (prevRecord as any)?.creditBalance || 0;
    const amountDue = DEFAULT_MONTHLY_DUE;
    let amountPaid = 0;
    let paidAt: string | undefined = undefined;
    let creditBalance = 0;

    if (carriedCredit > 0) {
      amountPaid = Math.min(carriedCredit, amountDue);
      creditBalance = creditFor(amountDue, carriedCredit);
      paidAt = (prevRecord as any)?.paidAt || new Date().toISOString().slice(0, 10);
    }

    const status = computeDuesStatus({
      dueMonth: currentMonth,
      dueDate,
      amountDue,
      amountPaid,
      paidAt,
    });

    const newId = await getNextId(DuesRecord);
    await DuesRecord.create({
      _id: newId,
      residentId: res._id,
      residentName: res.fullName,
      blockNo: res.blockNo || "",
      lotNo: res.lotNo || "",
      dueMonth: currentMonth,
      dueDate,
      amountDue,
      amountPaid,
      paidAt,
      creditBalance,
      status,
      source: "system",
      billingMonth,
      billingYear,
    } as any);

    createdCount++;
  }

  return { createdCount };
}

export async function getDues(): Promise<DuesType[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      try {
        await generateMonthlyDues();
      } catch (err) {
        console.error("Error auto-generating monthly dues:", err);
      }
      const docs = await DuesRecord.find().sort({ dueMonth: -1, residentName: 1 }).lean();
      return docs.map((d) => serialize<DuesType>(d));
    } catch (e) {}
  }
  return maria.getDuesMariaDB();
}

export async function importDuesRecords(
  records: Array<{
    residentId?: number;
    residentName: string;
    blockNo?: string;
    lotNo?: string;
    billingMonth?: string;
    billingYear?: number;
    dueMonth: string;
    dueDate?: string;
    amountDue?: number;
    amountPaid?: number;
    creditBalance?: number;
    paidAt?: string;
    status?: string;
  }>
): Promise<{
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  duplicates: number;
}> {
  await dbConnect();
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let duplicates = 0;

  for (const row of records) {
    if (!row.residentName || !row.dueMonth) {
      skipped++;
      continue;
    }

    const amountDue = row.amountDue !== undefined ? Number(row.amountDue) : DEFAULT_MONTHLY_DUE;
    const amountPaid = row.amountPaid !== undefined ? Number(row.amountPaid) : 0;
    const creditBalance = row.creditBalance !== undefined ? Number(row.creditBalance) : creditFor(amountDue, amountPaid);
    const dueDate = row.dueDate || getCycleDueDate(row.dueMonth);
    const paidAt = row.paidAt || undefined;
    const status = (row.status as any) || computeDuesStatus({ dueMonth: row.dueMonth, dueDate, amountDue, amountPaid, paidAt });

    // Check if record exists
    const query: any = {
      dueMonth: row.dueMonth,
      $or: [
        { residentName: row.residentName },
        ...(row.residentId ? [{ residentId: row.residentId }] : []),
      ],
    };

    const existing = await DuesRecord.findOne(query).lean() as any;

    if (existing) {
      duplicates++;
      await DuesRecord.updateOne(
        { _id: existing._id } as any,
        {
          $set: {
            residentId: row.residentId || existing.residentId,
            residentName: row.residentName,
            blockNo: row.blockNo ?? existing.blockNo,
            lotNo: row.lotNo ?? existing.lotNo,
            amountDue,
            amountPaid,
            creditBalance,
            paidAt,
            status,
            source: "imported",
            billingMonth: row.billingMonth || existing.billingMonth,
            billingYear: row.billingYear || existing.billingYear,
          },
        } as any
      );
      updated++;
    } else {
      const newId = await getNextId(DuesRecord);
      await DuesRecord.create({
        _id: newId,
        residentId: row.residentId,
        residentName: row.residentName,
        blockNo: row.blockNo || "",
        lotNo: row.lotNo || "",
        dueMonth: row.dueMonth,
        dueDate,
        amountDue,
        amountPaid,
        paidAt,
        creditBalance,
        status,
        source: "imported",
        billingMonth: row.billingMonth,
        billingYear: row.billingYear,
      } as any);
      imported++;
    }
  }

  return {
    total: records.length,
    imported,
    updated,
    skipped,
    duplicates,
  };
}

export async function getDuesRecord(id: number | string): Promise<DuesType | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const doc = await DuesRecord.findOne({ _id: Number(id) } as any).lean();
      if (doc) return serialize<DuesType>(doc);
    } catch (e) {}
  }
  const rows = await mariaQuery<any[]>(`SELECT * FROM dues WHERE id = ? LIMIT 1`, [Number(id)]);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    residentId: r.residentId,
    residentName: r.residentName,
    blockNo: r.blockNo,
    lotNo: r.lotNo,
    dueMonth: r.dueMonth,
    dueDate: r.dueDate,
    amountDue: Number(r.amountDue),
    amountPaid: Number(r.amountPaid),
    paidAt: r.paidAt || undefined,
    creditBalance: Number(r.creditBalance),
    status: r.status,
    source: r.source,
    billingMonth: r.billingMonth || undefined,
    billingYear: r.billingYear || undefined,
  };
}

export const DEFAULT_PAYMENT_CONFIGS: Record<"amenity" | "dues", Omit<PaymentConfigType, "id">> = {
  amenity: {
    category: "amenity",
    accountName: "MABUHAY HOMES HOA",
    accountNumber: "0917 123 4567",
    qrCodeUrl: "",
    instructions: "Amount updates automatically with your reservation type, session, and pax. Send downpayment now, or upload your receipt and enter your reference number below.",
    isActive: true,
    updatedBy: "System",
  },
  dues: {
    category: "dues",
    accountName: "MABUHAY HOMES HOA",
    accountNumber: "0917 123 4567",
    qrCodeUrl: "",
    instructions: "Please send your exact monthly dues via GCash. Keep your reference number and upload your receipt screenshot for swift verification.",
    isActive: true,
    updatedBy: "System",
  },
};

export async function getPaymentConfigs(): Promise<Record<"amenity" | "dues", PaymentConfigType>> {
  await dbConnect();
  const docs = await PaymentConfig.find().lean();
  const map: Record<string, any> = {};
  for (const d of docs) {
    if (d && (d as any).category) {
      map[(d as any).category] = {
        id: String((d as any)._id),
        category: (d as any).category,
        accountName: (d as any).accountName || "MABUHAY HOMES HOA",
        accountNumber: (d as any).accountNumber || "0917 123 4567",
        qrCodeUrl: (d as any).qrCodeUrl || "",
        instructions: (d as any).instructions || "",
        isActive: (d as any).isActive !== false,
        updatedBy: (d as any).updatedBy || "System",
        updatedAt: (d as any).updatedAt ? new Date((d as any).updatedAt).toISOString() : undefined,
      };
    }
  }

  return {
    amenity: map.amenity || { ...DEFAULT_PAYMENT_CONFIGS.amenity },
    dues: map.dues || { ...DEFAULT_PAYMENT_CONFIGS.dues },
  };
}

export async function getPaymentConfig(category: "amenity" | "dues"): Promise<PaymentConfigType> {
  await dbConnect();
  const doc = await PaymentConfig.findOne({ category } as any).lean() as any;
  if (!doc) {
    const def = DEFAULT_PAYMENT_CONFIGS[category];
    return { ...def };
  }
  return {
    id: String(doc._id),
    category: doc.category,
    accountName: doc.accountName || "MABUHAY HOMES HOA",
    accountNumber: doc.accountNumber || "0917 123 4567",
    qrCodeUrl: doc.qrCodeUrl || "",
    instructions: doc.instructions || "",
    isActive: doc.isActive !== false,
    updatedBy: doc.updatedBy || "System",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

export async function upsertPaymentConfig(
  category: "amenity" | "dues",
  data: Partial<PaymentConfigType>
): Promise<PaymentConfigType> {
  await dbConnect();
  const updateData: Record<string, unknown> = {
    ...data,
    category,
  };
  delete (updateData as any)._id;
  delete (updateData as any).id;

  const doc = await PaymentConfig.findOneAndUpdate(
    { category } as any,
    { $set: updateData },
    { new: true, upsert: true }
  ).lean() as any;

  return {
    id: String(doc._id),
    category: doc.category,
    accountName: doc.accountName,
    accountNumber: doc.accountNumber,
    qrCodeUrl: doc.qrCodeUrl || "",
    instructions: doc.instructions || "",
    isActive: doc.isActive !== false,
    updatedBy: doc.updatedBy,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

export interface TransactionFilter {
  isArchived?: boolean;
  includeArchived?: boolean;
  refType?: "amenity" | "dues" | "listing" | string;
  status?: string;
}

export async function getTransactions(filter?: TransactionFilter): Promise<TransactionType[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const query: Record<string, unknown> = {};

      if (filter?.isArchived !== undefined) {
        query.isArchived = filter.isArchived;
      } else if (!filter?.includeArchived) {
        query.$or = [{ isArchived: false }, { isArchived: { $exists: false } }];
      }

      if (filter?.refType && filter.refType !== "all") {
        query.refType = filter.refType;
      }

      if (filter?.status && filter.status !== "all") {
        query.status = filter.status;
      }

      const docs = await Transaction.find(query).sort({ _id: -1 }).lean();

      // Prefetch linked reservations and dues records to enrich transaction metadata
      const amenityRefIds = docs.filter((d: any) => d.refType === "amenity" && d.refId).map((d: any) => d.refId);
      const duesRefIds = docs.filter((d: any) => d.refType === "dues" && d.refId).map((d: any) => d.refId);

      const [reservations, duesRecords] = await Promise.all([
        amenityRefIds.length ? Reservation.find({ _id: { $in: amenityRefIds } }).lean() : [],
        duesRefIds.length ? DuesRecord.find({ _id: { $in: duesRefIds } }).lean() : [],
      ]);

      const resMap = new Map<number, any>(reservations.map((r: any) => [r._id, r]));
      const duesMap = new Map<number, any>(duesRecords.map((d: any) => [d._id, d]));

      return docs.map((d: any) => {
        const rawCreatedAt = d.createdAt || d.updatedAt;
        let createdAtIso = "";
        if (rawCreatedAt) {
          try {
            createdAtIso = new Date(rawCreatedAt).toISOString();
          } catch {
            createdAtIso = String(rawCreatedAt);
          }
        }

        const base = serialize<TransactionType>(d);

        let enriched: Partial<TransactionType> = {};
        if (d.refType === "amenity" && d.refId && resMap.has(d.refId)) {
          const res = resMap.get(d.refId);
          enriched = {
            amenityName: res.amenityName,
            reservationDate: res.date,
            bookingType: res.bookingType,
            reservationType: res.reservationType,
          };
        } else if (d.refType === "dues" && d.refId && duesMap.has(d.refId)) {
          const due = duesMap.get(d.refId);
          enriched = {
            dueMonth: due.dueMonth,
            dueDate: due.dueDate,
            amountDue: due.amountDue,
            amountPaid: due.amountPaid,
            billingMonth: due.billingMonth,
            billingYear: due.billingYear,
            blockNo: due.blockNo,
            lotNo: due.lotNo,
          };
        }

        return {
          ...base,
          ...enriched,
          isArchived: Boolean(d.isArchived),
          archiveReason: d.archiveReason || undefined,
          archivedBy: d.archivedBy || undefined,
          archivedAt: d.archivedAt ? new Date(d.archivedAt).toISOString() : undefined,
          createdAt: createdAtIso || base.createdAt || "",
        };
      });
    } catch (e) {}
  }
  return maria.getTransactionsMariaDB();
}

export async function getTransactionById(id: number | string): Promise<TransactionType | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const doc = await Transaction.findOne({ _id: Number(id) } as any).lean();
      if (doc) {
        const res = serialize<TransactionType>(doc);
        const rawCreatedAt = (doc as any).createdAt || (doc as any).updatedAt;
        const createdAtIso = rawCreatedAt ? (typeof rawCreatedAt === "string" ? rawCreatedAt : new Date(rawCreatedAt).toISOString()) : "";
        return {
          ...res,
          isArchived: Boolean((doc as any).isArchived),
          createdAt: createdAtIso || res.createdAt,
        };
      }
    } catch (e) {}
  }
  const txns = await maria.getTransactionsMariaDB();
  return txns.find((t) => t.id === Number(id)) || null;
}

export async function getPaymentByIntent(intentId: string): Promise<TransactionType | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const doc = await Transaction.findOne({ "payment.intentId": intentId } as any).lean();
      if (doc) return serialize<TransactionType>(doc);
    } catch (e) {}
  }
  const txns = await maria.getTransactionsMariaDB();
  return txns.find((t) => t.payment?.intentId === intentId) || null;
}

export async function updateTransactionById(
  id: number | string,
  patch: any
): Promise<TransactionType | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const numId = Number(id);
      const doc = await Transaction.findOneAndUpdate(
        { _id: numId } as any,
        { $set: patch },
        { new: true }
      ).lean();

      if (doc) {
        // Synchronize status with linked Reservation or DuesRecord
        if (patch.status) {
          if (doc.refType === "amenity" && doc.refId) {
            const resStatus = patch.status === "approved" ? "approved" : patch.status === "voided" ? "declined" : "pending";
            await Reservation.updateOne(
              { _id: doc.refId } as any,
              {
                $set: {
                  status: resStatus,
                  ...(patch.status === "approved" ? { approvedAt: new Date().toISOString() } : {}),
                  ...(patch.receiptPath ? { receiptPath: patch.receiptPath } : {}),
                },
              }
            );
          } else if (doc.refType === "dues" && doc.refId) {
            const dueRecord = await DuesRecord.findOne({ _id: doc.refId } as any).lean() as any;
            if (dueRecord) {
              if (patch.status === "approved") {
                const paidAt = doc.createdAt || new Date().toISOString().slice(0, 10);
                const status = computeDuesStatus({
                  dueMonth: dueRecord.dueMonth,
                  dueDate: dueRecord.dueDate,
                  amountDue: dueRecord.amountDue,
                  amountPaid: dueRecord.amountPaid,
                  paidAt,
                });
                await DuesRecord.updateOne(
                  { _id: doc.refId } as any,
                  { $set: { status, paidAt } }
                );
              }
            }
          }
        }
        maria.updateTransactionByIdMariaDB(id, patch).catch(() => {});
        return serialize<TransactionType>(doc);
      }
    } catch (e) {}
  }
  return maria.updateTransactionByIdMariaDB(id, patch);
}

export async function archiveTransaction(
  id: number | string,
  reason?: string,
  archivedBy = "admin"
): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const numId = Number(id);
      const filter = Number.isFinite(numId)
        ? { $or: [{ _id: numId }, { _id: String(id) }, { id: numId }] }
        : { _id: id };
      const res = await Transaction.updateOne(
        filter as any,
        {
          $set: {
            isArchived: true,
            archiveReason: reason || "Archived by Admin",
            archivedBy,
            archivedAt: new Date().toISOString(),
          },
        }
      );
      return res.matchedCount > 0 || res.modifiedCount > 0;
    } catch (e) {}
  }
  return true;
}

export async function unarchiveTransaction(id: number | string): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const numId = Number(id);
      const filter = Number.isFinite(numId)
        ? { $or: [{ _id: numId }, { _id: String(id) }, { id: numId }] }
        : { _id: id };
      const res = await Transaction.updateOne(
        filter as any,
        {
          $set: {
            isArchived: false,
            archiveReason: null,
            archivedBy: null,
            archivedAt: null,
          },
        }
      );
      return res.matchedCount > 0 || res.modifiedCount > 0;
    } catch (e) {}
  }
  return true;
}

export async function deleteTransaction(id: number | string): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const numId = Number(id);
      const filter = Number.isFinite(numId)
        ? { $or: [{ _id: numId }, { _id: String(id) }, { id: numId }] }
        : { _id: id };
      const res = await Transaction.deleteOne(filter as any);
      return res.deletedCount > 0;
    } catch (e) {}
  }
  return true;
}

// ── Exported Creation/Update Helpers for Dual Mode ──────────────────────────
export async function createReservation(data: any): Promise<ReservationType> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const id = data._id || data.id || (await getNextId(Reservation));
      const doc = await Reservation.create({ ...data, _id: id });
      const plain = (doc as any)?.toObject ? (doc as any).toObject() : doc;
      const res = serialize<ReservationType>(plain);
      maria.createReservationMariaDB({ ...data, id }).catch(() => {});
      return res;
    } catch (e) {}
  }
  return maria.createReservationMariaDB(data);
}

export async function updateReservation(id: number | string, data: any): Promise<ReservationType | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const doc = await Reservation.findOneAndUpdate({ _id: Number(id) } as any, { $set: data }, { new: true }).lean();
      maria.updateReservationMariaDB(id, data).catch(() => {});
      if (doc) return serialize<ReservationType>(doc);
    } catch (e) {}
  }
  return maria.updateReservationMariaDB(id, data);
}

export async function createDuesRecord(data: any): Promise<DuesType> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const id = data._id || data.id || (await getNextId(DuesRecord));
      const doc = await DuesRecord.create({ ...data, _id: id });
      const plain = (doc as any)?.toObject ? (doc as any).toObject() : doc;
      const res = serialize<DuesType>(plain);
      maria.createDuesRecordMariaDB({ ...data, id }).catch(() => {});
      return res;
    } catch (e) {}
  }
  return maria.createDuesRecordMariaDB(data);
}

export async function updateDuesRecord(id: number | string, data: any): Promise<DuesType | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const doc = await DuesRecord.findOneAndUpdate({ _id: Number(id) } as any, { $set: data }, { new: true }).lean();
      maria.updateDuesRecordMariaDB(id, data).catch(() => {});
      if (doc) return serialize<DuesType>(doc);
    } catch (e) {}
  }
  return maria.updateDuesRecordMariaDB(id, data);
}

export async function createTransaction(data: any): Promise<TransactionType> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const id = data._id || data.id || (await getNextId(Transaction));
      const doc = await Transaction.create({ ...data, _id: id });
      const plain = (doc as any)?.toObject ? (doc as any).toObject() : doc;
      const res = serialize<TransactionType>(plain);
      maria.createTransactionMariaDB({ ...data, id }).catch(() => {});
      return res;
    } catch (e) {}
  }
  return maria.createTransactionMariaDB(data);
}

export async function getPropertyViewings(filter?: { residentEmail?: string; listingId?: number }): Promise<PropertyViewingType[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const query: Record<string, any> = {};
      if (filter?.residentEmail) query.residentEmail = filter.residentEmail;
      if (filter?.listingId) query.listingId = filter.listingId;
      const docs = await PropertyViewing.find(query).sort({ _id: -1 }).lean();
      return docs.map((d: any) => ({ ...serialize<PropertyViewingType>(d), id: d._id }));
    } catch (e) {}
  }
  return maria.getPropertyViewingsMariaDB(filter);
}

export async function createPropertyViewing(data: any): Promise<PropertyViewingType> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const id = data._id || data.id || (await getNextId(PropertyViewing));
      const doc = await PropertyViewing.create({ ...data, _id: id });
      const plain = (doc as any)?.toObject ? (doc as any).toObject() : doc;
      const res = serialize<PropertyViewingType>(plain);
      maria.createPropertyViewingMariaDB({ ...data, id }).catch(() => {});
      return res;
    } catch (e) {}
  }
  return maria.createPropertyViewingMariaDB(data);
}

export async function updatePropertyViewing(id: number | string, data: any): Promise<PropertyViewingType | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const doc = await PropertyViewing.findOneAndUpdate({ _id: Number(id) } as any, { $set: data }, { new: true }).lean();
      maria.updatePropertyViewingMariaDB(id, data).catch(() => {});
      if (doc) return serialize<PropertyViewingType>(doc);
    } catch (e) {}
  }
  return maria.updatePropertyViewingMariaDB(id, data);
}

