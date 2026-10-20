import dbConnect from "./mongoose";
import { isMariaDBConnected } from "./mariadb";

let lastCheckTime = 0;
let cachedIsOnline = true;
const CACHE_TTL_MS = 30_000; // recheck every 30 seconds — reduces parallel Atlas hammering

/**
 * Determines whether the system should read/write using MongoDB Atlas (online)
 * or fall back to local XAMPP MariaDB (offline).
 */
export async function isOnlineMode(): Promise<boolean> {
  if (process.env.FORCE_OFFLINE === "true") {
    return false;
  }

  const now = Date.now();
  if (now - lastCheckTime < CACHE_TTL_MS) {
    return cachedIsOnline;
  }

  lastCheckTime = now;
  try {
    await dbConnect();
    cachedIsOnline = true;
    return true;
  } catch (err) {
    cachedIsOnline = false;
    return false;
  }
}

/**
 * Reset cache immediately (useful when testing online/offline transition).
 */
export function resetOnlineCheck(): void {
  lastCheckTime = 0;
}
