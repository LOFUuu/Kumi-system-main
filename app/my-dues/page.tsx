"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { computeDuesStatusForRecord, outstandingFor, creditFor } from "@/lib/dues";
import { formatPHP, type DuesRecord } from "@/lib/mock-data";

import { Upload, X, Check, Image as ImageIcon, Receipt, FileText, Smartphone } from "lucide-react";

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

  const load = () => api.dues().then(setDues).catch(() => setDues([]));
  useEffect(() => {
    load();
  }, []);

  const name = user?.fullName ?? "Resident";
  const myDues = dues.filter((d) => d.residentName === name);
  const paid = myDues.reduce((s, d) => s + d.amountPaid, 0);
  const outstanding = myDues.reduce((s, d) => s + outstandingFor(d), 0);
  const credit = myDues.reduce((s, d) => s + creditFor(d.amountDue, d.amountPaid), 0);

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
    setAmount(outstandingFor(d) || d.amountDue);
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
      setMsg("Payment recorded. Status and any credit were recalculated automatically.");
      setPayId(null);
      load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Could not record payment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="section">
      <h1 className="mb-2 font-serif text-4xl font-bold text-green-dark">My Dues</h1>
      <p className="mb-8 text-muted">Track your monthly homeownership dues. Status is computed from your due date, payment date, and amount.</p>

      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="text-sm text-muted">Total Paid</div>
          <div className="font-serif text-3xl font-bold text-green-mid">{formatPHP(paid)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-muted">Outstanding Balance</div>
          <div className="font-serif text-3xl font-bold text-green-mid">{formatPHP(outstanding)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-muted">Carried Credit</div>
          <div className="font-serif text-3xl font-bold text-gold-muted">{formatPHP(credit)}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-cream-2">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-muted">
            <tr>
              <th className="p-4">Month</th>
              <th className="p-4">Block / Lot</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Due</th>
              <th className="p-4">Paid</th>
              <th className="p-4">Credit</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {myDues.map((d) => {
              const status = computeDuesStatusForRecord(d);
              const fullySettled = d.amountPaid >= d.amountDue;
              return (
                <tr key={d.id} className="border-t border-cream-2">
                  <td className="p-4 font-semibold text-green-dark">{d.dueMonth}</td>
                  <td className="p-4">{d.blockNo} / {d.lotNo}</td>
                  <td className="p-4">{d.dueDate}</td>
                  <td className="p-4">{formatPHP(d.amountDue)}</td>
                  <td className="p-4">{formatPHP(d.amountPaid)}</td>
                  <td className="p-4">{formatPHP(creditFor(d.amountDue, d.amountPaid))}</td>
                  <td className="p-4"><span className={`badge ${STATUS_BADGE[status]}`}>{status.replace("_", " ")}</span></td>
                  <td className="p-4">
                    {fullySettled ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <button className="btn-green !px-3 !py-1.5 text-xs" onClick={() => openPay(d)}>Pay Now</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {myDues.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted">No dues records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {payId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in overflow-y-auto">
          <form onSubmit={submit} className="w-full max-w-md my-8 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-cream-2">
              <h3 className="font-serif text-xl font-bold text-green-dark">Pay {payId.dueMonth} Dues</h3>
              <button
                type="button"
                onClick={() => setPayId(null)}
                className="rounded-full p-1 text-muted hover:bg-cream"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs text-muted">
              Due <strong className="text-green-dark">{formatPHP(outstandingFor(payId) || payId.amountDue)}</strong>. Any overpayment becomes credit to your next cycle.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="field-label">Amount (PHP) *</label>
                <input
                  type="number"
                  className="field"
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
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-cream-2 text-muted"
                    }`}
                  >
                    GCash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`rounded-xl border p-2.5 text-center text-xs font-bold transition ${
                      paymentMethod === "cash"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-cream-2 text-muted"
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
