"use client";

import { useState } from "react";
import {
  X,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  FileText,
  Building,
  UserCheck,
  Receipt,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Coins,
  ArrowRight,
} from "lucide-react";
import { formatPHP, type DuesRecord, type Transaction } from "@/lib/mock-data";
import { formatBillingPeriod, type DetailedDuesStatus } from "@/lib/dues";

interface DuesDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DuesRecord | null;
  statusDetails: DetailedDuesStatus | null;
  transactions?: Transaction[];
  onPayClick?: (record: DuesRecord) => void;
  user?: {
    fullName?: string;
    blockNo?: string | null;
    lotNo?: string | null;
  } | null;
}

export default function DuesDetailModal({
  isOpen,
  onClose,
  record,
  statusDetails,
  transactions = [],
  onPayClick,
  user,
}: DuesDetailModalProps) {
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!isOpen || !record || !statusDetails) return null;

  const handleCopy = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRef(text);
      setTimeout(() => setCopiedRef(null), 2500);
    }
  };

  // Find linked transactions for this dues record
  const matchingTxns = transactions.filter(
    (t) => t.refType === "dues" && (t.refId === record.id || (t as any).dueMonth === record.dueMonth)
  );

  return (
    <>
      <div
        className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-cream-2 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-cream-2 bg-gradient-to-r from-cream/60 via-white to-emerald-50/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-800 shadow-2xs">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl font-bold text-green-dark">
                    {formatBillingPeriod(record.dueMonth)}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cream-2/80 text-green-mid font-semibold">
                    Cycle #{record.id}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Monthly Homeowners Association (HOA) Due Breakdown
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
            {/* Status & Timing Banner */}
            <div className="rounded-2xl border border-cream-2 bg-cream/30 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">
                    Payment Status:
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${statusDetails.paymentBadgeClass}`}
                  >
                    {statusDetails.paymentStatus === "paid_on_time" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                    {statusDetails.paymentStatus === "paid_late" && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                    {statusDetails.paymentStatus === "advance" && <CalendarDays className="h-3.5 w-3.5 text-indigo-600" />}
                    {statusDetails.paymentStatus === "partial" && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                    {statusDetails.paymentStatus === "unpaid" && <AlertCircle className="h-3.5 w-3.5 text-rose-600" />}
                    {statusDetails.paymentStatus === "pending_verification" && <Clock className="h-3.5 w-3.5 text-sky-600" />}
                    <span>{statusDetails.paymentStatusLabel}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">
                    Balance:
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${statusDetails.balanceBadgeClass}`}
                  >
                    {statusDetails.isFullySettled ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Coins className="h-3.5 w-3.5 text-rose-600" />
                    )}
                    <span>{statusDetails.balanceStatusLabel}</span>
                  </span>
                </div>
              </div>

              {/* Explanatory Context Box */}
              {statusDetails.paymentStatus === "paid_late" && (
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Payment Settled Late: </span>
                    <span>
                      Paid on <strong>{statusDetails.formattedPaidDate}</strong>, which was{" "}
                      <strong>{statusDetails.daysLate} days after the deadline</strong> of{" "}
                      {statusDetails.formattedDueDate}. The payment is verified and your balance is fully settled.
                    </span>
                  </div>
                </div>
              )}

              {statusDetails.paymentStatus === "paid_on_time" && (
                <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/80 p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Paid On Time: </span>
                    <span>
                      Paid on <strong>{statusDetails.formattedPaidDate}</strong>, on or before the due date deadline
                      ({statusDetails.formattedDueDate}). Fully verified and completed.
                    </span>
                  </div>
                </div>
              )}

              {statusDetails.paymentStatus === "advance" && (
                <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/80 p-3 text-xs text-indigo-900 flex items-start gap-2.5">
                  <CalendarDays className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Advance Payment: </span>
                    <span>
                      This monthly due was paid in advance prior to the start of the billing period. Thank you for your prompt compliance!
                    </span>
                  </div>
                </div>
              )}

              {statusDetails.paymentStatus === "unpaid" && statusDetails.isOverdue && (
                <div className="rounded-xl border border-rose-200/90 bg-rose-50/80 p-3 text-xs text-rose-900 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Overdue Notice: </span>
                    <span>
                      This bill was due on <strong>{statusDetails.formattedDueDate}</strong> and is currently{" "}
                      <strong>{statusDetails.daysOverdue} days past the deadline</strong>. Please settle your outstanding balance
                      of {formatPHP(statusDetails.remainingBalance)}.
                    </span>
                  </div>
                </div>
              )}

              {statusDetails.paymentStatus === "unpaid" && !statusDetails.isOverdue && (
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                  <Calendar className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Upcoming Due: </span>
                    <span>
                      This bill is due on <strong>{statusDetails.formattedDueDate}</strong> (
                      {statusDetails.daysUntilDue > 0 ? `${statusDetails.daysUntilDue} days remaining` : "Due today"}).
                    </span>
                  </div>
                </div>
              )}

              {statusDetails.paymentStatus === "partial" && (
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Partial Payment Recorded: </span>
                    <span>
                      You have paid {formatPHP(record.amountPaid)} of the {formatPHP(record.amountDue)} due.
                      Remaining balance: <strong>{formatPHP(statusDetails.remainingBalance)}</strong>.
                    </span>
                  </div>
                </div>
              )}

              {statusDetails.paymentStatus === "pending_verification" && (
                <div className="rounded-xl border border-sky-200/90 bg-sky-50/80 p-3 text-xs text-sky-900 flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Pending HOA Verification: </span>
                    <span>
                      Your GCash payment submission is currently under review by the HOA administration. Your ledger balance will update once approved.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Ledger Breakdown (4 Cards) */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5 flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-green-mid" />
                Financial Summary
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-cream-2 bg-cream/30 p-3.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted block">
                    Due Amount
                  </span>
                  <div className="font-serif text-lg font-bold text-green-dark mt-1">
                    {formatPHP(record.amountDue)}
                  </div>
                  <span className="text-[10px] text-muted">Fixed monthly fee</span>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 block">
                    Total Paid
                  </span>
                  <div className="font-serif text-lg font-bold text-emerald-700 mt-1">
                    {formatPHP(record.amountPaid)}
                  </div>
                  <span className="text-[10px] text-emerald-700/80">Verified amount</span>
                </div>

                <div
                  className={`rounded-2xl border p-3.5 ${
                    statusDetails.remainingBalance > 0
                      ? "border-rose-200 bg-rose-50/40"
                      : "border-cream-2 bg-cream/30"
                  }`}
                >
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider block ${
                      statusDetails.remainingBalance > 0 ? "text-rose-800" : "text-muted"
                    }`}
                  >
                    Remaining Balance
                  </span>
                  <div
                    className={`font-serif text-lg font-bold mt-1 ${
                      statusDetails.remainingBalance > 0 ? "text-rose-600" : "text-emerald-700"
                    }`}
                  >
                    {formatPHP(statusDetails.remainingBalance)}
                  </div>
                  <span
                    className={`text-[10px] ${
                      statusDetails.remainingBalance > 0 ? "text-rose-600" : "text-muted"
                    }`}
                  >
                    {statusDetails.remainingBalance > 0 ? "Action required" : "Zero balance"}
                  </span>
                </div>

                <div
                  className={`rounded-2xl border p-3.5 ${
                    statusDetails.credit > 0
                      ? "border-sky-200 bg-sky-50/40"
                      : "border-cream-2 bg-cream/30"
                  }`}
                >
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider block ${
                      statusDetails.credit > 0 ? "text-sky-800" : "text-muted"
                    }`}
                  >
                    Applied Credit
                  </span>
                  <div
                    className={`font-serif text-lg font-bold mt-1 ${
                      statusDetails.credit > 0 ? "text-sky-700" : "text-slate-500"
                    }`}
                  >
                    {formatPHP(statusDetails.credit)}
                  </div>
                  <span className="text-[10px] text-muted">Overpayment buffer</span>
                </div>
              </div>
            </div>

            {/* Billing & Timing Details Grid */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-green-mid" />
                Schedule & Record Metadata
              </h4>
              <div className="rounded-2xl border border-cream-2 bg-white p-4 divide-y divide-cream-2 text-xs shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2.5 first:pt-0">
                  <div>
                    <span className="text-muted text-[11px] block">Billing Cycle:</span>
                    <strong className="text-green-dark">
                      {formatBillingPeriod(record.dueMonth)} ({record.dueMonth})
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Official Due Date:</span>
                    <strong className="text-green-dark">{statusDetails.formattedDueDate}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2.5">
                  <div>
                    <span className="text-muted text-[11px] block">Actual Payment Date:</span>
                    <strong className={record.paidAt ? "text-emerald-700 font-bold" : "text-muted"}>
                      {statusDetails.formattedPaidDate}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Timing Assessment:</span>
                    <span className="font-semibold text-green-dark">
                      {statusDetails.daysLate > 0 ? (
                        <span className="text-amber-700 font-bold">
                          {statusDetails.daysLate} days late past Sep deadline
                        </span>
                      ) : statusDetails.isPaid ? (
                        <span className="text-emerald-700 font-bold">Paid on time (0 days late)</span>
                      ) : statusDetails.isOverdue ? (
                        <span className="text-rose-600 font-bold">
                          {statusDetails.daysOverdue} days overdue
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold">
                          {statusDetails.daysUntilDue} days until due date
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2.5 last:pb-0">
                  <div>
                    <span className="text-muted text-[11px] block">Resident Account:</span>
                    <strong className="text-green-dark">
                      {record.residentName || user?.fullName || "Resident"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] block">Assigned Property:</span>
                    <strong className="text-green-dark">
                      Block {record.blockNo || user?.blockNo || "—"} / Lot {record.lotNo || user?.lotNo || "—"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Transactions & Proof of Payment */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5 flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-green-mid" />
                Payment Transactions & Receipts
              </h4>

              {matchingTxns.length > 0 ? (
                <div className="space-y-3">
                  {matchingTxns.map((txn) => (
                    <div
                      key={txn.id}
                      className="rounded-2xl border border-cream-2 bg-white p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-2 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <Smartphone className="h-4 w-4" />
                          </span>
                          <div>
                            <div className="text-xs font-bold text-green-dark uppercase">
                              {txn.paymentMethod === "cash" ? "Cash Payment" : "GCash Payment"}
                            </div>
                            <div className="text-[10px] text-muted">
                              {txn.createdAt
                                ? new Date(txn.createdAt).toLocaleDateString("en-PH", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "Date recorded"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-green-mid">
                            {formatPHP(txn.amount)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              txn.status === "approved"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : txn.status === "pending"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            {txn.status === "approved"
                              ? "✓ Verified"
                              : txn.status === "pending"
                              ? "⏳ Pending Review"
                              : "✕ Rejected"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[11px] text-muted block">Transaction Ref:</span>
                          {txn.gcashRef ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-xs font-bold text-green-dark bg-cream/60 px-2 py-0.5 rounded border border-cream-2">
                                {txn.gcashRef}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(txn.gcashRef || "")}
                                className="p-1 text-muted hover:text-green-dark rounded hover:bg-cream transition cursor-pointer"
                                title="Copy reference"
                              >
                                {copiedRef === txn.gcashRef ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted font-medium">Direct HOA Record</span>
                          )}
                        </div>

                        <div>
                          <span className="text-[11px] text-muted block">Proof of Payment:</span>
                          {txn.receiptPath ? (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(txn.receiptPath || null)}
                              className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              View Uploaded Receipt
                            </button>
                          ) : (
                            <span className="text-muted text-[11px]">Official Ledger Entry</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-cream-2 bg-cream/20 p-4 text-xs text-muted flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-green-dark block">
                      {record.paidAt ? "Verified HOA Ledger Entry" : "No Payment Recorded Yet"}
                    </span>
                    <span className="text-[11px]">
                      {record.paidAt
                        ? `This payment was verified and posted into the official Mabuhay Homes HOA ledger on ${statusDetails.formattedPaidDate}.`
                        : "No transaction has been posted for this billing period yet. You can submit your monthly dues via GCash anytime."}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 px-6 border-t border-cream-2 bg-cream/30 shrink-0 flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted hidden sm:inline">
              Mabuhay Homes Homeowners Association
            </span>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost !py-2.5 !px-4 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>

              {statusDetails.remainingBalance > 0 && onPayClick && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPayClick(record);
                  }}
                  className="btn-gold !py-2.5 !px-5 text-xs font-bold shadow-md hover:scale-105 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Pay Due ({formatPHP(statusDetails.remainingBalance)})</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox for Receipt Image */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-lg w-full max-h-[90vh] bg-white rounded-3xl p-4 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-cream-2">
              <span className="font-bold text-xs text-green-dark">Proof of Payment Receipt</span>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="rounded-full p-1 text-muted hover:bg-cream hover:text-green-dark cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto py-3 flex items-center justify-center">
              <img
                src={lightboxUrl}
                alt="Payment Receipt"
                className="max-h-[75vh] w-auto object-contain rounded-xl shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
