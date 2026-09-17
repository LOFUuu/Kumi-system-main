"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Coins,
  RefreshCw,
  RotateCcw,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  computeDuesStatusForRecord,
  creditFor,
  outstandingFor,
} from "@/lib/dues";
import { formatPHP, type DuesRecord } from "@/lib/mock-data";

// ── helpers ─────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
    on_time: "bg-emerald-100 text-emerald-700 border-emerald-200",
    unpaid: "bg-rose-100 text-rose-700 border-rose-200",
    delayed: "bg-amber-100 text-amber-700 border-amber-200",
    advance: "bg-sky-100 text-sky-700 border-sky-200",
  };
  const label = status === "on_time" ? "paid" : status.replace("_", " ");
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${
        map[status] ?? "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {label}
    </span>
  );
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Generate years from 1990 to 2099 (covers all history to future)
const MIN_YEAR = 1990;
const MAX_YEAR = 2099;
const ALL_YEARS = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, i) => MIN_YEAR + i
);

// Format "2026-05" → "May 2026" or "2026" → "Year 2026"
function fmtMonth(ym: string) {
  if (!ym || ym === "all") return "All Time (1990–Future)";
  if (ym.length === 4) return `Year ${ym}`;
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

// ── Custom Year & Month Range Calendar Picker (1990 to 2099+) ────────────────
interface MonthYearPickerProps {
  value: string; // "YYYY-MM", "YYYY", or ""
  onChange: (val: string) => void;
  recordedMonths: string[]; // List of YYYY-MM that exist in DB
}

function MonthYearPicker({
  value,
  onChange,
  recordedMonths,
}: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Current view year
  const initialYear = useMemo(() => {
    if (value && value.length >= 4) {
      const parsed = parseInt(value.slice(0, 4), 10);
      if (!isNaN(parsed) && parsed >= MIN_YEAR && parsed <= MAX_YEAR) {
        return parsed;
      }
    }
    // Default to the year of the latest recorded month, or current year
    if (recordedMonths.length > 0) {
      const latest = [...recordedMonths].sort().reverse()[0];
      const y = parseInt(latest.slice(0, 4), 10);
      if (!isNaN(y)) return y;
    }
    return new Date().getFullYear();
  }, [value, recordedMonths]);

  const [viewYear, setViewYear] = useState<number>(initialYear);

  // Sync view year when value changes externally
  useEffect(() => {
    if (value && value.length >= 4) {
      const y = parseInt(value.slice(0, 4), 10);
      if (!isNaN(y)) setViewYear(y);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Parse active month from value
  const selectedYear = value && value.length >= 4 ? parseInt(value.slice(0, 4), 10) : null;
  const selectedMonth =
    value && value.length === 7 ? parseInt(value.slice(5, 7), 10) : null;
  const isFullYearSelected = value && value.length === 4;

  const currentCalYear = new Date().getFullYear();
  const currentCalMonth = new Date().getMonth() + 1;

  const handleSelectMonth = (monthIndex1Based: number) => {
    const formatted = `${viewYear}-${String(monthIndex1Based).padStart(2, "0")}`;
    onChange(formatted);
    setOpen(false);
  };

  const handleSelectFullYear = () => {
    onChange(String(viewYear));
    setOpen(false);
  };

  const handleSelectAllTime = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <div className="flex items-center gap-2 rounded-xl border border-cream-2 bg-white px-3 py-2 shadow-sm text-xs min-w-[220px]">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex flex-1 items-center gap-2 text-left cursor-pointer outline-none group"
        >
          <CalendarDays className="h-4 w-4 text-green-mid flex-shrink-0 group-hover:scale-110 transition-transform" />
          <div className="flex-1 truncate">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted block leading-none">
              Billing Period
            </span>
            <span className="text-xs font-bold text-green-dark truncate block mt-0.5">
              {fmtMonth(value)}
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted transition-transform duration-200 ${
              open ? "rotate-180 text-green-mid" : ""
            }`}
          />
        </button>

        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-cream hover:bg-cream-2 text-muted hover:text-green-dark text-[11px] font-bold transition"
            title="Reset to All Time (1990–Future)"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Floating Calendar Popover */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-2xl border border-cream-2 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 duration-200">
          {/* Header Controls: Year Navigation & Quick Jump */}
          <div className="mb-3 flex items-center justify-between border-b border-cream-2 pb-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewYear((y) => Math.max(MIN_YEAR, y - 5))}
                disabled={viewYear <= MIN_YEAR}
                title="Previous 5 Years"
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-cream text-muted hover:text-green-dark disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewYear((y) => Math.max(MIN_YEAR, y - 1))}
                disabled={viewYear <= MIN_YEAR}
                title="Previous Year"
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-cream text-muted hover:text-green-dark disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Year Selector Dropdown (1990 – 2099) */}
            <div className="flex items-center gap-1">
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="rounded-lg border border-cream-2 bg-cream/50 px-2 py-1 text-sm font-bold text-green-dark outline-none cursor-pointer hover:border-green-mid transition"
              >
                {ALL_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewYear((y) => Math.min(MAX_YEAR, y + 1))}
                disabled={viewYear >= MAX_YEAR}
                title="Next Year"
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-cream text-muted hover:text-green-dark disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewYear((y) => Math.min(MAX_YEAR, y + 5))}
                disabled={viewYear >= MAX_YEAR}
                title="Next 5 Years"
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-cream text-muted hover:text-green-dark disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Decade Jump shortcuts */}
          <div className="mb-3 flex items-center justify-between gap-1 overflow-x-auto pb-1 text-[10px] text-muted">
            {[1990, 2000, 2010, 2020, 2026, 2030, 2040, 2050].map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setViewYear(yr)}
                className={`rounded-md px-1.5 py-0.5 font-medium transition cursor-pointer ${
                  viewYear === yr
                    ? "bg-green-mid/15 text-green-dark font-bold"
                    : "hover:bg-cream hover:text-green-dark"
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* 12 Months Grid */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {MONTH_ABBR.map((abbr, idx) => {
              const monthNum = idx + 1;
              const isSelected =
                selectedYear === viewYear && selectedMonth === monthNum;
              const isCurrent =
                viewYear === currentCalYear && monthNum === currentCalMonth;
              const formatted = `${viewYear}-${String(monthNum).padStart(2, "0")}`;
              const hasData = recordedMonths.includes(formatted);

              return (
                <button
                  key={abbr}
                  type="button"
                  onClick={() => handleSelectMonth(monthNum)}
                  className={`relative flex flex-col items-center justify-center rounded-xl py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-green-mid text-white shadow-sm scale-105"
                      : "hover:bg-cream text-green-dark"
                  } ${isCurrent && !isSelected ? "ring-1 ring-green-mid/40 font-bold" : ""}`}
                >
                  <span>{abbr}</span>
                  {hasData && (
                    <span
                      className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                        isSelected ? "bg-white" : "bg-emerald-500"
                      }`}
                      title="Has dues records"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Full Year & All Time Quick Actions */}
          <div className="space-y-1.5 border-t border-cream-2 pt-3 text-xs">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleSelectFullYear}
                className={`flex items-center justify-center gap-1 rounded-xl border py-1.5 font-semibold transition cursor-pointer ${
                  isFullYearSelected && selectedYear === viewYear
                    ? "bg-green-mid text-white border-green-mid"
                    : "border-cream-2 bg-cream/40 text-green-dark hover:bg-cream hover:border-green-mid/50"
                }`}
              >
                Full Year {viewYear}
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewYear(currentCalYear);
                  handleSelectMonth(currentCalMonth);
                }}
                className="flex items-center justify-center gap-1 rounded-xl border border-cream-2 bg-cream/40 py-1.5 font-semibold text-green-dark hover:bg-cream hover:border-green-mid/50 transition cursor-pointer"
              >
                <Sparkles className="h-3 w-3 text-amber-500" />
                This Month
              </button>
            </div>

            <button
              type="button"
              onClick={handleSelectAllTime}
              className={`w-full rounded-xl border py-2 text-center text-xs font-bold transition cursor-pointer ${
                !value
                  ? "bg-green-dark text-white border-green-dark"
                  : "border-cream-2 bg-cream/30 text-green-dark hover:bg-cream"
              }`}
            >
              All Time (1990 – Future)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Dues Page Component ────────────────────────────────────────────────
export default function AdminDuesPage() {
  const [dues, setDues] = useState<DuesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [animIn, setAnimIn] = useState(false);

  // Filters — monthFilter: "" = All Time, "YYYY" = Year, "YYYY-MM" = Specific Month
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    api
      .dues()
      .then((data) => {
        setDues(data);
        // Default to the latest month with records if available, otherwise show all time
        const recent = Array.from(
          new Set(data.map((d) => d.dueMonth).filter(Boolean))
        )
          .sort()
          .reverse()[0];
        if (recent) {
          setMonthFilter(recent);
        }
      })
      .catch(() => setDues([]))
      .finally(() => {
        setLoading(false);
        setTimeout(() => setAnimIn(true), 50);
      });
  }, []);

  // Recorded months for badges
  const recordedMonths = useMemo(() => {
    return Array.from(new Set(dues.map((d) => d.dueMonth).filter(Boolean)));
  }, [dues]);

  const resetFilters = () => {
    setMonthFilter("");
    setStatusFilter("all");
  };

  // Filtered list
  const filtered = useMemo(() => {
    return dues.filter((d) => {
      let matchMonth = true;
      if (monthFilter && monthFilter !== "all") {
        if (monthFilter.length === 4) {
          matchMonth = d.dueMonth.startsWith(monthFilter);
        } else {
          matchMonth = d.dueMonth === monthFilter;
        }
      }

      const status = computeDuesStatusForRecord(d);
      const displayStatus = status === "on_time" ? "paid" : status;
      const matchStatus =
        statusFilter === "all" || displayStatus === statusFilter;
      return matchMonth && matchStatus;
    });
  }, [dues, monthFilter, statusFilter]);

  // Scope for summary statistics
  const scope = useMemo(() => {
    if (!monthFilter || monthFilter === "all") return dues;
    if (monthFilter.length === 4) {
      return dues.filter((d) => d.dueMonth.startsWith(monthFilter));
    }
    return dues.filter((d) => d.dueMonth === monthFilter);
  }, [dues, monthFilter]);

  const totalExpected = scope.reduce((s, d) => s + d.amountDue, 0);
  const totalPaid = scope.reduce(
    (s, d) => s + Math.min(d.amountPaid, d.amountDue),
    0
  );
  const totalUnpaid = scope.reduce((s, d) => s + outstandingFor(d), 0);
  const totalPending = scope.reduce((s, d) => {
    const st = computeDuesStatusForRecord(d);
    return s + (st === "delayed" ? outstandingFor(d) : 0);
  }, 0);

  const paidResidents = scope.filter((d) => {
    const st = computeDuesStatusForRecord(d);
    return st === "on_time" || st === "paid" || st === "advance";
  }).length;
  const unpaidResidents = scope.filter(
    (d) => computeDuesStatusForRecord(d) === "unpaid"
  ).length;
  const overdueResidents = scope.filter(
    (d) => computeDuesStatusForRecord(d) === "delayed"
  ).length;
  const pctPaid = scope.length
    ? Math.round((paidResidents / scope.length) * 100)
    : 0;

  return (
    <div
      className={`transition-all duration-500 ${
        animIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-green-dark">
          Dues Ledger
        </h1>
        <p className="mt-1 text-sm text-muted">
          View and track residents&apos; dues payments from 1990 to the future.
          Filter by year, month, or status to see payment records.
        </p>
      </div>

      {/* ── Layout: left (stats + table) + right (insights) ── */}
      <div className="flex gap-6">
        {/* LEFT COLUMN */}
        <div className="flex-1 min-w-0">
          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Total Expected",
                value: formatPHP(totalExpected),
                sub: `${scope.length} residents`,
                icon: CalendarDays,
                iconBg: "bg-green-light/20",
                iconColor: "text-green-mid",
                valueColor: "text-green-dark",
                delay: 0,
              },
              {
                label: "Total Paid",
                value: formatPHP(totalPaid),
                sub: `${paidResidents} residents`,
                icon: CheckCircle2,
                iconBg: "bg-emerald-100",
                iconColor: "text-emerald-600",
                valueColor: "text-emerald-700",
                delay: 50,
              },
              {
                label: "Total Unpaid",
                value: formatPHP(totalUnpaid),
                sub: `${unpaidResidents} residents`,
                icon: AlertCircle,
                iconBg: "bg-rose-100",
                iconColor: "text-rose-500",
                valueColor: "text-rose-600",
                delay: 100,
              },
              {
                label: "Pending",
                value: formatPHP(totalPending),
                sub: `${overdueResidents} residents`,
                icon: Clock,
                iconBg: "bg-amber-100",
                iconColor: "text-amber-600",
                valueColor: "text-amber-700",
                delay: 150,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="group flex items-center gap-3 rounded-2xl border border-cream-2 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                style={{
                  animationDelay: `${s.delay}ms`,
                  opacity: animIn ? 1 : 0,
                  transform: animIn ? "translateY(0)" : "translateY(12px)",
                  transition: `opacity 0.4s ease ${s.delay}ms, transform 0.4s ease ${s.delay}ms`,
                }}
              >
                <span
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${s.iconBg} transition-transform duration-300 group-hover:scale-110`}
                >
                  <s.icon className={`h-5 w-5 ${s.iconColor}`} />
                </span>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {s.label}
                  </div>
                  <div
                    className={`font-serif text-xl font-bold leading-tight ${s.valueColor}`}
                  >
                    {s.value}
                  </div>
                  <div className="text-[10px] text-muted/70">({s.sub})</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {/* Custom Month/Year Range Picker (1990 - 2099+) */}
            <MonthYearPicker
              value={monthFilter}
              onChange={setMonthFilter}
              recordedMonths={recordedMonths}
            />

            {/* Status select */}
            <div className="flex items-center gap-2 rounded-xl border border-cream-2 bg-white px-3 py-2 shadow-sm text-xs min-w-[140px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 bg-transparent text-xs text-green-dark font-semibold outline-none cursor-pointer"
              >
                <option value="all">Status: All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="delayed">Delayed</option>
                <option value="advance">Advance</option>
              </select>
            </div>

            {/* Reset */}
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs font-semibold text-muted shadow-sm hover:text-green-dark hover:bg-cream transition cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
            </button>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-cream-2 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream text-left text-[11px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="p-4">Resident</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Month</th>
                    <th className="p-4">Due</th>
                    <th className="p-4">Paid</th>
                    <th className="p-4">Credit</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-muted">
                        <Coins className="mx-auto mb-2 h-6 w-6 animate-pulse text-green-mid/40" />
                        Loading dues records…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-sm text-muted"
                      >
                        No dues records found for {fmtMonth(monthFilter)}.
                        <div className="mt-2">
                          <button
                            onClick={() => setMonthFilter("")}
                            className="text-xs font-bold text-green-mid hover:underline"
                          >
                            View All Time Records →
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((d, idx) => {
                      const status = computeDuesStatusForRecord(d);
                      const credit = creditFor(d.amountDue, d.amountPaid);
                      return (
                        <tr
                          key={d.id}
                          className="group border-t border-cream-2 transition-colors duration-150 hover:bg-cream/40"
                          style={{
                            opacity: animIn ? 1 : 0,
                            transform: animIn
                              ? "translateX(0)"
                              : "translateX(-8px)",
                            transition: `opacity 0.3s ease ${idx * 40}ms, transform 0.3s ease ${idx * 40}ms`,
                          }}
                        >
                          <td className="p-4">
                            <div className="font-semibold text-green-dark text-xs">
                              {d.residentName}
                            </div>
                            <div className="text-[10px] text-muted">
                              {d.blockNo} / {d.lotNo}
                            </div>
                          </td>
                          <td className="p-4 text-xs text-muted whitespace-nowrap">
                            {d.dueDate
                              ? new Date(
                                  d.dueDate + "T00:00:00"
                                ).toLocaleDateString("en-PH", {
                                  month: "short",
                                  day: "2-digit",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="p-4 text-xs text-green-dark font-medium whitespace-nowrap">
                            {fmtMonth(d.dueMonth)}
                          </td>
                          <td className="p-4 text-xs font-bold text-green-dark whitespace-nowrap">
                            {formatPHP(d.amountDue)}
                          </td>
                          <td className="p-4 text-xs font-bold text-green-mid whitespace-nowrap">
                            {formatPHP(d.amountPaid)}
                          </td>
                          <td className="p-4 text-xs font-semibold text-sky-600 whitespace-nowrap">
                            {formatPHP(credit)}
                          </td>
                          <td className="p-4">
                            <StatusBadge status={status} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Footer row count */}
            {!loading && filtered.length > 0 && (
              <div className="border-t border-cream-2 px-5 py-3 text-xs text-muted">
                Showing 1–{filtered.length} of {filtered.length} residents
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — Insights Panel */}
        <div
          className="w-72 flex-shrink-0"
          style={{
            opacity: animIn ? 1 : 0,
            transform: animIn ? "translateX(0)" : "translateX(20px)",
            transition: "opacity 0.5s ease 200ms, transform 0.5s ease 200ms",
          }}
        >
          <div className="sticky top-4 space-y-3">
            {/* Insights card */}
            <div className="rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-light/20">
                  <TrendingUp className="h-4 w-4 text-green-mid" />
                </span>
                <h3 className="font-serif text-base font-bold text-green-dark">
                  Monthly Due Insights
                </h3>
              </div>

              {/* Progress bar */}
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted">
                  Payment Completion
                </span>
                <span className="font-bold text-green-dark">{pctPaid}%</span>
              </div>
              <div className="mb-1 h-2.5 w-full overflow-hidden rounded-full bg-cream-2">
                <div
                  className="h-full rounded-full bg-green-mid transition-all duration-700 ease-out"
                  style={{ width: `${pctPaid}%` }}
                />
              </div>
              <p className="mb-5 text-[10px] text-muted">
                {paidResidents} of {scope.length} residents paid
              </p>

              {/* Quick stats */}
              <div className="space-y-2">
                {[
                  {
                    icon: Users,
                    label: `Send reminders`,
                    sub: `${unpaidResidents} unpaid residents`,
                    color: "text-rose-500",
                    bg: "bg-rose-50",
                    border: "border-rose-100",
                  },
                  {
                    icon: Clock,
                    label: "View overdue",
                    sub: `${overdueResidents} residents`,
                    color: "text-amber-600",
                    bg: "bg-amber-50",
                    border: "border-amber-100",
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    className={`group flex w-full items-center gap-3 rounded-xl border ${item.border} ${item.bg} px-3 py-2.5 text-left transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5`}
                  >
                    <span
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm`}
                    >
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-green-dark">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-muted">{item.sub}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted group-hover:text-green-mid transition" />
                  </button>
                ))}
              </div>
            </div>

            {/* Tip card */}
            <div className="rounded-2xl border border-green-light/30 bg-green-light/8 p-4 text-xs text-green-dark">
              <div className="mb-2 flex items-center gap-1.5 font-bold">
                <Bell className="h-3.5 w-3.5 text-green-mid" />
                <span>Tip</span>
              </div>
              <p className="leading-relaxed text-muted">
                Enable automatic due-date reminders to reduce late payments
                and keep your community on track.
              </p>
              <button className="mt-3 flex items-center gap-1 font-semibold text-green-mid hover:underline transition">
                <Settings className="h-3 w-3" /> Settings →
              </button>
            </div>

            {/* Summary breakdown */}
            <div className="rounded-2xl border border-cream-2 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Coins className="h-4 w-4 text-green-mid" />
                <h4 className="text-xs font-bold text-green-dark uppercase tracking-wider">
                  {fmtMonth(monthFilter)} Summary
                </h4>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  {
                    label: "Expected",
                    value: formatPHP(totalExpected),
                    color: "text-green-dark",
                  },
                  {
                    label: "Collected",
                    value: formatPHP(totalPaid),
                    color: "text-emerald-600",
                  },
                  {
                    label: "Outstanding",
                    value: formatPHP(totalUnpaid),
                    color: "text-rose-600",
                  },
                  {
                    label: "Credit Carried",
                    value: formatPHP(
                      scope.reduce(
                        (s, d) => s + creditFor(d.amountDue, d.amountPaid),
                        0
                      )
                    ),
                    color: "text-sky-600",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between border-b border-cream-2 pb-1.5 last:border-0 last:pb-0"
                  >
                    <span className="text-muted">{row.label}</span>
                    <span className={`font-bold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
