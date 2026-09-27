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
  CreditCard,
  Building,
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
  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "cash">("gcash");
  const [gcashRef, setGcashRef] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payId) return;
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
        paymentMethod,
        gcashRef: gcashRef.trim() || undefined,
        receiptPath: uploadedReceiptPath,
      });
      setMsg("Payment recorded successfully! Status and credit balance recalculated.");
      setTimeout(() => {
        setPayId(null);
        load();
      }, 600);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Could not record payment.");
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
          <form onSubmit={submit} className="w-full max-w-md my-8 rounded-2xl bg-white p-6 shadow-2xl">
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("gcash")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-bold transition ${
                      paymentMethod === "gcash"
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-xs"
                        : "border-cream-2 text-muted hover:bg-cream"
                    }`}
                  >
                    GCash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-bold transition ${
                      paymentMethod === "cash"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs"
                        : "border-cream-2 text-muted hover:bg-cream"
                    }`}
                  >
                    Cash (Admin Office)
                  </button>
                </div>
              </div>

              {paymentMethod === "gcash" && (
                <>
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
                </>
              )}
            </div>

            {msg && <p className="mt-3 text-xs font-semibold text-green-mid">{msg}</p>}

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={busy || amount <= 0}
                className="btn-green flex-1 !py-2.5 text-sm font-bold"
              >
                {busy ? "Processing…" : "Submit Payment"}
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
        </div>
      )}
    </div>
  );
}
