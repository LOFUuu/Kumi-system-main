"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Image as ImageIcon,
  MessageSquare,
  Phone,
  ReceiptText,
  Search,
  Users,
  Waves,
  X,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPHP, type Amenity, type Reservation } from "@/lib/mock-data";

const PAGE_SIZE = 6;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    declined: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${
        map[status] ?? "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${
        type === "private"
          ? "bg-gold/10 text-yellow-800 border-yellow-300"
          : "bg-green-light/20 text-green-dark border-green-light/40"
      }`}
    >
      {type}
    </span>
  );
}

export default function AdminReservationsPage() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [amenityFilter, setAmenityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // Side panel
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.reservations(), api.amenities()])
      .then(([res, ams]) => {
        setRows(res);
        setAmenities(ams);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const review = useCallback(
    async (id: number, action: "approve" | "reject") => {
      setBusyId(id);
      setError("");
      try {
        const { reservation } = await api.reviewReservation(id, action);
        setRows((prev) => prev.map((r) => (r.id === id ? reservation : r)));
        setSelected((prev) => (prev?.id === id ? reservation : prev));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Update failed.");
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  const openPanel = (r: Reservation) => {
    setSelected(r);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setTimeout(() => setSelected(null), 300);
  };

  // Stats
  const total = rows.length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const approved = rows.filter((r) => r.status === "approved").length;
  const declined = rows.filter((r) => r.status === "declined").length;

  // Filtered rows
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.residentName?.toLowerCase().includes(q) ||
        r.amenityName?.toLowerCase().includes(q) ||
        r.userEmail?.toLowerCase().includes(q) ||
        r.gcashRef?.toLowerCase().includes(q);
      const matchAmenity =
        amenityFilter === "all" || String(r.amenityId) === amenityFilter;
      const matchStatus =
        statusFilter === "all" || r.status === statusFilter;
      const matchFrom = !dateFrom || r.date >= dateFrom;
      const matchTo = !dateTo || r.date <= dateTo;
      return matchSearch && matchAmenity && matchStatus && matchFrom && matchTo;
    });
  }, [rows, search, amenityFilter, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, amenityFilter, statusFilter, dateFrom, dateTo]);

  // Find amenity image for selected
  const selectedAmenity = amenities.find((a) => a.id === selected?.amenityId);

  return (
    <div className="flex h-full gap-0">
      {/* Main content */}
      <div
        className={`flex-1 min-w-0 transition-all duration-300 ${panelOpen ? "mr-[380px]" : ""}`}
      >
        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h1 className="font-serif text-3xl font-bold text-green-dark">
              Amenity Reservations
            </h1>
            <p className="mt-1 text-sm text-muted max-w-xl">
              Review guest reservations and proof of downpayment receipts.
              Approving automatically blocks that date on the calendar.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Total Reservations",
              value: total,
              sub: "↑ this month",
              icon: CalendarDays,
              color: "text-green-mid",
              bg: "bg-green-light/10",
            },
            {
              label: "Pending",
              value: pending,
              sub: `${pending} need review`,
              icon: Clock,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              label: "Approved",
              value: approved,
              sub: `${total ? Math.round((approved / total) * 100) : 0}% of total`,
              icon: CheckCircle2,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "Declined",
              value: declined,
              sub: `${total ? Math.round((declined / total) * 100) : 0}% of total`,
              icon: XCircle,
              color: "text-rose-500",
              bg: "bg-rose-50",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-2xl border border-cream-2 bg-white p-4 shadow-sm"
            >
              <span
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${s.bg}`}
              >
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </span>
              <div>
                <div className="font-serif text-2xl font-bold text-green-dark">
                  {s.value}
                </div>
                <div className="text-[11px] font-semibold text-muted">
                  {s.label}
                </div>
                <div className="text-[10px] text-muted/70">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by guest name, amenity, or reference number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field w-full !pl-9 !py-2 text-xs"
            />
          </div>

          {/* Amenity filter */}
          <select
            value={amenityFilter}
            onChange={(e) => setAmenityFilter(e.target.value)}
            className="field !py-2 text-xs min-w-[130px]"
          >
            <option value="all">Amenity: All</option>
            {amenities.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="field !py-2 text-xs min-w-[120px]"
          >
            <option value="all">Status: All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1 rounded-xl border border-cream-2 bg-white px-3 py-1.5 text-xs text-muted shadow-sm">
            <CalendarDays className="h-3.5 w-3.5 text-green-mid" />
            <input
              type="date"
              min="1990-01-01"
              max="2099-12-31"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-xs text-green-dark outline-none"
            />
            <span>–</span>
            <input
              type="date"
              min="1990-01-01"
              max="2099-12-31"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-xs text-green-dark outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-cream-2 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream text-left text-muted text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-4">Guest</th>
                  <th className="p-4">Amenity</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Session</th>
                  <th className="p-4">Pax</th>
                  <th className="p-4">Downpay</th>
                  <th className="p-4">Receipt</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-muted">
                      <CalendarDays className="mx-auto mb-2 h-6 w-6 animate-pulse text-green-mid/40" />
                      Loading reservations…
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted text-sm">
                      No reservations found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => openPanel(r)}
                      className={`cursor-pointer border-t border-cream-2 transition hover:bg-cream/40 ${
                        selected?.id === r.id && panelOpen
                          ? "bg-green-light/10"
                          : ""
                      }`}
                    >
                      <td className="p-4">
                        <div className="font-semibold text-green-dark text-xs">
                          {r.residentName}
                        </div>
                        {r.userEmail && (
                          <div className="text-[10px] text-muted">{r.userEmail}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Waves className="h-3.5 w-3.5 text-green-mid flex-shrink-0" />
                          <span className="text-xs font-medium text-green-dark">
                            {r.amenityName}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <TypeBadge type={r.reservationType} />
                      </td>
                      <td className="p-4 text-xs font-semibold text-green-dark whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="p-4 text-xs capitalize text-muted">
                        {r.bookingType}
                      </td>
                      <td className="p-4 text-xs text-center">{r.paxCount}</td>
                      <td className="p-4 text-xs font-bold text-green-mid whitespace-nowrap">
                        {formatPHP(r.downpayment)}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {r.receiptPath ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxUrl(r.receiptPath!);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                          >
                            <ReceiptText className="h-3 w-3" /> View
                          </button>
                        ) : (
                          <span className="text-xs text-muted/50">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPanel(r);
                          }}
                          className="rounded-lg border border-cream-2 bg-cream px-2.5 py-1 text-[11px] font-semibold text-green-dark hover:bg-green-mid hover:text-white transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-cream-2 px-5 py-3 text-xs text-muted">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length} reservations
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg p-1.5 hover:bg-cream disabled:opacity-30 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - page) <= 2
                  )
                  .map((p, idx, arr) => (
                    <>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span key={`ellipsis-${p}`} className="px-1">
                          …
                        </span>
                      )}
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`h-7 w-7 rounded-lg text-xs font-semibold transition ${
                          page === p
                            ? "bg-green-mid text-white"
                            : "hover:bg-cream text-green-dark"
                        }`}
                      >
                        {p}
                      </button>
                    </>
                  ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg p-1.5 hover:bg-cream disabled:opacity-30 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Side Panel ── */}
      <div
        className={`fixed right-0 top-0 z-[1500] flex h-full w-[380px] flex-col border-l border-cream-2 bg-white shadow-2xl transition-transform duration-300 ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selected && (
          <>
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-cream-2 p-4">
              <h3 className="font-serif text-lg font-bold text-green-dark">
                Reservation Details
              </h3>
              <button
                onClick={closePanel}
                className="rounded-lg p-1.5 text-muted hover:bg-cream hover:text-green-dark transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 scroll-thin">
              {/* Amenity banner */}
              <div className="overflow-hidden rounded-xl border border-cream-2">
                <div
                  className="h-28 w-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${
                      selectedAmenity?.image ||
                      "https://picsum.photos/seed/amenity/800/600"
                    })`,
                  }}
                />
                <div className="flex items-center justify-between p-3">
                  <div>
                    <div className="text-xs text-muted">Amenity</div>
                    <div className="font-serif text-sm font-bold text-green-dark">
                      {selected.amenityName}
                    </div>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              {/* Guest Information */}
              <section>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <Users className="h-3.5 w-3.5" /> Guest Information
                </div>
                <div className="rounded-xl border border-cream-2 bg-cream/30 p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Name</span>
                    <span className="font-semibold text-green-dark">
                      {selected.residentName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Email</span>
                    <span className="font-semibold text-green-dark break-all text-right">
                      {selected.userEmail || "—"}
                    </span>
                  </div>
                  {selected.phone && (
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1 text-muted">
                        <Phone className="h-3 w-3" /> Phone
                      </span>
                      <span className="font-semibold text-green-dark">
                        {selected.phone}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Reservation Details */}
              <section>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <CalendarDays className="h-3.5 w-3.5" /> Reservation Details
                </div>
                <div className="rounded-xl border border-cream-2 bg-cream/30 p-3 space-y-2 text-xs">
                  {[
                    { label: "Date", value: selected.date },
                    {
                      label: "Session",
                      value:
                        selected.bookingType.charAt(0).toUpperCase() +
                        selected.bookingType.slice(1),
                    },
                    { label: "Type", value: <TypeBadge type={selected.reservationType} /> },
                    { label: "Pax", value: selected.paxCount },
                    {
                      label: "Amount",
                      value: (
                        <span className="font-bold text-green-mid">
                          {formatPHP(selected.downpayment)}
                        </span>
                      ),
                    },
                    {
                      label: "Payment Method",
                      value: selected.gcashRef ? "GCash" : "Cash",
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-muted">{label}</span>
                      <span className="font-semibold text-green-dark">{value}</span>
                    </div>
                  ))}
                  {selected.gcashRef && (
                    <div className="flex justify-between border-t border-cream-2 pt-2">
                      <span className="text-muted">GCash Ref</span>
                      <span className="font-mono text-[10px] text-green-dark">
                        {selected.gcashRef}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Receipt */}
              <section>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <ReceiptText className="h-3.5 w-3.5" /> Receipt / Proof of Payment
                </div>
                {selected.receiptPath ? (
                  <div className="overflow-hidden rounded-xl border border-cream-2 bg-cream/20">
                    <img
                      src={selected.receiptPath}
                      alt="Payment receipt"
                      className="h-36 w-full object-cover object-top cursor-pointer hover:opacity-90 transition"
                      onClick={() => setLightboxUrl(selected.receiptPath!)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="p-3">
                      <div className="text-xs font-semibold text-green-dark">
                        {selected.gcashRef ? "GCash Receipt" : "Payment Receipt"}
                      </div>
                      {selected.gcashRef && (
                        <div className="text-[10px] text-muted font-mono mt-0.5">
                          Reference No. {selected.gcashRef}
                        </div>
                      )}
                      <button
                        onClick={() => setLightboxUrl(selected.receiptPath!)}
                        className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-green-mid hover:underline"
                      >
                        <ImageIcon className="h-3 w-3" /> View Full Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-cream-2 p-6 text-center text-xs text-muted">
                    <ReceiptText className="mx-auto mb-2 h-6 w-6 text-muted/40" />
                    No receipt uploaded yet.
                  </div>
                )}
              </section>

              {/* Notes */}
              {selected.notes && (
                <section>
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                    <MessageSquare className="h-3.5 w-3.5" /> Notes
                  </div>
                  <p className="rounded-xl border border-cream-2 bg-cream/30 p-3 text-xs leading-relaxed text-green-dark">
                    {selected.notes}
                  </p>
                </section>
              )}
              {!selected.notes && (
                <section>
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                    <MessageSquare className="h-3.5 w-3.5" /> Notes
                  </div>
                  <p className="rounded-xl border border-cream-2 bg-cream/30 p-3 text-xs text-muted italic">
                    No additional notes.
                  </p>
                </section>
              )}
            </div>

            {/* Panel Footer — Actions */}
            {selected.status === "pending" && (
              <div className="border-t border-cream-2 p-4 flex gap-2">
                <button
                  disabled={busyId === selected.id}
                  onClick={() => review(selected.id, "reject")}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-danger/40 bg-white py-2.5 text-xs font-bold text-danger hover:bg-danger-bg disabled:opacity-60 transition"
                >
                  <XCircle className="h-4 w-4" />
                  {busyId === selected.id ? "…" : "Decline"}
                </button>
                <button
                  disabled={busyId === selected.id}
                  onClick={() => review(selected.id, "approve")}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-green-mid py-2.5 text-xs font-bold text-white hover:bg-green-dark disabled:opacity-60 transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {busyId === selected.id ? "…" : "Approve"}
                </button>
              </div>
            )}
            {selected.status === "approved" && (
              <div className="border-t border-cream-2 p-4">
                <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Approved & Date Blocked
                </div>
              </div>
            )}
            {selected.status === "declined" && (
              <div className="border-t border-cream-2 p-4">
                <div className="flex items-center justify-center gap-2 rounded-xl bg-rose-50 py-3 text-xs font-bold text-rose-600">
                  <XCircle className="h-4 w-4" /> This reservation was declined
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-2xl w-full rounded-2xl bg-white p-4 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex w-full items-center justify-between border-b border-cream-2 pb-3">
              <div className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-green-mid" />
                <h3 className="font-serif text-lg font-bold text-green-dark">
                  Receipt Preview
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={lightboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 text-muted hover:bg-cream transition"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={lightboxUrl}
                  download
                  className="rounded-lg p-2 text-muted hover:bg-cream transition"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setLightboxUrl(null)}
                  className="rounded-lg p-2 text-muted hover:bg-cream transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="my-4 flex max-h-[70vh] w-full flex-1 items-center justify-center overflow-auto rounded-xl bg-cream/30 p-2">
              {lightboxUrl.endsWith(".pdf") ? (
                <iframe
                  src={lightboxUrl}
                  className="h-[65vh] w-full rounded-lg"
                  title="PDF Receipt"
                />
              ) : (
                <img
                  src={lightboxUrl}
                  alt="Receipt"
                  className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
