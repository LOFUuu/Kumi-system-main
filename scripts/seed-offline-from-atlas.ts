import "./load-env";
import dbConnect from "../lib/mongoose";
import {
  User,
  Listing,
  Amenity,
  Announcement,
  Reservation,
  DuesRecord,
  Transaction,
  PropertyViewing,
  PaymentConfig,
} from "../models";
import { mariaQuery } from "../lib/mariadb";

function toMySqlDateTime(date: any): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

async function mirrorAtlasToMariaDB() {
  console.log("==> Connecting to MongoDB Atlas (READ-ONLY) to mirror existing records...");
  await dbConnect();
  console.log("==> Connected to Atlas. Fetching records...");

  // 1. Users
  const users = await User.find().lean();
  console.log(`==> Found ${users.length} users in Atlas. Mirroring to local MariaDB...`);
  for (const u of users as any[]) {
    await mariaQuery(
      `INSERT INTO users (
        id, fullName, email, role, isActive, address, blockNo, lotNo, phone, gender,
        householdMembers, householdHead, passwordHash, resetToken, resetTokenExpiry,
        emailVerified, verificationToken, verificationTokenExpiry, cedula, isArchived,
        archiveReason, archivedAt, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        fullName=VALUES(fullName), role=VALUES(role), isActive=VALUES(isActive),
        passwordHash=VALUES(passwordHash), blockNo=VALUES(blockNo), lotNo=VALUES(lotNo);`,
      [
        Number(u._id) || 0,
        u.fullName || "",
        u.email || "",
        u.role || "resident",
        u.isActive !== false ? 1 : 0,
        u.address || null,
        u.blockNo || null,
        u.lotNo || null,
        u.phone || null,
        u.gender || null,
        Number(u.householdMembers) || 0,
        u.householdHead || null,
        u.passwordHash || u.password || null,
        u.resetToken || null,
        toMySqlDateTime(u.resetTokenExpiry),
        u.emailVerified ? 1 : 0,
        u.verificationToken || null,
        toMySqlDateTime(u.verificationTokenExpiry),
        u.cedula || null,
        u.isArchived ? 1 : 0,
        u.archiveReason || null,
        toMySqlDateTime(u.archivedAt),
        toMySqlDateTime(u.createdAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
        toMySqlDateTime(u.updatedAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
      ]
    );
  }

  // 2. Listings
  const listings = await Listing.find().lean();
  console.log(`==> Found ${listings.length} listings in Atlas. Mirroring...`);
  for (const l of listings as any[]) {
    await mariaQuery(
      `INSERT INTO listings (
        id, houseName, address, blockNo, lotNo, price, listingType, bedrooms, bathrooms,
        sqm, status, transactionStatus, ownerContactNumber, ownerMessengerLink, description,
        ownerId, ownerName, images, lat, lng, verificationStatus, proofDocuments,
        rejectionReason, uploadedBy, showOnMap, siteVisitRecommended, isArchived,
        archiveReason, archivedBy, archivedAt, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        houseName=VALUES(houseName), price=VALUES(price), status=VALUES(status);`,
      [
        Number(l._id),
        l.houseName || "",
        l.address || "",
        l.blockNo || "",
        l.lotNo || "",
        Number(l.price) || 0,
        l.listingType || "sale",
        Number(l.bedrooms) || 0,
        Number(l.bathrooms) || 0,
        Number(l.sqm) || 0,
        l.status || "available",
        l.transactionStatus || "available",
        l.ownerContactNumber || "",
        l.ownerMessengerLink || "",
        l.description || "",
        Number(l.ownerId) || null,
        l.ownerName || "",
        JSON.stringify(l.images || []),
        Number(l.lat) || 0,
        Number(l.lng) || 0,
        l.verificationStatus || "pending",
        JSON.stringify(l.proofDocuments || []),
        l.rejectionReason || null,
        Number(l.uploadedBy) || null,
        l.showOnMap !== false ? 1 : 0,
        l.siteVisitRecommended ? 1 : 0,
        l.isArchived ? 1 : 0,
        l.archiveReason || null,
        l.archivedBy || null,
        toMySqlDateTime(l.archivedAt),
        toMySqlDateTime(l.createdAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
        toMySqlDateTime(l.updatedAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
      ]
    );
  }

  // 3. Amenities
  const amenities = await Amenity.find().lean();
  console.log(`==> Found ${amenities.length} amenities in Atlas. Mirroring...`);
  for (const a of amenities as any[]) {
    await mariaQuery(
      `INSERT INTO amenities (
        id, name, description, maxCapacity, rateWalkin, rateWhole, ratePrivate,
        downpayment, downpaymentPrivate, isActive, isArchived, image, lat, lng,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name=VALUES(name), isActive=VALUES(isActive), isArchived=VALUES(isArchived);`,
      [
        Number(a._id),
        a.name || "",
        a.description || "",
        Number(a.maxCapacity) || 50,
        Number(a.rateWalkin) || 0,
        Number(a.rateWhole) || 0,
        Number(a.ratePrivate) || 0,
        Number(a.downpayment) || 200,
        Number(a.downpaymentPrivate) || 500,
        a.isActive !== false ? 1 : 0,
        a.isArchived ? 1 : 0,
        a.image || "",
        Number(a.lat) || 0,
        Number(a.lng) || 0,
        toMySqlDateTime(a.createdAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
        toMySqlDateTime(a.updatedAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
      ]
    );
  }

  // 4. Announcements
  const announcements = await Announcement.find().lean();
  console.log(`==> Found ${announcements.length} announcements in Atlas. Mirroring...`);
  for (const an of announcements as any[]) {
    await mariaQuery(
      `INSERT INTO announcements (id, title, content, postDate, status, poster, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE title=VALUES(title), content=VALUES(content), status=VALUES(status);`,
      [
        Number(an._id),
        an.title || "",
        an.content || "",
        an.postDate || "",
        an.status || "active",
        an.poster || "HOA",
        toMySqlDateTime(an.createdAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
        toMySqlDateTime(an.updatedAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
      ]
    );
  }

  // 5. Reservations
  const reservations = await Reservation.find().lean();
  console.log(`==> Found ${reservations.length} reservations in Atlas. Mirroring...`);
  for (const r of reservations as any[]) {
    await mariaQuery(
      `INSERT INTO reservations (
        id, amenityId, amenityName, residentName, phone, bookingType, reservationType,
        date, paxCount, downpayment, totalAmount, status, notes, userEmail, approvedAt,
        gcashRef, receiptPath, isArchived, archivedAt, archiveReason, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status=VALUES(status);`,
      [
        Number(r._id),
        Number(r.amenityId) || null,
        r.amenityName || "",
        r.residentName || "",
        r.phone || "",
        r.bookingType || "day",
        r.reservationType || "public",
        r.date || "",
        Number(r.paxCount) || 1,
        Number(r.downpayment) || 0,
        Number(r.totalAmount) || 0,
        r.status || "pending",
        r.notes || "",
        r.userEmail || "",
        r.approvedAt || null,
        r.gcashRef || null,
        r.receiptPath || null,
        r.isArchived ? 1 : 0,
        toMySqlDateTime(r.archivedAt),
        r.archiveReason || null,
        toMySqlDateTime(r.createdAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
        toMySqlDateTime(r.updatedAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
      ]
    );
  }

  // 6. Dues
  const dues = await DuesRecord.find().lean();
  console.log(`==> Found ${dues.length} dues records in Atlas. Mirroring...`);
  for (const d of dues as any[]) {
    await mariaQuery(
      `INSERT INTO dues (
        id, residentId, residentName, blockNo, lotNo, dueMonth, dueDate, amountDue,
        amountPaid, paidAt, creditBalance, status, source, billingMonth, billingYear,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status=VALUES(status), amountPaid=VALUES(amountPaid);`,
      [
        Number(d._id),
        Number(d.residentId) || null,
        d.residentName || "",
        d.blockNo || "",
        d.lotNo || "",
        d.dueMonth || "",
        d.dueDate || "",
        Number(d.amountDue) || 100,
        Number(d.amountPaid) || 0,
        d.paidAt || null,
        Number(d.creditBalance) || 0,
        d.status || "unpaid",
        d.source || "system",
        d.billingMonth || null,
        Number(d.billingYear) || null,
        toMySqlDateTime(d.createdAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
        toMySqlDateTime(d.updatedAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
      ]
    );
  }

  // 7. Transactions
  const transactions = await Transaction.find().lean();
  console.log(`==> Found ${transactions.length} transactions in Atlas. Mirroring...`);
  for (const t of transactions as any[]) {
    await mariaQuery(
      `INSERT INTO transactions (
        id, residentName, refType, refId, userEmail, amount, paymentMethod, gcashRef,
        receiptPath, status, payment, isArchived, archiveReason, archivedBy, archivedAt,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status=VALUES(status);`,
      [
        Number(t._id),
        t.residentName || "",
        t.refType || "amenity",
        Number(t.refId) || null,
        t.userEmail || "",
        Number(t.amount) || 0,
        t.paymentMethod || "gcash",
        t.gcashRef || null,
        t.receiptPath || null,
        t.status || "pending",
        t.payment ? JSON.stringify(t.payment) : null,
        t.isArchived ? 1 : 0,
        t.archiveReason || null,
        t.archivedBy || null,
        toMySqlDateTime(t.archivedAt),
        toMySqlDateTime(t.createdAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
        toMySqlDateTime(t.updatedAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
      ]
    );
  }

  // 8. Property Viewings
  const viewings = await PropertyViewing.find().lean();
  console.log(`==> Found ${viewings.length} property viewings in Atlas. Mirroring...`);
  for (const v of viewings as any[]) {
    await mariaQuery(
      `INSERT INTO property_viewings (
        id, listingId, listingName, residentName, residentEmail, preferredDate,
        preferredTime, message, status, adminNotes, scheduledAt, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status=VALUES(status), scheduledAt=VALUES(scheduledAt);`,
      [
        Number(v._id),
        Number(v.listingId) || 0,
        v.listingName || "",
        v.residentName || "",
        v.residentEmail || "",
        v.preferredDate || "",
        v.preferredTime || "",
        v.message || "",
        v.status || "viewing_requested",
        v.adminNotes || "",
        v.scheduledAt || null,
        toMySqlDateTime(v.createdAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
        toMySqlDateTime(v.updatedAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
      ]
    );
  }

  // 9. Payment Configs
  const configs = await PaymentConfig.find().lean();
  console.log(`==> Found ${configs.length} payment configs in Atlas. Mirroring...`);
  for (const c of configs as any[]) {
    await mariaQuery(
      `INSERT INTO payment_configs (category, accountName, accountNumber, qrCodeUrl, instructions, isActive, updatedBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        accountName=VALUES(accountName), accountNumber=VALUES(accountNumber),
        qrCodeUrl=VALUES(qrCodeUrl), instructions=VALUES(instructions), isActive=VALUES(isActive);`,
      [
        c.category,
        c.accountName || "MABUHAY HOMES HOA",
        c.accountNumber || "0917 123 4567",
        c.qrCodeUrl || "",
        c.instructions || "",
        c.isActive !== false ? 1 : 0,
        c.updatedBy || "Admin",
        toMySqlDateTime(c.createdAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
        toMySqlDateTime(c.updatedAt) || new Date().toISOString().slice(0, 19).replace("T", " "),
      ]
    );
  }

  console.log("==> Mirroring complete! Local MariaDB now has an exact mirror of MongoDB Atlas.");
  process.exit(0);
}

mirrorAtlasToMariaDB().catch((err) => {
  console.error("==> Error mirroring Atlas to MariaDB:", err);
  process.exit(1);
});
