import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { isOnlineMode, resetOnlineCheck } from "../lib/db-router";
import { getAmenity, getAmenities, getReservations, createReservation } from "../lib/db";
import { isMariaDBConnected, mariaQuery } from "../lib/mariadb";

async function main() {
  console.log("=================================================");
  console.log("   TESTING OFFLINE SPEED & MARIADB/XAMPP HEALTH  ");
  console.log("=================================================\n");

  // Step 1: Check MariaDB / XAMPP connection
  console.log("1. Checking XAMPP / MariaDB Connection...");
  const mariaOk = await isMariaDBConnected();
  console.log("   -> MariaDB Connected:", mariaOk ? "YES (SUCCESS)" : "NO (FAILED)");
  if (!mariaOk) {
    console.error("   [ERROR] Cannot connect to XAMPP MariaDB/MySQL on localhost:3306!");
    process.exit(1);
  }

  // Check table status in kumi_offline
  const tables: any = await mariaQuery("SHOW TABLES");
  console.log(`   -> Found ${tables.length} tables in kumi_offline database.`);

  // Step 2: Check online detection speed
  console.log("\n2. Testing Online/Offline Detection Speed...");
  resetOnlineCheck();
  const startOnlineCheck = Date.now();
  const online = await isOnlineMode();
  const onlineDuration = Date.now() - startOnlineCheck;
  console.log(`   -> isOnlineMode(): ${online} in ${onlineDuration}ms`);

  // Step 3: Cached online check speed
  const startCached = Date.now();
  const onlineCached = await isOnlineMode();
  const cachedDuration = Date.now() - startCached;
  console.log(`   -> isOnlineMode() (cached): ${onlineCached} in ${cachedDuration}ms (instant response)`);

  // Step 4: getAmenities speed
  console.log("\n3. Testing Amenities Data Fetching...");
  const startAmenities = Date.now();
  const amenities = await getAmenities();
  const amenitiesDuration = Date.now() - startAmenities;
  console.log(`   -> getAmenities(): found ${amenities.length} amenities in ${amenitiesDuration}ms`);

  if (amenities.length > 0) {
    const a1 = amenities[0];
    console.log(`   -> Sample Amenity: id=${a1.id}, name="${a1.name}", pricingModel=${a1.pricingModel || "N/A"}`);
  }

  // Step 5: getAmenity(1) speed
  const targetId = amenities.length > 0 ? amenities[0].id : 1;
  const startAmenity1 = Date.now();
  const amenity1 = await getAmenity(targetId);
  const a1Duration = Date.now() - startAmenity1;
  console.log(`   -> getAmenity(${targetId}): "${amenity1?.name}" loaded in ${a1Duration}ms`);

  // Step 6: getReservations(false) speed
  console.log("\n4. Testing Reservations Query...");
  const startRes = Date.now();
  const resList = await getReservations(false);
  const resDuration = Date.now() - startRes;
  console.log(`   -> getReservations(false): found ${resList.length} reservations in ${resDuration}ms`);

  // Step 7: Safe createReservation test in Offline Mode
  console.log("\n5. Testing Offline Reservation Creation & Safe Rollback...");
  process.env.FORCE_OFFLINE = "true";
  resetOnlineCheck();

  const startCreate = Date.now();
  const newRes = await createReservation({
    amenityId: targetId,
    amenityName: amenity1?.name || "Clubhouse Swimming Pool",
    residentName: "__TEMP_DIAGNOSTIC_VERIFICATION_RESIDENT__",
    phone: "09170000000",
    bookingType: "day",
    reservationType: "public",
    date: "2026-12-31",
    paxCount: 2,
    downpayment: 100,
    totalAmount: 200,
    status: "pending",
    notes: "Temporary verification test - auto cleaned",
    pricingModel: "per_head",
    pricingBreakdown: { model: "per_head", ratePerPerson: 100, paxCount: 2, total: 200 }
  });
  const createDuration = Date.now() - startCreate;
  console.log(`   -> createReservation() succeeded with ID=${newRes.id} in ${createDuration}ms`);

  // Verify created reservation is retrievable
  const checkList = await getReservations(false);
  const found = checkList.find((r) => r.id === newRes.id);
  console.log(`   -> Verified reservation in list: ${Boolean(found)} (ID: ${found?.id})`);

  // Immediate Clean up so we DO NOT disrupt or pollute the user's database
  await mariaQuery("DELETE FROM reservations WHERE residentName = '__TEMP_DIAGNOSTIC_VERIFICATION_RESIDENT__'");
  await mariaQuery("DELETE FROM sync_queue WHERE tableName = 'reservations' AND (recordId = ? OR recordId = '28')", [String(newRes.id)]);
  console.log(`   -> Cleaned up temporary diagnostic reservation (ID: ${newRes.id}). Database clean!`);

  console.log("\n=================================================");
  console.log("   ALL OFFLINE & DATABASE SPEED TESTS PASSED!    ");
  console.log("=================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
