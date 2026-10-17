import "./load-env";
import fs from "fs";
import path from "path";
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
  PropertyViewing,
  PaymentConfig,
} from "../models";
import {
  MOCK_USERS,
  MOCK_LISTINGS,
  MOCK_AMENITIES,
  MOCK_ANNOUNCEMENTS,
  MOCK_RESERVATIONS,
  MOCK_DUES,
  MOCK_TRANSACTIONS,
} from "../lib/mock-data";

async function runExport() {
  console.log("Connecting to MongoDB Atlas...");
  let online = false;
  try {
    await dbConnect();
    online = mongoose.connection.readyState === 1;
  } catch (err: any) {
    console.warn("Could not connect to MongoDB Atlas directly:", err?.message || err);
  }

  const exportDir = path.join(process.cwd(), "database_exports");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  console.log(online ? "Connected to MongoDB Atlas!" : "Working in offline/fallback mode...");

  const getCollectionData = async (model: any, fallbackData: any[], name: string) => {
    if (online) {
      try {
        const records = await model.find().lean();
        if (records && records.length > 0) {
          console.log(`Fetched ${records.length} records for ${name} from MongoDB Atlas.`);
          return records;
        }
      } catch (err: any) {
        console.warn(`Error querying ${name} from MongoDB Atlas:`, err?.message);
      }
    }
    console.log(`Using fallback/mock data for ${name} (${fallbackData.length} records).`);
    return fallbackData.map((item: any) => ({
      _id: item.id || item._id,
      ...item,
    }));
  };

  const users = await getCollectionData(User, MOCK_USERS, "users");
  const listings = await getCollectionData(Listing, MOCK_LISTINGS, "listings");
  const amenities = await getCollectionData(Amenity, MOCK_AMENITIES, "amenities");
  const announcements = await getCollectionData(Announcement, MOCK_ANNOUNCEMENTS, "announcements");
  const reservations = await getCollectionData(Reservation, MOCK_RESERVATIONS, "reservations");
  const dues = await getCollectionData(DuesRecord, MOCK_DUES, "dues");
  const transactions = await getCollectionData(Transaction, MOCK_TRANSACTIONS, "transactions");
  const propertyViewings = await getCollectionData(PropertyViewing, [], "property_viewings");
  const paymentConfigs = await getCollectionData(
    PaymentConfig,
    [
      {
        category: "dues",
        accountName: "MABUHAY HOMES HOA",
        accountNumber: "0917 123 4567",
        qrCodeUrl: "",
        instructions: "Please enter your Block and Lot in the reference note.",
        isActive: true,
      },
      {
        category: "amenity",
        accountName: "MABUHAY HOMES HOA",
        accountNumber: "0917 123 4567",
        qrCodeUrl: "",
        instructions: "Please send downpayment and reference reservation ID.",
        isActive: true,
      },
    ],
    "payment_configs"
  );

  const fullDatabase = {
    exportedAt: new Date().toISOString(),
    databaseName: "kumi",
    source: online ? "MongoDB Atlas (Cluster0 / kumi)" : "Local/Fallback System Data",
    collections: {
      users,
      listings,
      amenities,
      announcements,
      reservations,
      dues,
      transactions,
      property_viewings: propertyViewings,
      payment_configs: paymentConfigs,
    },
  };

  // 1. Write the combined database file
  const fullExportPath = path.join(exportDir, "full_database_mongo.json");
  fs.writeFileSync(fullExportPath, JSON.stringify(fullDatabase, null, 2), "utf8");
  console.log(`Saved full database export to: ${fullExportPath}`);

  // 2. Also write individual collection files for easy mongoimport
  const writeCollectionFile = (colName: string, data: any[]) => {
    const colPath = path.join(exportDir, `${colName}.json`);
    fs.writeFileSync(colPath, JSON.stringify(data, null, 2), "utf8");
  };

  writeCollectionFile("users", users);
  writeCollectionFile("listings", listings);
  writeCollectionFile("amenities", amenities);
  writeCollectionFile("announcements", announcements);
  writeCollectionFile("reservations", reservations);
  writeCollectionFile("dues", dues);
  writeCollectionFile("transactions", transactions);
  writeCollectionFile("property_viewings", propertyViewings);
  writeCollectionFile("payment_configs", paymentConfigs);

  console.log("All collection files have been written successfully to:", exportDir);

  if (online) {
    await mongoose.disconnect();
  }
}

runExport()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Export error:", err);
    process.exit(1);
  });
