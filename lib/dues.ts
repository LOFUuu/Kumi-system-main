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

export interface PaymentAllocationResult {
  paymentAmount: number;
  allocatedToOutstanding: number;
  remainingOutstanding: number;
  allocatedToAdvance: number;
  excessCredit: number;
  newCarriedCredit: number;
  advanceMonthsCovered: number;
  statusAfterPayment: "paid" | "partially_paid" | "unpaid";
}

/**
 * Calculates authoritative, transparent payment breakdown for both standard
 * and advance payments according to HOA accounting rules.
 */
export function calculatePaymentAllocation({
  currentOutstanding,
  configuredMonthlyDue,
  existingCredit = 0,
  paymentAmount,
}: {
  currentOutstanding: number;
  configuredMonthlyDue: number;
  existingCredit?: number;
  paymentAmount: number;
}): PaymentAllocationResult {
  const pAmount = Math.max(0, paymentAmount);
  const monthlyDue = Math.max(1, configuredMonthlyDue || DEFAULT_MONTHLY_DUE);

  // 1. Allocate toward any older/current outstanding obligations first
  const allocatedToOutstanding = Math.min(currentOutstanding, pAmount);
  const remainingOutstanding = Math.max(0, currentOutstanding - allocatedToOutstanding);

  // 2. Remaining payment funds available for advance or credit
  const remainingFunds = Math.max(0, pAmount - allocatedToOutstanding);

  // 3. Full month advance coverage
  const advanceMonthsCovered = Math.floor(remainingFunds / monthlyDue);
  const allocatedToAdvance = advanceMonthsCovered * monthlyDue;

  // 4. Excess buffer carried over as credit
  const excessCredit = remainingFunds - allocatedToAdvance;
  const newCarriedCredit = existingCredit + excessCredit;

  let statusAfterPayment: "paid" | "partially_paid" | "unpaid" = "unpaid";
  if (remainingOutstanding === 0 && (allocatedToOutstanding > 0 || currentOutstanding === 0)) {
    statusAfterPayment = "paid";
  } else if (allocatedToOutstanding > 0 && remainingOutstanding > 0) {
    statusAfterPayment = "partially_paid";
  }

  return {
    paymentAmount: pAmount,
    allocatedToOutstanding,
    remainingOutstanding,
    allocatedToAdvance,
    excessCredit,
    newCarriedCredit,
    advanceMonthsCovered,
    statusAfterPayment,
  };
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

export interface DetailedDuesStatus {
  paymentStatus: "paid_on_time" | "paid_late" | "advance" | "partial" | "unpaid" | "pending_verification";
  paymentStatusLabel: string;
  paymentBadgeClass: string;
  balanceStatus: "fully_settled" | "outstanding" | "advance_credit" | "partially_paid";
  balanceStatusLabel: string;
  balanceBadgeClass: string;
  remainingBalance: number;
  credit: number;
  daysLate: number;
  daysOverdue: number;
  daysUntilDue: number;
  isPaid: boolean;
  isFullySettled: boolean;
  isOverdue: boolean;
  isPendingVerification: boolean;
  hasCredit: boolean;
  formattedDueDate: string;
  formattedPaidDate: string;
}

/**
 * Returns a rich, accurate breakdown of both Payment Status and Balance Status.
 * Calculates days late, days overdue, and distinguishes between payment timing and remaining balance.
 */
export function getDetailedDuesStatus(
  r: DuesRecord,
  options?: {
    hasPendingTxn?: boolean;
    referenceNow?: Date;
  }
): DetailedDuesStatus {
  const now = options?.referenceNow || new Date();
  const nowTime = now.getTime();
  const amountDue = Number(r.amountDue || 0);
  const amountPaid = Number(r.amountPaid || 0);
  const remainingBalance = Math.max(0, amountDue - amountPaid);
  const credit = Math.max(0, amountPaid - amountDue);
  const isFullySettled = remainingBalance === 0;
  const isPaid = amountPaid >= amountDue;
  const isPendingVerification = Boolean(options?.hasPendingTxn);

  const dueDateStr = r.dueDate || getCycleDueDate(r.dueMonth);
  let dueTime = new Date(dueDateStr + "T00:00:00").getTime();
  if (isNaN(dueTime)) {
    dueTime = new Date(`${r.dueMonth}-28T00:00:00`).getTime();
  }

  let formattedDueDate = "End of month";
  try {
    formattedDueDate = new Date(dueDateStr + "T00:00:00").toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    formattedDueDate = dueDateStr;
  }

  let formattedPaidDate = "—";
  let paidTime = 0;
  if (r.paidAt) {
    try {
      formattedPaidDate = new Date(r.paidAt + "T00:00:00").toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      paidTime = new Date(r.paidAt + "T00:00:00").getTime();
    } catch {
      formattedPaidDate = r.paidAt;
    }
  }

  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const daysLate = r.paidAt && paidTime > dueTime
    ? Math.max(1, Math.round((paidTime - dueTime) / (1000 * 60 * 60 * 24)))
    : 0;

  const daysOverdue = !isPaid && nowMidnight > dueTime
    ? Math.max(1, Math.round((nowMidnight - dueTime) / (1000 * 60 * 60 * 24)))
    : 0;

  const daysUntilDue = !isPaid && nowMidnight <= dueTime
    ? Math.max(0, Math.round((dueTime - nowMidnight) / (1000 * 60 * 60 * 24)))
    : 0;

  const isOverdue = daysOverdue > 0;

  // Determine Balance Status
  let balanceStatus: DetailedDuesStatus["balanceStatus"] = "outstanding";
  let balanceStatusLabel = `₱${remainingBalance.toFixed(2)} Balance`;
  let balanceBadgeClass = "bg-rose-50 text-rose-700 border-rose-200/80";

  if (isFullySettled && credit === 0) {
    balanceStatus = "fully_settled";
    balanceStatusLabel = "Fully Settled";
    balanceBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
  } else if (isFullySettled && credit > 0) {
    balanceStatus = "advance_credit";
    balanceStatusLabel = `Credit (+₱${credit.toFixed(2)})`;
    balanceBadgeClass = "bg-sky-50 text-sky-700 border-sky-200/80";
  } else if (amountPaid > 0 && remainingBalance > 0) {
    balanceStatus = "partially_paid";
    balanceStatusLabel = `Partially Paid (₱${remainingBalance.toFixed(2)} left)`;
    balanceBadgeClass = "bg-amber-50 text-amber-700 border-amber-200/80";
  } else {
    balanceStatus = "outstanding";
    balanceStatusLabel = `Outstanding (₱${remainingBalance.toFixed(2)})`;
    balanceBadgeClass = "bg-rose-50 text-rose-700 border-rose-200/80";
  }

  // Determine Payment Status
  let paymentStatus: DetailedDuesStatus["paymentStatus"] = "unpaid";
  let paymentStatusLabel = "Unpaid";
  let paymentBadgeClass = "bg-rose-50 text-rose-700 border-rose-200/80";

  if (isPendingVerification) {
    paymentStatus = "pending_verification";
    paymentStatusLabel = "Pending Verification";
    paymentBadgeClass = "bg-sky-50 text-sky-700 border-sky-200/80";
  } else if (amountPaid <= 0) {
    paymentStatus = "unpaid";
    if (isOverdue) {
      paymentStatusLabel = `Unpaid (${daysOverdue}d overdue)`;
      paymentBadgeClass = "bg-rose-50 text-rose-700 border-rose-200/80";
    } else if (daysUntilDue > 0) {
      paymentStatusLabel = `Unpaid (Due in ${daysUntilDue}d)`;
      paymentBadgeClass = "bg-amber-50 text-amber-800 border-amber-200/80";
    } else {
      paymentStatusLabel = "Unpaid (Due Today)";
      paymentBadgeClass = "bg-amber-50 text-amber-800 border-amber-200/80";
    }
  } else if (amountPaid < amountDue) {
    paymentStatus = "partial";
    paymentStatusLabel = "Partial Payment";
    paymentBadgeClass = "bg-amber-50 text-amber-800 border-amber-200/80";
  } else {
    // Fully Paid: determine if Advance, On Time, or Paid Late
    const [y, m] = r.dueMonth.split("-").map(Number);
    const cycleStart = new Date(y, (m || 1) - 1, 1).getTime();

    if (r.paidAt && paidTime < cycleStart) {
      paymentStatus = "advance";
      paymentStatusLabel = "Advance Payment";
      paymentBadgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200/80";
    } else if (daysLate > 0) {
      paymentStatus = "paid_late";
      paymentStatusLabel = `Paid Late (${daysLate} days late)`;
      paymentBadgeClass = "bg-amber-50 text-amber-800 border-amber-200/80";
    } else {
      paymentStatus = "paid_on_time";
      paymentStatusLabel = "Paid On Time";
      paymentBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    }
  }

  return {
    paymentStatus,
    paymentStatusLabel,
    paymentBadgeClass,
    balanceStatus,
    balanceStatusLabel,
    balanceBadgeClass,
    remainingBalance,
    credit,
    daysLate,
    daysOverdue,
    daysUntilDue,
    isPaid,
    isFullySettled,
    isOverdue,
    isPendingVerification,
    hasCredit: credit > 0,
    formattedDueDate,
    formattedPaidDate,
  };
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

export type ImportMatchClassification =
  | "MATCHED"
  | "NO ACCOUNT FOUND"
  | "DUPLICATE"
  | "INVALID"
  | "REVIEW REQUIRED";

export interface ParsedExcelDuesRow {
  raw: Record<string, any>;
  residentId?: number;
  matchedUser?: User;
  matchStatus: "matched" | "unmatched";
  classification: ImportMatchClassification;
  residentName: string;
  email?: string;
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

  // 1b. Check for Email if provided
  const emailRaw =
    row["Email"] ??
    row["email"] ??
    row["Email Address"] ??
    row["email_address"] ??
    row["e-mail"];
  let cleanEmail: string | undefined = undefined;
  if (emailRaw !== undefined && emailRaw !== null && String(emailRaw).trim()) {
    cleanEmail = String(emailRaw).trim().toLowerCase();
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      errors.push(`Invalid email format: "${emailRaw}"`);
    }
  }

  const cleanRowBlock = cleanUnitToken(rawBlock);
  const cleanRowLot = cleanUnitToken(rawLot);
  const rowNormName = normalizeName(residentName);

  // ── Automated Entity Lookup / Cross-Referencing ────────────────────────────
  let matchedUser: User | undefined = undefined;
  let isAmbiguous = false;

  // Criteria 0: Direct authoritative Email match (if provided)
  if (cleanEmail && errors.length === 0) {
    const emailMatches = users.filter(
      (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
    );
    if (emailMatches.length === 1) {
      matchedUser = emailMatches[0];
    } else if (emailMatches.length > 1) {
      isAmbiguous = true;
      matchedUser = emailMatches[0];
    }
  }

  // Criteria A: Direct ID match
  if (!matchedUser && residentId !== undefined) {
    const idMatches = users.filter(
      (u) =>
        Number(u.id) === residentId ||
        String(u.id) === String(residentId) ||
        String((u as any)._id) === String(residentId)
    );
    if (idMatches.length === 1) {
      matchedUser = idMatches[0];
    } else if (idMatches.length > 1) {
      isAmbiguous = true;
      matchedUser = idMatches[0];
    }
  }

  // Criteria B: Exact normalized Name match
  if (!matchedUser && rowNormName) {
    const nameMatches = users.filter((u) => {
      const uNorm = normalizeName(u.fullName);
      return uNorm === rowNormName || (u.email && u.email.toLowerCase() === rowNormName);
    });
    if (nameMatches.length === 1) {
      matchedUser = nameMatches[0];
    } else if (nameMatches.length > 1) {
      isAmbiguous = true;
      matchedUser = nameMatches[0];
    }
  }

  // Criteria C: Name + Unit/Block code combination (e.g. Jose Reyes - C-03 / 11)
  if (!matchedUser && rowNormName) {
    const comboMatches = users.filter((u) => {
      const uNorm = normalizeName(u.fullName);
      const nameOverlaps =
        uNorm.includes(rowNormName) ||
        rowNormName.includes(uNorm) ||
        (uNorm.split(" ").length > 1 &&
          rowNormName.split(" ").some((part) => part.length >= 3 && uNorm.includes(part)));

      if (!nameOverlaps) return false;

      const uBlock = cleanUnitToken(u.blockNo);
      const uLot = cleanUnitToken(u.lotNo);

      const blockMatches = !cleanRowBlock || cleanRowBlock === uBlock;
      const lotMatches = !cleanRowLot || cleanRowLot === uLot;

      return blockMatches && lotMatches;
    });
    if (comboMatches.length === 1) {
      matchedUser = comboMatches[0];
    } else if (comboMatches.length > 1) {
      isAmbiguous = true;
      matchedUser = comboMatches[0];
    }
  }

  // Criteria D: Unit match with partial name confirmation
  if (!matchedUser && cleanRowBlock && cleanRowLot) {
    const unitMatches = users.filter((u) => {
      const uBlock = cleanUnitToken(u.blockNo);
      const uLot = cleanUnitToken(u.lotNo);
      if (uBlock !== cleanRowBlock || uLot !== cleanRowLot) return false;

      if (!rowNormName) return true;
      const uTokens = normalizeName(u.fullName).split(" ");
      return rowNormName.split(" ").some((t) => t.length >= 3 && uTokens.includes(t));
    });
    if (unitMatches.length === 1) {
      matchedUser = unitMatches[0];
    } else if (unitMatches.length > 1) {
      isAmbiguous = true;
      matchedUser = unitMatches[0];
    }
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

  // 6. Determine 5-Tier Import Classification
  let classification: ImportMatchClassification;
  if (errors.length > 0) {
    classification = "INVALID";
  } else if (isAmbiguous) {
    classification = "REVIEW REQUIRED";
  } else if (matchedUser) {
    classification = "MATCHED";
  } else {
    classification = "NO ACCOUNT FOUND";
  }

  return {
    raw: row,
    residentId: matchedUser?.id || residentId,
    matchedUser,
    matchStatus: matchedUser ? "matched" : "unmatched",
    classification,
    residentName: finalResidentName,
    email: cleanEmail || matchedUser?.email,
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

/** Parse full batch of rows with duplicate detection */
export function parseDuesBatch(
  rawRows: Record<string, any>[],
  users: User[]
): ParsedExcelDuesRow[] {
  const seenCycleKeys = new Map<string, number>();

  const parsed = rawRows.map((row) => parseDuesRow(row, users));

  // Detect duplicates within the import file
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item.isValid) continue;

    const key = `${normalizeName(item.residentName)}|${item.dueMonth}`;
    if (seenCycleKeys.has(key)) {
      item.classification = "DUPLICATE";
      item.isValid = false;
      item.errors.push(`Duplicate billing entry for ${item.residentName} in ${item.dueMonth}`);
    } else {
      seenCycleKeys.set(key, i);
    }
  }

  return parsed;
}

