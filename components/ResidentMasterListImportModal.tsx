"use client";

import { useState, useRef, useMemo } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Table,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { api } from "@/lib/api";

interface ResidentMasterListImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface DetectedColumns {
  nameCol: string;
  firstNameCol?: string;
  lastNameCol?: string;
  blockCol: string;
  lotCol: string;
  emailCol: string;
  phoneCol: string;
}

export default function ResidentMasterListImportModal({
  isOpen,
  onClose,
  onSuccess,
}: ResidentMasterListImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Column Mapping State
  const [selectedNameCol, setSelectedNameCol] = useState<string>("");
  const [selectedBlockCol, setSelectedBlockCol] = useState<string>("");
  const [selectedLotCol, setSelectedLotCol] = useState<string>("");
  const [selectedEmailCol, setSelectedEmailCol] = useState<string>("");
  const [selectedPhoneCol, setSelectedPhoneCol] = useState<string>("");

  // Split Name mode (First Name + Last Name)
  const [splitNameMode, setSplitNameMode] = useState(false);
  const [selectedFirstNameCol, setSelectedFirstNameCol] = useState("");
  const [selectedLastNameCol, setSelectedLastNameCol] = useState("");

  // Summary State
  const [summary, setSummary] = useState<{
    total: number;
    imported: number;
    skipped: number;
    duplicates: number;
    retroMatched: number;
    flaggedForReview: number;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoDetectColumns = (headers: string[]): DetectedColumns => {
    let nameCol = "";
    let firstNameCol = "";
    let lastNameCol = "";
    let blockCol = "";
    let lotCol = "";
    let emailCol = "";
    let phoneCol = "";

    const lowerHeaders = headers.map((h) => ({
      original: h,
      lower: h.toLowerCase().trim().replace(/[\s_-]+/g, " "),
    }));

    // 1. Single Name column
    for (const item of lowerHeaders) {
      if (
        [
          "name",
          "full name",
          "fullname",
          "resident",
          "resident name",
          "homeowner",
          "homeowner name",
          "member name",
          "owner",
        ].includes(item.lower)
      ) {
        nameCol = item.original;
        break;
      }
    }

    // 2. First name / Last name columns
    for (const item of lowerHeaders) {
      if (["first name", "firstname", "first", "fname"].includes(item.lower)) {
        firstNameCol = item.original;
      }
      if (
        ["last name", "lastname", "last", "lname", "surname", "family name"].includes(
          item.lower
        )
      ) {
        lastNameCol = item.original;
      }
    }

    // 3. Block column
    for (const item of lowerHeaders) {
      if (["block", "blk", "block no", "block number", "blk no"].includes(item.lower)) {
        blockCol = item.original;
        break;
      }
    }

    // 4. Lot column
    for (const item of lowerHeaders) {
      if (["lot", "lot no", "lot number", "lot #"].includes(item.lower)) {
        lotCol = item.original;
        break;
      }
    }

    // 5. Email column
    for (const item of lowerHeaders) {
      if (["email", "e mail", "email address", "e mail address"].includes(item.lower)) {
        emailCol = item.original;
        break;
      }
    }

    // 6. Phone column
    for (const item of lowerHeaders) {
      if (
        [
          "phone",
          "phone number",
          "mobile",
          "mobile number",
          "contact",
          "contact number",
          "cellphone",
          "tel",
        ].includes(item.lower)
      ) {
        phoneCol = item.original;
        break;
      }
    }

    return {
      nameCol,
      firstNameCol,
      lastNameCol,
      blockCol,
      lotCol,
      emailCol,
      phoneCol,
    };
  };

  const SPREADSHEET_EXTENSIONS = [".xlsx", ".xls", ".csv"];

  const parseSpreadsheetBuffer = (buffer: ArrayBuffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("The selected spreadsheet contains no sheets.");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: "",
    });

    if (!data || data.length === 0) {
      throw new Error("No data rows found in the spreadsheet.");
    }

    return data;
  };

  const extractSpreadsheetFromZip = async (buffer: ArrayBuffer): Promise<{ data: Record<string, any>[]; fileName: string }> => {
    const zip = await JSZip.loadAsync(buffer);
    const entries = Object.keys(zip.files).filter((name) => {
      const lower = name.toLowerCase();
      // Skip macOS resource fork files and hidden files
      if (lower.includes("__macosx") || lower.startsWith(".") || lower.includes("/.")) return false;
      return SPREADSHEET_EXTENSIONS.some((ext) => lower.endsWith(ext));
    });

    if (entries.length === 0) {
      throw new Error(
        "No spreadsheet files (.xlsx, .xls, .csv) found inside the ZIP archive."
      );
    }

    // Pick the first valid spreadsheet
    const targetEntry = entries[0];
    const fileData = await zip.files[targetEntry].async("arraybuffer");
    const data = parseSpreadsheetBuffer(fileData);
    return { data, fileName: targetEntry.split("/").pop() || targetEntry };
  };

  const handleFileProcess = async (selectedFile: File) => {
    setErrorMsg("");
    setSummary(null);
    setFile(selectedFile);
    setParsing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const isZip = selectedFile.name.toLowerCase().endsWith(".zip");

      let data: Record<string, any>[];

      if (isZip) {
        const result = await extractSpreadsheetFromZip(buffer);
        data = result.data;
      } else {
        data = parseSpreadsheetBuffer(buffer);
      }

      // Collect all unique headers across all rows
      const headerSet = new Set<string>();
      data.forEach((row) => {
        Object.keys(row).forEach((k) => headerSet.add(k));
      });
      const headers = Array.from(headerSet);

      setRawHeaders(headers);
      setRawRows(data);

      // Auto-detect columns
      const detected = autoDetectColumns(headers);

      if (detected.nameCol) {
        setSelectedNameCol(detected.nameCol);
        setSplitNameMode(false);
      } else if (detected.firstNameCol && detected.lastNameCol) {
        setSelectedFirstNameCol(detected.firstNameCol);
        setSelectedLastNameCol(detected.lastNameCol);
        setSplitNameMode(true);
      } else if (headers.length > 0) {
        setSelectedNameCol(headers[0]);
        setSplitNameMode(false);
      }

      setSelectedBlockCol(detected.blockCol || "");
      setSelectedLotCol(detected.lotCol || "");
      setSelectedEmailCol(detected.emailCol || "");
      setSelectedPhoneCol(detected.phoneCol || "");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err?.message ||
          "Failed to parse file. Please upload a valid .xlsx, .xls, .csv, or .zip file."
      );
      setRawHeaders([]);
      setRawRows([]);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Preview mapped rows (first 10)
  const mappedPreview = useMemo(() => {
    if (rawRows.length === 0) return [];

    return rawRows.slice(0, 10).map((row, idx) => {
      let name = "";
      if (splitNameMode) {
        const first = row[selectedFirstNameCol] ? String(row[selectedFirstNameCol]).trim() : "";
        const last = row[selectedLastNameCol] ? String(row[selectedLastNameCol]).trim() : "";
        name = `${first} ${last}`.trim();
      } else {
        name = selectedNameCol && row[selectedNameCol] ? String(row[selectedNameCol]).trim() : "";
      }

      const block = selectedBlockCol && row[selectedBlockCol] ? String(row[selectedBlockCol]).trim() : "—";
      const lot = selectedLotCol && row[selectedLotCol] ? String(row[selectedLotCol]).trim() : "—";
      const email = selectedEmailCol && row[selectedEmailCol] ? String(row[selectedEmailCol]).trim() : "—";
      const phone = selectedPhoneCol && row[selectedPhoneCol] ? String(row[selectedPhoneCol]).trim() : "—";

      return {
        id: idx + 1,
        fullName: name || "(Empty)",
        block,
        lot,
        email,
        phone,
      };
    });
  }, [
    rawRows,
    splitNameMode,
    selectedNameCol,
    selectedFirstNameCol,
    selectedLastNameCol,
    selectedBlockCol,
    selectedLotCol,
    selectedEmailCol,
    selectedPhoneCol,
  ]);

  const handleConfirmImport = async () => {
    if (rawRows.length === 0) return;
    if (!splitNameMode && !selectedNameCol) {
      setErrorMsg("Please select the Name column from your file before importing.");
      return;
    }
    if (splitNameMode && (!selectedFirstNameCol || !selectedLastNameCol)) {
      setErrorMsg("Please select both First Name and Last Name columns.");
      return;
    }

    setImporting(true);
    setErrorMsg("");

    try {
      const recordsToImport = rawRows.map((row) => {
        let fullName = "";
        if (splitNameMode) {
          const first = row[selectedFirstNameCol] ? String(row[selectedFirstNameCol]).trim() : "";
          const last = row[selectedLastNameCol] ? String(row[selectedLastNameCol]).trim() : "";
          fullName = `${first} ${last}`.trim();
        } else {
          fullName = selectedNameCol && row[selectedNameCol] ? String(row[selectedNameCol]).trim() : "";
        }

        return {
          fullName,
          block: selectedBlockCol && row[selectedBlockCol] ? String(row[selectedBlockCol]).trim() : undefined,
          lot: selectedLotCol && row[selectedLotCol] ? String(row[selectedLotCol]).trim() : undefined,
          email: selectedEmailCol && row[selectedEmailCol] ? String(row[selectedEmailCol]).trim() : undefined,
          phone: selectedPhoneCol && row[selectedPhoneCol] ? String(row[selectedPhoneCol]).trim() : undefined,
        };
      });

      const res = await api.importResidentMasterList({ records: recordsToImport });

      setSummary({
        total: res.summary.total,
        imported: res.summary.imported,
        skipped: res.summary.skipped,
        duplicates: res.summary.duplicates,
        retroMatched: res.summary.retroMatched,
        flaggedForReview: res.summary.flaggedForReview,
        message: res.message,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to import resident master list.");
    } finally {
      setImporting(false);
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-cream-2 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-cream-2 px-6 py-4 bg-[#133E2B] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white shadow-inner">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold">Import Resident Master List</h2>
              <p className="text-xs text-white/80">
                Upload official HOA resident database (.xlsx, .xls, .csv, .zip)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SUCCESS SUMMARY VIEW */}
          {summary ? (
            <div className="space-y-6 py-4 text-center animate-fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-inner">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div>
                <h3 className="font-serif text-xl font-bold text-green-dark">
                  Master List Imported Successfully!
                </h3>
                <p className="mt-1 text-xs text-muted max-w-md mx-auto">
                  {summary.message}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-cream-2 bg-cream/40 p-3 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Rows</div>
                  <div className="font-serif text-xl font-bold text-green-dark">{summary.total}</div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Imported</div>
                  <div className="font-serif text-xl font-bold text-emerald-700">{summary.imported}</div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Duplicates</div>
                  <div className="font-serif text-xl font-bold text-amber-700">{summary.duplicates}</div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Promoted</div>
                  <div className="font-serif text-xl font-bold text-blue-700">{summary.retroMatched}</div>
                </div>
              </div>

              {summary.flaggedForReview > 0 && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span>
                    {summary.flaggedForReview} accounts had multiple name matches and were flagged for manual review.
                  </span>
                </div>
              )}

              <button
                onClick={handleFinish}
                className="w-full sm:w-auto px-8 py-2.5 rounded-full bg-[#133E2B] hover:bg-[#0E2F20] text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                Close & Refresh Residents
              </button>
            </div>
          ) : (
            <>
              {/* STEP 1: FILE DROPZONE */}
              {!file ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cream-2 bg-cream/30 p-8 text-center transition hover:border-emerald-600 hover:bg-emerald-50/30"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, .zip"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileProcess(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 mb-3">
                    <Upload className="h-7 w-7" />
                  </div>
                  <h4 className="font-serif text-base font-bold text-green-dark">
                    Drag and drop your spreadsheet or ZIP file here
                  </h4>
                  <p className="mt-1 text-xs text-muted max-w-sm">
                    Supports Microsoft Excel (.xlsx, .xls), CSV (.csv), and ZIP (.zip) files.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 rounded-full bg-[#133E2B] hover:bg-[#0E2F20] text-white px-5 py-2 text-xs font-bold shadow-sm transition"
                  >
                    Browse Files
                  </button>
                </div>
              ) : (
                /* FILE LOADED & COLUMN MAPPING */
                <div className="space-y-5">
                  {/* Loaded File Bar */}
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-700" />
                      <div>
                        <div className="font-bold text-xs text-emerald-950">{file.name}</div>
                        <div className="text-[11px] text-emerald-700">
                          {rawRows.length} total rows detected
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setRawRows([]);
                        setRawHeaders([]);
                      }}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Change File
                    </button>
                  </div>

                  {/* COLUMN MAPPING CONTROLS */}
                  <div className="rounded-2xl border border-cream-2 bg-cream/20 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-700" />
                        <h4 className="font-serif text-sm font-bold text-green-dark">
                          Confirm Column Mapping
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSplitNameMode(!splitNameMode)}
                        className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                      >
                        {splitNameMode
                          ? "Switch to Single Full Name Column"
                          : "File has First & Last Name separated?"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {/* Name Column(s) */}
                      {!splitNameMode ? (
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-green-dark flex items-center gap-1">
                            Name Column <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={selectedNameCol}
                            onChange={(e) => setSelectedNameCol(e.target.value)}
                            className="w-full rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs font-semibold text-green-deep focus:border-emerald-600 focus:outline-none"
                          >
                            <option value="">-- Select Column --</option>
                            {rawHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-green-dark flex items-center gap-1">
                              First Name <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={selectedFirstNameCol}
                              onChange={(e) => setSelectedFirstNameCol(e.target.value)}
                              className="w-full rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs font-semibold text-green-deep focus:border-emerald-600 focus:outline-none"
                            >
                              <option value="">-- Select Column --</option>
                              {rawHeaders.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-green-dark flex items-center gap-1">
                              Last Name <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={selectedLastNameCol}
                              onChange={(e) => setSelectedLastNameCol(e.target.value)}
                              className="w-full rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs font-semibold text-green-deep focus:border-emerald-600 focus:outline-none"
                            >
                              <option value="">-- Select Column --</option>
                              {rawHeaders.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      {/* Block Column */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                          Block Column (Optional)
                        </label>
                        <select
                          value={selectedBlockCol}
                          onChange={(e) => setSelectedBlockCol(e.target.value)}
                          className="w-full rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs font-semibold text-green-deep focus:border-emerald-600 focus:outline-none"
                        >
                          <option value="">-- None / Skip --</option>
                          {rawHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Lot Column */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                          Lot Column (Optional)
                        </label>
                        <select
                          value={selectedLotCol}
                          onChange={(e) => setSelectedLotCol(e.target.value)}
                          className="w-full rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs font-semibold text-green-deep focus:border-emerald-600 focus:outline-none"
                        >
                          <option value="">-- None / Skip --</option>
                          {rawHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Email Column */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                          Email Column (Optional)
                        </label>
                        <select
                          value={selectedEmailCol}
                          onChange={(e) => setSelectedEmailCol(e.target.value)}
                          className="w-full rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs font-semibold text-green-deep focus:border-emerald-600 focus:outline-none"
                        >
                          <option value="">-- None / Skip --</option>
                          {rawHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Phone Column */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                          Phone Column (Optional)
                        </label>
                        <select
                          value={selectedPhoneCol}
                          onChange={(e) => setSelectedPhoneCol(e.target.value)}
                          className="w-full rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs font-semibold text-green-deep focus:border-emerald-600 focus:outline-none"
                        >
                          <option value="">-- None / Skip --</option>
                          {rawHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* PREVIEW TABLE (FIRST 10 ROWS) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-green-dark">
                        <Table className="h-4 w-4 text-emerald-700" />
                        <span>Preview Mapped Data (First 10 Rows)</span>
                      </div>
                      <span className="text-[11px] text-muted">
                        Total {rawRows.length} rows to import
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-cream-2 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-cream/50 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-cream-2">
                          <tr>
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Resident Name</th>
                            <th className="px-3 py-2">Block</th>
                            <th className="px-3 py-2">Lot</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Phone</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cream-2">
                          {mappedPreview.map((row) => (
                            <tr key={row.id} className="hover:bg-cream/30">
                              <td className="px-3 py-2 text-muted">{row.id}</td>
                              <td className="px-3 py-2 font-bold text-green-dark whitespace-nowrap">
                                {row.fullName}
                              </td>
                              <td className="px-3 py-2 text-green-deep">{row.block}</td>
                              <td className="px-3 py-2 text-green-deep">{row.lot}</td>
                              <td className="px-3 py-2 text-muted truncate max-w-[140px]">{row.email}</td>
                              <td className="px-3 py-2 text-muted whitespace-nowrap">{row.phone}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!summary && (
          <div className="flex items-center justify-end gap-3 border-t border-cream-2 bg-cream/30 px-6 py-3.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="rounded-full border border-cream-2 bg-white px-4 py-2 text-xs font-bold text-muted hover:bg-cream hover:text-green-dark transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={
                importing ||
                rawRows.length === 0 ||
                (!splitNameMode && !selectedNameCol) ||
                (splitNameMode && (!selectedFirstNameCol || !selectedLastNameCol))
              }
              className="flex items-center gap-2 rounded-full bg-[#133E2B] hover:bg-[#0E2F20] text-white px-6 py-2 text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {importing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Importing & Matching...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Import Database</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
