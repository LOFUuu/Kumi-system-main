import dbConnect from "./mongoose";
import { mariaQuery, isMariaDBConnected } from "./mariadb";
import { isOnlineMode } from "./db-router";
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

export interface SyncStatus {
  isOnline: boolean;
  isLocalDbConnected: boolean;
  pendingCount: number;
  lastSyncedAt?: string;
  errorMessage?: string;
}

/**
 * Checks connection state of both databases and counts pending items in queue.
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const [isLocalDbConnected, isOnline] = await Promise.all([
    isMariaDBConnected(),
    isOnlineMode(),
  ]);

  let pendingCount = 0;
  let lastSyncedAt: string | undefined = undefined;

  if (isLocalDbConnected) {
    try {
      const countRows = await mariaQuery<any[]>(
        `SELECT COUNT(*) as cnt FROM sync_queue WHERE status = 'pending'`
      );
      pendingCount = countRows[0]?.cnt || 0;

      const lastRows = await mariaQuery<any[]>(
        `SELECT syncedAt FROM sync_queue WHERE status = 'synced' ORDER BY syncedAt DESC LIMIT 1`
      );
      if (lastRows.length && lastRows[0].syncedAt) {
        lastSyncedAt = new Date(lastRows[0].syncedAt).toISOString();
      }
    } catch (e) {
      // sync_queue might not be initialized yet
    }
  }

  return {
    isOnline,
    isLocalDbConnected,
    pendingCount,
    lastSyncedAt,
  };
}

/**
 * Pushes pending changes made offline in MariaDB to MongoDB Atlas.
 */
export async function syncPendingToAtlas(): Promise<{
  success: boolean;
  syncedCount: number;
  errors: string[];
}> {
  if (process.env.FORCE_OFFLINE === "true") {
    return { success: false, syncedCount: 0, errors: ["System forced offline"] };
  }

  await dbConnect();

  const pendingRows = await mariaQuery<any[]>(
    `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 50`
  );

  let syncedCount = 0;
  const errors: string[] = [];

  for (const item of pendingRows) {
    const { id: queueId, tableName, recordId, operation, payload: rawPayload } = item;
    let payload: any;
    try {
      payload = JSON.parse(rawPayload);
    } catch (e) {
      payload = rawPayload;
    }

    try {
      if (tableName === "users") {
        if (operation === "INSERT" || operation === "UPDATE") {
          const { id, ...data } = payload;
          await User.findOneAndUpdate(
            { _id: Number(id) },
            { $set: { ...data, _id: Number(id) } },
            { upsert: true }
          );
        } else if (operation === "DELETE") {
          await User.deleteOne({ _id: Number(recordId) });
        }
      } else if (tableName === "listings") {
        if (operation === "INSERT" || operation === "UPDATE") {
          const { id, ...data } = payload;
          await Listing.findOneAndUpdate(
            { _id: Number(id) },
            { $set: { ...data, _id: Number(id) } },
            { upsert: true }
          );
        } else if (operation === "DELETE") {
          await Listing.deleteOne({ _id: Number(recordId) });
        }
      } else if (tableName === "reservations") {
        if (operation === "INSERT" || operation === "UPDATE") {
          const { id, ...data } = payload;
          await Reservation.findOneAndUpdate(
            { _id: Number(id) },
            { $set: { ...data, _id: Number(id) } },
            { upsert: true }
          );
        } else if (operation === "DELETE") {
          await Reservation.deleteOne({ _id: Number(recordId) });
        }
      } else if (tableName === "dues") {
        if (operation === "INSERT" || operation === "UPDATE") {
          const { id, ...data } = payload;
          await DuesRecord.findOneAndUpdate(
            { _id: Number(id) },
            { $set: { ...data, _id: Number(id) } },
            { upsert: true }
          );
        } else if (operation === "DELETE") {
          await DuesRecord.deleteOne({ _id: Number(recordId) });
        }
      } else if (tableName === "transactions") {
        if (operation === "INSERT" || operation === "UPDATE") {
          const { id, ...data } = payload;
          await Transaction.findOneAndUpdate(
            { _id: Number(id) },
            { $set: { ...data, _id: Number(id) } },
            { upsert: true }
          );
        } else if (operation === "DELETE") {
          await Transaction.deleteOne({ _id: Number(recordId) });
        }
      } else if (tableName === "property_viewings") {
        if (operation === "INSERT" || operation === "UPDATE") {
          const { id, ...data } = payload;
          await PropertyViewing.findOneAndUpdate(
            { _id: Number(id) },
            { $set: { ...data, _id: Number(id) } },
            { upsert: true }
          );
        } else if (operation === "DELETE") {
          await PropertyViewing.deleteOne({ _id: Number(recordId) });
        }
      }

      // Mark row as synced
      await mariaQuery(
        `UPDATE sync_queue SET status = 'synced', syncedAt = NOW(), errorMessage = NULL WHERE id = ?`,
        [queueId]
      );
      syncedCount++;
    } catch (err: any) {
      const msg = err?.message || String(err);
      errors.push(`Queue item #${queueId} (${tableName}:${recordId}) failed: ${msg}`);
      await mariaQuery(
        `UPDATE sync_queue SET status = 'failed', retryCount = retryCount + 1, errorMessage = ? WHERE id = ?`,
        [msg, queueId]
      );
    }
  }

  return {
    success: errors.length === 0,
    syncedCount,
    errors,
  };
}
