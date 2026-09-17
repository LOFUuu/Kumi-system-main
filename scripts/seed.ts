import "./load-env";
import mongoose from "mongoose";
import dbConnect from "../lib/mongoose";
import {
  Listing,
  Amenity,
  Announcement,
  User,
  Reservation,
  DuesRecord,
  Transaction,
} from "../models";
import {
  MOCK_LISTINGS,
  MOCK_AMENITIES,
  MOCK_ANNOUNCEMENTS,
  MOCK_USERS,
  MOCK_RESERVATIONS,
  MOCK_DUES,
  MOCK_TRANSACTIONS,
} from "../lib/mock-data";
import { hashPassword } from "../lib/password";

// Demo login password for all seeded accounts.
const DEMO_PASSWORD = "demo1234";

// Use the existing numeric `id` as the document _id so the app's id-based
// lookups keep working after migration.
const withId = (arr: Record<string, any>[]) => arr.map((x) => ({ _id: x.id, ...x }));

async function seed() {
  console.log("Connecting to MongoDB Atlas...");
  await dbConnect();
  console.log("Connected.");

  await Listing.deleteMany({});
  await Listing.insertMany(withId(MOCK_LISTINGS));

  await Amenity.deleteMany({});
  await Amenity.insertMany(withId(MOCK_AMENITIES));

  await Announcement.deleteMany({});
  await Announcement.insertMany(withId(MOCK_ANNOUNCEMENTS));

  await User.deleteMany({});
  await User.insertMany(withId(MOCK_USERS));
  const demoHash = await hashPassword(DEMO_PASSWORD);
  await User.updateMany({}, { $set: { passwordHash: demoHash } });

  await Reservation.deleteMany({});
  await Reservation.insertMany(withId(MOCK_RESERVATIONS));

  await DuesRecord.deleteMany({});
  await DuesRecord.insertMany(withId(MOCK_DUES));

  await Transaction.deleteMany({});
  await Transaction.insertMany(withId(MOCK_TRANSACTIONS));

  const counts = {
    listings: await Listing.countDocuments(),
    amenities: await Amenity.countDocuments(),
    announcements: await Announcement.countDocuments(),
    users: await User.countDocuments(),
    reservations: await Reservation.countDocuments(),
    dues: await DuesRecord.countDocuments(),
    transactions: await Transaction.countDocuments(),
  };
  console.log("Seed complete:", counts);
  console.log(`\nDemo accounts can log in with the password: ${DEMO_PASSWORD}`);

  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
