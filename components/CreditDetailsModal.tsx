"use client";

import { useState } from "react";
import {
  X,
  Coins,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check,
  AlertCircle,
  Calendar,
  CreditCard,
  FileText,
} from "lucide-react";
import { formatPHP, type DuesRecord, type Transaction } from "@/lib/mock-data";
import { formatBillingPeriod } from "@/lib/dues";

interface CreditDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableCredit: number;
  appliedCredit?: number;
  remainingCredit: number;
  currentBillingPeriod?: string;
  dues: DuesRecord[];
  transactions: Transaction[];
  residentName?: string;
}

export default function CreditDetailsModal({
  isOpen,
  onClose,
  availableCredit,
  appliedCredit = 0,
  remainingCredit,
  currentBillingPeriod,
  dues,
  transactions,
  residentName,
}: CreditDetailsModalProps) {
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRef(text);
      setTimeout(() => setCopiedRef(null), 2500);
    }
  };

  // Find all confirmed dues records with excess payments or applied credit
  const recordsWithCredit = dues.filter(
    (d) => (d.creditBalance && d.creditBalance > 0) || (d.appliedCredit && d.appliedCredit > 0)
  );

  // Find confirmed transactions that yielded excess credit or advance
  const confirmedDuesTxns = transactions.filter(
    (t) => t.refType === "dues" && t.status === "approved"
  );

  const creditSourceTxns = confirmedDuesTxns.filter((t) => {
    if (t.creditAmount && t.creditAmount > 0) return true;
    if (t.advanceForMonth) return true;
    // Check if it was an overpayment on a dues record
    const linkedRecord = dues.find((d) => d.id === t.refId);
    if (linkedRecord && (t.amount || 0) > linkedRecord.amountDue) return true;
    return false;
  });

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-cream-2 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-cream-2 bg-gradient-to-r from-sky-50 via-white to-cream/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-2xs">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl font-bold text-green-dark">
                  Carried Credit Ledger
                </h3>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  Authoritative Record
                </span>
              </div>
              <p className="text-xs text-muted">
                {residentName ? `${residentName} · ` : ""}Detailed audit of excess payments, applied credits, and unused buffers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-cream hover:text-green-dark transition cursor-pointer"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 3 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Available Credit */}
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                Total Usable Credit
              </div>
              <div className="font-serif text-2xl font-bold text-sky-900 mt-1">
                {formatPHP(availableCredit)}
              </div>
              <div className="mt-1 text-[11px] text-sky-700">
                Confirmed excess funds available for dues
              </div>
            </div>

            {/* Card 2: Credit Applied */}
            <div className="rounded-2xl border border-cream-2 bg-cream/40 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Applied to Cycles
              </div>
              <div className="font-serif text-2xl font-bold text-green-dark mt-1">
                {formatPHP(appliedCredit)}
              </div>
              <div className="mt-1 text-[11px] text-muted">
                {currentBillingPeriod
                  ? `Applied to ${formatBillingPeriod(currentBillingPeriod)}`
                  : "Deducted from billing obligations"}
              </div>
            </div>

            {/* Card 3: Remaining Credit */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Net Remaining Credit
              </div>
              <div className="font-serif text-2xl font-bold text-emerald-900 mt-1">
                {formatPHP(remainingCredit)}
              </div>
              <div className="mt-1 text-[11px] text-emerald-700">
                Carries over to upcoming cycles
              </div>
            </div>
          </div>

          {/* Traceable Sources Section */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-bold text-green-dark flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-mid" />
              Traceable Credit Sources & Confirmed Overpayments
            </h4>

            {creditSourceTxns.length > 0 ? (
              <div className="rounded-2xl border border-cream-2 overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-cream/80 text-[10px] uppercase font-bold text-muted border-b border-cream-2">
                    <tr>
                      <th className="p-3">Date Earned</th>
                      <th className="p-3">Reference / Method</th>
                      <th className="p-3">Amount Paid</th>
                      <th className="p-3">Credit Created</th>
                      <th className="p-3 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-2">
                    {creditSourceTxns.map((t) => {
                      const linkedDue = dues.find((d) => d.id === t.refId);
                      const excess =
                        t.creditAmount ??
                        (linkedDue ? Math.max(0, (t.amount || 0) - linkedDue.amountDue) : t.amount);

                      return (
                        <tr key={t.id} className="hover:bg-cream/20 transition">
                          <td className="p-3 font-medium text-slate-700">
                            {t.createdAt
                              ? new Date(t.createdAt).toLocaleDateString("en-PH", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-green-dark">
                              {t.paymentMethod?.toUpperCase() || "GCASH"}
                            </div>
                            {t.gcashRef && (
                              <div className="flex items-center gap-1 font-mono text-[11px] text-muted">
                                <span>Ref: {t.gcashRef}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(t.gcashRef!)}
                                  className="text-green-mid hover:text-green-dark"
                                  title="Copy reference"
                                >
                                  {copiedRef === t.gcashRef ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-800">
                            {formatPHP(t.amount)}
                          </td>
                          <td className="p-3 font-bold text-sky-700">
                            +{formatPHP(excess)}
                          </td>
                          <td className="p-3 text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Confirmed
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-cream-2 bg-cream/20 p-6 text-center text-xs text-muted">
                <Coins className="mx-auto h-8 w-8 text-muted/50 mb-2" />
                <p className="font-bold text-green-dark">No historical excess credits found</p>
                <p className="mt-0.5">
                  When you make an overpayment (e.g. paying ₱150 for a ₱100 due) or an advance payment, the confirmed excess will be safely credited here.
                </p>
              </div>
            )}
          </div>

          {/* Dues Periods Utilizing Credit */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-bold text-green-dark flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" />
              Billing Periods with Applied Credit
            </h4>

            {recordsWithCredit.length > 0 ? (
              <div className="rounded-2xl border border-cream-2 overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-cream/80 text-[10px] uppercase font-bold text-muted border-b border-cream-2">
                    <tr>
                      <th className="p-3">Billing Cycle</th>
                      <th className="p-3">Due Amount</th>
                      <th className="p-3">Credit Applied</th>
                      <th className="p-3">Cash Paid</th>
                      <th className="p-3 text-right">Cycle Balance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-2">
                    {recordsWithCredit.map((d) => (
                      <tr key={d.id} className="hover:bg-cream/20 transition">
                        <td className="p-3 font-bold text-green-dark">
                          {formatBillingPeriod(d.dueMonth)}
                        </td>
                        <td className="p-3 font-semibold text-slate-700">
                          {formatPHP(d.amountDue)}
                        </td>
                        <td className="p-3 font-bold text-sky-700">
                          {formatPHP(d.appliedCredit || 0)}
                        </td>
                        <td className="p-3 font-semibold text-emerald-700">
                          {formatPHP(d.amountPaid)}
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              d.amountPaid >= d.amountDue
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {d.amountPaid >= d.amountDue ? "Satisfied" : "Partial Balance"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-cream-2 bg-cream/10 p-4 text-xs text-muted flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>
                  No credit has been drawn yet. Your full credit buffer remains safely reserved for the next generated billing period.
                </span>
              </div>
            )}
          </div>

          {/* HOA Accounting Policy Notice */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 space-y-1.5 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 text-blue-950">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              HOA Carried Credit & Accounting Rules
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-800">
              <li>
                <strong>Non-Duplication:</strong> Carried credits are tied directly to confirmed transaction records and can only be applied once per billing cycle.
              </li>
              <li>
                <strong>Automatic Rollover:</strong> When a new monthly cycle is generated, any remaining credit buffer is automatically deducted from the new amount due.
              </li>
              <li>
                <strong>Audit Traceability:</strong> All payments, receipts, and credit applications are permanently archived and visible on both Resident and Admin ledgers.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-cream-2 bg-cream/30 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-green-dark px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-green-mid transition cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
