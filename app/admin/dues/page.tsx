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
  Archive,
  ArchiveRestore,
  Printer,
  AlertTriangle,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";
import StatementOfAccountModal from "@/components/StatementOfAccountModal";
import GenerateBillingCycleModal from "@/components/GenerateBillingCycleModal";
import {
  computeDuesStatusForRecord,
  creditFor,
  outstandingFor,
  parseDuesRow,
  parseDuesBatch,
  type ParsedExcelDuesRow,
  type ImportMatchClassification,
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
  const [step, setStep] = useState<"upload" | "preview" | "success">("upload");
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

  const matchedCount = useMemo(
    () => parsedRows.filter((r) => r.classification === "MATCHED").length,
    [parsedRows]
  );
  const noAccountCount = useMemo(
    () => parsedRows.filter((r) => r.classification === "NO ACCOUNT FOUND").length,
    [parsedRows]
  );
  const duplicateCount = useMemo(
    () => parsedRows.filter((r) => r.classification === "DUPLICATE").length,
    [parsedRows]
  );
  const invalidCount = useMemo(
    () => parsedRows.filter((r) => r.classification === "INVALID").length,
    [parsedRows]
  );
  const reviewCount = useMemo(
    () => parsedRows.filter((r) => r.classification === "REVIEW REQUIRED").length,
    [parsedRows]
  );
  const validCount = useMemo(
    () => parsedRows.filter((r) => r.isValid).length,
    [parsedRows]
  );

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

      const rows = parseDuesBatch(rawJson, users);
      setParsedRows(rows);
      setStep("preview"); // Move strictly to Preview screen
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to parse the Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.");
      setParsedRows([]);
      setStep("upload");
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

  const handleResetFile = () => {
    setFile(null);
    setParsedRows([]);
    setErrorMsg("");
    setResultSummary(null);
    setStep("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(
      (r) => r.isValid && r.classification !== "INVALID" && r.classification !== "DUPLICATE"
    );
    if (validRows.length === 0) {
      setErrorMsg("No valid records to import. Please resolve invalid or duplicate rows first.");
      return;
    }
    setImporting(true);
    setErrorMsg("");

    try {
      const payload = validRows.map((r) => ({
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
        total: parsedRows.length,
        imported: res.summary.imported,
        updated: res.summary.updated,
        duplicates: duplicateCount + (res.summary.duplicates || 0),
        message: `Processed ${validRows.length} valid records (${res.summary.imported} new, ${res.summary.updated} updated). ${parsedRows.length - validRows.length} skipped. Login accounts were preserved without modification.`,
      });
      // Transition strictly to success state after database write
      setStep("success");
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
        "Unit/Block Code": "C-03 / 11",
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

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cream-2 px-6 py-4 bg-cream/40">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-light/20 text-green-mid">
              {step === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <FileSpreadsheet className="h-5 w-5" />
              )}
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-green-dark leading-none">
                {step === "upload" && "Import Historical Dues Database"}
                {step === "preview" && "Preview Parsed Records"}
                {step === "success" && "Import Completed Successfully!"}
              </h3>
              <p className="mt-1 text-xs text-muted">
                {step === "upload" && "Upload your Excel or CSV file to import past and present dues records."}
                {step === "preview" && "Review resident entity matching and dues data before committing to the database."}
                {step === "success" && "Your monthly dues records have been committed to the database ledger."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-cream text-muted hover:text-green-dark transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ── STEP 1: FILE UPLOAD ─────────────────────────────────── */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cream-2 bg-cream/20 p-8 text-center cursor-pointer hover:border-green-mid hover:bg-green-light/5 transition"
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
                  Drop Excel file here or Browse
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
                    Resident ID (optional), Resident Name, Block, Lot (or Unit/Block Code), Month, Year, Due Amount, Paid Amount, Payment Date, Status
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="flex items-center gap-1.5 rounded-lg border border-green-mid/30 bg-white px-3 py-1.5 text-xs font-bold text-green-mid hover:bg-green-mid hover:text-white transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Sample Template
                </button>
              </div>

              {/* Parsing Indicator */}
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
            </div>
          )}

          {/* ── STEP 2: PREVIEW PARSED RECORDS ───────────────────────── */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* File Info Strip */}
              <div className="flex items-center justify-between rounded-xl border border-cream-2 bg-cream/30 px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="h-4 w-4 text-green-mid flex-shrink-0" />
                  <span className="font-semibold text-green-dark truncate">
                    {file?.name || "Uploaded Spreadsheet"}
                  </span>
                  <span className="text-muted">
                    ({parsedRows.length} rows parsed)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetFile}
                  className="text-xs font-bold text-muted hover:text-green-dark underline transition cursor-pointer"
                >
                  Choose Another File
                </button>
              </div>

              {/* 5-Tier Matching Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="rounded-xl border border-cream-2 bg-white p-2.5 text-center shadow-2xs">
                  <div className="text-[9px] uppercase font-bold text-muted">Total Rows</div>
                  <div className="text-base font-bold text-green-dark">{parsedRows.length}</div>
                  <div className="text-[9px] text-emerald-600 font-medium">{validCount} valid</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-center shadow-2xs">
                  <div className="text-[9px] uppercase font-bold text-emerald-700">Matched Accounts</div>
                  <div className="text-base font-bold text-emerald-700 flex items-center justify-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" /> {matchedCount}
                  </div>
                  <div className="text-[9px] text-emerald-600">Safely linked</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-center shadow-2xs">
                  <div className="text-[9px] uppercase font-bold text-slate-700">No Account Found</div>
                  <div className="text-base font-bold text-slate-700 flex items-center justify-center gap-1">
                    <Info className="h-3.5 w-3.5" /> {noAccountCount}
                  </div>
                  <div className="text-[9px] text-slate-500">Admin record only</div>
                </div>
                <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-2.5 text-center shadow-2xs">
                  <div className="text-[9px] uppercase font-bold text-orange-700">Duplicate Rows</div>
                  <div className="text-base font-bold text-orange-700 flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> {duplicateCount}
                  </div>
                  <div className="text-[9px] text-orange-600">Auto-skipped</div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-2.5 text-center shadow-2xs">
                  <div className="text-[9px] uppercase font-bold text-rose-700">Invalid Rows</div>
                  <div className="text-base font-bold text-rose-700 flex items-center justify-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {invalidCount}
                  </div>
                  <div className="text-[9px] text-rose-600">Missing/malformed</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-center shadow-2xs">
                  <div className="text-[9px] uppercase font-bold text-amber-700">Review Required</div>
                  <div className="text-base font-bold text-amber-700 flex items-center justify-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> {reviewCount}
                  </div>
                  <div className="text-[9px] text-amber-600">Ambiguous match</div>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Interactive Read-Only Preview Table */}
              <div className="rounded-xl border border-cream-2 overflow-hidden shadow-2xs">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-cream text-[10px] uppercase font-bold text-muted z-10">
                      <tr>
                        <th className="p-2.5">Resident</th>
                        <th className="p-2.5">Match Classification</th>
                        <th className="p-2.5">Period</th>
                        <th className="p-2.5">Due</th>
                        <th className="p-2.5">Paid</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-2 bg-white">
                      {parsedRows.slice(0, 50).map((r, idx) => (
                        <tr key={idx} className="hover:bg-cream/40 transition">
                          <td className="p-2.5 font-semibold text-green-dark">
                            {r.residentName}
                            {(r.blockNo || r.lotNo) && (
                              <span className="block text-[10px] font-normal text-muted">
                                {r.blockNo ? `Block ${r.blockNo}` : ""} {r.lotNo ? `/ Lot ${r.lotNo}` : ""}
                              </span>
                            )}
                            {r.email && (
                              <span className="block text-[10px] font-normal text-muted/70">
                                {r.email}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {r.classification === "MATCHED" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                <UserCheck className="h-3 w-3" /> MATCHED
                              </span>
                            ) : r.classification === "NO ACCOUNT FOUND" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                                <Info className="h-3 w-3" /> NO ACCOUNT FOUND
                              </span>
                            ) : r.classification === "DUPLICATE" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 border border-orange-200">
                                <AlertTriangle className="h-3 w-3" /> DUPLICATE
                              </span>
                            ) : r.classification === "INVALID" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200" title={r.errors.join(", ")}>
                                <AlertCircle className="h-3 w-3" /> INVALID
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                <Sparkles className="h-3 w-3" /> REVIEW REQUIRED
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
              </div>

              {parsedRows.length > 50 && (
                <p className="text-[10px] text-muted text-center italic">
                  Showing first 50 of {parsedRows.length} rows. All {parsedRows.length} rows will be committed to the database.
                </p>
              )}

              <p className="text-[11px] text-muted text-center bg-cream/20 py-2 rounded-lg border border-cream-2">
                💡 Review the entity matches above. Click <strong>&quot;Confirm & Save to Ledger&quot;</strong> below to commit all valid rows into the database.
              </p>
            </div>
          )}

          {/* ── STEP 3: SUCCESS SUMMARY ──────────────────────────────── */}
          {step === "success" && resultSummary && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3 shadow-xs">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="font-serif text-xl font-bold text-emerald-900">
                  Import Completed Successfully!
                </h4>
                <p className="mt-1 text-sm text-emerald-700">
                  {resultSummary.message}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 max-w-md mx-auto">
                  <div className="rounded-xl bg-white p-3 border border-emerald-200 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-muted">Total Processed</div>
                    <div className="text-xl font-bold text-green-dark">{resultSummary.total}</div>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-emerald-200 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-emerald-600">New Added</div>
                    <div className="text-xl font-bold text-emerald-600">{resultSummary.imported}</div>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-emerald-200 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-amber-600">Updated / Synced</div>
                    <div className="text-xl font-bold text-amber-600">{resultSummary.updated}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-cream-2 px-6 py-4 bg-cream/20">
          {step === "upload" && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-cream-2 bg-white px-4 py-2 text-xs font-semibold text-muted hover:bg-cream transition cursor-pointer"
            >
              Cancel
            </button>
          )}

          {step === "preview" && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-cream-2 bg-white px-4 py-2 text-xs font-semibold text-muted hover:bg-cream transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="rounded-xl border border-cream-2 bg-white px-4 py-2 text-xs font-semibold text-green-dark hover:bg-cream transition cursor-pointer"
              >
                Back to Upload
              </button>
              <button
                type="button"
                disabled={parsedRows.length === 0 || importing}
                onClick={handleImport}
                className="btn-green flex items-center gap-2 !px-5 !py-2 text-xs font-bold disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {importing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Saving to Ledger…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirm &amp; Save to Ledger ({parsedRows.length} Records)
                  </>
                )}
              </button>
            </>
          )}

          {step === "success" && (
            <button
              type="button"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="btn-green !px-6 !py-2 text-xs font-bold cursor-pointer shadow-sm"
            >
              Done &amp; View Ledger
            </button>
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
  users?: User[];
  onClose: () => void;
  onRefresh: () => void;
}

function ResidentHistoryModal({
  residentName,
  dues,
  users = [],
  onClose,
  onRefresh,
}: ResidentHistoryModalProps) {
  const [showSoa, setShowSoa] = useState(false);
  const residentDues = useMemo(() => {
    return dues
      .filter((d) => d.residentName === residentName)
      .sort((a, b) => b.dueMonth.localeCompare(a.dueMonth));
  }, [dues, residentName]);

  const residentInfo = residentDues[0];
  const matchedUser = users.find(
    (u) =>
      u.fullName.toLowerCase() === residentName.toLowerCase() ||
      (residentInfo?.residentId && u.id === residentInfo.residentId) ||
      (residentInfo?.blockNo &&
        residentInfo?.lotNo &&
        String(u.blockNo) === String(residentInfo.blockNo) &&
        String(u.lotNo) === String(residentInfo.lotNo))
  );

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSoa(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition cursor-pointer"
              title="Generate and print official Statement of Account"
            >
              <Printer className="h-4 w-4" />
              <span>Print Official SOA</span>
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-cream text-muted hover:text-green-dark transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
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
        <div className="flex items-center justify-between border-t border-cream-2 px-6 py-3 bg-cream/20">
          <button
            type="button"
            onClick={() => setShowSoa(true)}
            className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3.5 py-2 text-xs font-bold text-green-dark hover:bg-cream transition cursor-pointer"
          >
            <Printer className="h-4 w-4 text-emerald-700" />
            <span>Generate / Print Statement of Account (SOA)</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-cream-2 bg-white px-4 py-2 text-xs font-semibold text-muted hover:bg-cream transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Official Statement of Account (SOA) Modal */}
      <StatementOfAccountModal
        isOpen={showSoa}
        onClose={() => setShowSoa(false)}
        user={
          matchedUser || {
            fullName: residentName,
            residentId: residentInfo?.residentId,
            blockNo: residentInfo?.blockNo,
            lotNo: residentInfo?.lotNo,
          }
        }
        dues={residentDues}
      />
    </div>
  );
}

// ── Admin Dues Page Component ────────────────────────────────────────────────
export default function AdminDuesPage() {
  const [dues, setDues] = useState<DuesRecord[]>([]);
  const [archivedDues, setArchivedDues] = useState<DuesRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [animIn, setAnimIn] = useState(false);

  // Archive modal & actions state
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [targetDuesToArchive, setTargetDuesToArchive] = useState<DuesRecord[]>([]);
  const [targetDuesToDelete, setTargetDuesToDelete] = useState<DuesRecord[]>([]);
  const [archiveReason, setArchiveReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filters — monthFilter: "" = All Time, "YYYY" = Year, "YYYY-MM" = Specific Month
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedResidentHistory, setSelectedResidentHistory] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [duesData, archivedData, usersData] = await Promise.all([
        api.dues(),
        api.archivedDues().catch(() => []),
        api.users().catch(() => []),
      ]);
      setDues(duesData);
      setArchivedDues(archivedData);
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
      setArchivedDues([]);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimIn(true), 50);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, []);

  // Clear selections on tab switch
  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  // Auto-dismiss action feedback
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  // Recorded months for badges (both active and archived)
  const recordedMonths = useMemo(() => {
    return Array.from(
      new Set(
        [...dues, ...archivedDues]
          .map((d) => (d.dueMonth || "").slice(0, 7))
          .filter(Boolean)
      )
    );
  }, [dues, archivedDues]);

  const resetFilters = () => {
    setMonthFilter("");
    setStatusFilter("all");
    setSearchQuery("");
  };

  const currentRecords = activeTab === "active" ? dues : archivedDues;

  // Filtered list
  const filtered = useMemo(() => {
    return currentRecords.filter((d) => {
      let matchMonth = true;
      if (monthFilter && monthFilter !== "all") {
        const dMonthNorm = (d.dueMonth || "").slice(0, 7);
        const filterNorm = monthFilter.slice(0, 7);
        if (monthFilter.length === 4) {
          matchMonth = (d.dueMonth || "").startsWith(monthFilter);
        } else {
          matchMonth = dMonthNorm === filterNorm;
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
  }, [currentRecords, monthFilter, statusFilter, searchQuery]);

  // Multi-select controls
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((d) => selectedIds.includes(d.id));
  const someFilteredSelected =
    filtered.some((d) => selectedIds.includes(d.id)) && !allFilteredSelected;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filtered.map((d) => d.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...filtered.map((d) => d.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Open single item archive modal
  const handleOpenSingleArchive = (record: DuesRecord) => {
    setTargetDuesToArchive([record]);
    setArchiveReason("");
    setArchiveModalOpen(true);
  };

  // Open bulk archive modal
  const handleOpenBulkArchive = () => {
    const targets = filtered.filter((d) => selectedIds.includes(d.id));
    if (targets.length === 0) return;
    setTargetDuesToArchive(targets);
    setArchiveReason("");
    setArchiveModalOpen(true);
  };

  // Commit Archive action
  const handleConfirmArchive = async () => {
    if (targetDuesToArchive.length === 0) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const ids = targetDuesToArchive.map((d) => d.id);
      const res = await api.archiveDues(ids, archiveReason.trim() || "Archived by Administrator");
      if (res.ok) {
        setActionFeedback({
          type: "success",
          message: res.message || `Successfully archived ${res.count ?? ids.length} dues record(s).`,
        });
        setArchiveModalOpen(false);
        setSelectedIds([]);
        await loadData();
      } else {
        setActionFeedback({
          type: "error",
          message: res.message || "Failed to archive selected records.",
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        message: err?.message || "An unexpected error occurred while archiving.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Restore 1 or multiple records
  const handleRestoreRecords = async (ids: number[]) => {
    if (ids.length === 0) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await api.unarchiveDues(ids);
      if (res.ok) {
        setActionFeedback({
          type: "success",
          message: res.message || `Successfully restored ${res.count ?? ids.length} dues record(s) to active ledger.`,
        });
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
        await loadData();
      } else {
        setActionFeedback({
          type: "error",
          message: res.message || "Failed to restore records.",
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        message: err?.message || "An error occurred while restoring records.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Permanently delete archived records
  const handleConfirmDeleteRecords = async () => {
    if (targetDuesToDelete.length === 0) return;
    const ids = targetDuesToDelete.map((d) => d.id);
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await api.deleteDues(ids);
      if (res.ok) {
        setActionFeedback({
          type: "success",
          message: res.message || `Permanently deleted ${ids.length} dues record(s).`,
        });
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
        setTargetDuesToDelete([]);
        await loadData();
      } else {
        setActionFeedback({
          type: "error",
          message: res.message || "Failed to delete records.",
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        message: err?.message || "An error occurred while deleting records.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Restore all records for selected month
  const handleRestoreSelectedMonth = async () => {
    if (!monthFilter) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await api.unarchiveMonth(monthFilter);
      if (res.ok) {
        setActionFeedback({
          type: "success",
          message: res.message || `Successfully restored records for ${fmtMonth(monthFilter)} to active ledger.`,
        });
        await loadData();
      } else {
        setActionFeedback({
          type: "error",
          message: res.message || "Failed to restore records for the selected month.",
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: "error",
        message: err?.message || "An error occurred while restoring records.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const archivedCountForSelectedMonth = useMemo(() => {
    if (!monthFilter || monthFilter === "all") return 0;
    const filterNorm = monthFilter.slice(0, 7);
    return archivedDues.filter((d) => (d.dueMonth || "").slice(0, 7) === filterNorm).length;
  }, [archivedDues, monthFilter]);

  // Scope for summary statistics (calculated on current tab records: active or archived)
  const scope = useMemo(() => {
    const list = currentRecords;
    if (!monthFilter || monthFilter === "all") return list;
    const filterNorm = monthFilter.slice(0, 7);
    if (monthFilter.length === 4) {
      return list.filter((d) => (d.dueMonth || "").startsWith(monthFilter));
    }
    return list.filter((d) => (d.dueMonth || "").slice(0, 7) === filterNorm);
  }, [currentRecords, monthFilter]);

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
      {/* ── Action Feedback Toast/Banner ── */}
      {actionFeedback && (
        <div
          className={`mb-4 flex items-center justify-between rounded-2xl border px-4 py-3 text-xs font-semibold shadow-sm animate-fadeIn ${
            actionFeedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-muted hover:text-green-dark"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-green-dark text-white px-4 py-2.5 text-xs font-bold shadow-md hover:bg-green-mid hover:scale-105 transition cursor-pointer"
          >
            <CalendarDays className="h-4 w-4 text-emerald-300" />
            <span>Start / Generate Billing Cycle</span>
          </button>
          <a
            href="/admin/amenities/archive"
            className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3.5 py-2.5 text-xs font-bold text-muted hover:text-green-dark hover:bg-cream transition shadow-xs"
          >
            <Archive className="h-4 w-4 text-amber-600" />
            Archive Center
          </a>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="btn-green flex items-center gap-2 !px-4 !py-2.5 text-xs font-bold shadow-md hover:scale-105 transition"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel Database
          </button>
        </div>
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

          {/* ── Sub-tabs: Active Dues vs Archived Dues ── */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="inline-flex rounded-2xl border border-cream-2 bg-white p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                  activeTab === "active"
                    ? "bg-green-dark text-white shadow-xs"
                    : "text-muted hover:text-green-dark"
                }`}
              >
                <span>Active Dues</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    activeTab === "active"
                      ? "bg-green-mid/40 text-cream"
                      : "bg-cream-2 text-muted"
                  }`}
                >
                  {dues.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("archived")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                  activeTab === "archived"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-muted hover:text-amber-700"
                }`}
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Archived Dues</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    activeTab === "archived"
                      ? "bg-amber-500/40 text-white"
                      : "bg-cream-2 text-muted"
                  }`}
                >
                  {archivedDues.length}
                </span>
              </button>
            </div>

            {activeTab === "archived" && (
              <span className="text-xs text-amber-700 font-medium hidden sm:inline-block">
                Archived records are hidden from active ledger and summaries.
              </span>
            )}
          </div>

          {/* ── Bulk Action Context Bar (Appears when >= 1 item is selected) ── */}
          {selectedIds.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-dark/20 bg-green-dark px-4 py-2.5 text-white shadow-md animate-fadeIn">
              <div className="flex items-center gap-3 text-xs">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-light text-green-dark font-bold text-[10px]">
                  {selectedIds.length}
                </span>
                <span className="font-semibold text-cream">
                  {selectedIds.length} record{selectedIds.length > 1 ? "s" : ""} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-[11px] text-cream/70 underline hover:text-white transition cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activeTab === "active" ? (
                  <button
                    type="button"
                    onClick={handleOpenBulkArchive}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive Selected ({selectedIds.length})
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleRestoreRecords(selectedIds)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      Restore Selected ({selectedIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const toDelete = archivedDues.filter((d) => selectedIds.includes(d.id));
                        setTargetDuesToDelete(toDelete);
                      }}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Selected ({selectedIds.length})
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

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
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someFilteredSelected;
                        }}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-cream-2 text-green-mid focus:ring-green-mid cursor-pointer"
                      />
                    </th>
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
                      <td colSpan={9} className="py-16 text-center text-muted">
                        <Coins className="mx-auto mb-2 h-6 w-6 animate-pulse text-green-mid/40" />
                        Loading dues records…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-12 text-center text-sm text-muted"
                      >
                        {activeTab === "active" && archivedCountForSelectedMonth > 0 ? (
                          <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-xs text-center">
                            <Archive className="mx-auto h-7 w-7 text-amber-600 mb-2" />
                            <h5 className="font-serif text-base font-bold text-amber-900">
                              {archivedCountForSelectedMonth} dues record{archivedCountForSelectedMonth > 1 ? "s" : ""} for {fmtMonth(monthFilter)} {archivedCountForSelectedMonth > 1 ? "are" : "is"} in Archived Dues
                            </h5>
                            <p className="mt-1 text-xs text-amber-700">
                              These records are archived and hidden from the active ledger. You can inspect them in Archived Dues or restore them to the active ledger with one click.
                            </p>
                            <div className="mt-3 flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveTab("archived")}
                                className="rounded-xl border border-amber-300 bg-white px-3.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition shadow-2xs cursor-pointer"
                              >
                                View Archived ({archivedCountForSelectedMonth})
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={handleRestoreSelectedMonth}
                                className="btn-green !px-3.5 !py-1.5 text-xs font-bold shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                {actionLoading ? "Restoring…" : `Restore to Active Ledger`}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            No {activeTab === "archived" ? "archived" : ""} dues records found for {fmtMonth(monthFilter)}.
                            <div className="mt-2 flex items-center justify-center gap-3">
                              <button
                                onClick={() => setMonthFilter("")}
                                className="text-xs font-bold text-green-mid hover:underline cursor-pointer"
                              >
                                View All Time Records →
                              </button>
                              {activeTab === "active" && (
                                <button
                                  onClick={() => setShowImportModal(true)}
                                  className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <FileSpreadsheet className="h-3.5 w-3.5" /> Import Excel Database
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((d, idx) => {
                      const status = computeDuesStatusForRecord(d);
                      const credit = creditFor(d.amountDue, d.amountPaid);
                      const isSelected = selectedIds.includes(d.id);
                      return (
                        <tr
                          key={d.id}
                          onClick={() => setSelectedResidentHistory(d.residentName)}
                          className={`group border-t border-cream-2 transition-colors duration-150 cursor-pointer ${
                            isSelected ? "bg-green-light/15" : "hover:bg-cream/50"
                          }`}
                          style={{
                            opacity: animIn ? 1 : 0,
                            transform: animIn
                              ? "translateX(0)"
                              : "translateX(-8px)",
                            transition: `opacity 0.3s ease ${idx * 30}ms, transform 0.3s ease ${idx * 30}ms`,
                          }}
                        >
                          {/* Checkbox column */}
                          <td
                            className="p-4 w-10 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(d.id)}
                              className="h-4 w-4 rounded border-cream-2 text-green-mid focus:ring-green-mid cursor-pointer"
                            />
                          </td>
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
                                  {d.archiveReason && (
                                    <span className="ml-2 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 border border-amber-200">
                                      {d.archiveReason}
                                    </span>
                                  )}
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
                          <td
                            className="p-4 text-center whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedResidentHistory(d.residentName)}
                                className="rounded-lg border border-cream-2 bg-white px-2.5 py-1 text-[11px] font-semibold text-green-dark hover:bg-green-mid hover:text-white hover:border-green-mid transition shadow-2xs"
                              >
                                History →
                              </button>
                              {activeTab === "active" ? (
                                <button
                                  type="button"
                                  title="Archive this dues record"
                                  onClick={() => handleOpenSingleArchive(d)}
                                  className="rounded-lg border border-cream-2 bg-white p-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 hover:border-amber-200 transition shadow-2xs cursor-pointer"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    title="Restore this record to active dues"
                                    onClick={() => handleRestoreRecords([d.id])}
                                    className="rounded-lg border border-cream-2 bg-white p-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition shadow-2xs cursor-pointer"
                                  >
                                    <ArchiveRestore className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Permanently delete this archived record"
                                    onClick={() => setTargetDuesToDelete([d])}
                                    className="rounded-lg border border-cream-2 bg-white p-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition shadow-2xs cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
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
                <span>
                  Showing {filtered.length} {activeTab === "archived" ? "archived" : "active"} dues record{filtered.length > 1 ? "s" : ""}
                </span>
                <span className="text-[11px] text-muted/70">
                  Tip: Multi-select rows using checkboxes for bulk archive or restore operations
                </span>
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
          dues={[...dues, ...archivedDues]}
          users={users}
          onClose={() => setSelectedResidentHistory(null)}
          onRefresh={loadData}
        />
      )}

      {/* ── Archive Confirmation Modal ── */}
      {archiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-cream-2 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <Archive className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-serif text-lg font-bold text-green-dark">
                  Archive Dues Records
                </h3>
                <p className="text-xs text-muted">
                  {targetDuesToArchive.length === 1
                    ? `Archiving record for ${targetDuesToArchive[0].residentName} (${fmtMonth(targetDuesToArchive[0].dueMonth)})`
                    : `Archiving ${targetDuesToArchive.length} selected dues records`}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed mb-4">
              Archived dues are safely hidden from active financial calculations and insights, but can be reviewed or restored at any time.
            </p>

            <div className="mb-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-green-dark mb-1.5">
                Archive Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Moved Out, Paid in Advance, Duplicate..."
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full rounded-xl border border-cream-2 bg-cream/40 px-3 py-2 text-xs text-green-dark outline-none focus:border-green-mid"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["Moved Out", "Paid in Advance", "Duplicate Entry", "Record Correction"].map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => setArchiveReason(pill)}
                    className="rounded-full border border-cream-2 bg-cream/60 px-2 py-0.5 text-[10px] text-muted hover:border-green-mid hover:text-green-dark transition cursor-pointer"
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-cream-2">
              <button
                type="button"
                onClick={() => {
                  setArchiveModalOpen(false);
                  setArchiveReason("");
                }}
                disabled={actionLoading}
                className="rounded-xl border border-cream-2 bg-white px-4 py-2 text-xs font-semibold text-muted hover:bg-cream transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Permanent Delete Modal ────────────────────────────────────── */}
      {targetDuesToDelete.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => !actionLoading && setTargetDuesToDelete([])}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </span>
              <div>
                <h3 className="font-serif text-lg font-bold text-rose-700">
                  Delete Permanently?
                </h3>
                <p className="text-xs text-muted">
                  {targetDuesToDelete.length === 1
                    ? `Deleting dues record for ${targetDuesToDelete[0].residentName} (${fmtMonth(targetDuesToDelete[0].dueMonth)})`
                    : `Deleting ${targetDuesToDelete.length} selected dues records`}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 leading-relaxed mb-4">
              ⚠️ This action <strong>cannot be undone</strong>. {targetDuesToDelete.length === 1 ? "This archived monthly dues record" : `These ${targetDuesToDelete.length} archived monthly dues records`} will be permanently erased from the database.
            </div>

            <p className="text-xs text-muted leading-relaxed mb-5">
              Please confirm that you want to delete this record permanently. Only use this for duplicate entries or errors created by mistake.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-cream-2">
              <button
                type="button"
                onClick={() => setTargetDuesToDelete([])}
                disabled={actionLoading}
                className="rounded-xl border border-cream-2 bg-white px-4 py-2 text-xs font-semibold text-muted hover:bg-cream transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRecords}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {actionLoading ? "Deleting…" : targetDuesToDelete.length === 1 ? "Yes, Delete Record" : `Yes, Delete (${targetDuesToDelete.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initialize Billing Cycle Modal */}
      <GenerateBillingCycleModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
