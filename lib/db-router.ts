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

  // If running in cloud/Vercel with MONGODB_URI, we are ALWAYS online.
  // There is no local MariaDB on Vercel or cloud hosts.
  if (process.env.VERCEL || (process.env.NODE_ENV === "production" && process.env.MONGODB_URI)) {
    return true;
  }

  const now = Date.now();
  if (now - lastCheckTime < CACHE_TTL_MS && lastCheckTime > 0) {
    return cachedIsOnline;
  }

  lastCheckTime = now;
  try {
    await dbConnect();
    if (mongoose.connection.readyState === 1) {
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
  // Never mark offline on Vercel or cloud production where MariaDB is not available.
  if (process.env.VERCEL || (process.env.NODE_ENV === "production" && process.env.MONGODB_URI)) {
    return;
  }
  cachedIsOnline = false;
  lastCheckTime = Date.now();
}

/**
 * Reset cache immediately (useful when testing online/offline transition).
 */
export function resetOnlineCheck(): void {
  lastCheckTime = 0;
}
