"use client";

import { useMemo, useRef } from "react";
import {
  X,
  Printer,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building,
  UserCheck,
  Calendar,
  CreditCard,
  History,
} from "lucide-react";
import { formatPHP, type DuesRecord } from "@/lib/mock-data";
import {
  computeDuesStatusForRecord,
  outstandingFor,
  creditFor,
  MONTH_NAMES,
} from "@/lib/dues";

interface StatementOfAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    fullName?: string;
    residentId?: string | number;
    id?: string | number;
    blockNo?: string | null;
    lotNo?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  residentName?: string;
  residentId?: string | number;
  blockNo?: string | null;
  lotNo?: string | null;
  email?: string | null;
  phone?: string | null;
  dues: DuesRecord[];
  statementMonth?: string;
}

export default function StatementOfAccountModal({
  isOpen,
  onClose,
  user,
  residentName,
  residentId,
  blockNo,
  lotNo,
  email,
  phone,
  dues,
  statementMonth,
}: StatementOfAccountModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const resolvedName = residentName || user?.fullName || "Resident Homeowner";
  const resolvedId = residentId ?? user?.residentId ?? user?.id;
  const resolvedBlock = blockNo ?? user?.blockNo ?? undefined;
  const resolvedLot = lotNo ?? user?.lotNo ?? undefined;
  const resolvedEmail = email ?? user?.email ?? undefined;
  const resolvedPhone = phone ?? user?.phone ?? undefined;

  // Filter and sort dues for this resident
  const sortedDues = useMemo(() => {
    return [...dues].sort((a, b) => b.dueMonth.localeCompare(a.dueMonth));
  }, [dues]);

  // Aggregate totals
  const totalDue = useMemo(
    () => sortedDues.reduce((sum, d) => sum + (Number(d.amountDue) || 0), 0),
    [sortedDues]
  );
  const totalPaid = useMemo(
    () => sortedDues.reduce((sum, d) => sum + (Number(d.amountPaid) || 0), 0),
    [sortedDues]
  );
  const totalOutstanding = useMemo(
    () => sortedDues.reduce((sum, d) => sum + outstandingFor(d), 0),
    [sortedDues]
  );
  const totalCredit = useMemo(
    () =>
      sortedDues.reduce(
        (sum, d) => sum + creditFor(Number(d.amountDue) || 0, Number(d.amountPaid) || 0),
        0
      ),
    [sortedDues]
  );

  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const soaNumber = useMemo(() => {
    const resPart = residentId ? String(residentId).padStart(4, "0") : "0001";
    const yearPart = new Date().getFullYear();
    return `SOA-MH5-${yearPart}-${resPart}`;
  }, [residentId]);

  const coveragePeriod = useMemo(() => {
    if (statementMonth && statementMonth !== "all") {
      const [y, m] = statementMonth.split("-").map(Number);
      return `${MONTH_NAMES[m - 1] || statementMonth} ${y}`;
    }
    if (sortedDues.length === 0) return "No Records";
    const oldest = sortedDues[sortedDues.length - 1].dueMonth;
    const newest = sortedDues[0].dueMonth;
    return `${oldest} to ${newest}`;
  }, [statementMonth, sortedDues]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white print:static print:inset-auto">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #kumi-soa-document,
          #kumi-soa-document * {
            visibility: visible !important;
          }
          #kumi-soa-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-cream-2 overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Modal Top Header (Screen Only) */}
        <div className="no-print flex items-center justify-between border-b border-cream-2 px-6 py-4 bg-[#133E2B] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white shadow-inner">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold">Statement of Account (SOA)</h2>
              <p className="text-xs text-white/80">
                Official Homeowners Association Billing &amp; Payment Statement
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-[#133E2B] shadow-xs hover:bg-cream transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable SOA Document Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-gray-50/50 print:bg-white print:p-0">
          <div
            id="kumi-soa-document"
            ref={printRef}
            className="mx-auto max-w-3xl bg-white p-8 sm:p-10 shadow-sm border border-gray-200 rounded-xl print:border-none print:shadow-none print:p-0"
          >
            {/* HOA Official Letterhead */}
            <div className="border-b-2 border-[#133E2B] pb-5 text-center">
              <div className="flex items-center justify-center gap-2 text-[#133E2B] font-bold text-xs uppercase tracking-widest">
                <Building className="h-4 w-4" />
                <span>Republic of the Philippines • Province of Cavite</span>
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-black text-[#133E2B] tracking-wide mt-1 uppercase">
                Mabuhay Homes 2000 Phase 5 Homeowners Association, Inc.
              </h1>
              <p className="text-xs text-gray-600 mt-1">
                Phase 5, Brgy. Salitran IV, City of Dasmariñas, Cavite 4114
              </p>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">
                Office of the Treasurer &amp; HOA Administration
              </p>
              <div className="mt-4 inline-block rounded-full bg-[#133E2B] px-5 py-1 text-xs font-black uppercase tracking-wider text-white">
                Official Statement of Account
              </div>
            </div>

            {/* Meta & Resident Information Box */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Account / Resident Details
                </div>
                <div className="text-base font-bold text-gray-900">{resolvedName}</div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-semibold">Unit Location:</span>
                  <span>
                    Block {resolvedBlock || "—"}, Lot {resolvedLot || "—"}
                  </span>
                </div>
                {resolvedEmail && (
                  <div className="text-gray-600">
                    <span className="font-semibold">Email:</span> {resolvedEmail}
                  </div>
                )}
                {resolvedPhone && (
                  <div className="text-gray-600">
                    <span className="font-semibold">Contact:</span> {resolvedPhone}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Statement Summary
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Statement No:</span>
                  <span className="font-mono font-bold text-gray-900">{soaNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date Issued:</span>
                  <span className="font-semibold text-gray-900">{currentDateFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Period Covered:</span>
                  <span className="font-semibold text-gray-900">{coveragePeriod}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                  <span className="text-gray-500">Account Standing:</span>
                  {totalOutstanding === 0 ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                      <CheckCircle2 className="h-3 w-3" /> Fully Settled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full text-[10px]">
                      <AlertCircle className="h-3 w-3" /> Balance Due
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs">
                <div className="text-[10px] uppercase font-bold text-gray-500">Total Assessed</div>
                <div className="font-serif text-lg font-bold text-[#133E2B] mt-0.5">
                  {formatPHP(totalDue)}
                </div>
                <span className="text-[10px] text-gray-400">Monthly HOA Dues</span>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 shadow-xs">
                <div className="text-[10px] uppercase font-bold text-emerald-800">Total Paid</div>
                <div className="font-serif text-lg font-bold text-emerald-700 mt-0.5">
                  {formatPHP(totalPaid)}
                </div>
                <span className="text-[10px] text-emerald-600">Recorded Payments</span>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 shadow-xs">
                <div className="text-[10px] uppercase font-bold text-rose-800">Outstanding Balance</div>
                <div className="font-serif text-lg font-bold text-rose-700 mt-0.5">
                  {formatPHP(totalOutstanding)}
                </div>
                <span className="text-[10px] text-rose-600">Current Amount Due</span>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 shadow-xs">
                <div className="text-[10px] uppercase font-bold text-sky-800">Advance Credit</div>
                <div className="font-serif text-lg font-bold text-sky-700 mt-0.5">
                  {formatPHP(totalCredit)}
                </div>
                <span className="text-[10px] text-sky-600">Carried Forward</span>
              </div>
            </div>

            {/* Itemized Assessment & Payment Ledger */}
            <div className="mt-6">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#133E2B] flex items-center gap-1.5">
                  <History className="h-4 w-4" /> Itemized Assessment &amp; Payment Ledger
                </h3>
                <span className="text-[11px] text-gray-500">
                  {sortedDues.length} {sortedDues.length === 1 ? "Record" : "Records"}
                </span>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="p-2.5">Billing Period</th>
                      <th className="p-2.5">Due Date</th>
                      <th className="p-2.5 text-right">Assessment</th>
                      <th className="p-2.5 text-right">Paid</th>
                      <th className="p-2.5 text-right">Balance</th>
                      <th className="p-2.5">Payment Date</th>
                      <th className="p-2.5">Reference No.</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {sortedDues.map((d) => {
                      const status = computeDuesStatusForRecord(d);
                      const due = Number(d.amountDue) || 0;
                      const paid = Number(d.amountPaid) || 0;
                      const bal = outstandingFor(d);

                      return (
                        <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="p-2.5 font-bold text-gray-900 whitespace-nowrap">
                            {d.dueMonth}
                          </td>
                          <td className="p-2.5 text-gray-500 whitespace-nowrap">
                            {d.dueDate
                              ? new Date(d.dueDate + "T00:00:00").toLocaleDateString("en-PH", {
                                  month: "short",
                                  day: "2-digit",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="p-2.5 font-semibold text-gray-900 text-right whitespace-nowrap">
                            {formatPHP(due)}
                          </td>
                          <td className="p-2.5 font-bold text-emerald-700 text-right whitespace-nowrap">
                            {formatPHP(paid)}
                          </td>
                          <td className="p-2.5 font-bold text-right whitespace-nowrap">
                            {bal > 0 ? (
                              <span className="text-rose-600">{formatPHP(bal)}</span>
                            ) : (
                              <span className="text-gray-400">₱0.00</span>
                            )}
                          </td>
                          <td className="p-2.5 text-gray-600 whitespace-nowrap">
                            {d.paidAt
                              ? new Date(d.paidAt + "T00:00:00").toLocaleDateString("en-PH", {
                                  month: "short",
                                  day: "2-digit",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                            {(d as any).referenceNumber || (d.source ? `[${d.source}]` : "—")}
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            {status === "on_time" || status === "paid" ? (
                              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                                Paid
                              </span>
                            ) : status === "advance" ? (
                              <span className="rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-[10px] font-bold">
                                Advance
                              </span>
                            ) : status === "delayed" ? (
                              <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                                Delayed
                              </span>
                            ) : (
                              <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold">
                                Unpaid
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {sortedDues.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-400 text-xs">
                          No dues transactions recorded for this resident.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Official Advisory & Payment Instructions */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-[11px] text-gray-600 leading-relaxed">
              <div className="font-bold text-gray-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#133E2B]" />
                Official HOA Advisory
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                <li>
                  Monthly association dues are assessed at the regular rate of <strong>₱100.00</strong> per lot, due on the 5th of each month.
                </li>
                <li>
                  Payments may be settled via official HOA GCash or at the HOA Clubhouse Admin Office.
                </li>
                <li>
                  Overpayments automatically roll over as advance credit balance toward succeeding months.
                </li>
                <li>
                  For any billing inquiries, corrections, or official receipt issuance, please present this statement to the Office of the Treasurer within 15 calendar days.
                </li>
              </ul>
            </div>

            {/* Certification & Signatures Block */}
            <div className="mt-8 pt-6 border-t border-gray-300 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-400 mb-8">
                  Certified Correct By:
                </div>
                <div className="border-b border-gray-800 pb-1 font-bold text-gray-900 uppercase">
                  HOA Treasurer
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Office of the Treasurer • Mabuhay Homes Phase 5
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-gray-400 mb-8">
                  Noted &amp; Approved By:
                </div>
                <div className="border-b border-gray-800 pb-1 font-bold text-gray-900 uppercase">
                  HOA Association President
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Mabuhay Homes 2000 Phase 5 HOA, Inc.
                </div>
              </div>
            </div>

            {/* System Audit Footer */}
            <div className="mt-8 text-center text-[10px] text-gray-400">
              Generated electronically via Kumi HOA Portal on {currentDateFormatted}. Document Reference: {soaNumber}.
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Screen Only) */}
        <div className="no-print flex items-center justify-between border-t border-cream-2 px-6 py-3 bg-cream/20 shrink-0">
          <span className="text-xs text-muted">
            All records synchronized with database master ledger.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-green flex items-center gap-1.5 !px-4 !py-2 text-xs font-bold shadow-xs cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Statement</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-cream-2 bg-white px-4 py-2 text-xs font-semibold text-muted hover:bg-cream transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
