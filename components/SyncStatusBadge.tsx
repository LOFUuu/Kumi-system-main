"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";

interface SyncStatus {
  isOnline: boolean;
  isLocalDbConnected: boolean;
  pendingCount: number;
  lastSyncedAt?: string;
}

export default function SyncStatusBadge({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/system/sync", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // If network fetch fails, we are definitely offline
      setStatus((prev) => (prev ? { ...prev, isOnline: false } : null));
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 20000); // Poll status every 20s
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/system/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncMessage(`Synced ${data.syncedCount || 0} item(s)!`);
        await fetchStatus();
      } else {
        setSyncMessage("Sync completed with errors");
      }
    } catch {
      setSyncMessage("Cannot connect to server");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  if (!status) return null;

  const isOnline = status.isOnline;
  const pending = status.pendingCount || 0;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" title={isOnline ? "Online: MongoDB Atlas connected" : "Offline Mode: XAMPP MariaDB active"}>
        <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
        <span className="text-[11px] font-medium text-gray-500">
          {isOnline ? (pending > 0 ? `${pending} pending` : "Online") : `Offline (${pending})`}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-amber-600" />
          )}
          <span className="font-semibold text-gray-700">
            {isOnline ? "Online (Atlas)" : "Offline (Local MariaDB)"}
          </span>
        </div>

        {isOnline && pending > 0 && (
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-1 rounded-md bg-[#123f2a] px-2 py-0.5 text-[10px] font-bold text-white hover:bg-[#1b5338] disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-2.5 w-2.5 ${syncing ? "animate-spin" : ""}`} />
            Sync ({pending})
          </button>
        )}
      </div>

      {pending > 0 && !isOnline && (
        <div className="mt-1 text-[10px] text-amber-700">
          {pending} offline changes queued for sync
        </div>
      )}

      {syncMessage && (
        <div className="mt-1 text-[10px] font-medium text-emerald-700">
          {syncMessage}
        </div>
      )}
    </div>
  );
}
