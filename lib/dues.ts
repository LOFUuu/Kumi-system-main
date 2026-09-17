import type { DuesRecord, DuesStatus } from "./mock-data";

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

  // Default the due date to the 5th of the cycle when it is not stored (older
  // records may lack dueDate), so the algorithm never sees an invalid date.
  const dueDate = r.dueDate || `${r.dueMonth}-05`;
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

// Hours the next cycle's due amount given a carried credit from a prior month.
// The credit is consumed first (up to zero), so the resident pays less or nothing.
export function dueAfterCredit(baseAmount: number, carryCredit: number): number {
  return Math.max(0, baseAmount - Math.max(0, carryCredit));
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
