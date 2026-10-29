import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import path from "path";
import dbConnect from "../lib/mongoose";
import mongoose from "mongoose";

async function backup() {
  console.log("=== CREATING DATABASE BACKUP ===");
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) throw new Error("No DB connection");

  const backupDir = path.join(process.cwd(), "database_exports", "backup_" + new Date().toISOString().replace(/[:.]/g, "-"));
  fs.mkdirSync(backupDir, { recursive: true });

  const collections = ["duesrecords", "transactions", "users", "paymentconfigs", "reservations", "amenities"];
  for (const collName of collections) {
    const data = await db.collection(collName).find({}).toArray();
    const filePath = path.join(backupDir, `${collName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    console.log(`Backed up ${collName}: ${data.length} records -> ${filePath}`);
  }

  console.log(`=== BACKUP COMPLETED: ${backupDir} ===`);
  process.exit(0);
}

backup().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
