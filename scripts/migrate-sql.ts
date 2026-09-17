import "./load-env";
import fs from "fs";
import mongoose from "mongoose";
import dbConnect from "../lib/mongoose";
import {
  User,
  Listing,
  Amenity,
  Announcement,
  Reservation,
  DuesRecord,
  Transaction,
} from "../models";

// Real subdivision center (SQL has no geo columns, so markers default here).
const CENTER: [number, number] = [14.3033, 120.9886];

const SQL_PATH =
  "C:/Users/Fujitsu/Documents/Cyrus Coding/Kumi System/mabuhay_v4.sql";

// ---- tiny phpMyAdmin INSERT parser ----------------------------------------
function parseValuesBlock(s: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let val = "";
  let inStr = false;
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (inStr) {
      if (ch === "'") {
        if (s[i + 1] === "'") {
          val += "'";
          i += 2;
          continue;
        }
        inStr = false;
        i++;
        continue;
      }
      val += ch;
      i++;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      i++;
      continue;
    }
    if (ch === "(") {
      row = [];
      i++;
      continue;
    }
    if (ch === ")") {
      row.push(val.trim());
      val = "";
      rows.push(row);
      row = [];
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(val.trim());
      val = "";
      i++;
      continue;
    }
    val += ch;
    i++;
  }
  return rows;
}

function convertCell(raw: string): any {
  if (raw === "NULL") return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

function parseAll(sql: string): Record<string, Record<string, any>[]> {
  const re = /INSERT INTO `(\w+)`\s*\(([^)]*)\)\s*VALUES\s*([\s\S]*?);/g;
  const out: Record<string, Record<string, any>[]> = {};
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    const table = m[1];
    const cols = m[2].split(",").map((c) => c.trim().replace(/`/g, ""));
    const rows = parseValuesBlock(m[3]);
    out[table] = rows.map((r) => {
      const obj: Record<string, any> = {};
      cols.forEach((c, i) => (obj[c] = convertCell(r[i] ?? "")));
      return obj;
    });
  }
  return out;
}

async function migrate() {
  console.log("Connecting to MongoDB Atlas...");
  await dbConnect();
  console.log("Connected. Parsing SQL dump...");
  const raw = parseAll(fs.readFileSync(SQL_PATH, "utf8"));

  // users
  const usersById: Record<number, any> = {};
  const userDocs = (raw.users ?? []).map((r) => {
    const d = {
      _id: r.id,
      fullName: r.full_name,
      email: r.email,
      password: r.password ?? "",
      phone: r.phone ?? "",
      role: r.role,
      blockNo: r.block_no ?? "",
      lotNo: r.lot_no ?? "",
      isActive: r.is_active === 1 || r.is_active === "1" || r.is_active === true,
    };
    usersById[r.id] = d;
    return d;
  });

  // house_images grouped by listing
  const imgsByListing: Record<number, string[]> = {};
  (raw.house_images ?? []).forEach((r) => {
    (imgsByListing[r.listing_id] ||= []).push(r.image_path);
  });

  const listingDocs = (raw.house_listings ?? []).map((r) => {
    const lotMatch = String(r.address || "").match(/Lot\s+([\w-]+)/i);
    const blockMatch = String(r.address || "").match(/Block\s+([\w-]+)/i);
    return {
      _id: r.id,
      houseName: r.house_name,
      address: r.address,
      blockNo: blockMatch?.[1] ?? "",
      lotNo: lotMatch?.[1] ?? "",
      price: Number(r.price),
      listingType: r.listing_type,
      bedrooms: Number(r.bedrooms),
      bathrooms: Number(r.bathrooms),
      sqm: Number(r.sqm),
      status: ({ available: "available", occupied: "reserved", pending: "reserved", sold: "sold" } as Record<string, string>)[r.status] ?? "available",
      description: r.description ?? "",
      ownerId: r.owner_id ?? null,
      ownerName: usersById[r.owner_id]?.fullName ?? "—",
      images: Array.from({ length: 3 }, (_, i) => `https://picsum.photos/seed/mabuhay-${r.id}-${i}/800/600`),
      lat: CENTER[0],
      lng: CENTER[1],
    };
  });

  const amenityDocs = (raw.amenities ?? []).map((r) => ({
    _id: r.id,
    name: r.name,
    description: r.description ?? "",
    maxCapacity: Number(r.max_capacity),
    rateWalkin: Number(r.rate_walkin),
    rateWhole: Number(r.rate_whole),
    ratePrivate: Number(r.rate_private),
    downpayment: Number(r.downpayment),
    downpaymentPrivate: Number(r.downpayment_private),
    isActive: r.is_active === 1 || r.is_active === "1" || r.is_active === true,
    image: `https://picsum.photos/seed/amenity-${r.id}/800/600`,
    lat: CENTER[0],
    lng: CENTER[1],
  }));
  const amenityById: Record<number, any> = {};
  amenityDocs.forEach((a) => (amenityById[a._id] = a));

  const resDocs = (raw.amenity_reservations ?? []).map((r) => ({
    _id: r.id,
    amenityId: r.amenity_id,
    amenityName: amenityById[r.amenity_id]?.name ?? "Amenity",
    residentName: r.full_name,
    phone: r.phone ?? "",
    bookingType: r.booking_type === "night" ? "night" : "day",
    reservationType: r.reservation_type === "private" ? "private" : "public",
    date: r.booking_date,
    paxCount: Number(r.pax_count),
    downpayment: Number(r.downpayment),
    totalAmount: Number(r.total_amount),
    status: ({ pending: "pending", approved: "approved", rejected: "declined", voided: "declined" } as Record<string, string>)[r.status] ?? "pending",
    notes: r.notes ?? "",
  }));

  const annDocs = (raw.announcements ?? []).map((r) => ({
    _id: r.id,
    title: r.title,
    content: r.content,
    postDate: r.post_date,
    status: r.status,
    poster: usersById[r.posted_by]?.fullName ?? "HOA",
  }));

  const duesDocs = (raw.dues_ledger ?? []).map((r) => {
    const amountDue = Number(r.amount_due);
    const amountPaid = Number(r.amount_paid);
    const dueDate = `${r.due_month}-05`;
    return {
      _id: r.id,
      residentName: usersById[r.user_id]?.fullName ?? "—",
      blockNo: usersById[r.user_id]?.blockNo ?? "—",
      lotNo: usersById[r.user_id]?.lotNo ?? "—",
      dueMonth: r.due_month,
      dueDate,
      amountDue,
      amountPaid,
      paidAt: amountPaid > 0 ? dueDate : undefined,
      creditBalance: Math.max(0, amountPaid - amountDue),
      status: r.status === "paid" ? "on_time" : r.status,
    };
  });

  const txnDocs = (raw.transactions ?? []).map((r) => ({
    _id: r.id,
    residentName: usersById[r.user_id]?.fullName ?? "—",
    userEmail: usersById[r.user_id]?.email ?? "",
    refType: r.ref_type,
    refId: r.ref_id ?? 0,
    amount: Number(r.amount),
    paymentMethod: r.payment_method === "cash" ? "cash" : "gcash",
    gcashRef: r.gcash_ref ?? "",
    receiptPath: r.receipt_path ?? "",
    status: ({ pending: "pending", approved: "approved", rejected: "voided", voided: "voided" } as Record<string, string>)[r.status] ?? "pending",
    createdAt: r.created_at,
  }));

  // Write main collections (overwrite demo data)
  await Promise.all([
    User.deleteMany({}),
    Listing.deleteMany({}),
    Amenity.deleteMany({}),
    Reservation.deleteMany({}),
    Announcement.deleteMany({}),
    DuesRecord.deleteMany({}),
    Transaction.deleteMany({}),
  ]);
  await Promise.all([
    User.insertMany(userDocs),
    Listing.insertMany(listingDocs),
    Amenity.insertMany(amenityDocs),
    Reservation.insertMany(resDocs),
    Announcement.insertMany(annDocs),
    DuesRecord.insertMany(duesDocs),
    Transaction.insertMany(txnDocs),
  ]);

  // Raw extra tables (no UI yet) -> plain collections
  const rawTables: Record<string, string> = {
    amenity_capacity_log: "amenitycapacitylogs",
    ocular_requests: "ocularrequests",
    password_resets: "passwordresets",
  };
  for (const [tbl, collName] of Object.entries(rawTables)) {
    const docs = (raw[tbl] ?? []).map((r) => {
      const { id, ...rest } = r;
      return { _id: id, ...rest };
    });
    const coll = mongoose.connection.collection(collName);
    await coll.deleteMany({});
    if (docs.length) await coll.insertMany(docs);
  }

  const counts = {
    users: await User.countDocuments(),
    listings: await Listing.countDocuments(),
    amenities: await Amenity.countDocuments(),
    reservations: await Reservation.countDocuments(),
    announcements: await Announcement.countDocuments(),
    dues: await DuesRecord.countDocuments(),
    transactions: await Transaction.countDocuments(),
  };
  console.log("Migration complete:", counts);
  await mongoose.disconnect();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
