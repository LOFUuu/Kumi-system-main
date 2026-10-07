"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  computeDuesStatusForRecord,
  outstandingFor,
  creditFor,
  formatBillingPeriod,
  getCurrentDueMonth,
  DEFAULT_MONTHLY_DUE,
} from "@/lib/dues";
import { formatPHP, type DuesRecord } from "@/lib/mock-data";
import {
  Upload,
  X,
  Check,
  Receipt,
  FileText,
  Smartphone,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  History,
  Coins,
  Building,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Eye,
} from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  on_time: "badge-green",
  paid: "badge-green",
  unpaid: "badge-danger",
  delayed: "badge-gold",
  advance: "badge-muted",
};

export default function MyDuesPage() {
  const { user } = useAuth();
  const [dues, setDues] = useState<DuesRecord[]>([]);
  const [payId, setPayId] = useState<DuesRecord | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"gcash">("gcash");
  const [gcashRef, setGcashRef] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalStep, setModalStep] = useState<"form" | "review" | "success">("form");

  const load = () => api.dues().then(setDues).catch(() => setDues([]));
  useEffect(() => {
    load();
  }, []);

  const name = user?.fullName ?? "Resident";
  const myDues = useMemo(() => {
    return dues
      .filter((d) => d.residentName === name || (user?.id && d.residentId === user.id))
      .sort((a, b) => b.dueMonth.localeCompare(a.dueMonth));
  }, [dues, name, user?.id]);

  const currentMonth = getCurrentDueMonth();
  const currentRecord = myDues.find((d) => d.dueMonth === currentMonth);

  const paid = myDues.reduce((s, d) => s + d.amountPaid, 0);
  const outstanding = myDues.reduce((s, d) => s + outstandingFor(d), 0);
  const credit = myDues.reduce((s, d) => s + creditFor(d.amountDue, d.amountPaid), 0);

  const filteredDues = useMemo(() => {
    if (statusFilter === "all") return myDues;
    return myDues.filter((d) => {
      const st = computeDuesStatusForRecord(d);
      const displayStatus = st === "on_time" ? "paid" : st;
      return displayStatus === statusFilter;
    });
  }, [myDues, statusFilter]);

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(String(reader.result));
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview("");
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview("");
  };

  const openPay = (d: DuesRecord) => {
    setPayId(d);
    setAmount(outstandingFor(d) || d.amountDue || DEFAULT_MONTHLY_DUE);
    setPaymentMethod("gcash");
    setGcashRef("");
    setReceiptFile(null);
    setReceiptPreview("");
    setMsg("");
    setModalStep("form");
  };

  /** Step 1: Validate input form and open the confirmation review step */
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payId) return;
    if (amount <= 0) {
      setMsg("Please enter a valid payment amount.");
      return;
    }
    if (!gcashRef.trim() && !receiptFile) {
      setMsg("Please enter a GCash Reference Number or upload a receipt screenshot.");
      return;
    }
    setMsg("");
    setModalStep("review");
  };

  /** Step 2: User clicks "Confirm & Submit Payment" on the review step */
  const confirmPaymentSubmission = async () => {
    if (!payId || busy) return;
    setBusy(true);
    setMsg("");
    try {
      let uploadedReceiptPath: string | undefined = undefined;
      if (receiptFile) {
        const uploadRes = await api.uploadPaymentReceipt(receiptFile);
        uploadedReceiptPath = uploadRes.path;
      }

      await api.payDues(payId.id, {
        amount,
        paidAt: new Date().toISOString().slice(0, 10),
        userEmail: user?.email,
        paymentMethod: "gcash",
        gcashRef: gcashRef.trim() || undefined,
        receiptPath: uploadedReceiptPath,
      });

      setModalStep("success");
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Could not submit payment. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="section">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold text-green-dark">My Dues</h1>
          <p className="mt-1 text-sm text-muted">
            Track your fixed ₱100 monthly homeownership dues and complete past payment history.
          </p>
        </div>

        {user?.blockNo && user?.lotNo && (
          <div className="flex items-center gap-2 rounded-2xl border border-cream-2 bg-white px-4 py-2.5 shadow-sm text-xs text-green-dark">
            <Building className="h-4 w-4 text-green-mid" />
            <span>
              Block <strong>{user.blockNo}</strong> / Lot <strong>{user.lotNo}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Hero Current Month Banner */}
      {currentRecord && (
        <div className="mb-8 rounded-3xl border border-green-light/40 bg-gradient-to-r from-green-dark via-green-mid to-green-deep p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                Current Billing Period: {formatBillingPeriod(currentRecord.dueMonth)}
              </div>
              <h2 className="font-serif text-3xl font-bold text-gold">
                Monthly Due: {formatPHP(currentRecord.amountDue)}
              </h2>
              <p className="text-xs text-white/80 max-w-lg">
                Due Date:{" "}
                <strong>
                  {currentRecord.dueDate
                    ? new Date(currentRecord.dueDate + "T00:00:00").toLocaleDateString("en-PH", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "End of month"}
                </strong>
                . Fixed community maintenance & security fee.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {currentRecord.amountPaid >= currentRecord.amountDue ? (
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 px-5 py-3 text-emerald-100 backdrop-blur-sm">
                  <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                  <div>
                    <div className="text-sm font-bold">Fully Paid</div>
                    <div className="text-[11px] text-emerald-200">
                      Paid: {formatPHP(currentRecord.amountPaid)}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openPay(currentRecord)}
                  className="btn-gold !px-6 !py-3 text-sm font-bold shadow-lg hover:scale-105 transition"
                >
                  Pay {formatBillingPeriod(currentRecord.dueMonth)} Due →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <div className="card flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Total Paid (All Time)</div>
            <div className="font-serif text-2xl font-bold text-green-dark mt-0.5">{formatPHP(paid)}</div>
            <div className="text-[10px] text-muted">{myDues.length} recorded billing periods</div>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
            <AlertCircle className="h-6 w-6" />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Outstanding Balance</div>
            <div className="font-serif text-2xl font-bold text-rose-600 mt-0.5">{formatPHP(outstanding)}</div>
            <div className="text-[10px] text-muted">Total unpaid or delayed dues</div>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
            <Coins className="h-6 w-6" />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Carried Credit</div>
            <div className="font-serif text-2xl font-bold text-sky-700 mt-0.5">{formatPHP(credit)}</div>
            <div className="text-[10px] text-muted">Applied automatically to upcoming dues</div>
          </div>
        </div>
      </div>

      {/* Continuous Payment & Dues History */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-xl font-bold text-green-dark flex items-center gap-2">
            <History className="h-5 w-5 text-green-mid" />
            Complete Payment & Dues History
          </h3>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white p-1 text-xs shadow-sm">
            {["all", "paid", "unpaid", "delayed"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1 font-semibold capitalize transition ${
                  statusFilter === st
                    ? "bg-green-mid text-white"
                    : "text-muted hover:text-green-dark hover:bg-cream"
                }`}
              >
                {st === "delayed" ? "Overdue / Partial" : st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-cream-2 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="p-4">Billing Month</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Due Amount</th>
                <th className="p-4">Paid Amount</th>
                <th className="p-4">Credit</th>
                <th className="p-4">Payment Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDues.map((d) => {
                const status = computeDuesStatusForRecord(d);
                const fullySettled = d.amountPaid >= d.amountDue;
                return (
                  <tr key={d.id} className="border-t border-cream-2 hover:bg-cream/40 transition">
                    <td className="p-4 font-semibold text-green-dark">
                      {formatBillingPeriod(d.dueMonth)}
                    </td>
                    <td className="p-4 text-xs text-muted whitespace-nowrap">
                      {d.dueDate
                        ? new Date(d.dueDate + "T00:00:00").toLocaleDateString("en-PH", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="p-4 font-bold text-green-dark">{formatPHP(d.amountDue)}</td>
                    <td className="p-4 font-bold text-green-mid">{formatPHP(d.amountPaid)}</td>
                    <td className="p-4 font-semibold text-sky-600">
                      {formatPHP(creditFor(d.amountDue, d.amountPaid))}
                    </td>
                    <td className="p-4 text-xs text-muted whitespace-nowrap">
                      {d.paidAt
                        ? new Date(d.paidAt + "T00:00:00").toLocaleDateString("en-PH", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="p-4">
                      <span className={`badge ${STATUS_BADGE[status]}`}>
                        {status === "on_time" ? "paid" : status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {fullySettled ? (
                        <span className="text-xs font-semibold text-emerald-600">✓ Settled</span>
                      ) : (
                        <button
                          className="btn-green !px-3 !py-1.5 text-xs font-bold"
                          onClick={() => openPay(d)}
                        >
                          Pay Now
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredDues.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted text-sm">
                    No dues records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Dues Modal */}
      {payId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md my-8 rounded-2xl bg-white p-6 shadow-2xl">
            {/* ════════════════════════════════════════════════════════ */}
            {/* MODAL STEP 1: PAYMENT INPUT FORM                         */}
            {/* ════════════════════════════════════════════════════════ */}
            {modalStep === "form" && (
              <form onSubmit={handleProceedToReview}>
                <div className="flex items-center justify-between pb-3 border-b border-cream-2">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-green-dark">
                      Pay {formatBillingPeriod(payId.dueMonth)} Dues
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Monthly Homeowners Association Fee
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayId(null)}
                    className="rounded-full p-1 text-muted hover:bg-cream"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 rounded-xl bg-cream/40 p-3 text-xs text-muted border border-cream-2">
                  <div className="flex justify-between items-center">
                    <span>Amount Due for Cycle:</span>
                    <strong className="text-green-dark">{formatPHP(outstandingFor(payId) || payId.amountDue)}</strong>
                  </div>
                  <p className="mt-1 text-[11px] text-green-mid">
                    💡 Overpayment (e.g. paying ₱200 for ₱100 due) automatically carries over as credit for next month.
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="field-label">Amount to Pay (PHP) *</label>
                    <input
                      type="number"
                      className="field text-lg font-bold text-green-dark"
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">Payment Method</label>
                    <div className="rounded-xl border border-blue-500 bg-blue-50/80 p-2.5 flex items-center justify-between text-blue-800">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4 text-blue-600" /> GCash Only
                      </span>
                      <span className="text-[10px] font-semibold bg-blue-200/70 text-blue-900 px-2 py-0.5 rounded-md">
                        Accepted Method
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-center">
                    <div className="text-xs font-bold text-blue-700">MABUHAY HOMES HOA GCASH</div>
                    <div className="font-mono text-sm font-bold text-blue-900 mt-0.5">0917 123 4567</div>
                  </div>

                  <div>
                    <label className="field-label">GCash Reference Number</label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        className="field pl-9"
                        value={gcashRef}
                        onChange={(e) => setGcashRef(e.target.value)}
                        placeholder="e.g. 1002 9384 7561"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="field-label">Attach Proof of Payment (Receipt Screenshot)</label>
                    {!receiptFile ? (
                      <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-cream-2 bg-cream/20 p-4 cursor-pointer hover:border-green-mid hover:bg-green-light/5 transition group">
                        <Upload className="h-5 w-5 text-muted group-hover:text-green-mid transition" />
                        <span className="mt-1 text-xs font-bold text-green-dark">Upload Receipt Image</span>
                        <span className="text-[10px] text-muted">JPG, PNG, WEBP, or PDF</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleReceiptChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="rounded-xl border border-cream-2 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {receiptPreview ? (
                              <img
                                src={receiptPreview}
                                alt="Receipt"
                                className="h-12 w-12 rounded-lg object-cover border border-cream-2 flex-shrink-0"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cream flex-shrink-0">
                                <FileText className="h-5 w-5 text-muted" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-green-dark truncate">{receiptFile.name}</p>
                              <span className="text-[10px] text-emerald-600 font-semibold">✓ Receipt Attached</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={removeReceipt}
                            className="rounded p-1 text-muted hover:bg-rose-50 hover:text-rose-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {msg && <p className="mt-3 text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{msg}</p>}

                <div className="mt-5 flex gap-3">
                  <button
                    type="submit"
                    className="btn-green flex-1 !py-2.5 text-sm font-bold flex items-center justify-center gap-1.5"
                  >
                    Submit Payment <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayId(null)}
                    className="btn-ghost flex-1 !py-2.5 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* ════════════════════════════════════════════════════════ */}
            {/* MODAL STEP 2: REVIEW / CONFIRMATION STEP                 */}
            {/* ════════════════════════════════════════════════════════ */}
            {modalStep === "review" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-cream-2">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-green-dark">
                      Review Your Payment
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Please review your payment details before confirming.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayId(null)}
                    className="rounded-full p-1 text-muted hover:bg-cream"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Details Breakdown */}
                <div className="rounded-xl border border-cream-2 bg-cream/30 p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-green-dark pb-1 border-b border-cream-2">
                    Payment Details
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-white p-2.5 border border-cream-2">
                      <span className="text-muted block text-[10px]">Billing Period</span>
                      <strong className="text-green-dark text-xs mt-0.5 block">
                        {formatBillingPeriod(payId.dueMonth)}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-cream-2">
                      <span className="text-muted block text-[10px]">Amount to Pay</span>
                      <strong className="text-green-mid text-xs mt-0.5 block">
                        {formatPHP(amount)}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-cream-2">
                      <span className="text-muted block text-[10px]">Payment Method</span>
                      <strong className="text-blue-700 text-xs mt-0.5 block">GCash</strong>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-cream-2">
                      <span className="text-muted block text-[10px]">Status</span>
                      <span className="inline-block mt-0.5 font-bold text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        Pending Verification
                      </span>
                    </div>
                    <div className="col-span-2 rounded-lg bg-white p-2.5 border border-cream-2">
                      <span className="text-muted block text-[10px]">GCash Reference Number</span>
                      <strong className="font-mono text-green-dark text-xs mt-0.5 block">
                        {gcashRef.trim() || "(No reference number provided)"}
                      </strong>
                    </div>
                  </div>

                  {/* Receipt Preview */}
                  <div className="pt-1">
                    <span className="text-[11px] font-bold text-green-dark block mb-1">Proof of Payment Preview:</span>
                    {receiptPreview ? (
                      <div className="rounded-xl border border-cream-2 bg-white p-2 flex items-center justify-center">
                        <img
                          src={receiptPreview}
                          alt="Receipt Preview"
                          className="max-h-40 object-contain rounded-lg"
                        />
                      </div>
                    ) : receiptFile ? (
                      <div className="rounded-xl border border-cream-2 bg-white p-3 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted" />
                        <span className="text-xs font-bold text-green-dark truncate">{receiptFile.name}</span>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-2.5 text-center text-xs text-amber-800">
                        No receipt screenshot attached.
                      </div>
                    )}
                  </div>
                </div>

                {/* Notice Box */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[11px]">
                    <p className="font-bold text-amber-950">Please make sure your payment details and receipt are correct before submitting.</p>
                    <p className="text-amber-800">Your payment will be sent for verification after confirmation.</p>
                  </div>
                </div>

                {msg && <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{msg}</p>}

                {/* Confirmation Actions */}
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalStep("form")}
                    disabled={busy}
                    className="btn-ghost flex-1 !py-2.5 text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> ← Back & Edit
                  </button>
                  <button
                    type="button"
                    onClick={confirmPaymentSubmission}
                    disabled={busy}
                    className="btn-green flex-1 !py-2.5 text-xs font-bold flex items-center justify-center gap-1"
                  >
                    {busy ? "Submitting…" : "Confirm & Submit Payment"}
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════ */}
            {/* MODAL STEP 3: SUCCESS STATE                              */}
            {/* ════════════════════════════════════════════════════════ */}
            {modalStep === "success" && (
              <div className="space-y-4 text-center py-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <div>
                  <h3 className="font-serif text-xl font-bold text-green-dark">
                    Payment Submitted Successfully!
                  </h3>
                  <p className="text-xs text-muted mt-1 max-w-xs mx-auto">
                    Your GCash payment and receipt have been submitted for verification.
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Billing Period:</span>
                    <span className="font-bold text-green-dark">{formatBillingPeriod(payId.dueMonth)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Amount Submitted:</span>
                    <span className="font-bold text-green-mid">{formatPHP(amount)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-emerald-200/60">
                    <span className="text-muted">Payment Status:</span>
                    <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                      Pending Verification
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-muted">
                  The HOA admin will review your proof of payment and update your dues record accordingly.
                </p>

                <button
                  type="button"
                  onClick={() => setPayId(null)}
                  className="btn-green w-full !py-2.5 text-sm font-bold mt-2"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

