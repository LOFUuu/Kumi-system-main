"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Eye,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  Search,
  X,
  Loader2,
  Building2,
  User,
  CalendarDays,
  ArrowUpDown,
} from "lucide-react";
import { api } from "@/lib/api";
import type { PropertyViewing, ViewingStatus } from "@/lib/mock-data";

// ── Helpers ─────────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()))
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { /* empty */ }
  return dateStr;
}

function formatTime(time?: string) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

const STATUS_CONFIG: Record<
  ViewingStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  viewing_requested: {
    label: "Requested",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
  },
  viewing_scheduled: {
    label: "Scheduled",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: CalendarCheck,
  },
  viewing_completed: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  viewing_declined: {
    label: "Declined",
    color: "bg-rose-100 text-rose-700 border-rose-200",
    icon: XCircle,
  },
};

function StatusBadge({ status }: { status: ViewingStatus }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors duration-500 ${cfg.color}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ── Update Viewing Modal ────────────────────────────────────────────────────────

function UpdateModal({
  viewing,
  onClose,
  onUpdated,
}: {
  viewing: PropertyViewing;
  onClose: () => void;
  onUpdated: (v: PropertyViewing) => void;
}) {
  const [action, setAction] = useState<"schedule" | "complete" | "decline" | "">("");
  const [adminNotes, setAdminNotes] = useState(viewing.adminNotes || "");
  const [scheduledAt, setScheduledAt] = useState(viewing.scheduledAt || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 10);
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      const statusMap: Record<string, ViewingStatus> = {
        schedule: "viewing_scheduled",
        complete: "viewing_completed",
        decline: "viewing_declined",
      };
      const payload: Record<string, unknown> = {
        status: statusMap[action],
        adminNotes,
      };
      if (action === "schedule" && scheduledAt) payload.scheduledAt = scheduledAt;

      const { viewing: updated } = await api.updateViewing(viewing.id, payload);
      onUpdated(updated);
      close();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update viewing.");
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={close}
    >
      <div
        className={`w-full max-w-md rounded-2xl bg-white shadow-2xl transition-all duration-300 ${
          visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-cream-2 p-5">
          <div>
            <h3 className="font-serif text-lg font-bold text-green-dark">Update Viewing</h3>
            <p className="text-xs text-muted mt-0.5">
              {viewing.listingName} · {viewing.residentName}
            </p>
          </div>
          <button
            onClick={close}
            className="rounded-lg p-1 text-muted hover:bg-cream hover:text-green-dark transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Property + resident info */}
          <div className="rounded-xl border border-cream-2 bg-cream/40 p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-green-dark">
              <Building2 className="h-3.5 w-3.5 text-green-mid" />
              <span className="font-semibold">{viewing.listingName}</span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <User className="h-3.5 w-3.5" />
              <span>{viewing.residentName} — {viewing.residentEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>
                Preferred: {formatDate(viewing.preferredDate)} at {formatTime(viewing.preferredTime)}
              </span>
            </div>
            {viewing.message && (
              <div className="flex items-start gap-2 text-muted">
                <MessageSquare className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span className="italic">&ldquo;{viewing.message}&rdquo;</span>
              </div>
            )}
          </div>

          {/* Action selection */}
          <div>
            <label className="field-label">Action</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "schedule", label: "Confirm Schedule", icon: CalendarCheck, color: "border-blue-300 bg-blue-50 text-blue-700" },
                { key: "complete", label: "Mark Completed", icon: CheckCircle2, color: "border-emerald-300 bg-emerald-50 text-emerald-700" },
                { key: "decline", label: "Decline", icon: XCircle, color: "border-rose-300 bg-rose-50 text-rose-700" },
              ].map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAction(key as typeof action)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 text-center text-[11px] font-semibold transition-all duration-200 ${
                    action === key
                      ? color + " scale-[1.03]"
                      : "border-cream-2 bg-white text-muted hover:border-green-mid/40"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Scheduled date (only for schedule action) */}
          {action === "schedule" && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="field-label">Confirmed Viewing Date & Time</label>
              <input
                type="datetime-local"
                className="field"
                min={today}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          )}

          {/* Admin notes */}
          <div>
            <label className="field-label">
              {action === "decline" ? "Reason for Declining *" : "Admin Notes (optional)"}
            </label>
            <textarea
              required={action === "decline"}
              className="field min-h-[70px]"
              placeholder={
                action === "decline"
                  ? "Explain why this viewing is being declined…"
                  : "Any notes for the resident…"
              }
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-bg p-3 text-xs text-danger">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={close} className="btn-ghost flex-1 justify-center !py-2.5 text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !action}
              className="btn-green flex-1 justify-center !py-2.5 text-xs disabled:opacity-50"
            >
              {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…</> : "Confirm Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────────

type SortField = "date" | "property" | "resident" | "status";
type SortDir = "asc" | "desc";
type FilterStatus = "all" | ViewingStatus;

export default function AdminViewingsPage() {
  const [viewings, setViewings] = useState<PropertyViewing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [updateTarget, setUpdateTarget] = useState<PropertyViewing | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .viewings()
      .then((data) => setViewings(data || []))
      .catch(() => setViewings([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdated = (updated: PropertyViewing) => {
    setViewings((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    setMsg({ type: "success", text: `Viewing for "${updated.listingName}" updated to ${STATUS_CONFIG[updated.status]?.label}.` });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  // Counts per status
  const counts = {
    all: viewings.length,
    viewing_requested: viewings.filter((v) => v.status === "viewing_requested").length,
    viewing_scheduled: viewings.filter((v) => v.status === "viewing_scheduled").length,
    viewing_completed: viewings.filter((v) => v.status === "viewing_completed").length,
    viewing_declined: viewings.filter((v) => v.status === "viewing_declined").length,
  };

  // Filter + sort
  const filtered = viewings
    .filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          v.listingName.toLowerCase().includes(q) ||
          v.residentName.toLowerCase().includes(q) ||
          v.residentEmail.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let r = 0;
      if (sortField === "date") r = (a.preferredDate || "").localeCompare(b.preferredDate || "");
      else if (sortField === "property") r = a.listingName.localeCompare(b.listingName);
      else if (sortField === "resident") r = a.residentName.localeCompare(b.residentName);
      else if (sortField === "status") r = a.status.localeCompare(b.status);
      return sortDir === "asc" ? r : -r;
    });

  const statusTabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "viewing_requested", label: "Requested", count: counts.viewing_requested },
    { key: "viewing_scheduled", label: "Scheduled", count: counts.viewing_scheduled },
    { key: "viewing_completed", label: "Completed", count: counts.viewing_completed },
    { key: "viewing_declined", label: "Declined", count: counts.viewing_declined },
  ];

  return (
    <div className="relative pb-16">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-green-dark tracking-tight">
            Property Viewings
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Manage viewing requests from residents. Confirm, schedule, or decline viewings.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-cream-2 bg-cream/60 px-3 py-2 text-xs text-muted">
          <Eye className="h-4 w-4 text-green-mid" />
          <span>
            <strong className="text-green-dark">{counts.viewing_requested}</strong> pending review
          </span>
        </div>
      </div>

      {/* Notification */}
      {msg && (
        <div
          className={`mb-5 flex items-center justify-between rounded-xl border p-3.5 text-xs font-semibold transition-all duration-300 ${
            msg.type === "success"
              ? "border-green-light/40 bg-green-light/10 text-green-dark"
              : "border-danger/30 bg-danger-bg text-danger"
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-green-mid" />
            ) : (
              <AlertCircle className="h-4 w-4 text-danger" />
            )}
            {msg.text}
          </div>
          <button onClick={() => setMsg(null)} className="text-muted hover:text-green-dark">×</button>
        </div>
      )}

      {/* Status tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
              statusFilter === tab.key
                ? "bg-green-dark text-white shadow-sm"
                : "bg-cream/70 text-green-dark border border-cream-2 hover:bg-cream"
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              statusFilter === tab.key ? "bg-white/20" : "bg-cream-2"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search by property, resident name, or email…"
          className="field pl-9 text-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-cream-2 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAF8F3] border-b border-cream-2 text-[11px] font-semibold text-muted">
              <tr>
                <th
                  onClick={() => handleSort("property")}
                  className="p-4 cursor-pointer hover:text-green-dark select-none"
                >
                  <div className="flex items-center gap-1">
                    Property <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("resident")}
                  className="p-4 cursor-pointer hover:text-green-dark select-none"
                >
                  <div className="flex items-center gap-1">
                    Resident <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("date")}
                  className="p-4 cursor-pointer hover:text-green-dark select-none"
                >
                  <div className="flex items-center gap-1">
                    Preferred Date <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th className="p-4">Message</th>
                <th
                  onClick={() => handleSort("status")}
                  className="p-4 cursor-pointer hover:text-green-dark select-none"
                >
                  <div className="flex items-center gap-1">
                    Status <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-2">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-green-mid" />
                    <p>Loading viewings…</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted">
                    <Eye className="mx-auto mb-2 h-10 w-10 text-muted/40" />
                    <p className="font-semibold text-green-dark text-sm">No viewing requests found</p>
                    <p className="text-[11px] mt-0.5">
                      {search ? "Try a different search term." : "No viewings match this filter."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const canUpdate = v.status !== "viewing_completed" && v.status !== "viewing_declined";
                  return (
                    <tr key={v.id} className="hover:bg-cream/20 transition group">
                      {/* Property */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-green-mid flex-shrink-0" />
                          <div>
                            <div className="font-bold text-green-dark group-hover:text-green-mid transition">
                              {v.listingName}
                            </div>
                            <div className="text-[11px] text-muted mt-0.5">Listing #{v.listingId}</div>
                          </div>
                        </div>
                      </td>

                      {/* Resident */}
                      <td className="p-4">
                        <div className="font-semibold text-green-dark">{v.residentName}</div>
                        <div className="text-[11px] text-muted">{v.residentEmail}</div>
                      </td>

                      {/* Date */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-semibold text-green-dark">{formatDate(v.preferredDate)}</div>
                        <div className="text-[11px] text-muted">{formatTime(v.preferredTime)}</div>
                        {v.scheduledAt && (
                          <div className="mt-0.5 text-[10px] text-blue-600 font-semibold">
                            Confirmed: {formatDate(v.scheduledAt)}
                          </div>
                        )}
                      </td>

                      {/* Message */}
                      <td className="p-4 max-w-[180px]">
                        {v.message ? (
                          <p className="text-[11px] text-muted line-clamp-2 italic">&ldquo;{v.message}&rdquo;</p>
                        ) : (
                          <span className="text-[11px] text-muted/50">—</span>
                        )}
                        {v.adminNotes && (
                          <p className="mt-1 text-[10px] text-green-mid font-semibold">Note: {v.adminNotes}</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <StatusBadge status={v.status} />
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        {canUpdate ? (
                          <button
                            onClick={() => setUpdateTarget(v)}
                            className="flex items-center gap-1.5 rounded-xl border border-green-mid/30 bg-green-light/10 px-3 py-1.5 text-[11px] font-semibold text-green-dark hover:bg-green-mid hover:text-white hover:border-green-mid transition-all duration-200"
                          >
                            <CalendarCheck className="h-3.5 w-3.5" />
                            Update
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted/60 italic">
                            {v.status === "viewing_completed" ? "Completed" : "Declined"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="border-t border-cream-2 bg-cream/20 px-4 py-3 text-[11px] text-muted flex items-center justify-between">
          <span>
            Showing {filtered.length} of {viewings.length} viewing requests
          </span>
          <span className="font-medium text-green-dark">
            Mabuhay Homes Phase 5 — Property Viewings
          </span>
        </div>
      </div>

      {/* Update Modal */}
      {updateTarget && (
        <UpdateModal
          viewing={updateTarget}
          onClose={() => setUpdateTarget(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
