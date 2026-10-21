import mongoose from "mongoose";
import dbConnect from "./mongoose";
import { isMariaDBConnected } from "./mariadb";

let lastCheckTime = 0;
let cachedIsOnline = false;
const CACHE_TTL_MS = 10_000; // recheck every 10 seconds

/**
 * Determines whether the system should read/write using MongoDB Atlas (online)
 * or fall back to local XAMPP MariaDB (offline).
 */
export async function isOnlineMode(): Promise<boolean> {
  if (process.env.FORCE_OFFLINE === "true") {
    return false;
  }

  const now = Date.now();
  if (now - lastCheckTime < CACHE_TTL_MS && lastCheckTime > 0) {
    return cachedIsOnline;
  }

  lastCheckTime = now;
  try {
    await dbConnect();
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      // Ping check with 1200ms strict timeout
      await Promise.race([
        mongoose.connection.db.admin().ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Mongo ping timeout")), 1200)
        ),
      ]);
      cachedIsOnline = true;
      return true;
    }
    cachedIsOnline = false;
    return false;
  } catch (err) {
    cachedIsOnline = false;
    return false;
  }
}

/**
 * Mark system as offline immediately (called when an Atlas operation fails or times out).
 */
export function markOffline(): void {
  cachedIsOnline = false;
  lastCheckTime = Date.now();
}

/**
 * Reset cache immediately (useful when testing online/offline transition).
 */
export function resetOnlineCheck(): void {
  lastCheckTime = 0;
}
