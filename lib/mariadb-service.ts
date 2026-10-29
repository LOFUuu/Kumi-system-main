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
import type { AuthUser } from "./db";

function toDateString(d: any): string | undefined {
  if (!d) return undefined;
  const date = new Date(d);
  return isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * Enqueue an offline mutation to sync_queue for synchronization once reconnected.
 */
export async function enqueueSync(
  tableName: string,
  recordId: number,
  operation: "INSERT" | "UPDATE" | "DELETE",
  payload: any
): Promise<void> {
  await mariaQuery(
    `INSERT INTO sync_queue (tableName, recordId, operation, payload, status, createdAt)
     VALUES (?, ?, ?, ?, 'pending', NOW())`,
    [tableName, recordId, operation, JSON.stringify(payload)]
  );
}

// ==========================================
// USERS
// ==========================================
export async function getUsersMariaDB(role?: string): Promise<UserType[]> {
  let sql = `SELECT * FROM users WHERE isArchived = 0`;
  const params: any[] = [];
  if (role) {
    sql += ` AND role = ?`;
    params.push(role);
  }
  sql += ` ORDER BY id ASC`;
  const rows = await mariaQuery<any[]>(sql, params);
  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    role: r.role,
    isActive: Boolean(r.isActive),
    address: r.address || undefined,
    blockNo: r.blockNo || undefined,
    lotNo: r.lotNo || undefined,
    phone: r.phone || undefined,
    gender: r.gender || undefined,
    householdMembers: r.householdMembers,
    householdHead: r.householdHead || undefined,
    cedula: r.cedula || undefined,
    emailVerified: Boolean(r.emailVerified),
    createdAt: toDateString(r.createdAt),
    isArchived: Boolean(r.isArchived),
  }));
}

export async function getArchivedUsersMariaDB(): Promise<UserType[]> {
  const rows = await mariaQuery<any[]>(`SELECT * FROM users WHERE isArchived = 1 ORDER BY archivedAt DESC, id DESC`);
  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    role: r.role,
    isActive: Boolean(r.isActive),
    address: r.address || undefined,
    blockNo: r.blockNo || undefined,
    lotNo: r.lotNo || undefined,
    phone: r.phone || undefined,
    cedula: r.cedula || undefined,
    createdAt: toDateString(r.createdAt),
    isArchived: true,
    archiveReason: r.archiveReason || undefined,
    archivedAt: toDateString(r.archivedAt),
  }));
}

export async function getUserByIdMariaDB(id: number | string): Promise<UserType | null> {
  const rows = await mariaQuery<any[]>(`SELECT * FROM users WHERE id = ? LIMIT 1`, [Number(id)]);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    role: r.role,
    isActive: Boolean(r.isActive),
    address: r.address || undefined,
    blockNo: r.blockNo || undefined,
    lotNo: r.lotNo || undefined,
    phone: r.phone || undefined,
    gender: r.gender || undefined,
    householdMembers: r.householdMembers,
    householdHead: r.householdHead || undefined,
    cedula: r.cedula || undefined,
    emailVerified: Boolean(r.emailVerified),
    createdAt: toDateString(r.createdAt),
    isArchived: Boolean(r.isArchived),
  };
}

export async function getUserByEmailForAuthMariaDB(email: string): Promise<AuthUser | null> {
  const rows = await mariaQuery<any[]>(`SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`, [email.trim()]);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    role: r.role,
    isActive: Boolean(r.isActive),
    address: r.address || undefined,
    blockNo: r.blockNo || undefined,
    lotNo: r.lotNo || undefined,
    phone: r.phone || undefined,
    gender: r.gender || undefined,
    householdMembers: r.householdMembers,
    householdHead: r.householdHead || undefined,
    cedula: r.cedula || undefined,
    emailVerified: Boolean(r.emailVerified),
    passwordHash: r.passwordHash || undefined,
    resetToken: r.resetToken || undefined,
    resetTokenExpiry: r.resetTokenExpiry ? new Date(r.resetTokenExpiry) : undefined,
    verificationToken: r.verificationToken || undefined,
    verificationTokenExpiry: r.verificationTokenExpiry ? new Date(r.verificationTokenExpiry) : undefined,
    isArchived: Boolean(r.isArchived),
    archiveReason: r.archiveReason || undefined,
    archivedAt: toDateString(r.archivedAt),
    createdAt: toDateString(r.createdAt),
  };
}

export async function createUserMariaDB(data: any): Promise<UserType> {
  let id = data.id || data._id;
  if (!id) {
    const maxRow = await mariaQuery<any[]>(`SELECT MAX(id) as maxId FROM users`);
    id = (maxRow[0]?.maxId || 0) + 1;
  }

  await mariaQuery(
    `INSERT INTO users (
      id, fullName, email, role, isActive, address, blockNo, lotNo, phone, gender,
      householdMembers, householdHead, passwordHash, resetToken, resetTokenExpiry,
      emailVerified, verificationToken, verificationTokenExpiry, cedula, isArchived
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      data.fullName,
      data.email,
      data.role || "resident",
      data.isActive !== false ? 1 : 0,
      data.address || null,
      data.blockNo || null,
      data.lotNo || null,
      data.phone || null,
      data.gender || null,
      data.householdMembers || 0,
      data.householdHead || null,
      data.passwordHash || null,
      data.resetToken || null,
      data.resetTokenExpiry || null,
      data.emailVerified ? 1 : 0,
      data.verificationToken || null,
      data.verificationTokenExpiry || null,
      data.cedula || null,
    ]
  );

  const created = await getUserByIdMariaDB(id);
  await enqueueSync("users", id, "INSERT", created);
  return created!;
}

export async function updateUserByIdMariaDB(id: number | string, data: any): Promise<UserType | null> {
  const fields: string[] = [];
  const params: any[] = [];

  const mappings: Record<string, string> = {
    fullName: "fullName",
    email: "email",
    role: "role",
    isActive: "isActive",
    address: "address",
    blockNo: "blockNo",
    lotNo: "lotNo",
    phone: "phone",
    gender: "gender",
    householdMembers: "householdMembers",
    householdHead: "householdHead",
    passwordHash: "passwordHash",
    resetToken: "resetToken",
    resetTokenExpiry: "resetTokenExpiry",
    emailVerified: "emailVerified",
    verificationToken: "verificationToken",
    verificationTokenExpiry: "verificationTokenExpiry",
    cedula: "cedula",
  };

  for (const [key, col] of Object.entries(mappings)) {
    if (data[key] !== undefined) {
      fields.push(`\`${col}\` = ?`);
      let val = data[key];
      if (typeof val === "boolean") val = val ? 1 : 0;
      params.push(val);
    }
  }

  if (fields.length > 0) {
    params.push(Number(id));
    await mariaQuery(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, params);
  }

  const updated = await getUserByIdMariaDB(id);
  if (updated) {
    await enqueueSync("users", Number(id), "UPDATE", updated);
  }
  return updated;
}

export async function deleteUserByIdMariaDB(id: number | string): Promise<boolean> {
  await mariaQuery(`DELETE FROM users WHERE id = ?`, [Number(id)]);
  await enqueueSync("users", Number(id), "DELETE", { id: Number(id) });
  return true;
}

export async function archiveUserMariaDB(id: number | string, reason?: string): Promise<boolean> {
  await mariaQuery(
    `UPDATE users SET isArchived = 1, archiveReason = ?, archivedAt = NOW() WHERE id = ?`,
    [reason || "Archived", Number(id)]
  );
  const updated = await getUserByIdMariaDB(id);
  await enqueueSync("users", Number(id), "UPDATE", updated);
  return true;
}

export async function unarchiveUserMariaDB(id: number | string): Promise<boolean> {
  await mariaQuery(
    `UPDATE users SET isArchived = 0, archiveReason = NULL, archivedAt = NULL WHERE id = ?`,
    [Number(id)]
  );
  const updated = await getUserByIdMariaDB(id);
  await enqueueSync("users", Number(id), "UPDATE", updated);
  return true;
}

// ==========================================
// LISTINGS
// ==========================================
export async function getListingsMariaDB(filter?: {
  status?: HouseListing["status"];
  verificationStatus?: HouseListing["verificationStatus"];
  includeArchived?: boolean;
  isArchived?: boolean;
}): Promise<HouseListing[]> {
  let sql = `SELECT * FROM listings WHERE 1=1`;
  const params: any[] = [];

  if (filter?.isArchived !== undefined) {
    sql += ` AND isArchived = ?`;
    params.push(filter.isArchived ? 1 : 0);
  } else if (!filter?.includeArchived) {
    sql += ` AND isArchived = 0`;
  }

  if (filter?.status) {
    sql += ` AND status = ?`;
    params.push(filter.status);
  }

  if (filter?.verificationStatus) {
    if (filter.verificationStatus === "verified") {
      sql += ` AND verificationStatus NOT IN ('pending', 'rejected')`;
    } else {
      sql += ` AND verificationStatus = ?`;
      params.push(filter.verificationStatus);
    }
  }

  sql += ` ORDER BY createdAt DESC, id DESC`;
  const rows = await mariaQuery<any[]>(sql, params);
  return rows.map((r) => ({
    id: r.id,
    houseName: r.houseName,
    address: r.address,
    blockNo: r.blockNo,
    lotNo: r.lotNo,
    price: Number(r.price),
    listingType: r.listingType,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    sqm: Number(r.sqm),
    status: r.status,
    transactionStatus: r.transactionStatus,
    ownerContactNumber: r.ownerContactNumber || undefined,
    ownerMessengerLink: r.ownerMessengerLink || undefined,
    description: r.description || "",
    ownerId: r.ownerId,
    ownerName: r.ownerName,
    images: r.images ? JSON.parse(r.images) : [],
    lat: r.lat,
    lng: r.lng,
    verificationStatus: r.verificationStatus,
    proofDocuments: r.proofDocuments ? JSON.parse(r.proofDocuments) : [],
    rejectionReason: r.rejectionReason || undefined,
    uploadedBy: r.uploadedBy || undefined,
    showOnMap: Boolean(r.showOnMap),
    siteVisitRecommended: Boolean(r.siteVisitRecommended),
    isArchived: Boolean(r.isArchived),
    archiveReason: r.archiveReason || undefined,
    archivedBy: r.archivedBy || undefined,
    archivedAt: toDateString(r.archivedAt),
    createdAt: toDateString(r.createdAt),
  }));
}

export async function getListingMariaDB(id: number | string): Promise<HouseListing | null> {
  const rows = await mariaQuery<any[]>(`SELECT * FROM listings WHERE id = ? LIMIT 1`, [Number(id)]);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    houseName: r.houseName,
    address: r.address,
    blockNo: r.blockNo,
    lotNo: r.lotNo,
    price: Number(r.price),
    listingType: r.listingType,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    sqm: Number(r.sqm),
    status: r.status,
    transactionStatus: r.transactionStatus,
    ownerContactNumber: r.ownerContactNumber || undefined,
    ownerMessengerLink: r.ownerMessengerLink || undefined,
    description: r.description || "",
    ownerId: r.ownerId,
    ownerName: r.ownerName,
    images: r.images ? JSON.parse(r.images) : [],
    lat: r.lat,
    lng: r.lng,
    verificationStatus: r.verificationStatus,
    proofDocuments: r.proofDocuments ? JSON.parse(r.proofDocuments) : [],
    rejectionReason: r.rejectionReason || undefined,
    uploadedBy: r.uploadedBy || undefined,
    showOnMap: Boolean(r.showOnMap),
    siteVisitRecommended: Boolean(r.siteVisitRecommended),
    isArchived: Boolean(r.isArchived),
    archiveReason: r.archiveReason || undefined,
    archivedBy: r.archivedBy || undefined,
    archivedAt: toDateString(r.archivedAt),
    createdAt: toDateString(r.createdAt),
  };
}

export async function createListingMariaDB(data: any): Promise<HouseListing> {
  let id = data.id || data._id;
  if (!id) {
    const maxRow = await mariaQuery<any[]>(`SELECT MAX(id) as maxId FROM listings`);
    id = (maxRow[0]?.maxId || 0) + 1;
  }

  await mariaQuery(
    `INSERT INTO listings (
      id, houseName, address, blockNo, lotNo, price, listingType, bedrooms, bathrooms,
      sqm, status, transactionStatus, ownerContactNumber, ownerMessengerLink, description,
      ownerId, ownerName, images, lat, lng, verificationStatus, proofDocuments,
      rejectionReason, uploadedBy, showOnMap, siteVisitRecommended, isArchived
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      data.houseName,
      data.address,
      data.blockNo,
      data.lotNo,
      data.price,
      data.listingType || "sale",
      data.bedrooms || 0,
      data.bathrooms || 0,
      data.sqm || 0,
      data.status || "available",
      data.transactionStatus || "available",
      data.ownerContactNumber || "",
      data.ownerMessengerLink || "",
      data.description || "",
      data.ownerId || null,
      data.ownerName || "",
      JSON.stringify(data.images || []),
      data.lat || 0,
      data.lng || 0,
      data.verificationStatus || "pending",
      JSON.stringify(data.proofDocuments || []),
      data.rejectionReason || null,
      data.uploadedBy || null,
      data.showOnMap !== false ? 1 : 0,
      data.siteVisitRecommended ? 1 : 0,
    ]
  );

  const created = await getListingMariaDB(id);
  await enqueueSync("listings", id, "INSERT", created);
  return created!;
}

export async function updateListingMariaDB(id: number | string, data: any): Promise<HouseListing | null> {
  const fields: string[] = [];
  const params: any[] = [];

  const mappings: Record<string, string> = {
    houseName: "houseName",
    address: "address",
    blockNo: "blockNo",
    lotNo: "lotNo",
    price: "price",
    listingType: "listingType",
    bedrooms: "bedrooms",
    bathrooms: "bathrooms",
    sqm: "sqm",
    status: "status",
    transactionStatus: "transactionStatus",
    ownerContactNumber: "ownerContactNumber",
    ownerMessengerLink: "ownerMessengerLink",
    description: "description",
    ownerId: "ownerId",
    ownerName: "ownerName",
    lat: "lat",
    lng: "lng",
    verificationStatus: "verificationStatus",
    rejectionReason: "rejectionReason",
    uploadedBy: "uploadedBy",
    showOnMap: "showOnMap",
    siteVisitRecommended: "siteVisitRecommended",
    isArchived: "isArchived",
    archiveReason: "archiveReason",
    archivedBy: "archivedBy",
  };

  for (const [key, col] of Object.entries(mappings)) {
    if (data[key] !== undefined) {
      fields.push(`\`${col}\` = ?`);
      let val = data[key];
      if (typeof val === "boolean") val = val ? 1 : 0;
      params.push(val);
    }
  }

  if (data.images !== undefined) {
    fields.push("`images` = ?");
    params.push(JSON.stringify(data.images));
  }
  if (data.proofDocuments !== undefined) {
    fields.push("`proofDocuments` = ?");
    params.push(JSON.stringify(data.proofDocuments));
  }

  if (fields.length > 0) {
    params.push(Number(id));
    await mariaQuery(`UPDATE listings SET ${fields.join(", ")} WHERE id = ?`, params);
  }

  const updated = await getListingMariaDB(id);
  if (updated) {
    await enqueueSync("listings", Number(id), "UPDATE", updated);
  }
  return updated;
}

// ==========================================
// AMENITIES
// ==========================================
export async function getAmenitiesMariaDB(): Promise<AmenityType[]> {
  const rows = await mariaQuery<any[]>(`SELECT * FROM amenities WHERE isArchived = 0 ORDER BY id ASC`);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description || "",
    maxCapacity: r.maxCapacity,
    rateWalkin: Number(r.rateWalkin),
    rateWhole: Number(r.rateWhole),
    ratePrivate: Number(r.ratePrivate),
    downpayment: Number(r.downpayment),
    downpaymentPrivate: Number(r.downpaymentPrivate),
    isActive: Boolean(r.isActive),
    isArchived: Boolean(r.isArchived),
    image: r.image || "",
    lat: r.lat,
    lng: r.lng,
    pricingModel: r.pricingModel || "per_head",
    basePrice: Number(r.basePrice || 0),
    pricePerPerson: Number(r.pricePerPerson || 0),
    includedGuests: Number(r.includedGuests || 1),
    extraGuestFee: Number(r.extraGuestFee || 0),
  }));
}

export async function getAmenityMariaDB(id: number | string): Promise<AmenityType | null> {
  const rows = await mariaQuery<any[]>(`SELECT * FROM amenities WHERE id = ? LIMIT 1`, [Number(id)]);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    description: r.description || "",
    maxCapacity: r.maxCapacity,
    rateWalkin: Number(r.rateWalkin),
    rateWhole: Number(r.rateWhole),
    ratePrivate: Number(r.ratePrivate),
    downpayment: Number(r.downpayment),
    downpaymentPrivate: Number(r.downpaymentPrivate),
    isActive: Boolean(r.isActive),
    isArchived: Boolean(r.isArchived),
    image: r.image || "",
    lat: r.lat,
    lng: r.lng,
    pricingModel: r.pricingModel || "per_head",
    basePrice: Number(r.basePrice || 0),
    pricePerPerson: Number(r.pricePerPerson || 0),
    includedGuests: Number(r.includedGuests || 1),
    extraGuestFee: Number(r.extraGuestFee || 0),
  };
}

export async function createAmenityMariaDB(data: any): Promise<AmenityType> {
  let id = data.id || data._id;
  if (!id) {
    const maxRow = await mariaQuery<any[]>(`SELECT MAX(id) as maxId FROM amenities`);
    id = (maxRow[0]?.maxId || 0) + 1;
  }
  await mariaQuery(
    `INSERT INTO amenities (
      id, name, description, maxCapacity, rateWalkin, rateWhole, ratePrivate, 
      downpayment, downpaymentPrivate, isActive, isArchived, image, lat, lng,
      pricingModel, basePrice, pricePerPerson, includedGuests, extraGuestFee
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), isActive=VALUES(isActive), pricingModel=VALUES(pricingModel)`,
    [
      id,
      data.name || "",
      data.description || "",
      Number(data.maxCapacity) || 50,
      Number(data.rateWalkin) || 0,
      Number(data.rateWhole) || 0,
      Number(data.ratePrivate) || 0,
      Number(data.downpayment) || 200,
      Number(data.downpaymentPrivate) || 500,
      data.isActive !== false ? 1 : 0,
      data.image || "",
      data.lat || 0,
      data.lng || 0,
      data.pricingModel || "per_head",
      Number(data.basePrice) || 0,
      Number(data.pricePerPerson) || 0,
      Number(data.includedGuests) || 1,
      Number(data.extraGuestFee) || 0,
    ]
  );
  const result = await getAmenityMariaDB(id);
  return result!;
}

export async function updateAmenityMariaDB(id: number | string, data: any): Promise<AmenityType | null> {
  const fields: string[] = [];
  const params: any[] = [];
  const mappings: Record<string, string> = {
    name: "name", description: "description", maxCapacity: "maxCapacity",
    rateWalkin: "rateWalkin", rateWhole: "rateWhole", ratePrivate: "ratePrivate",
    downpayment: "downpayment", downpaymentPrivate: "downpaymentPrivate",
    isActive: "isActive", isArchived: "isArchived", image: "image", lat: "lat", lng: "lng",
    pricingModel: "pricingModel", basePrice: "basePrice", pricePerPerson: "pricePerPerson",
    includedGuests: "includedGuests", extraGuestFee: "extraGuestFee",
  };
  for (const [key, col] of Object.entries(mappings)) {
    if (data[key] !== undefined) {
      fields.push(`\`${col}\` = ?`);
      let val = data[key];
      if (typeof val === "boolean") val = val ? 1 : 0;
      params.push(val);
    }
  }
  if (fields.length > 0) {
    params.push(Number(id));
    await mariaQuery(`UPDATE amenities SET ${fields.join(", ")} WHERE id = ?`, params);
  }
  return getAmenityMariaDB(id);
}

// ==========================================
// ANNOUNCEMENTS
// ==========================================
export async function getAnnouncementsMariaDB(activeOnly = false): Promise<AnnouncementType[]> {
  let sql = `SELECT * FROM announcements`;
  if (activeOnly) sql += ` WHERE status = 'active'`;
  sql += ` ORDER BY id DESC`;
  const rows = await mariaQuery<any[]>(sql);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content || "",
    postDate: r.postDate || "",
    status: r.status,
    poster: r.poster || "HOA",
  }));
}

export async function createAnnouncementMariaDB(data: any): Promise<AnnouncementType> {
  const title = String(data.title || "");
  const content = String(data.content || "");
  const postDate = String(data.postDate || new Date().toISOString().split("T")[0]);
  const status = String(data.status || "active");
  const poster = String(data.poster || "Admin");

  let id = Number(data.id);
  if (!id) {
    const rows = await mariaQuery<any[]>(`SELECT MAX(id) as maxId FROM announcements`);
    id = (rows[0]?.maxId || 0) + 1;
  }

  await mariaQuery(
    `INSERT INTO announcements (id, title, content, postDate, status, poster) VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content), status = VALUES(status)`,
    [id, title, content, postDate, status, poster]
  );

  const item: AnnouncementType = { id, title, content, postDate, status: status as any, poster };
  await enqueueSync("announcements", id, "INSERT", item).catch(() => {});
  return item;
}

export async function updateAnnouncementMariaDB(id: number | string, data: any): Promise<AnnouncementType | null> {
  const fields: string[] = [];
  const params: any[] = [];
  if (data.title !== undefined) { fields.push("title = ?"); params.push(String(data.title)); }
  if (data.content !== undefined) { fields.push("content = ?"); params.push(String(data.content)); }
  if (data.status !== undefined) { fields.push("status = ?"); params.push(String(data.status)); }
  if (data.poster !== undefined) { fields.push("poster = ?"); params.push(String(data.poster)); }

  if (fields.length > 0) {
    params.push(Number(id));
    await mariaQuery(`UPDATE announcements SET ${fields.join(", ")} WHERE id = ?`, params);
  }

  const rows = await mariaQuery<any[]>(`SELECT * FROM announcements WHERE id = ?`, [Number(id)]);
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  const updated: AnnouncementType = {
    id: r.id,
    title: r.title,
    content: r.content || "",
    postDate: r.postDate || "",
    status: r.status,
    poster: r.poster || "HOA",
  };
  await enqueueSync("announcements", Number(id), "UPDATE", updated).catch(() => {});
  return updated;
}

export async function deleteAnnouncementMariaDB(id: number | string): Promise<boolean> {
  await mariaQuery(`DELETE FROM announcements WHERE id = ?`, [Number(id)]);
  await enqueueSync("announcements", Number(id), "DELETE", { id: Number(id) }).catch(() => {});
  return true;
}

// ==========================================
// RESERVATIONS
// ==========================================
function rowToReservation(r: any): ReservationType {
  let breakdown = undefined;
  if (r.pricingBreakdown) {
    try {
      breakdown = typeof r.pricingBreakdown === "string" ? JSON.parse(r.pricingBreakdown) : r.pricingBreakdown;
    } catch {}
  }
  return {
    id: r.id,
    amenityId: r.amenityId,
    amenityName: r.amenityName || "",
    residentName: r.residentName || "",
    phone: r.phone || undefined,
    bookingType: r.bookingType,
    reservationType: r.reservationType,
    date: r.date,
    paxCount: r.paxCount,
    downpayment: Number(r.downpayment),
    totalAmount: Number(r.totalAmount),
    status: r.status,
    notes: r.notes || undefined,
    userEmail: r.userEmail || undefined,
    approvedAt: r.approvedAt || undefined,
    gcashRef: r.gcashRef || undefined,
    receiptPath: r.receiptPath || undefined,
    pricingModel: r.pricingModel || "per_head",
    pricingBreakdown: breakdown,
    cancelledAt: toDateString(r.cancelledAt),
    cancelledBy: r.cancelledBy || undefined,
    cancelReason: r.cancelReason || undefined,
    isArchived: Boolean(r.isArchived),
    archiveReason: r.archiveReason || undefined,
    archivedAt: toDateString(r.archivedAt),
  };
}

export async function getReservationsMariaDB(includeArchived = false): Promise<ReservationType[]> {
  const sql = includeArchived
    ? `SELECT * FROM reservations ORDER BY id DESC`
    : `SELECT * FROM reservations WHERE isArchived = 0 ORDER BY id DESC`;
  const rows = await mariaQuery<any[]>(sql);
  return rows.map(rowToReservation);
}

export async function getArchivedReservationsMariaDB(): Promise<ReservationType[]> {
  const rows = await mariaQuery<any[]>(
    `SELECT * FROM reservations WHERE isArchived = 1 ORDER BY archivedAt DESC, id DESC`
  );
  return rows.map(rowToReservation);
}

export async function archiveReservationMariaDB(
  id: number | string,
  reason?: string
): Promise<ReservationType | null> {
  const now = new Date().toISOString();
  await mariaQuery(
    `UPDATE reservations SET isArchived = 1, archivedAt = ?, archiveReason = ? WHERE id = ?`,
    [now, reason || "Archived by Administrator", Number(id)]
  );
  const rows = await mariaQuery<any[]>(`SELECT * FROM reservations WHERE id = ?`, [Number(id)]);
  if (!rows.length) return null;
  const result = rowToReservation(rows[0]);
  await enqueueSync("reservations", Number(id), "UPDATE", result);
  return result;
}

export async function unarchiveReservationMariaDB(
  id: number | string
): Promise<{ ok: boolean; error?: string; reservation?: ReservationType }> {
  const rows = await mariaQuery<any[]>(`SELECT * FROM reservations WHERE id = ? LIMIT 1`, [Number(id)]);
  if (!rows.length) return { ok: false, error: "Reservation not found." };
  const r = rows[0];
  // If previously approved, check for slot conflicts
  if (r.status === "approved") {
    const conflicts = await mariaQuery<any[]>(
      `SELECT id FROM reservations WHERE id != ? AND amenityId = ? AND date = ? AND bookingType = ? AND status = 'approved' AND isArchived = 0 LIMIT 1`,
      [Number(id), r.amenityId, r.date, r.bookingType]
    );
    if (conflicts.length > 0) {
      return {
        ok: false,
        error: `Slot conflict: Amenity on ${r.date} (${r.bookingType} session) is already occupied by an active approved reservation.`,
      };
    }
  }
  await mariaQuery(
    `UPDATE reservations SET isArchived = 0, archivedAt = NULL, archiveReason = NULL WHERE id = ?`,
    [Number(id)]
  );
  const updated = await mariaQuery<any[]>(`SELECT * FROM reservations WHERE id = ?`, [Number(id)]);
  const result = rowToReservation(updated[0]);
  await enqueueSync("reservations", Number(id), "UPDATE", result);
  return { ok: true, reservation: result };
}

export async function deleteReservationMariaDB(
  id: number | string
): Promise<{ ok: boolean; error?: string }> {
  const rows = await mariaQuery<any[]>(`SELECT id FROM reservations WHERE id = ? LIMIT 1`, [Number(id)]);
  if (!rows.length) return { ok: false, error: "Reservation not found." };
  // Void linked transactions
  await mariaQuery(
    `UPDATE transactions SET status = 'voided' WHERE refType = 'amenity' AND refId = ?`,
    [Number(id)]
  );
  await mariaQuery(`DELETE FROM reservations WHERE id = ?`, [Number(id)]);
  await enqueueSync("reservations", Number(id), "DELETE", { id: Number(id) });
  return { ok: true };
}

export async function createReservationMariaDB(data: any): Promise<ReservationType> {
  let id = data.id || data._id;
  if (!id) {
    const maxRow = await mariaQuery<any[]>(`SELECT MAX(id) as maxId FROM reservations`);
    id = (maxRow[0]?.maxId || 0) + 1;
  }

  const breakdownJson = data.pricingBreakdown
    ? (typeof data.pricingBreakdown === "string" ? data.pricingBreakdown : JSON.stringify(data.pricingBreakdown))
    : null;

  await mariaQuery(
    `INSERT INTO reservations (
      id, amenityId, amenityName, residentName, phone, bookingType, reservationType,
      date, paxCount, downpayment, totalAmount, status, notes, userEmail, approvedAt,
      gcashRef, receiptPath, pricingModel, pricingBreakdown, cancelledAt, cancelledBy, cancelReason, isArchived
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      data.amenityId || null,
      data.amenityName || "",
      data.residentName || "",
      data.phone || null,
      data.bookingType || "day",
      data.reservationType || "public",
      data.date || "",
      data.paxCount || 1,
      data.downpayment || 0,
      data.totalAmount || 0,
      data.status || "pending",
      data.notes || null,
      data.userEmail || null,
      data.approvedAt || null,
      data.gcashRef || null,
      data.receiptPath || null,
      data.pricingModel || "per_head",
      breakdownJson,
      data.cancelledAt ? new Date(data.cancelledAt) : null,
      data.cancelledBy || null,
      data.cancelReason || null,
    ]
  );

  const resRows = await mariaQuery<any[]>(`SELECT * FROM reservations WHERE id = ?`, [id]);
  const r = resRows[0];
  const created: ReservationType = rowToReservation(r);

  await enqueueSync("reservations", id, "INSERT", created);
  return created;
}

export async function updateReservationMariaDB(id: number | string, data: any): Promise<ReservationType | null> {
  const fields: string[] = [];
  const params: any[] = [];

  const mappings: Record<string, string> = {
    status: "status",
    notes: "notes",
    approvedAt: "approvedAt",
    gcashRef: "gcashRef",
    receiptPath: "receiptPath",
    pricingModel: "pricingModel",
    pricingBreakdown: "pricingBreakdown",
    cancelledAt: "cancelledAt",
    cancelledBy: "cancelledBy",
    cancelReason: "cancelReason",
    isArchived: "isArchived",
    archiveReason: "archiveReason",
    totalAmount: "totalAmount",
    downpayment: "downpayment",
    phone: "phone",
    paxCount: "paxCount",
  };

  for (const [key, col] of Object.entries(mappings)) {
    if (data[key] !== undefined) {
      fields.push(`\`${col}\` = ?`);
      let val = data[key];
      if (typeof val === "boolean") val = val ? 1 : 0;
      if (key === "pricingBreakdown" && val && typeof val === "object") {
        val = JSON.stringify(val);
      }
      if (key === "cancelledAt" && val) {
        val = new Date(val);
      }
      params.push(val);
    }
  }

  if (fields.length > 0) {
    params.push(Number(id));
    await mariaQuery(`UPDATE reservations SET ${fields.join(", ")} WHERE id = ?`, params);
  }

  const resRows = await mariaQuery<any[]>(`SELECT * FROM reservations WHERE id = ?`, [Number(id)]);
  if (!resRows.length) return null;
  const updated: ReservationType = rowToReservation(resRows[0]);

  await enqueueSync("reservations", Number(id), "UPDATE", updated);
  return updated;
}

// ==========================================
// DUES
// ==========================================
export async function getDuesMariaDB(): Promise<DuesType[]> {
  const rows = await mariaQuery<any[]>(`SELECT * FROM dues ORDER BY dueMonth DESC, residentName ASC`);
  return rows.map((r) => ({
    id: r.id,
    residentId: r.residentId || undefined,
    residentName: r.residentName,
    blockNo: r.blockNo || "",
    lotNo: r.lotNo || "",
    dueMonth: r.dueMonth,
    dueDate: r.dueDate || "",
    amountDue: Number(r.amountDue),
    amountPaid: Number(r.amountPaid),
    paidAt: r.paidAt || undefined,
    creditBalance: Number(r.creditBalance),
    status: r.status,
    source: r.source || "system",
    billingMonth: r.billingMonth || undefined,
    billingYear: r.billingYear || undefined,
  }));
}

export async function createDuesRecordMariaDB(data: any): Promise<DuesType> {
  let id = data.id || data._id;
  if (!id) {
    const maxRow = await mariaQuery<any[]>(`SELECT MAX(id) as maxId FROM dues`);
    id = (maxRow[0]?.maxId || 0) + 1;
  }

  await mariaQuery(
    `INSERT INTO dues (
      id, residentId, residentName, blockNo, lotNo, dueMonth, dueDate, amountDue,
      amountPaid, paidAt, creditBalance, status, source, billingMonth, billingYear
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.residentId || null,
      data.residentName,
      data.blockNo || "",
      data.lotNo || "",
      data.dueMonth,
      data.dueDate || "",
      data.amountDue || 100,
      data.amountPaid || 0,
      data.paidAt || null,
      data.creditBalance || 0,
      data.status || "unpaid",
      data.source || "manual",
      data.billingMonth || null,
      data.billingYear || null,
    ]
  );

  const resRows = await mariaQuery<any[]>(`SELECT * FROM dues WHERE id = ?`, [id]);
  const r = resRows[0];
  const created: DuesType = {
    id: r.id,
    residentId: r.residentId || undefined,
    residentName: r.residentName,
    blockNo: r.blockNo || "",
    lotNo: r.lotNo || "",
    dueMonth: r.dueMonth,
    dueDate: r.dueDate || "",
    amountDue: Number(r.amountDue),
    amountPaid: Number(r.amountPaid),
    paidAt: r.paidAt || undefined,
    creditBalance: Number(r.creditBalance),
    status: r.status,
    source: r.source || "manual",
    billingMonth: r.billingMonth || undefined,
    billingYear: r.billingYear || undefined,
  };

  await enqueueSync("dues", id, "INSERT", created);
  return created;
}

export async function updateDuesRecordMariaDB(id: number | string, data: any): Promise<DuesType | null> {
  const fields: string[] = [];
  const params: any[] = [];

  const mappings: Record<string, string> = {
    amountPaid: "amountPaid",
    paidAt: "paidAt",
    creditBalance: "creditBalance",
    status: "status",
  };

  for (const [key, col] of Object.entries(mappings)) {
    if (data[key] !== undefined) {
      fields.push(`\`${col}\` = ?`);
      params.push(data[key]);
    }
  }

  if (fields.length > 0) {
    params.push(Number(id));
    await mariaQuery(`UPDATE dues SET ${fields.join(", ")} WHERE id = ?`, params);
  }

  const resRows = await mariaQuery<any[]>(`SELECT * FROM dues WHERE id = ?`, [Number(id)]);
  if (!resRows.length) return null;
  const r = resRows[0];
  const updated: DuesType = {
    id: r.id,
    residentId: r.residentId || undefined,
    residentName: r.residentName,
    blockNo: r.blockNo || "",
    lotNo: r.lotNo || "",
    dueMonth: r.dueMonth,
    dueDate: r.dueDate || "",
    amountDue: Number(r.amountDue),
    amountPaid: Number(r.amountPaid),
    paidAt: r.paidAt || undefined,
    creditBalance: Number(r.creditBalance),
    status: r.status,
    source: r.source || "system",
    billingMonth: r.billingMonth || undefined,
    billingYear: r.billingYear || undefined,
  };

  await enqueueSync("dues", Number(id), "UPDATE", updated);
  return updated;
}

export async function deleteDuesRecordMariaDB(id: number | string): Promise<boolean> {
  const numId = Number(id);
  await mariaQuery(`DELETE FROM dues WHERE id = ?`, [numId]);
  await enqueueSync("dues", numId, "DELETE", { id: numId });
  return true;
}

export async function deleteDuesRecordsMariaDB(ids: (number | string)[]): Promise<number> {
  const numIds = ids.map(Number).filter((n) => !isNaN(n));
  if (numIds.length === 0) return 0;
  const placeholders = numIds.map(() => "?").join(",");
  await mariaQuery(`DELETE FROM dues WHERE id IN (${placeholders})`, numIds);
  for (const numId of numIds) {
    await enqueueSync("dues", numId, "DELETE", { id: numId });
  }
  return numIds.length;
}

// ==========================================
// TRANSACTIONS
// ==========================================
export async function getTransactionsMariaDB(): Promise<TransactionType[]> {
  const rows = await mariaQuery<any[]>(`SELECT * FROM transactions WHERE isArchived = 0 ORDER BY id DESC`);
  return rows.map((r) => ({
    id: r.id,
    residentName: r.residentName || "",
    refType: r.refType,
    refId: r.refId,
    userEmail: r.userEmail || undefined,
    amount: Number(r.amount),
    paymentMethod: r.paymentMethod,
    gcashRef: r.gcashRef || undefined,
    receiptPath: r.receiptPath || undefined,
    status: r.status,
    payment: r.payment ? JSON.parse(r.payment) : undefined,
    createdAt: toDateString(r.createdAt) || new Date().toISOString(),
    isArchived: Boolean(r.isArchived),
  }));
}

export async function createTransactionMariaDB(data: any): Promise<TransactionType> {
  let id = data.id || data._id;
  if (!id) {
    const maxRow = await mariaQuery<any[]>(`SELECT MAX(id) as maxId FROM transactions`);
    id = (maxRow[0]?.maxId || 0) + 1;
  }

  await mariaQuery(
    `INSERT INTO transactions (
      id, residentName, refType, refId, userEmail, amount, paymentMethod, gcashRef,
      receiptPath, status, payment, isArchived
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      data.residentName || "",
      data.refType || "amenity",
      data.refId || 0,
      data.userEmail || null,
      data.amount || 0,
      data.paymentMethod || "gcash",
      data.gcashRef || null,
      data.receiptPath || null,
      data.status || "pending",
      data.payment ? JSON.stringify(data.payment) : null,
    ]
  );

  const resRows = await mariaQuery<any[]>(`SELECT * FROM transactions WHERE id = ?`, [id]);
  const r = resRows[0];
  const created: TransactionType = {
    id: r.id,
    residentName: r.residentName || "",
    refType: r.refType,
    refId: r.refId,
    userEmail: r.userEmail || undefined,
    amount: Number(r.amount),
    paymentMethod: r.paymentMethod,
    gcashRef: r.gcashRef || undefined,
    receiptPath: r.receiptPath || undefined,
    status: r.status,
    payment: r.payment ? JSON.parse(r.payment) : undefined,
    createdAt: toDateString(r.createdAt) || new Date().toISOString(),
    isArchived: false,
  };

  await enqueueSync("transactions", id, "INSERT", created);
  return created;
}

export async function updateTransactionByIdMariaDB(id: number | string, data: any): Promise<TransactionType | null> {
  const fields: string[] = [];
  const params: any[] = [];

  if (data.status !== undefined) {
    fields.push("`status` = ?");
    params.push(data.status);
  }
  if (data.paymentMethod !== undefined) {
    fields.push("`paymentMethod` = ?");
    params.push(data.paymentMethod);
  }
  if (data.gcashRef !== undefined) {
    fields.push("`gcashRef` = ?");
    params.push(data.gcashRef);
  }
  if (data.receiptPath !== undefined) {
    fields.push("`receiptPath` = ?");
    params.push(data.receiptPath);
  }

  if (fields.length > 0) {
    params.push(Number(id));
    await mariaQuery(`UPDATE transactions SET ${fields.join(", ")} WHERE id = ?`, params);
  }

  const resRows = await mariaQuery<any[]>(`SELECT * FROM transactions WHERE id = ?`, [Number(id)]);
  if (!resRows.length) return null;
  const r = resRows[0];
  const updated: TransactionType = {
    id: r.id,
    residentName: r.residentName || "",
    refType: r.refType,
    refId: r.refId,
    userEmail: r.userEmail || undefined,
    amount: Number(r.amount),
    paymentMethod: r.paymentMethod,
    gcashRef: r.gcashRef || undefined,
    receiptPath: r.receiptPath || undefined,
    status: r.status,
    payment: r.payment ? JSON.parse(r.payment) : undefined,
    createdAt: toDateString(r.createdAt) || new Date().toISOString(),
    isArchived: Boolean(r.isArchived),
  };

  await enqueueSync("transactions", Number(id), "UPDATE", updated);
  return updated;
}

// ==========================================
// PROPERTY VIEWINGS
// ==========================================
export async function getPropertyViewingsMariaDB(filter?: { residentEmail?: string; listingId?: number }): Promise<PropertyViewingType[]> {
  let sql = `SELECT * FROM property_viewings WHERE 1=1`;
  const params: any[] = [];
  if (filter?.residentEmail) {
    sql += ` AND residentEmail = ?`;
    params.push(filter.residentEmail.toLowerCase());
  }
  if (filter?.listingId) {
    sql += ` AND listingId = ?`;
    params.push(filter.listingId);
  }
  sql += ` ORDER BY createdAt DESC, id DESC`;
  const rows = await mariaQuery<any[]>(sql, params);
  return rows.map((r) => ({
    id: r.id,
    listingId: r.listingId,
    listingName: r.listingName,
    residentName: r.residentName,
    residentEmail: r.residentEmail,
    preferredDate: r.preferredDate,
    preferredTime: r.preferredTime,
    message: r.message || "",
    status: r.status,
    adminNotes: r.adminNotes || "",
    scheduledAt: r.scheduledAt || undefined,
    createdAt: toDateString(r.createdAt),
  }));
}

export async function createPropertyViewingMariaDB(data: any): Promise<PropertyViewingType> {
  // Check for active reservation on the same property, date, and time
  const conflict = await mariaQuery<any[]>(
    `SELECT id FROM property_viewings 
     WHERE listingId = ? AND preferredDate = ? AND preferredTime = ? 
     AND status IN ('viewing_requested', 'viewing_scheduled', 'viewing_completed') LIMIT 1`,
    [data.listingId, data.preferredDate, data.preferredTime]
  );
  if (conflict && conflict.length > 0) {
    throw new Error("This date and time are currently unavailable. Please select another available schedule.");
  }

  let id = data.id || data._id;
  if (!id) {
    const maxRow = await mariaQuery<any[]>(`SELECT MAX(id) as maxId FROM property_viewings`);
    id = (maxRow[0]?.maxId || 0) + 1;
  }

  await mariaQuery(
    `INSERT INTO property_viewings (
      id, listingId, listingName, residentName, residentEmail, preferredDate,
      preferredTime, message, status, adminNotes, scheduledAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.listingId,
      data.listingName,
      data.residentName,
      data.residentEmail,
      data.preferredDate,
      data.preferredTime,
      data.message || "",
      data.status || "viewing_requested",
      data.adminNotes || "",
      data.scheduledAt || null,
    ]
  );

  const rows = await mariaQuery<any[]>(`SELECT * FROM property_viewings WHERE id = ?`, [id]);
  const r = rows[0];
  const created: PropertyViewingType = {
    id: r.id,
    listingId: r.listingId,
    listingName: r.listingName,
    residentName: r.residentName,
    residentEmail: r.residentEmail,
    preferredDate: r.preferredDate,
    preferredTime: r.preferredTime,
    message: r.message || "",
    status: r.status,
    adminNotes: r.adminNotes || "",
    scheduledAt: r.scheduledAt || undefined,
    createdAt: toDateString(r.createdAt),
  };

  await enqueueSync("property_viewings", id, "INSERT", created);
  return created;
}

export async function updatePropertyViewingMariaDB(id: number | string, data: any): Promise<PropertyViewingType | null> {
  const fields: string[] = [];
  const params: any[] = [];

  if (data.status !== undefined) {
    fields.push("`status` = ?");
    params.push(data.status);
  }
  if (data.adminNotes !== undefined) {
    fields.push("`adminNotes` = ?");
    params.push(data.adminNotes);
  }
  if (data.scheduledAt !== undefined) {
    fields.push("`scheduledAt` = ?");
    params.push(data.scheduledAt);
  }

  if (fields.length > 0) {
    params.push(Number(id));
    await mariaQuery(`UPDATE property_viewings SET ${fields.join(", ")} WHERE id = ?`, params);
  }

  const rows = await mariaQuery<any[]>(`SELECT * FROM property_viewings WHERE id = ?`, [Number(id)]);
  if (!rows.length) return null;
  const r = rows[0];
  const updated: PropertyViewingType = {
    id: r.id,
    listingId: r.listingId,
    listingName: r.listingName,
    residentName: r.residentName,
    residentEmail: r.residentEmail,
    preferredDate: r.preferredDate,
    preferredTime: r.preferredTime,
    message: r.message || "",
    status: r.status,
    adminNotes: r.adminNotes || "",
    scheduledAt: r.scheduledAt || undefined,
    createdAt: toDateString(r.createdAt),
  };

  await enqueueSync("property_viewings", Number(id), "UPDATE", updated);
  return updated;
}

export async function createNotificationMariaDB(data: any): Promise<NotificationType> {
  const maxRows = await mariaQuery<any[]>("SELECT MAX(id) as maxId FROM notifications");
  const nextId = (maxRows[0]?.maxId || 0) + 1;
  const metadataStr = data.metadata ? JSON.stringify(data.metadata) : null;

  await mariaQuery(
    `INSERT INTO notifications (id, userId, userEmail, title, message, type, referenceId, link, isRead, metadata, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      nextId,
      data.userId ? String(data.userId) : null,
      data.userEmail ? data.userEmail.toLowerCase().trim() : null,
      data.title,
      data.message,
      data.type || "general",
      data.referenceId || null,
      data.link || "",
      data.isRead ? 1 : 0,
      metadataStr,
    ]
  );

  return {
    id: nextId,
    userId: data.userId,
    userEmail: data.userEmail,
    title: data.title,
    message: data.message,
    type: data.type || "general",
    referenceId: data.referenceId,
    link: data.link || "",
    isRead: Boolean(data.isRead),
    metadata: data.metadata,
    createdAt: new Date().toISOString(),
  };
}

export async function getUserNotificationsMariaDB(userIdentifier: { id?: number | string; email?: string }): Promise<NotificationType[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (userIdentifier.id !== undefined && userIdentifier.id !== null) {
    conditions.push("userId = ?");
    params.push(String(userIdentifier.id));
  }
  if (userIdentifier.email) {
    conditions.push("userEmail = ?");
    params.push(userIdentifier.email.toLowerCase().trim());
  }

  if (conditions.length === 0) return [];

  const rows = await mariaQuery<any[]>(
    `SELECT * FROM notifications WHERE ${conditions.join(" OR ")} ORDER BY id DESC LIMIT 50`,
    params
  );

  return rows.map((r) => {
    let metadata: any = undefined;
    if (r.metadata) {
      try {
        metadata = JSON.parse(r.metadata);
      } catch {}
    }
    return {
      id: r.id,
      userId: r.userId,
      userEmail: r.userEmail,
      title: r.title,
      message: r.message,
      type: r.type,
      referenceId: r.referenceId,
      link: r.link,
      isRead: Boolean(r.isRead),
      metadata,
      createdAt: toDateString(r.createdAt),
    };
  });
}

export async function markNotificationReadMariaDB(id: number | string): Promise<boolean> {
  await mariaQuery(`UPDATE notifications SET isRead = 1 WHERE id = ?`, [Number(id)]);
  return true;
}

export async function markAllNotificationsReadMariaDB(userIdentifier: { id?: number | string; email?: string }): Promise<boolean> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (userIdentifier.id !== undefined && userIdentifier.id !== null) {
    conditions.push("userId = ?");
    params.push(String(userIdentifier.id));
  }
  if (userIdentifier.email) {
    conditions.push("userEmail = ?");
    params.push(userIdentifier.email.toLowerCase().trim());
  }

  if (conditions.length === 0) return true;

  await mariaQuery(`UPDATE notifications SET isRead = 1 WHERE ${conditions.join(" OR ")}`, params);
  return true;
}
