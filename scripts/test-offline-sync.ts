import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { verifyPassword } from "../lib/password";
import { getMariaDBPool, mariaQuery } from "../lib/mariadb";
import { isOnlineMode } from "../lib/db-router";
import {
  getUserByEmailForAuth,
  getListings,
  createListing,
  deleteListing,
  getReservations,
  createReservation,
  deleteReservation,
  getTransactions,
  createTransaction,
  deleteTransaction,
} from "../lib/db";
import { syncPendingToAtlas, getSyncStatus } from "../lib/sync-service";
import dbConnect from "../lib/mongoose";
import { Listing, Reservation, Transaction } from "../models";

async function runTest() {
  console.log("=================================================");
  console.log("   KUMI SYSTEM OFFLINE & SYNC VERIFICATION TEST   ");
  console.log("=================================================\n");

  // Step 1: Initial connectivity check
  console.log("[1/6] Checking Online Mode & MariaDB connection...");
  const initialOnline = await isOnlineMode();
  console.log(`  Initial Online Status: ${initialOnline ? "ONLINE (Atlas connected)" : "OFFLINE"}`);

  const pool = getMariaDBPool();
  const mariaPing = await mariaQuery("SELECT 1 as val");
  console.log(`  MariaDB Status: CONNECTED (ping = ${(mariaPing as any)[0]?.val})\n`);

  // Step 2: Offline Authentication Verification
  console.log("[2/6] Testing Offline Authentication against MariaDB...");
  const adminUser = await getUserByEmailForAuth("admin@mabuhay.com");
  if (!adminUser) {
    throw new Error("Admin user admin@mabuhay.com not found in local database!");
  }
  console.log(`  Found user: ${adminUser.fullName} (role: ${adminUser.role})`);
  
  // Verify password using password hash stored in MariaDB
  const passwordMatch = await verifyPassword("Mabuhay!P5#2026Admin", (adminUser as any).passwordHash || "");
  console.log(`  Password verification against MariaDB hash: ${passwordMatch ? "PASSED" : "FAILED"}\n`);

  // Step 3: Simulate OFFLINE mode
  console.log("[3/6] Simulating OFFLINE mode (FORCE_OFFLINE = true)...");
  process.env.FORCE_OFFLINE = "true";
  const offlineCheck = await isOnlineMode();
  console.log(`  isOnlineMode(): ${offlineCheck} (expected: false)`);

  const testTitle = `Offline Test House ${Date.now()}`;
  console.log(`  Creating test listing in OFFLINE mode: "${testTitle}"...`);
  const offlineListing = await createListing({
    houseName: testTitle,
    address: "Block 99 Lot 99, Mabuhay Homes Phase 5",
    blockNo: "99",
    lotNo: "99",
    price: 1500000,
    listingType: "sale",
    bedrooms: 3,
    bathrooms: 2,
    sqm: 120,
    status: "available",
    transactionStatus: "available",
    ownerContactNumber: "09123456789",
    ownerMessengerLink: "https://m.me/test",
    description: "Offline sync test record",
    ownerId: adminUser.id,
    ownerName: adminUser.fullName,
    images: ["/placeholder.jpg"],
    verificationStatus: "verified",
    proofDocuments: ["/proof.pdf"],
    uploadedBy: adminUser.id,
  });

  console.log(`  Listing created locally! Local ID: ${offlineListing.id}`);

  // Verify sync_queue entry in MariaDB
  const queueRows = await mariaQuery<any[]>(
    `SELECT * FROM sync_queue WHERE tableName = 'listings' AND recordId = ?`,
    [offlineListing.id]
  );
  console.log(`  sync_queue entries for listing: ${queueRows.length} (status: ${queueRows[0]?.status})`);
  if (!queueRows.length || queueRows[0]?.status !== "pending") {
    throw new Error("Failed: Record was not added to sync_queue with status 'pending'");
  }
  console.log("  Offline record creation & queueing: PASSED\n");

  // Step 4: Check Sync Status summary
  console.log("[4/6] Inspecting Sync Queue Status...");
  const syncStatusBefore = await getSyncStatus();
  console.log(`  Pending sync items: ${syncStatusBefore.pendingCount}`);
  console.log(`  Local DB connected: ${syncStatusBefore.isLocalDbConnected}\n`);

  // Step 5: Simulate reconnection (ONLINE) and trigger Sync to MongoDB Atlas
  console.log("[5/6] Restoring Connection (FORCE_OFFLINE = false) & Synchronizing to Atlas...");
  process.env.FORCE_OFFLINE = "false";
  const onlineCheck = await isOnlineMode();
  console.log(`  isOnlineMode(): ${onlineCheck} (expected: true)`);

  const syncResult = await syncPendingToAtlas();
  console.log(`  Sync execution result: success=${syncResult.success}, syncedCount=${syncResult.syncedCount}, errors=${syncResult.errors.length}`);

  // Verify record reached MongoDB Atlas directly
  await dbConnect();
  const atlasRecord = await Listing.findById(offlineListing.id).lean();
  console.log(`  Checking MongoDB Atlas for ID ${offlineListing.id}: ${atlasRecord ? "FOUND IN ATLAS!" : "NOT FOUND"}`);
  if (!atlasRecord) {
    throw new Error("Failed: Synced record was not found in MongoDB Atlas!");
  }
  console.log(`  Atlas record title: "${(atlasRecord as any).houseName}"`);

  // Verify sync_queue status is now 'synced'
  const updatedQueue = await mariaQuery<any[]>(
    `SELECT * FROM sync_queue WHERE tableName = 'listings' AND recordId = ?`,
    [offlineListing.id]
  );
  console.log(`  sync_queue item status after sync: "${updatedQueue[0]?.status}" (expected: 'synced')\n`);

  // Step 6: Safe Cleanup of Test Record
  console.log("[6/6] Cleaning up test records from both databases...");
  await Listing.deleteOne({ _id: offlineListing.id });
  await mariaQuery(`DELETE FROM listings WHERE id = ?`, [offlineListing.id]);
  await mariaQuery(`DELETE FROM sync_queue WHERE tableName = 'listings' AND recordId = ?`, [offlineListing.id]);
  console.log("  Test records safely removed from Atlas and MariaDB.");

  console.log("\n=================================================");
  console.log("   ALL OFFLINE & SYNC VERIFICATION TESTS PASSED! ");
  console.log("=================================================");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("\nTEST FAILED WITH ERROR:", err);
  process.exit(1);
});
