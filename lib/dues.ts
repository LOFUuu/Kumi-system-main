import type { DuesRecord, DuesStatus, User } from "./mock-data";

export const DEFAULT_MONTHLY_DUE = 100;

export const MONTH_NAMES = [
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

export const MONTH_ABBR = [
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

/** Parse month name or number string to 2-digit "01"-"12" */
export function normalizeMonthNumber(m: string | number): string | null {
  if (typeof m === "number") {
    if (m >= 1 && m <= 12) return String(m).padStart(2, "0");
    return null;
  }
  const str = String(m || "").trim().toLowerCase();
  if (!str) return null;

  // Numeric string "1" - "12"
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    return String(num).padStart(2, "0");
  }

  // Month names
  const idx = MONTH_NAMES.findIndex((name) => name.toLowerCase() === str || name.toLowerCase().startsWith(str));
  if (idx !== -1) {
    return String(idx + 1).padStart(2, "0");
  }

  const abbrIdx = MONTH_ABBR.findIndex((abbr) => abbr.toLowerCase() === str);
  if (abbrIdx !== -1) {
    return String(abbrIdx + 1).padStart(2, "0");
  }

  return null;
}

/** Format YYYY-MM to readable "September 2026" */
export function formatBillingPeriod(ym: string): string {
  if (!ym || ym === "all") return "All Time";
  if (ym.length === 4) return `Year ${ym}`;
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return ym;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export interface DuesInput {
  dueMonth: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  paidAt?: string;
}

// Algorithmic dues status, tied to each record's fixed monthly due date.
//   unpaid   - nothing recorded for the cycle
//   delayed  - partial payment, OR fully paid but after the due date (same month)
//   on_time  - fully paid on or before the due date (within the cycle)
//   advance  - fully paid BEFORE the billing cycle month began (paying ahead)
export function computeDuesStatus(r: DuesInput): DuesStatus {
  if (r.amountPaid <= 0) return "unpaid";
  if (r.amountPaid < r.amountDue) return "delayed";

  if (!r.paidAt) return "on_time";

  const [y, m] = r.dueMonth.split("-").map(Number);
  const cycleStart = new Date(y, m - 1, 1).getTime();
  const paid = new Date(r.paidAt + "T00:00:00").getTime();
  if (paid < cycleStart) return "advance";

  // Default the due date to the end of month or 5th
  const dueDate = r.dueDate || `${r.dueMonth}-30`;
  const due = new Date(dueDate + "T00:00:00").getTime();
  if (!Number.isFinite(due) || paid <= due) return "on_time";
  return "delayed";
}

// Overpayment on this record, which is carried over as credit to future cycles.
export function creditFor(amountDue: number, amountPaid: number): number {
  return Math.max(0, amountPaid - amountDue);
}

// Effective remaining balance for this cycle after any applied payments.
export function outstandingFor(r: DuesInput): number {
  return Math.max(0, r.amountDue - r.amountPaid);
}

// Next billing cycle string given a "YYYY-MM" cycle, e.g. "2026-08" -> "2026-09".
export function nextDueMonth(dueMonth: string): string {
  const [y, m] = dueMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Previous billing cycle string given a "YYYY-MM" cycle, e.g. "2026-08" -> "2026-07".
export function prevDueMonth(dueMonth: string): string {
  const [y, m] = dueMonth.split("-").map(Number);
  const d = new Date(y, m - 1 - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Current billing cycle string in "YYYY-MM" format based on current date
export function getCurrentDueMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Fixed due date for a cycle (e.g. 30th of month)
export function getCycleDueDate(dueMonth: string): string {
  const [y, m] = dueMonth.split("-").map(Number);
  // Last day of that month
  const lastDay = new Date(y, m, 0).getDate();
  return `${dueMonth}-${String(lastDay).padStart(2, "0")}`;
}

export function computeDuesStatusForRecord(r: DuesRecord): DuesStatus {
  return computeDuesStatus({
    dueMonth: r.dueMonth,
    dueDate: r.dueDate,
    amountDue: r.amountDue,
    amountPaid: r.amountPaid,
    paidAt: r.paidAt,
  });
}

/** Clean currency strings like "₱100.00", "Php 100", "$100", "100" -> 100 */
export function parseCurrency(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : Math.max(0, val);
  if (!val) return 0;
  const str = String(val).replace(/[^0-9.-]+/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.max(0, num);
}

/** Parse various date formats (Excel serial number, ISO, Date string) -> "YYYY-MM-DD" */
export function parseExcelDate(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === "number") {
    // Excel serial date format (days since 1900-01-01)
    const utcDays = Math.floor(val - 25569);
    const utcValue = utcDays * 86400 * 1000;
    const date = new Date(utcValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }
  const str = String(val).trim();
  if (!str || str === "—" || str === "-") return undefined;
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return undefined;
}

export interface ParsedExcelDuesRow {
  raw: Record<string, any>;
  residentId?: number;
  matchedUser?: User;
  matchStatus: "matched" | "unmatched";
  residentName: string;
  blockNo: string;
  lotNo: string;
  billingMonth: string;
  billingYear: number;
  dueMonth: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  creditBalance: number;
  paidAt?: string;
  status: DuesStatus;
  isValid: boolean;
  errors: string[];
}

export function cleanUnitToken(val: unknown): string {
  if (!val) return "";
  const s = String(val).trim().toLowerCase();
  // Strip common prefixes/words like "block", "blk", "lot", "lt", "#"
  let stripped = s.replace(/\b(block|lot|blk|lt|phase|ph|b|l)\b/gi, "").replace(/[^a-z0-9]/gi, "").trim();
  // Normalize internal leading zeros in alphanumeric tokens (e.g. "c03" -> "c3", "03" -> "3")
  stripped = stripped.replace(/([a-z]+)0+(\d+)/gi, "$1$2").replace(/^0+/, "");
  return stripped;
}

export function normalizeName(name: string): string {
  if (!name) return "";
  let n = name.toLowerCase().trim();
  // Handle "Lastname, Firstname" format (e.g. "Reyes, Jose" -> "jose reyes")
  if (n.includes(",")) {
    const parts = n.split(",").map((p) => p.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      n = `${parts[1]} ${parts[0]}`;
    }
  }
  return n
    .replace(/\b(jr|sr|iii|ii|iv)\b\.?/gi, "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse an individual raw Excel or CSV row and match against system residents */
export function parseDuesRow(
  row: Record<string, any>,
  users: User[]
): ParsedExcelDuesRow {
  const errors: string[] = [];

  // 1. Find resident identifiers
  const residentIdRaw =
    row["Resident ID"] ??
    row["resident_id"] ??
    row["ResidentID"] ??
    row["ID"] ??
    row["id"] ??
    row["User ID"] ??
    row["user_id"];

  const residentNameRaw =
    row["Resident Name"] ??
    row["resident_name"] ??
    row["Resident"] ??
    row["resident"] ??
    row["Name"] ??
    row["name"] ??
    row["Full Name"] ??
    row["fullName"];

  let residentId: number | undefined = undefined;
  if (residentIdRaw !== undefined && residentIdRaw !== null && String(residentIdRaw).trim()) {
    // Clean "RES-001" or numeric "1"
    const cleanedId = String(residentIdRaw).replace(/\D/g, "");
    if (cleanedId) residentId = parseInt(cleanedId, 10);
  }

  let residentName = String(residentNameRaw || "").trim();

  // Extract Block & Lot, including combined fields (e.g., "C-03 / 11", "Block 3 Lot 11")
  let rawBlock =
    row["Block"] ??
    row["block"] ??
    row["Block No"] ??
    row["blockNo"] ??
    row["Block Number"] ??
    "";
  let rawLot =
    row["Lot"] ??
    row["lot"] ??
    row["Lot No"] ??
    row["lotNo"] ??
    row["Lot Number"] ??
    "";

  const combinedUnitRaw =
    row["Unit"] ??
    row["unit"] ??
    row["Unit No."] ??
    row["Unit No"] ??
    row["Unit/Block Code"] ??
    row["Block / Lot"] ??
    row["Block/Lot"] ??
    row["Block & Lot"] ??
    row["Address"] ??
    "";

  // If the residentName contains embedded unit info like "Jose Reyes - C-03 / 11" or "Jose Reyes (C-03 / 11)"
  if (residentName) {
    const embeddedMatch = residentName.match(/^(.*?)\s*[-–—(]\s*(?:block|blk)?\s*([a-z0-9-]+)\s*[\/,&-]\s*(?:lot|lt)?\s*([a-z0-9-]+)\s*\)?$/i);
    if (embeddedMatch) {
      residentName = embeddedMatch[1].trim();
      if (!rawBlock) rawBlock = embeddedMatch[2].trim();
      if (!rawLot) rawLot = embeddedMatch[3].trim();
    }
  }

  if ((!rawBlock || !rawLot) && combinedUnitRaw) {
    const combinedStr = String(combinedUnitRaw).trim();
    const match = combinedStr.match(/(?:block|blk)?\s*([a-z0-9-]+)\s*[\/,&-]\s*(?:lot|lt)?\s*([a-z0-9-]+)/i);
    if (match) {
      if (!rawBlock) rawBlock = match[1];
      if (!rawLot) rawLot = match[2];
    }
  }

  const cleanRowBlock = cleanUnitToken(rawBlock);
  const cleanRowLot = cleanUnitToken(rawLot);
  const rowNormName = normalizeName(residentName);

  // ── Automated Entity Lookup / Cross-Referencing ────────────────────────────
  let matchedUser: User | undefined = undefined;

  // Criteria A: Direct ID match
  if (residentId !== undefined) {
    matchedUser = users.find(
      (u) =>
        Number(u.id) === residentId ||
        String(u.id) === String(residentId) ||
        String((u as any)._id) === String(residentId)
    );
  }

  // Criteria B: Exact normalized Name match
  if (!matchedUser && rowNormName) {
    matchedUser = users.find((u) => {
      const uNorm = normalizeName(u.fullName);
      return uNorm === rowNormName || (u.email && u.email.toLowerCase() === rowNormName);
    });
  }

  // Criteria C: Name + Unit/Block code combination (e.g. Jose Reyes - C-03 / 11)
  if (!matchedUser && rowNormName) {
    matchedUser = users.find((u) => {
      const uNorm = normalizeName(u.fullName);
      const nameOverlaps =
        uNorm.includes(rowNormName) ||
        rowNormName.includes(uNorm) ||
        (uNorm.split(" ").length > 1 &&
          rowNormName.split(" ").some((part) => part.length >= 3 && uNorm.includes(part)));

      if (!nameOverlaps) return false;

      const uBlock = cleanUnitToken(u.blockNo);
      const uLot = cleanUnitToken(u.lotNo);

      // Matches block and lot or matching unit
      const blockMatches = !cleanRowBlock || cleanRowBlock === uBlock;
      const lotMatches = !cleanRowLot || cleanRowLot === uLot;

      return blockMatches && lotMatches;
    });
  }

  // Criteria D: Unit match with partial name confirmation
  if (!matchedUser && cleanRowBlock && cleanRowLot) {
    matchedUser = users.find((u) => {
      const uBlock = cleanUnitToken(u.blockNo);
      const uLot = cleanUnitToken(u.lotNo);
      if (uBlock !== cleanRowBlock || uLot !== cleanRowLot) return false;

      // Ensure at least one token of name matches so we don't match a completely different person
      if (!rowNormName) return true;
      const uTokens = normalizeName(u.fullName).split(" ");
      return rowNormName.split(" ").some((t) => t.length >= 3 && uTokens.includes(t));
    });
  }

  const finalResidentName =
    matchedUser?.fullName || residentName || "Unknown Resident";
  const blockNo =
    rawBlock ||
    matchedUser?.blockNo ||
    "";
  const lotNo =
    rawLot ||
    matchedUser?.lotNo ||
    "";

  // 2. Parse Month and Year
  const monthRaw =
    row["Month"] ??
    row["month"] ??
    row["Billing Month"] ??
    row["billing_month"] ??
    row["Due Month"] ??
    row["dueMonth"];

  const yearRaw =
    row["Year"] ??
    row["year"] ??
    row["Billing Year"] ??
    row["billing_year"];

  let billingYear = new Date().getFullYear();
  if (yearRaw) {
    const y = parseInt(String(yearRaw).trim(), 10);
    if (!isNaN(y) && y >= 1990 && y <= 2099) {
      billingYear = y;
    }
  }

  let monthNumber = normalizeMonthNumber(monthRaw);
  // If Month has format "2025-01" or "2025/01"
  if (monthRaw && String(monthRaw).includes("-")) {
    const parts = String(monthRaw).split("-");
    if (parts.length === 2) {
      const py = parseInt(parts[0], 10);
      if (!isNaN(py) && py >= 1990) billingYear = py;
      monthNumber = normalizeMonthNumber(parts[1]);
    }
  }

  if (!monthNumber) {
    monthNumber = String(new Date().getMonth() + 1).padStart(2, "0");
    if (!monthRaw) errors.push("Missing billing month");
  }

  const billingMonthName = MONTH_NAMES[parseInt(monthNumber, 10) - 1] || "January";
  const dueMonth = `${billingYear}-${monthNumber}`;
  const dueDate = getCycleDueDate(dueMonth);

  // 3. Parse amounts
  const dueAmountRaw =
    row["Due"] ??
    row["due"] ??
    row["Due Amount"] ??
    row["due_amount"] ??
    row["Amount Due"] ??
    row["amountDue"] ??
    row["Monthly Due"];

  const paidAmountRaw =
    row["Paid"] ??
    row["paid"] ??
    row["Paid Amount"] ??
    row["paid_amount"] ??
    row["Amount Paid"] ??
    row["amountPaid"];

  const amountDue = dueAmountRaw !== undefined ? parseCurrency(dueAmountRaw) : DEFAULT_MONTHLY_DUE;
  const amountPaid = paidAmountRaw !== undefined ? parseCurrency(paidAmountRaw) : 0;
  const creditBalance = creditFor(amountDue, amountPaid);

  // 4. Parse Payment Date
  const paymentDateRaw =
    row["Payment Date"] ??
    row["payment_date"] ??
    row["PaymentDate"] ??
    row["Date Paid"] ??
    row["date_paid"] ??
    row["Paid At"] ??
    row["paidAt"];

  const paidAt = parseExcelDate(paymentDateRaw);

  // 5. Compute or override status
  const statusRaw = String(
    row["Status"] ?? row["status"] ?? ""
  ).toLowerCase().trim();

  let status: DuesStatus;
  if (statusRaw === "paid" || statusRaw === "on_time") {
    status = "on_time";
  } else if (statusRaw === "unpaid") {
    status = "unpaid";
  } else if (statusRaw === "delayed" || statusRaw === "partial" || statusRaw === "overdue") {
    status = "delayed";
  } else if (statusRaw === "advance") {
    status = "advance";
  } else {
    status = computeDuesStatus({
      dueMonth,
      dueDate,
      amountDue,
      amountPaid,
      paidAt,
    });
  }

  if (!finalResidentName || finalResidentName === "Unknown Resident") {
    errors.push("Missing resident name / ID");
  }

  return {
    raw: row,
    residentId: matchedUser?.id || residentId,
    matchedUser,
    matchStatus: matchedUser ? "matched" : "unmatched",
    residentName: finalResidentName,
    blockNo: String(blockNo),
    lotNo: String(lotNo),
    billingMonth: billingMonthName,
    billingYear,
    dueMonth,
    dueDate,
    amountDue,
    amountPaid,
    creditBalance,
    paidAt,
    status,
    isValid: errors.length === 0,
    errors,
  };
}

