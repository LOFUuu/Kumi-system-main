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
  Download,
  FileSpreadsheet,
  History,
  Info,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";
import {
  computeDuesStatusForRecord,
  creditFor,
  outstandingFor,
  parseDuesRow,
  type ParsedExcelDuesRow,
  MONTH_NAMES,
  MONTH_ABBR,
} from "@/lib/dues";
import { formatPHP, type DuesRecord, type User } from "@/lib/mock-data";

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
    if (recordedMonths.length > 0) {
      const latest = [...recordedMonths].sort().reverse()[0];
      const y = parseInt(latest.slice(0, 4), 10);
      if (!isNaN(y)) return y;
    }
    return new Date().getFullYear();
  }, [value, recordedMonths]);

  const [viewYear, setViewYear] = useState<number>(initialYear);

  useEffect(() => {
    if (value && value.length >= 4) {
      const y = parseInt(value.slice(0, 4), 10);
      if (!isNaN(y)) setViewYear(y);
    }
  }, [value]);

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
      <div className="flex items-center gap-2 rounded-xl border border-cream-2 bg-white px-3 py-2 shadow-sm text-xs min-w-[200px]">
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

          <div className="mb-3 flex items-center justify-between gap-1 overflow-x-auto pb-1 text-[10px] text-muted">
            {[1990, 2000, 2010, 2020, 2025, 2026, 2030, 2040].map((yr) => (
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

// ── Excel Import Modal Component ─────────────────────────────────────────────
interface ExcelImportModalProps {
  users: User[];
  onClose: () => void;
  onSuccess: () => void;
}

function ExcelImportModal({ users, onClose, onSuccess }: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedExcelDuesRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resultSummary, setResultSummary] = useState<{
    total: number;
    imported: number;
    updated: number;
    duplicates: number;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (selectedFile: File) => {
    setErrorMsg("");
    setResultSummary(null);
    setFile(selectedFile);
    setParsing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("The selected Excel file is empty.");
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      if (rawJson.length === 0) {
        throw new Error("No data rows found in the Excel sheet.");
      }

      const rows = rawJson.map((row) => parseDuesRow(row, users));
      setParsedRows(rows);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to parse the Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.");
      setParsedRows([]);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setErrorMsg("");

    try {
      const payload = parsedRows.map((r) => ({
        residentId: r.residentId,
        residentName: r.residentName,
        blockNo: r.blockNo,
        lotNo: r.lotNo,
        dueMonth: r.dueMonth,
        dueDate: r.dueDate,
        amountDue: r.amountDue,
        amountPaid: r.amountPaid,
        creditBalance: r.creditBalance,
        paidAt: r.paidAt,
        status: r.status,
        billingMonth: r.billingMonth,
        billingYear: r.billingYear,
      }));

      const res = await api.importDues(payload);
      setResultSummary({
        total: res.summary.total,
        imported: res.summary.imported,
        updated: res.summary.updated,
        duplicates: res.summary.duplicates,
        message: res.message,
      });
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Import failed. Please check your data and try again.");
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        "Resident ID": "RES-003",
        "Resident Name": "Maria Santos",
        "Block": "B-12",
        "Lot": "34",
        "Month": "January",
        "Year": 2025,
        "Due Amount": 100,
        "Paid Amount": 100,
        "Payment Date": "2025-01-10",
        "Status": "Paid",
      },
      {
        "Resident ID": "RES-004",
        "Resident Name": "Jose Reyes",
        "Block": "C-03",
        "Lot": "11",
        "Month": "January",
        "Year": 2025,
        "Due Amount": 100,
        "Paid Amount": 100,
        "Payment Date": "2025-01-12",
        "Status": "Paid",
      },
      {
        "Resident ID": "RES-004",
        "Resident Name": "Jose Reyes",
        "Block": "C-03",
        "Lot": "11",
        "Month": "February",
        "Year": 2025,
        "Due Amount": 100,
        "Paid Amount": 100,
        "Payment Date": "2025-02-14",
        "Status": "Paid",
      },
      {
        "Resident ID": "RES-004",
        "Resident Name": "Jose Reyes",
        "Block": "C-03",
        "Lot": "11",
        "Month": "March",
        "Year": 2025,
        "Due Amount": 100,
        "Paid Amount": 0,
        "Payment Date": "",
        "Status": "Unpaid",
      },
      {
        "Resident ID": "RES-005",
        "Resident Name": "Linda Cruz",
        "Block": "A-21",
        "Lot": "7",
        "Month": "January",
        "Year": 2025,
        "Due Amount": 100,
        "Paid Amount": 200,
        "Payment Date": "2025-01-08",
        "Status": "Advance",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Dues");
    XLSX.writeFile(wb, "Mabuhay_Homes_Dues_Import_Template.xlsx");
  };

  const matchedCount = parsedRows.filter((r) => r.matchStatus === "matched").length;
  const unmatchedCount = parsedRows.length - matchedCount;

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cream-2 px-6 py-4 bg-cream/40">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-light/20 text-green-mid">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-green-dark leading-none">
                Import Historical Dues Database
              </h3>
              <p className="mt-1 text-xs text-muted">
                Upload your Excel or CSV file to import past and present dues records.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-cream text-muted hover:text-green-dark transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {resultSummary ? (
            /* Success Summary View */
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="font-serif text-xl font-bold text-emerald-900">
                  Import Completed Successfully!
                </h4>
                <p className="mt-1 text-sm text-emerald-700">
                  {resultSummary.message}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 max-w-md mx-auto">
                  <div className="rounded-xl bg-white p-3 border border-emerald-200 shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-muted">Total Processed</div>
                    <div className="text-xl font-bold text-green-dark">{resultSummary.total}</div>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-emerald-200 shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-emerald-600">{resultSummary.imported}</div>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-emerald-200 shadow-sm">
                    <div className="text-[10px] uppercase font-bold text-amber-600">{resultSummary.updated}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Upload & Preview Step */
            <>
              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cream-2 bg-cream/20 p-6 text-center cursor-pointer hover:border-green-mid hover:bg-green-light/5 transition"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm text-green-mid group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6" />
                </span>
                <p className="mt-3 text-sm font-bold text-green-dark">
                  {file ? file.name : "Drop Excel file here or Browse"}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Supports .xlsx, .xls, and .csv formats
                </p>
              </div>

              {/* Template Helper and Required Columns */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream-2 bg-cream/30 p-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-green-dark">Supported Column Names:</span>
                  <p className="text-[11px] text-muted">
                    Resident ID (optional), Resident Name, Month, Year, Due Amount, Paid Amount, Payment Date, Status
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="flex items-center gap-1.5 rounded-lg border border-green-mid/30 bg-white px-3 py-1.5 text-xs font-bold text-green-mid hover:bg-green-mid hover:text-white transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Sample Template
                </button>
              </div>

              {/* Parsing Indicator / Error */}
              {parsing && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-muted">
                  <RefreshCw className="h-4 w-4 animate-spin text-green-mid" />
                  Reading Excel sheets and matching residents…
                </div>
              )}

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Parsed Rows Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-green-dark">
                        Preview Parsed Records ({parsedRows.length} rows)
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {matchedCount} Matched
                      </span>
                      {unmatchedCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          {unmatchedCount} Unmatched / New
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-xl border border-cream-2">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-cream text-[10px] uppercase font-bold text-muted">
                        <tr>
                          <th className="p-2.5">Resident</th>
                          <th className="p-2.5">Match Status</th>
                          <th className="p-2.5">Period</th>
                          <th className="p-2.5">Due</th>
                          <th className="p-2.5">Paid</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-2">
                        {parsedRows.slice(0, 30).map((r, idx) => (
                          <tr key={idx} className="hover:bg-cream/40">
                            <td className="p-2.5 font-semibold text-green-dark">
                              {r.residentName}
                              {r.blockNo && (
                                <span className="block text-[10px] font-normal text-muted">
                                  {r.blockNo} / {r.lotNo}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5">
                              {r.matchStatus === "matched" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                  <UserCheck className="h-3 w-3" /> Matched
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                                  <Info className="h-3 w-3" /> New / Unmatched
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 whitespace-nowrap font-medium text-green-dark">
                              {r.billingMonth} {r.billingYear}
                            </td>
                            <td className="p-2.5 whitespace-nowrap font-bold text-green-dark">
                              {formatPHP(r.amountDue)}
                            </td>
                            <td className="p-2.5 whitespace-nowrap font-bold text-green-mid">
                              {formatPHP(r.amountPaid)}
                            </td>
                            <td className="p-2.5">
                              <StatusBadge status={r.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedRows.length > 30 && (
                    <p className="text-[10px] text-muted text-center italic">
                      Showing first 30 of {parsedRows.length} rows. All {parsedRows.length} rows will be imported.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-cream-2 px-6 py-4 bg-cream/20">
          {resultSummary ? (
            <button
              type="button"
              onClick={onClose}
              className="btn-green !px-6 !py-2 text-xs font-bold"
            >
              Done & View Ledger
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-cream-2 bg-white px-4 py-2 text-xs font-semibold text-muted hover:bg-cream transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedRows.length === 0 || importing || parsing}
                onClick={handleImport}
                className="btn-green flex items-center gap-2 !px-5 !py-2 text-xs font-bold disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Importing Records…
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Import {parsedRows.length > 0 ? `${parsedRows.length} Records` : "Excel"}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Resident History Modal Component ─────────────────────────────────────────
interface ResidentHistoryModalProps {
  residentName: string;
  dues: DuesRecord[];
  onClose: () => void;
  onRefresh: () => void;
}

function ResidentHistoryModal({
  residentName,
  dues,
  onClose,
  onRefresh,
}: ResidentHistoryModalProps) {
  const residentDues = useMemo(() => {
    return dues
      .filter((d) => d.residentName === residentName)
      .sort((a, b) => b.dueMonth.localeCompare(a.dueMonth));
  }, [dues, residentName]);

  const residentInfo = residentDues[0];
  const totalPaid = residentDues.reduce((s, d) => s + d.amountPaid, 0);
  const totalUnpaid = residentDues.reduce((s, d) => s + outstandingFor(d), 0);
  const totalCredit = residentDues.reduce(
    (s, d) => s + creditFor(d.amountDue, d.amountPaid),
    0
  );

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cream-2 px-6 py-4 bg-cream/40">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-mid text-white font-bold text-lg shadow-sm">
              {residentName.slice(0, 1)}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl font-bold text-green-dark">
                  {residentName}
                </h3>
                {residentInfo?.residentId && (
                  <span className="rounded-md bg-white border border-cream-2 px-2 py-0.5 text-[10px] font-mono font-bold text-muted">
                    ID: RES-{String(residentInfo.residentId).padStart(3, "0")}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                Block {residentInfo?.blockNo || "—"} / Lot {residentInfo?.lotNo || "—"} • Mabuhay Homes Phase 5
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-cream text-muted hover:text-green-dark transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 border-b border-cream-2 bg-cream/10 p-5">
          <div className="rounded-xl border border-cream-2 bg-white p-3 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-muted">Monthly Due</span>
            <div className="text-lg font-serif font-bold text-green-dark mt-0.5">₱100.00</div>
            <span className="text-[10px] text-muted">Fixed Monthly Rate</span>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-emerald-700">Total Paid (All Time)</span>
            <div className="text-lg font-serif font-bold text-emerald-800 mt-0.5">{formatPHP(totalPaid)}</div>
            <span className="text-[10px] text-emerald-600">{residentDues.length} recorded months</span>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-rose-700">Current Balance</span>
            <div className="text-lg font-serif font-bold text-rose-800 mt-0.5">{formatPHP(totalUnpaid)}</div>
            <span className="text-[10px] text-rose-600">Outstanding Unpaid</span>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-sky-700">Available Credit</span>
            <div className="text-lg font-serif font-bold text-sky-800 mt-0.5">{formatPHP(totalCredit)}</div>
            <span className="text-[10px] text-sky-600">Overpayment Balance</span>
          </div>
        </div>

        {/* Table of Continuous Dues History */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-green-dark flex items-center gap-1.5">
              <History className="h-4 w-4 text-green-mid" />
              Continuous Dues & Payment Ledger ({residentDues.length} Records)
            </h4>
          </div>

          <div className="overflow-hidden rounded-xl border border-cream-2 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream text-[10px] uppercase font-bold text-muted">
                <tr>
                  <th className="p-3">Billing Cycle</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Monthly Due</th>
                  <th className="p-3">Amount Paid</th>
                  <th className="p-3">Credit</th>
                  <th className="p-3">Payment Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-2">
                {residentDues.map((d) => {
                  const status = computeDuesStatusForRecord(d);
                  const credit = creditFor(d.amountDue, d.amountPaid);
                  return (
                    <tr key={d.id} className="hover:bg-cream/40 transition-colors">
                      <td className="p-3 font-semibold text-green-dark whitespace-nowrap">
                        {fmtMonth(d.dueMonth)}
                      </td>
                      <td className="p-3 text-muted whitespace-nowrap">
                        {d.dueDate
                          ? new Date(d.dueDate + "T00:00:00").toLocaleDateString("en-PH", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="p-3 font-bold text-green-dark whitespace-nowrap">
                        {formatPHP(d.amountDue)}
                      </td>
                      <td className="p-3 font-bold text-green-mid whitespace-nowrap">
                        {formatPHP(d.amountPaid)}
                      </td>
                      <td className="p-3 font-semibold text-sky-600 whitespace-nowrap">
                        {formatPHP(credit)}
                      </td>
                      <td className="p-3 text-muted whitespace-nowrap">
                        {d.paidAt
                          ? new Date(d.paidAt + "T00:00:00").toLocaleDateString("en-PH", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <StatusBadge status={status} />
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="rounded bg-cream px-2 py-0.5 text-[10px] font-medium text-muted capitalize">
                          {d.source || "system"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-cream-2 px-6 py-3 bg-cream/20">
          <button
            onClick={onClose}
            className="rounded-xl border border-cream-2 bg-white px-4 py-2 text-xs font-semibold text-muted hover:bg-cream transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin Dues Page Component ────────────────────────────────────────────────
export default function AdminDuesPage() {
  const [dues, setDues] = useState<DuesRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [animIn, setAnimIn] = useState(false);

  // Filters — monthFilter: "" = All Time, "YYYY" = Year, "YYYY-MM" = Specific Month
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedResidentHistory, setSelectedResidentHistory] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [duesData, usersData] = await Promise.all([
        api.dues(),
        api.users().catch(() => []),
      ]);
      setDues(duesData);
      setUsers(usersData);

      // Default to the latest month with records if available, otherwise show all time
      if (!monthFilter) {
        const recent = Array.from(
          new Set(duesData.map((d) => d.dueMonth).filter(Boolean))
        )
          .sort()
          .reverse()[0];
        if (recent) {
          setMonthFilter(recent);
        }
      }
    } catch (err) {
      console.error(err);
      setDues([]);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimIn(true), 50);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, []);

  // Recorded months for badges
  const recordedMonths = useMemo(() => {
    return Array.from(new Set(dues.map((d) => d.dueMonth).filter(Boolean)));
  }, [dues]);

  const resetFilters = () => {
    setMonthFilter("");
    setStatusFilter("all");
    setSearchQuery("");
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

      let matchSearch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const blockMatch = typeof d.blockNo === "string" && d.blockNo.toLowerCase().includes(q);
        const lotMatch = typeof d.lotNo === "string" && d.lotNo.toLowerCase().includes(q);
        matchSearch =
          d.residentName.toLowerCase().includes(q) ||
          blockMatch ||
          lotMatch;
      }

      return matchMonth && matchStatus && matchSearch;
    });
  }, [dues, monthFilter, statusFilter, searchQuery]);

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-green-dark">
            Dues Ledger
          </h1>
          <p className="mt-1 text-sm text-muted">
            Track residents&apos; ₱100 monthly dues and historical records from 1990 to future. Click any resident to inspect their full payment history.
          </p>
        </div>

        {/* Action Header Button */}
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="btn-green flex items-center gap-2 !px-4 !py-2.5 text-xs font-bold shadow-md hover:scale-105 transition"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Import Excel Database
        </button>
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

          {/* Filter Bar: [ Import Excel ] [ Billing Period ▼ ] [ Status ▼ ] [ Reset Filters ] */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {/* Import Excel Shortcut */}
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-green-mid/40 bg-green-light/15 px-3 py-2 text-xs font-bold text-green-dark shadow-sm hover:bg-green-mid hover:text-white transition cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-mid group-hover:text-white" />
              Import Excel
            </button>

            {/* Custom Month/Year Range Picker (1990 - 2099+) */}
            <MonthYearPicker
              value={monthFilter}
              onChange={setMonthFilter}
              recordedMonths={recordedMonths}
            />

            {/* Status select */}
            <div className="flex items-center gap-2 rounded-xl border border-cream-2 bg-white px-3 py-2 shadow-sm text-xs min-w-[130px]">
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

            {/* Search resident input */}
            <div className="flex items-center gap-2 rounded-xl border border-cream-2 bg-white px-3 py-2 shadow-sm text-xs min-w-[170px] flex-1 max-w-xs">
              <Search className="h-3.5 w-3.5 text-muted flex-shrink-0" />
              <input
                type="text"
                placeholder="Search resident or lot…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-green-dark placeholder:text-muted outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-muted hover:text-green-dark"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
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
                    <th className="p-4">Resident (Click for History)</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Month</th>
                    <th className="p-4">Due</th>
                    <th className="p-4">Paid</th>
                    <th className="p-4">Credit</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-muted">
                        <Coins className="mx-auto mb-2 h-6 w-6 animate-pulse text-green-mid/40" />
                        Loading dues records…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-sm text-muted"
                      >
                        No dues records found for {fmtMonth(monthFilter)}.
                        <div className="mt-2 flex items-center justify-center gap-3">
                          <button
                            onClick={() => setMonthFilter("")}
                            className="text-xs font-bold text-green-mid hover:underline"
                          >
                            View All Time Records →
                          </button>
                          <button
                            onClick={() => setShowImportModal(true)}
                            className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" /> Import Excel Database
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
                          onClick={() => setSelectedResidentHistory(d.residentName)}
                          className="group border-t border-cream-2 transition-colors duration-150 hover:bg-cream/50 cursor-pointer"
                          style={{
                            opacity: animIn ? 1 : 0,
                            transform: animIn
                              ? "translateX(0)"
                              : "translateX(-8px)",
                            transition: `opacity 0.3s ease ${idx * 30}ms, transform 0.3s ease ${idx * 30}ms`,
                          }}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-light/20 text-green-dark font-bold text-xs group-hover:bg-green-mid group-hover:text-white transition-colors">
                                {d.residentName.slice(0, 1)}
                              </span>
                              <div>
                                <div className="font-semibold text-green-dark text-xs group-hover:text-green-mid transition-colors flex items-center gap-1">
                                  {d.residentName}
                                  <History className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-green-mid" />
                                </div>
                                <div className="text-[10px] text-muted">
                                  {d.blockNo || "—"} / {d.lotNo || "—"}
                                </div>
                              </div>
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
                          <td className="p-4 whitespace-nowrap">
                            <StatusBadge status={status} />
                          </td>
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedResidentHistory(d.residentName);
                              }}
                              className="rounded-lg border border-cream-2 bg-white px-2.5 py-1 text-[11px] font-semibold text-green-dark hover:bg-green-mid hover:text-white hover:border-green-mid transition shadow-2xs"
                            >
                              History →
                            </button>
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
              <div className="border-t border-cream-2 px-5 py-3 text-xs text-muted flex items-center justify-between">
                <span>Showing 1–{filtered.length} of {filtered.length} dues records</span>
                <span className="text-[11px] text-muted/70">Tip: Click on any resident to inspect their full payment history</span>
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
                <button
                  type="button"
                  onClick={() => setStatusFilter("unpaid")}
                  className="group flex w-full items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-left transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                    <Users className="h-4 w-4 text-rose-500" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-green-dark">
                      Filter Unpaid
                    </div>
                    <div className="text-[10px] text-muted">{unpaidResidents} unpaid residents</div>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted group-hover:text-green-mid transition" />
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter("delayed")}
                  className="group flex w-full items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-left transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-green-dark">
                      View Overdue / Partial
                    </div>
                    <div className="text-[10px] text-muted">{overdueResidents} residents</div>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted group-hover:text-green-mid transition" />
                </button>
              </div>
            </div>

            {/* Tip card */}
            <div className="rounded-2xl border border-green-light/30 bg-green-light/8 p-4 text-xs text-green-dark">
              <div className="mb-2 flex items-center gap-1.5 font-bold">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Automatic ₱100 Monthly Dues</span>
              </div>
              <p className="leading-relaxed text-muted text-[11px]">
                The system automatically creates a fixed ₱100 due for all active residents every month. Carried credit from overpayments is automatically applied.
              </p>
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

      {/* ── Excel Import Modal ── */}
      {showImportModal && (
        <ExcelImportModal
          users={users}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* ── Resident History Slide-over / Modal ── */}
      {selectedResidentHistory && (
        <ResidentHistoryModal
          residentName={selectedResidentHistory}
          dues={dues}
          onClose={() => setSelectedResidentHistory(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
