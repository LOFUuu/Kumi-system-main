import dns from "dns";
import mongoose from "mongoose";
import dbConnect from "./mongoose";

let lastCheckTime = 0;
let cachedIsOnline = false;
let checkInFlight: Promise<boolean> | null = null;

const ONLINE_CACHE_TTL_MS = 30_000; // 30 seconds when confirmed online
const OFFLINE_CACHE_TTL_MS = 45_000; // 45 seconds when confirmed offline to prevent repeated lag

function extractMongoHost(uri?: string): string | null {
  if (!uri) return null;
  const match = uri.match(/@([^/?#:]+)/);
  return match ? match[1] : null;
}

function checkDnsResolution(host: string, isSrv = false, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, timeoutMs);

    if (isSrv) {
      dns.resolveSrv(`_mongodb._tcp.${host}`, (err, addresses) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(!err && Boolean(addresses && addresses.length > 0));
        }
      });
    } else {
      dns.lookup(host, (err, address) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(!err && Boolean(address));
        }
      });
    }
  });
}

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

  // If already connected with active socket, return true in 0ms
  if (mongoose.connection.readyState === 1) {
    cachedIsOnline = true;
    lastCheckTime = Date.now();
    return true;
  }

  const now = Date.now();
  const ttl = cachedIsOnline ? ONLINE_CACHE_TTL_MS : OFFLINE_CACHE_TTL_MS;
  if (lastCheckTime > 0 && now - lastCheckTime < ttl) {
    return cachedIsOnline;
  }

  // Deduplicate concurrent probes so multiple requests don't initiate redundant checks
  if (checkInFlight) {
    return await checkInFlight;
  }

  checkInFlight = (async () => {
    try {
      const atlasHost = extractMongoHost(process.env.MONGODB_URI);
      if (atlasHost) {
        const isSrv = Boolean(process.env.MONGODB_URI?.startsWith("mongodb+srv://"));
        // Fast probe: DNS lookup fails in ~5ms when offline without waiting 2.5s for Mongoose socket
        const canResolve = await checkDnsResolution(atlasHost, isSrv, 1500);
        if (!canResolve) {
          cachedIsOnline = false;
          lastCheckTime = Date.now();
          return false;
        }
      }

      await dbConnect();
      const isConnected = mongoose.connection.readyState === 1;
      cachedIsOnline = isConnected;
      lastCheckTime = Date.now();
      return isConnected;
    } catch {
      cachedIsOnline = false;
      lastCheckTime = Date.now();
      return false;
    } finally {
      checkInFlight = null;
    }
  })();

  return await checkInFlight;
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
  checkInFlight = null;
}

