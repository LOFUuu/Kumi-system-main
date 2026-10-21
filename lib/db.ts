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
  Notification,
} from "../models";
import { isOnlineMode, markOffline } from "./db-router";
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
  InAppNotification as NotificationType,
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

// Short-lived in-memory cache for listings queries (eliminates repeated Atlas network latency)
interface CacheEntry<T> {
  data: T;
  expires: number;
}
const listingsCache = new Map<string, CacheEntry<HouseListing[]>>();
const LISTINGS_CACHE_TTL = 15_000; // 15 seconds

export function clearListingsCache(): void {
  listingsCache.clear();
}

export async function getListings(filter?: {
  status?: HouseListing["status"];
  verificationStatus?: HouseListing["verificationStatus"];
  includeArchived?: boolean;
  isArchived?: boolean;
  includeProofDocuments?: boolean;
}): Promise<HouseListing[]> {
  const cacheKey = JSON.stringify(filter || {});
  const cached = listingsCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

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

      let queryBuilder = Listing.find(query).sort({ createdAt: -1, _id: -1 });
      // Exclude heavy base64 proof documents from listing feeds unless explicitly requested
      if (!filter?.includeProofDocuments) {
        queryBuilder = queryBuilder.select("-proofDocuments");
      }

      const docs = await queryBuilder.lean();
      const result = docs.map((d: any) => {
        const s = serialize<HouseListing>(d);
        if (Array.isArray(s.images) && s.images.length > 2) {
          s.images = s.images.slice(0, 2);
        }
        return {
          ...s,
          createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
        };
      });

      listingsCache.set(cacheKey, { data: result, expires: Date.now() + LISTINGS_CACHE_TTL });
      return result;
    } catch (e) {
      if (process.env.VERCEL) return [];
      // fallback to offline
    }
  }
  if (process.env.VERCEL) return [];
  try {
    const offlineResult = await maria.getListingsMariaDB(filter);
    listingsCache.set(cacheKey, { data: offlineResult, expires: Date.now() + LISTINGS_CACHE_TTL });
    return offlineResult;
  } catch {
    return [];
  }
}

export async function getArchivedListings(): Promise<HouseListing[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const docs = await Listing.find({
        $or: [{ isArchived: true }, { isArchived: "true" }, { isArchived: 1 }],
      } as any)
        .select("-proofDocuments")
        .sort({ updatedAt: -1, _id: -1 })
        .lean();
      return docs.map((d: any) => ({
        ...serialize<HouseListing>(d),
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
      }));
    } catch (e) {}
  }
  try {
    return await maria.getListingsMariaDB({ isArchived: true });
  } catch {
    return [];
  }
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
      clearListingsCache();
      return res.matchedCount > 0 || res.modifiedCount > 0;
    } catch (e) {}
  }
  try {
    const updated = await maria.updateListingMariaDB(id, {
      isArchived: true,
      archiveReason: reason || (archivedBy === "owner" ? "Archived by Owner" : "Archived by Admin"),
      archivedBy,
    });
    clearListingsCache();
    return Boolean(updated);
  } catch {
    return false;
  }
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
      clearListingsCache();
      return res.matchedCount > 0 || res.modifiedCount > 0;
    } catch (e) {}
  }
  try {
    const updated = await maria.updateListingMariaDB(id, { isArchived: false, archiveReason: null });
    clearListingsCache();
    return Boolean(updated);
  } catch {
    return false;
  }
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
  try {
    return await maria.getListingMariaDB(id);
  } catch {
    return null;
  }
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
      clearListingsCache();
      return res;
    } catch (e: any) {
      if (process.env.VERCEL) {
        throw new Error(e?.message || "Failed to save listing to database.");
      }
      markOffline();
    }
  }
  try {
    return await maria.createListingMariaDB(data);
  } catch (err: any) {
    throw new Error(err?.message || "Failed to create listing in database.");
  }
}

export async function updateListing(id: number | string, data: any): Promise<HouseListing | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const numId = Number(id);
      const doc = await Listing.findOneAndUpdate({ _id: numId } as any, { $set: data }, { new: true }).lean();
      maria.updateListingMariaDB(id, data).catch(() => {});
      clearListingsCache();
      if (doc) return serialize<HouseListing>(doc);
    } catch (e) {
      markOffline();
    }
  }
  try {
    return await maria.updateListingMariaDB(id, data);
  } catch {
    return null;
  }
}

export async function deleteListing(id: number | string): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const numId = Number(id);
      await Listing.deleteOne({ _id: numId } as any);
      mariaQuery(`DELETE FROM listings WHERE id = ?`, [numId]).catch(() => {});
      clearListingsCache();
      return true;
    } catch (e) {}
  }
  try {
    await mariaQuery(`DELETE FROM listings WHERE id = ?`, [Number(id)]);
  } catch {}
  return true;
}

export async function getListingsByOwner(uploadedBy: number): Promise<HouseListing[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const docs = await Listing.find({ uploadedBy, $or: [{ isArchived: false }, { isArchived: { $exists: false } }] } as any)
        .select("-proofDocuments")
        .sort({ createdAt: -1, _id: -1 })
        .lean();
      return docs.map((d: any) => ({
        ...serialize<HouseListing>(d),
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
      }));
    } catch (e) {}
  }
  try {
    return await maria.getListingsMariaDB({ status: undefined }).then(l => l.filter(x => x.uploadedBy === uploadedBy));
  } catch {
    return [];
  }
}


let cachedAmenities: { data: AmenityType[]; expires: number } | null = null;
const AMENITIES_CACHE_TTL = 30_000; // 30 seconds

export function clearAmenitiesCache(): void {
  cachedAmenities = null;
}

export async function getAmenities(): Promise<AmenityType[]> {
  if (cachedAmenities && Date.now() < cachedAmenities.expires) {
    return cachedAmenities.data;
  }
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const docs = await Amenity.find({ $or: [{ isArchived: false }, { isArchived: { $exists: false } }] }).lean();
      const result = docs.map((d) => serialize<AmenityType>(d));
      cachedAmenities = { data: result, expires: Date.now() + AMENITIES_CACHE_TTL };
      return result;
    } catch (e) {
      // fallback to offline
    }
  }
  try {
    const result = await maria.getAmenitiesMariaDB();
    cachedAmenities = { data: result, expires: Date.now() + AMENITIES_CACHE_TTL };
    return result;
  } catch {
    return [];
  }
}

export async function getArchivedAmenities(): Promise<AmenityType[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const docs = await Amenity.find({ isArchived: true }).lean();
      return docs.map((d) => serialize<AmenityType>(d));
    } catch (e) {}
  }
  try {
    const rows = await mariaQuery<any[]>(`SELECT * FROM amenities WHERE isArchived = 1 ORDER BY id ASC`);
    return rows.map((r) => ({
      id: r.id, name: r.name, description: r.description || "",
      maxCapacity: r.maxCapacity, rateWalkin: Number(r.rateWalkin),
      rateWhole: Number(r.rateWhole), ratePrivate: Number(r.ratePrivate),
      downpayment: Number(r.downpayment), downpaymentPrivate: Number(r.downpaymentPrivate),
      isActive: Boolean(r.isActive), isArchived: Boolean(r.isArchived),
      image: r.image || "", lat: r.lat, lng: r.lng,
    }));
  } catch {
    return [];
  }
}

export async function getAmenity(id: number | string): Promise<AmenityType | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const doc = await Amenity.findOne({ _id: Number(id) } as any);
      if (doc) return serialize<AmenityType>(doc.toObject());
    } catch (e) {}
  }
  return maria.getAmenityMariaDB(id);
}

export async function createAmenity(data: Partial<AmenityType>): Promise<AmenityType> {
  const online = await isOnlineMode();
  const id = await getNextId(Amenity);
  const payload = {
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
    lat: Number(data.lat) || 14.3430,
    lng: Number(data.lng) || 120.9807,
  };

  let created: AmenityType;
  if (online) {
    try {
      await dbConnect();
      const doc = (await Amenity.create({ _id: id, ...payload } as any)) as any;
      clearAmenitiesCache();
      const plain = doc?.toObject ? doc.toObject() : doc;
      created = serialize<AmenityType>(plain);
      maria.createAmenityMariaDB({ ...payload, id }).catch(() => {});
      return created;
    } catch (e) {}
  }
  clearAmenitiesCache();
  return maria.createAmenityMariaDB({ ...payload, id });
}

export async function updateAmenity(
  id: number | string,
  data: Partial<AmenityType>
): Promise<AmenityType | null> {
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

  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const doc = await Amenity.findOneAndUpdate(
        { _id: Number(id) } as any,
        { $set: update },
        { new: true }
      ).lean();
      clearAmenitiesCache();
      maria.updateAmenityMariaDB(id, data).catch(() => {});
      return doc ? serialize<AmenityType>(doc) : null;
    } catch (e) {}
  }
  clearAmenitiesCache();
  return maria.updateAmenityMariaDB(id, data);
}

export async function deleteAmenity(id: number | string): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const res = await Amenity.deleteOne({ _id: Number(id) } as any);
      clearAmenitiesCache();
      mariaQuery(`DELETE FROM amenities WHERE id = ?`, [Number(id)]).catch(() => {});
      return res.deletedCount > 0;
    } catch (e) {}
  }
  clearAmenitiesCache();
  await mariaQuery(`DELETE FROM amenities WHERE id = ?`, [Number(id)]);
  return true;
}

export async function archiveAmenity(id: number | string): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const res = await Amenity.updateOne({ _id: Number(id) } as any, { $set: { isArchived: true } });
      clearAmenitiesCache();
      mariaQuery(`UPDATE amenities SET isArchived = 1 WHERE id = ?`, [Number(id)]).catch(() => {});
      return res.modifiedCount > 0;
    } catch (e) {}
  }
  clearAmenitiesCache();
  await mariaQuery(`UPDATE amenities SET isArchived = 1 WHERE id = ?`, [Number(id)]);
  return true;
}

export async function unarchiveAmenity(id: number | string): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const res = await Amenity.updateOne({ _id: Number(id) } as any, { $set: { isArchived: false } });
      clearAmenitiesCache();
      mariaQuery(`UPDATE amenities SET isArchived = 0 WHERE id = ?`, [Number(id)]).catch(() => {});
      return res.modifiedCount > 0;
    } catch (e) {}
  }
  clearAmenitiesCache();
  await mariaQuery(`UPDATE amenities SET isArchived = 0 WHERE id = ?`, [Number(id)]);
  return true;
}

// Compute the set of dates that are already blocked for an amenity.
// - A private approved reservation blocks the entire day.
// - A public approved reservation blocks the day once booked pax >= capacity.
export async function getBlockedDates(amenityId: number): Promise<string[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
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
    } catch (e) {}
  }
  // Offline: compute blocked dates from local MariaDB
  try {
    const amenityRow = await maria.getAmenityMariaDB(amenityId);
    const capacity = amenityRow?.maxCapacity ?? 0;

    const privateRows = await mariaQuery<any[]>(
      `SELECT date FROM reservations WHERE amenityId = ? AND reservationType = 'private' AND status = 'approved' AND isArchived = 0`,
      [amenityId]
    );
    const publicRows = await mariaQuery<any[]>(
      `SELECT date, SUM(paxCount) as pax FROM reservations WHERE amenityId = ? AND reservationType = 'public' AND status = 'approved' AND isArchived = 0 GROUP BY date`,
      [amenityId]
    );

    const privateDates = privateRows.map((r) => r.date);
    const publicFull = publicRows.filter((r) => Number(r.pax) >= capacity).map((r) => r.date);
    return Array.from(new Set([...privateDates, ...publicFull])).filter(Boolean);
  } catch {
    return [];
  }
}

// True if `date` is available for a new public booking with the given pax.
export async function isDateAvailableForPublic(
  amenityId: number,
  date: string,
  pax: number
): Promise<boolean> {
  const blocked = await getBlockedDates(amenityId);
  if (blocked.includes(date)) return false;

  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
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
    } catch (e) {}
  }
  // Offline fallback
  try {
    const amenityRow = await maria.getAmenityMariaDB(amenityId);
    const paxRows = await mariaQuery<any[]>(
      `SELECT SUM(paxCount) as pax FROM reservations WHERE amenityId = ? AND reservationType = 'public' AND status = 'approved' AND date = ? AND isArchived = 0`,
      [amenityId, date]
    );
    const used = Number(paxRows[0]?.pax) || 0;
    return used + Math.max(1, pax) <= (amenityRow?.maxCapacity ?? 0);
  } catch {
    return true;
  }
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
  try {
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
      notification: "notifications",
    };
    const table = tableMap[name] || "listings";
    const rows = await mariaQuery<any[]>(`SELECT MAX(id) as maxId FROM \`${table}\``);
    return (rows[0]?.maxId || 0) + 1;
  } catch {
    return Date.now();
  }
}

export async function getAnnouncements(activeOnly = false): Promise<AnnouncementType[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const filter: Record<string, string> = {};
      if (activeOnly) filter.status = "active";
      const docs = await Announcement.find(filter as any).sort({ _id: -1 }).lean();
      return docs.map((d) => serialize<AnnouncementType>(d));
    } catch (e) {}
  }
  try {
    return await maria.getAnnouncementsMariaDB(activeOnly);
  } catch {
    return [];
  }
}

export async function createAnnouncement(data: {
  title: string;
  content: string;
  status?: "active" | "archived";
  poster?: string;
  category?: string;
  postDate?: string;
}): Promise<AnnouncementType> {
  const online = await isOnlineMode();
  const postDate = data.postDate || new Date().toISOString().split("T")[0];
  const payload = {
    title: String(data.title || "").trim(),
    content: String(data.content || "").trim(),
    status: data.status || "active",
    poster: data.poster || "HOA Admin",
    category: data.category || "Community",
    postDate,
  };

  let createdAnnouncement: AnnouncementType;

  if (online) {
    try {
      await dbConnect();
      const id = await getNextId(Announcement);
      const doc = await (Announcement as any).create({ ...payload, _id: id });
      const plain = (doc as any)?.toObject ? (doc as any).toObject() : doc;
      createdAnnouncement = serialize<AnnouncementType>(plain);
      maria.createAnnouncementMariaDB({ ...payload, id }).catch(() => {});
    } catch (e: any) {
      createdAnnouncement = await maria.createAnnouncementMariaDB(payload);
    }
  } else {
    createdAnnouncement = await maria.createAnnouncementMariaDB(payload);
  }

  // Create In-App Notifications for eligible users (non-admin users)
  if (createdAnnouncement && createdAnnouncement.status === "active") {
    createAnnouncementNotifications(createdAnnouncement).catch((err) => {
      console.error("[Notification] Failed to generate announcement notifications:", err);
    });
  }

  return createdAnnouncement;
}

export async function updateAnnouncement(
  id: number | string,
  data: Partial<AnnouncementType>
): Promise<AnnouncementType | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const numId = Number(id);
      const filter = Number.isFinite(numId) ? { $or: [{ _id: numId }, { id: numId }] } : { _id: id };
      const doc = await Announcement.findOneAndUpdate(filter as any, { $set: data }, { new: true }).lean();
      maria.updateAnnouncementMariaDB(id, data).catch(() => {});
      if (doc) return serialize<AnnouncementType>(doc);
    } catch (e) {}
  }
  return maria.updateAnnouncementMariaDB(id, data);
}

export async function deleteAnnouncement(id: number | string): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const numId = Number(id);
      const filter = Number.isFinite(numId) ? { $or: [{ _id: numId }, { id: numId }] } : { _id: id };
      const res = await Announcement.deleteOne(filter as any);
      // Clean up notifications for this announcement
      await (Notification as any).deleteMany({ type: "announcement", referenceId: numId }).catch(() => {});
      maria.deleteAnnouncementMariaDB(id).catch(() => {});
      return res.deletedCount > 0;
    } catch (e) {}
  }
  return maria.deleteAnnouncementMariaDB(id);
}

export async function createNotification(data: {
  userId: number | string;
  userEmail?: string;
  title: string;
  message: string;
  type?: "announcement" | "viewing" | "reservation" | "dues" | "general";
  referenceId?: number | string;
  link?: string;
}): Promise<NotificationType> {
  const online = await isOnlineMode();
  const payload = {
    userId: data.userId,
    userEmail: data.userEmail ? data.userEmail.toLowerCase().trim() : undefined,
    title: data.title.trim(),
    message: data.message.trim(),
    type: data.type || "general",
    referenceId: data.referenceId,
    link: data.link || "",
    isRead: false,
  };

  if (online) {
    try {
      await dbConnect();
      const id = await getNextId(Notification as any);
      const doc = await (Notification as any).create({ ...payload, _id: id });
      const plain = (doc as any)?.toObject ? (doc as any).toObject() : doc;
      return serialize<NotificationType>(plain);
    } catch (e) {}
  }
  return { id: Date.now(), ...payload, isRead: false, createdAt: new Date().toISOString() };
}

export async function createAnnouncementNotifications(announcement: AnnouncementType): Promise<void> {
  try {
    await dbConnect();
    // Get all eligible non-admin users: resident, non_resident, counselor
    const users = await (User as any).find({
      role: { $in: ["resident", "non_resident", "counselor"] },
      $or: [{ isArchived: false }, { isArchived: { $exists: false } }],
    }).lean();

    for (const u of users) {
      const uId = (u as any)._id ?? (u as any).id;
      // Prevent duplicate notification for same announcement event
      const existing = await (Notification as any).findOne({
        userId: uId,
        type: "announcement",
        referenceId: announcement.id,
      }).lean();

      if (!existing) {
        const id = await getNextId(Notification as any);
        await (Notification as any).create({
          _id: id,
          userId: uId,
          userEmail: u.email,
          title: `Announcement: ${announcement.title}`,
          message: announcement.content.length > 120 ? announcement.content.slice(0, 117) + "…" : announcement.content,
          type: "announcement",
          referenceId: announcement.id,
          link: "/announcements",
          isRead: false,
        });
      }
    }
  } catch (err) {
    console.error("[Notification] createAnnouncementNotifications error:", err);
  }
}

export async function getUserNotifications(userIdentifier: { id?: number | string; email?: string }): Promise<NotificationType[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const orClauses: any[] = [];
      if (userIdentifier.id !== undefined && userIdentifier.id !== null) {
        const numId = Number(userIdentifier.id);
        if (Number.isFinite(numId)) {
          orClauses.push({ userId: numId });
        }
        orClauses.push({ userId: String(userIdentifier.id) });
      }
      if (userIdentifier.email) {
        orClauses.push({ userEmail: userIdentifier.email.toLowerCase().trim() });
      }

      if (orClauses.length === 0) return [];

      const docs = await (Notification as any).find({ $or: orClauses })
        .sort({ createdAt: -1, _id: -1 })
        .limit(50)
        .lean();

      return docs.map((d: any) => ({
        ...serialize<NotificationType>(d),
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
      }));
    } catch (e) {
      return [];
    }
  }
  return [];
}

export async function markNotificationRead(notificationId: number | string, userId?: number | string): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const numId = Number(notificationId);
      const filter: any = Number.isFinite(numId)
        ? { $or: [{ _id: numId }, { id: numId }] }
        : { _id: notificationId };
      if (userId) {
        filter.userId = { $in: [userId, String(userId), Number(userId)].filter(Boolean) };
      }
      const res = await (Notification as any).updateOne(filter, { $set: { isRead: true } });
      return res.modifiedCount > 0 || res.matchedCount > 0;
    } catch (e) {
      return false;
    }
  }
  return true;
}

export async function markAllNotificationsRead(userIdentifier: { id?: number | string; email?: string }): Promise<boolean> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const orClauses: any[] = [];
      if (userIdentifier.id !== undefined && userIdentifier.id !== null) {
        const numId = Number(userIdentifier.id);
        if (Number.isFinite(numId)) orClauses.push({ userId: numId });
        orClauses.push({ userId: String(userIdentifier.id) });
      }
      if (userIdentifier.email) {
        orClauses.push({ userEmail: userIdentifier.email.toLowerCase().trim() });
      }
      if (orClauses.length === 0) return false;
      const res = await (Notification as any).updateMany({ $or: orClauses, isRead: false }, { $set: { isRead: true } });
      return Boolean(res.acknowledged);
    } catch (e) {
      return false;
    }
  }
  return true;
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
        needsReview: Boolean(d.needsReview),
        needsReviewReason: d.needsReviewReason ?? null,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
      }));
    } catch (e) {}
  }
  try {
    return await maria.getUsersMariaDB();
  } catch {
    return [];
  }
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
  try {
    return await maria.getArchivedUsersMariaDB();
  } catch {
    return [];
  }
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
  try {
    return Boolean(await maria.archiveUserMariaDB(id, reason));
  } catch {
    return false;
  }
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
  try {
    return Boolean(await maria.unarchiveUserMariaDB(id));
  } catch {
    return false;
  }
}

// Full user lookup (incl. password/reset fields) for server-side auth only.
export async function getUserByEmailForAuth(email: string): Promise<AuthUser | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const doc = await User.findOne({ email: normalizedEmail }).lean();
      if (doc) return serializeAuth(doc);
    } catch (e) {
      console.warn("[DB] MongoDB getUserByEmailForAuth error:", (e as Error)?.message);
    }
  }
  // Fall back to local MariaDB only if reachable, safely catching connection errors
  try {
    return await maria.getUserByEmailForAuthMariaDB(normalizedEmail);
  } catch {
    return null;
  }
}

export async function savePasswordResetToken(
  email: string,
  tokenHash: string,
  expiry: Date
): Promise<void> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      await User.updateOne(
        { email: email.toLowerCase() },
        { $set: { resetToken: tokenHash, resetTokenExpiry: expiry } }
      );
    } catch (e) {}
  }
  try {
    await mariaQuery(
      `UPDATE users SET resetToken = ?, resetTokenExpiry = ? WHERE LOWER(email) = LOWER(?)`,
      [tokenHash, expiry, email.toLowerCase().trim()]
    );
  } catch (e) {}
}

export async function clearPasswordResetToken(email: string): Promise<void> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      await User.updateOne(
        { email: email.toLowerCase() },
        { $set: { resetToken: null, resetTokenExpiry: null } }
      );
    } catch (e) {}
  }
  try {
    await mariaQuery(
      `UPDATE users SET resetToken = NULL, resetTokenExpiry = NULL WHERE LOWER(email) = LOWER(?)`,
      [email.toLowerCase().trim()]
    );
  } catch (e) {}
}

export async function setUserPassword(email: string, passwordHash: string): Promise<void> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      await User.updateOne(
        { email: email.toLowerCase() },
        { $set: { passwordHash, resetToken: null, resetTokenExpiry: null, emailVerified: true } }
      );
    } catch (e) {}
  }
  try {
    await mariaQuery(
      `UPDATE users SET passwordHash = ?, resetToken = NULL, resetTokenExpiry = NULL, emailVerified = 1 WHERE LOWER(email) = LOWER(?)`,
      [passwordHash, email.toLowerCase().trim()]
    );
  } catch (e) {}
}

export async function saveVerificationToken(
  email: string,
  tokenHash: string,
  expiry: Date
): Promise<void> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      await User.updateOne(
        { email: email.toLowerCase() },
        { $set: { verificationToken: tokenHash, verificationTokenExpiry: expiry } }
      );
    } catch (e) {}
  }
  try {
    await mariaQuery(
      `UPDATE users SET verificationToken = ?, verificationTokenExpiry = ? WHERE LOWER(email) = LOWER(?)`,
      [tokenHash, expiry, email.toLowerCase().trim()]
    );
  } catch (e) {}
}

export async function clearVerificationToken(email: string): Promise<void> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      await User.updateOne(
        { email: email.toLowerCase() },
        { $set: { verificationToken: null, verificationTokenExpiry: null } }
      );
    } catch (e) {}
  }
  try {
    await mariaQuery(
      `UPDATE users SET verificationToken = NULL, verificationTokenExpiry = NULL WHERE LOWER(email) = LOWER(?)`,
      [email.toLowerCase().trim()]
    );
  } catch (e) {}
}

export async function setEmailVerified(email: string, verified = true): Promise<void> {
  const online = await isOnlineMode();
  if (online) {
    try {
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
    } catch (e) {}
  }
  try {
    await mariaQuery(
      `UPDATE users SET emailVerified = ?, verificationToken = NULL, verificationTokenExpiry = NULL WHERE LOWER(email) = LOWER(?)`,
      [verified ? 1 : 0, email.toLowerCase().trim()]
    );
  } catch (e) {}
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
  try {
    await maria.deleteUserByIdMariaDB(id);
  } catch {}
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
  needsReview?: boolean;
  needsReviewReason?: string;
}): Promise<UserType> {
  const normalizedEmail = data.email.toLowerCase().trim();
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const id = await getNextId(User);
      const doc = await User.create({
        _id: id,
        fullName: data.fullName,
        email: normalizedEmail,
        role: data.role,
        isActive: true,
        address: data.address || undefined,
        blockNo: data.blockNo || undefined,
        lotNo: data.lotNo || undefined,
        phone: data.phone || undefined,
        cedula: data.cedula || undefined,
        passwordHash: data.passwordHash || undefined,
        emailVerified: data.emailVerified,
        needsReview: data.needsReview || false,
        needsReviewReason: data.needsReviewReason || undefined,
      } as any);
      const res = serialize<UserType>(doc);
      maria.createUserMariaDB({ ...data, email: normalizedEmail, id }).catch(() => {});
      return res;
    } catch (e) {
      console.error("[DB] Failed to create user in MongoDB:", e);
    }
  }
  try {
    return await maria.createUserMariaDB({ ...data, email: normalizedEmail });
  } catch (err: any) {
    throw new Error(err?.message || "Failed to create user in database.");
  }
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
      if (data.needsReview !== undefined) update.needsReview = Boolean(data.needsReview);
      if (data.needsReviewReason !== undefined) update.needsReviewReason = data.needsReviewReason || null;

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
  try {
    return await maria.updateUserByIdMariaDB(id, data);
  } catch {
    return null;
  }
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
        blockNo: { $exists: true, $ne: null, $nin: ["", "null", "undefined"] },
        lotNo: { $exists: true, $ne: null, $nin: ["", "null", "undefined"] },
      } as any)
        .select({ blockNo: 1, lotNo: 1, _id: 0 })
        .lean();
      const seen = new Set<string>();
      const units: { blockNo: string; lotNo: string }[] = [];
      for (const d of docs as any[]) {
        if (!d.blockNo || !d.lotNo) continue;
        const b = String(d.blockNo).trim();
        const l = String(d.lotNo).trim();
        if (!b || !l || b.toLowerCase() === "null" || l.toLowerCase() === "null") continue;
        const key = `${b}|${l}`;
        if (!seen.has(key)) {
          seen.add(key);
          units.push({ blockNo: b, lotNo: l });
        }
      }
      return units;
    } catch (e) {}
  }
  try {
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
  } catch {
    return [];
  }
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
  try {
    return await maria.getReservationsMariaDB(includeArchived);
  } catch {
    return [];
  }
}

export async function getArchivedReservations(): Promise<ReservationType[]> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const docs = await Reservation.find({
        $or: [{ isArchived: true }, { isArchived: "true" }, { isArchived: 1 }],
      } as any)
        .sort({ archivedAt: -1, _id: -1 })
        .lean();
      return docs.map((d) => serialize<ReservationType>(d));
    } catch (e) {}
  }
  try {
    return await maria.getArchivedReservationsMariaDB();
  } catch {
    return [];
  }
}

export async function archiveReservation(
  id: number | string,
  reason?: string
): Promise<ReservationType | null> {
  const online = await isOnlineMode();
  if (online) {
    try {
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
      maria.archiveReservationMariaDB(id, reason).catch(() => {});
      return doc ? serialize<ReservationType>(doc) : null;
    } catch (e) {}
  }
  return maria.archiveReservationMariaDB(id, reason);
}

export async function unarchiveReservation(
  id: number | string
): Promise<{ ok: boolean; error?: string; reservation?: ReservationType }> {
  const online = await isOnlineMode();
  if (online) {
    try {
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
      maria.unarchiveReservationMariaDB(id).catch(() => {});

      const updated = (await Reservation.findById(resId).lean()) as any;
      return { ok: true, reservation: serialize<ReservationType>(updated) };
    } catch (e) {}
  }
  return maria.unarchiveReservationMariaDB(id);
}

export async function deleteReservation(
  id: number | string
): Promise<{ ok: boolean; error?: string }> {
  const online = await isOnlineMode();
  if (online) {
    try {
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
      maria.deleteReservationMariaDB(id).catch(() => {});
      return { ok: true };
    } catch (e) {}
  }
  return maria.deleteReservationMariaDB(id);
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
  try {
    return await maria.getDuesMariaDB();
  } catch {
    return [];
  }
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
  const online = await isOnlineMode();
  if (online) {
    try {
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
    } catch (e) {}
  }
  // Offline fallback: read from local MariaDB
  try {
    const rows = await mariaQuery<any[]>(`SELECT * FROM payment_configs`);
    const map: Record<string, any> = {};
    for (const r of rows) {
      if (r && r.category) {
        map[r.category] = {
          id: String(r.id),
          category: r.category,
          accountName: r.accountName || "MABUHAY HOMES HOA",
          accountNumber: r.accountNumber || "0917 123 4567",
          qrCodeUrl: r.qrCodeUrl || "",
          instructions: r.instructions || "",
          isActive: Boolean(r.isActive),
          updatedBy: r.updatedBy || "System",
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
        };
      }
    }
    return {
      amenity: map.amenity || { ...DEFAULT_PAYMENT_CONFIGS.amenity },
      dues: map.dues || { ...DEFAULT_PAYMENT_CONFIGS.dues },
    };
  } catch {
    return {
      amenity: { ...DEFAULT_PAYMENT_CONFIGS.amenity },
      dues: { ...DEFAULT_PAYMENT_CONFIGS.dues },
    };
  }
}

export async function getPaymentConfig(category: "amenity" | "dues"): Promise<PaymentConfigType> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      const doc = await PaymentConfig.findOne({ category } as any).lean() as any;
      if (doc) {
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
    } catch (e) {}
  }
  // Offline fallback
  try {
    const rows = await mariaQuery<any[]>(`SELECT * FROM payment_configs WHERE category = ? LIMIT 1`, [category]);
    if (rows.length) {
      const r = rows[0];
      return {
        id: String(r.id),
        category: r.category,
        accountName: r.accountName || "MABUHAY HOMES HOA",
        accountNumber: r.accountNumber || "0917 123 4567",
        qrCodeUrl: r.qrCodeUrl || "",
        instructions: r.instructions || "",
        isActive: Boolean(r.isActive),
        updatedBy: r.updatedBy || "System",
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
      };
    }
  } catch (e) {}
  return { ...DEFAULT_PAYMENT_CONFIGS[category] };
}

export async function upsertPaymentConfig(
  category: "amenity" | "dues",
  data: Partial<PaymentConfigType>
): Promise<PaymentConfigType> {
  const online = await isOnlineMode();
  const updateData: Record<string, unknown> = { ...data, category };
  delete (updateData as any)._id;
  delete (updateData as any).id;

  if (online) {
    try {
      await dbConnect();
      const doc = await PaymentConfig.findOneAndUpdate(
        { category } as any,
        { $set: updateData },
        { new: true, upsert: true }
      ).lean() as any;
      // Mirror to local MariaDB
      mariaQuery(
        `UPDATE payment_configs SET accountName = ?, accountNumber = ?, qrCodeUrl = ?, instructions = ?, isActive = ?, updatedBy = ? WHERE category = ?`,
        [doc.accountName, doc.accountNumber, doc.qrCodeUrl || "", doc.instructions || "", doc.isActive ? 1 : 0, doc.updatedBy || "Admin", category]
      ).catch(() => {});
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
    } catch (e) {}
  }
  // Offline: update local MariaDB only (will sync when back online)
  await mariaQuery(
    `UPDATE payment_configs SET accountName = ?, accountNumber = ?, qrCodeUrl = ?, instructions = ?, isActive = ?, updatedBy = ? WHERE category = ?`,
    [data.accountName || "MABUHAY HOMES HOA", data.accountNumber || "0917 123 4567", data.qrCodeUrl || "", data.instructions || "", data.isActive !== false ? 1 : 0, data.updatedBy || "Admin", category]
  );
  return getPaymentConfig(category);
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
    } catch (e) {
      markOffline();
    }
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
    } catch (e) {
      markOffline();
    }
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
      const docs = await PropertyViewing.find(query).sort({ createdAt: -1, _id: -1 }).lean();
      return docs.map((d: any) => ({
        ...serialize<PropertyViewingType>(d),
        id: d._id,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
      }));
    } catch (e) {}
  }
  return maria.getPropertyViewingsMariaDB(filter);
}

export async function createPropertyViewing(data: any): Promise<PropertyViewingType> {
  const online = await isOnlineMode();
  if (online) {
    try {
      await dbConnect();
      // Atomic conflict check for duplicate active reservation on the same property, date, and time
      const activeConflict = await PropertyViewing.findOne({
        listingId: Number(data.listingId),
        preferredDate: String(data.preferredDate),
        preferredTime: String(data.preferredTime),
        status: { $in: ["viewing_requested", "viewing_scheduled", "viewing_completed"] },
      }).lean();

      if (activeConflict) {
        throw new Error("This date and time are currently unavailable. Please select another available schedule.");
      }

      const id = data._id || data.id || (await getNextId(PropertyViewing));
      const doc = await PropertyViewing.create({ ...data, _id: id });
      const plain = (doc as any)?.toObject ? (doc as any).toObject() : doc;
      const res = {
        ...serialize<PropertyViewingType>(plain),
        id,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      };
      maria.createPropertyViewingMariaDB({ ...data, id }).catch(() => {});
      return res;
    } catch (e: any) {
      if (e?.message?.includes("unavailable")) throw e;
    }
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

