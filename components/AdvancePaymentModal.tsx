"use client";

import { useState, useMemo } from "react";
import QRCode from "react-qr-code";
import {
  X,
  CalendarDays,
  Smartphone,
  Calendar,
  Coins,
  ShieldCheck,
  Upload,
  Check,
  CheckCircle2,
  AlertCircle,
  Copy,
  Receipt,
  ArrowRight,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { formatPHP, type PaymentConfig, type DuesRecord } from "@/lib/mock-data";
import {
  calculatePaymentAllocation,
  formatBillingPeriod,
  DEFAULT_MONTHLY_DUE,
  MONTH_NAMES,
} from "@/lib/dues";
import { buildPlaceholderQR, HOAGCashNumber } from "@/lib/payment";
import { validateReferenceNumber, validateAmount } from "@/lib/validation";
import { api } from "@/lib/api";

interface AdvancePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentOutstanding: number;
  currentBillingPeriod: string;
  configuredMonthlyDue: number;
  existingCredit?: number;
  user?: {
    fullName?: string;
    email?: string;
    blockNo?: string | null;
    lotNo?: string | null;
  } | null;
  gcashConfig?: PaymentConfig | null;
  currentRecord?: DuesRecord | null;
}

export default function AdvancePaymentModal({
  isOpen,
  onClose,
  onSuccess,
  currentOutstanding,
  currentBillingPeriod,
  configuredMonthlyDue,
  existingCredit = 0,
  user,
  gcashConfig,
  currentRecord,
}: AdvancePaymentModalProps) {
  const monthlyDue = configuredMonthlyDue || DEFAULT_MONTHLY_DUE;

  // Calculate next eligible billing period
  const nextEligiblePeriod = useMemo(() => {
    if (!currentBillingPeriod) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}`;
    }
    const [y, m] = currentBillingPeriod.split("-").map(Number);
    if (m === 12) return `${y + 1}-01`;
    return `${y}-${String(m + 1).padStart(2, "0")}`;
  }, [currentBillingPeriod]);

  // Suggested default payment amount
  const defaultAmount = useMemo(() => {
    if (currentOutstanding > 0) {
      return currentOutstanding + monthlyDue;
    }
    return monthlyDue;
  }, [currentOutstanding, monthlyDue]);

  const [amount, setAmount] = useState<number>(defaultAmount);
  const [gcashRef, setGcashRef] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [autoApproveDemo, setAutoApproveDemo] = useState(true);
  const [step, setStep] = useState<"form" | "review" | "success">("form");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Real-time allocation calculation
  const allocation = useMemo(() => {
    return calculatePaymentAllocation({
      currentOutstanding,
      configuredMonthlyDue: monthlyDue,
      existingCredit,
      paymentAmount: Number(amount) || 0,
    });
  }, [currentOutstanding, monthlyDue, existingCredit, amount]);

  // Compute upcoming months covered by advance portion
  const upcomingMonthsList = useMemo(() => {
    const list: string[] = [];
    if (allocation.advanceMonthsCovered <= 0) return list;

    let [y, m] = nextEligiblePeriod.split("-").map(Number);
    for (let i = 0; i < allocation.advanceMonthsCovered; i++) {
      list.push(`${y}-${String(m).padStart(2, "0")}`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return list;
  }, [nextEligiblePeriod, allocation.advanceMonthsCovered]);

  if (!isOpen) return null;

  const handleCopyAccount = () => {
    const num = gcashConfig?.accountNumber || HOAGCashNumber;
    navigator.clipboard?.writeText(num.replace(/\s+/g, ""));
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(String(reader.result));
      reader.readAsDataURL(file);
    }
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    const amtErr = validateAmount(amount, { required: true, label: "Payment amount", min: 1 });
    if (amtErr) {
      setErrorMsg(amtErr);
      return;
    }
    const refErr = validateReferenceNumber(gcashRef, { required: true, label: "GCash reference number" });
    if (refErr) {
      setErrorMsg(refErr);
      return;
    }
    if (!receiptFile) {
      setErrorMsg("Please upload your GCash payment confirmation screenshot / receipt.");
      return;
    }
    setErrorMsg("");
    setStep("review");
  };

  const handleConfirmPayment = async () => {
    setBusy(true);
    setErrorMsg("");
    try {
      let uploadedReceiptPath: string | undefined = undefined;
      if (receiptFile) {
        const uploadRes = await api.uploadPaymentReceipt(receiptFile);
        uploadedReceiptPath = uploadRes.path;
      }

      // If we have a current record, pay towards it with advance metadata
      // Otherwise, pay or create
      const targetRecordId = currentRecord?.id;
      if (targetRecordId) {
        await api.payDues(targetRecordId, {
          amount,
          paidAt: new Date().toISOString().slice(0, 10),
          userEmail: user?.email,
          paymentMethod: "gcash",
          gcashRef: gcashRef.trim(),
          receiptPath: uploadedReceiptPath,
          advanceForMonth: upcomingMonthsList.join(","),
          allocatedAmount: allocation.allocatedToOutstanding + allocation.allocatedToAdvance,
          creditAmount: allocation.excessCredit,
          autoApprove: autoApproveDemo,
        });
      } else {
        // If no dues record currently exists, create advance transaction directly
        await fetch("/api/dues/advance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            paidAt: new Date().toISOString().slice(0, 10),
            userEmail: user?.email,
            residentName: user?.fullName,
            blockNo: user?.blockNo,
            lotNo: user?.lotNo,
            gcashRef: gcashRef.trim(),
            receiptPath: uploadedReceiptPath,
            advanceForMonth: upcomingMonthsList.join(","),
            allocatedAmount: allocation.allocatedToAdvance,
            creditAmount: allocation.excessCredit,
            autoApprove: autoApproveDemo,
          }),
        });
      }

      setStep("success");
      onSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit advance payment.");
    } finally {
      setBusy(false);
    }
  };

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
        <div className="flex items-center justify-between p-6 pb-4 border-b border-cream-2 bg-gradient-to-r from-emerald-50 via-white to-cream/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-2xs">
              <CalendarDays className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl font-bold text-green-dark">
                  Make an Advance Payment
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Fixed ₱{monthlyDue}/mo
                </span>
              </div>
              <p className="text-xs text-muted">
                Pay upcoming monthly HOA dues ahead of schedule or buffer your account with carried credit
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* STEP 1: FORM */}
          {step === "form" && (
            <form onSubmit={handleProceedToReview} className="space-y-5">
              {/* Context Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-cream-2 bg-cream/30 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Current Period
                  </div>
                  <div className="text-xs font-bold text-green-dark mt-0.5">
                    {formatBillingPeriod(currentBillingPeriod)}
                  </div>
                </div>

                <div className="rounded-xl border border-cream-2 bg-cream/30 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Next Due Period
                  </div>
                  <div className="text-xs font-bold text-emerald-800 mt-0.5">
                    {formatBillingPeriod(nextEligiblePeriod)}
                  </div>
                </div>

                <div className="rounded-xl border border-cream-2 bg-cream/30 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Outstanding
                  </div>
                  <div className={`text-xs font-bold mt-0.5 ${currentOutstanding > 0 ? "text-rose-600" : "text-green-dark"}`}>
                    {formatPHP(currentOutstanding)}
                  </div>
                </div>

                <div className="rounded-xl border border-cream-2 bg-cream/30 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Existing Credit
                  </div>
                  <div className="text-xs font-bold text-sky-700 mt-0.5">
                    {formatPHP(existingCredit)}
                  </div>
                </div>
              </div>

              {/* Amount Input & Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">
                    Advance Payment Amount (PHP) *
                  </label>
                  <span className="text-[11px] font-medium text-emerald-700">
                    Configured Monthly Due: {formatPHP(monthlyDue)}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-green-mid">
                    ₱
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    placeholder="Enter amount (e.g. 100, 200, 300)"
                    className="w-full rounded-2xl border border-cream-2 bg-white pl-9 pr-4 py-3 text-lg font-bold text-green-dark shadow-2xs focus:border-green-mid focus:outline-none"
                    required
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted font-medium mr-1">Quick Select:</span>
                  {[
                    { label: "1 Month", val: monthlyDue },
                    { label: "2 Months", val: monthlyDue * 2 },
                    { label: "3 Months", val: monthlyDue * 3 },
                    { label: "6 Months", val: monthlyDue * 6 },
                    ...(currentOutstanding > 0 ? [{ label: `Payoff + 1 Mo (${formatPHP(currentOutstanding + monthlyDue)})`, val: currentOutstanding + monthlyDue }] : []),
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAmount(p.val)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition cursor-pointer ${
                        amount === p.val
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : "bg-white text-muted border-cream-2 hover:bg-cream hover:text-green-dark"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Payment Allocation Breakdown Card */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    <TrendingUp className="h-4 w-4 text-emerald-700" />
                    Authoritative Payment Allocation Breakdown
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800">
                    Total: {formatPHP(amount)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Current Balance Allocation */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-emerald-100">
                    <span className="text-muted">1. Current / Older Outstanding:</span>
                    <strong className="text-slate-800">
                      {formatPHP(allocation.allocatedToOutstanding)}
                    </strong>
                  </div>

                  {/* Remaining Current Balance */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-emerald-100">
                    <span className="text-muted">Remaining Balance After:</span>
                    <strong className={allocation.remainingOutstanding > 0 ? "text-rose-600" : "text-emerald-700"}>
                      {formatPHP(allocation.remainingOutstanding)}
                    </strong>
                  </div>

                  {/* Advance Coverage */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-emerald-100">
                    <span className="text-muted">2. Advance Dues Coverage:</span>
                    <strong className="text-emerald-800">
                      {formatPHP(allocation.allocatedToAdvance)}{" "}
                      <span className="text-[11px] font-normal text-muted">
                        ({allocation.advanceMonthsCovered} mo{allocation.advanceMonthsCovered === 1 ? "" : "s"})
                      </span>
                    </strong>
                  </div>

                  {/* Excess Carried Credit */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-emerald-100">
                    <span className="text-muted">3. Excess Carried Credit Buffer:</span>
                    <strong className="text-sky-700">
                      +{formatPHP(allocation.excessCredit)}
                    </strong>
                  </div>
                </div>

                {/* Covered Months Pill List */}
                {upcomingMonthsList.length > 0 && (
                  <div className="pt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-emerald-900 font-bold">Advance Cycles Settled:</span>
                    {upcomingMonthsList.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-200/80 px-2 py-0.5 font-bold text-emerald-900 border border-emerald-300"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                        {formatBillingPeriod(m)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* GCash Payment Details Box */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950 uppercase tracking-wider">
                    <Smartphone className="h-4 w-4 text-blue-600" />
                    Official HOA GCash Account
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                    Verified
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/90 p-3 rounded-xl border border-blue-100">
                  <div className="p-2 rounded-lg bg-white border border-cream-2 shrink-0">
                    {gcashConfig?.qrCodeUrl ? (
                      <img
                        src={gcashConfig.qrCodeUrl}
                        alt="GCash QR"
                        className="h-24 w-24 object-contain mx-auto"
                      />
                    ) : (
                      <QRCode
                        value={buildPlaceholderQR(
                          gcashConfig?.accountNumber || HOAGCashNumber,
                          amount,
                          gcashConfig?.accountName || "MABUHAY HOMES HOA"
                        )}
                        size={96}
                      />
                    )}
                  </div>
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <div className="text-muted text-[11px]">Account Name:</div>
                    <div className="font-bold text-green-dark">
                      {gcashConfig?.accountName || "MABUHAY HOMES HOA"}
                    </div>
                    <div className="text-muted text-[11px] mt-1">Account Number:</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-blue-900">
                        {gcashConfig?.accountNumber || HOAGCashNumber}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyAccount}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900"
                      >
                        {copiedAccount ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        {copiedAccount ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reference Number & Receipt Upload */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">
                      GCash Reference Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1002 9384 7561 or 902837482910"
                      value={gcashRef}
                      onChange={(e) => setGcashRef(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-cream-2 bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-green-dark shadow-2xs focus:border-green-mid focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">
                      Proof of Payment (Screenshot Receipt) *
                    </label>
                    <div className="mt-1 flex items-center gap-3">
                      <label className="flex items-center gap-2 rounded-xl border border-cream-2 bg-white px-4 py-2.5 text-xs font-bold text-green-dark hover:bg-cream cursor-pointer shadow-2xs transition">
                        <Upload className="h-4 w-4 text-green-mid" />
                        <span>{receiptFile ? "Change Receipt File" : "Choose Screenshot"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleReceiptChange}
                          className="hidden"
                        />
                      </label>
                      {receiptFile && (
                        <span className="text-xs font-medium text-emerald-700 truncate max-w-xs">
                          ✓ {receiptFile.name}
                        </span>
                      )}
                    </div>

                    {receiptPreview && (
                      <div className="mt-2 relative w-32 h-32 rounded-xl overflow-hidden border border-cream-2 shadow-2xs">
                        <img
                          src={receiptPreview}
                          alt="Receipt Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptFile(null);
                            setReceiptPreview("");
                          }}
                          className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black"
                          title="Remove receipt"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instant Demo Verification Toggle for Instructor Demo */}
                <div className="rounded-xl border border-emerald-200 bg-white/80 p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Classroom Demonstration Mode
                    </div>
                    <div className="text-[11px] text-muted">
                      Automatically confirm payment and allocate advance months immediately upon submission
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoApproveDemo}
                      onChange={(e) => setAutoApproveDemo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-cream-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-cream-2 bg-white px-4 py-2.5 text-xs font-semibold text-muted hover:bg-cream transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-green-dark px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-green-mid transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>Review Payment Allocation</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: REVIEW */}
          {step === "review" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-cream-2 bg-cream/30 p-5 space-y-4">
                <h4 className="font-serif text-lg font-bold text-green-dark">
                  Please Confirm Payment Details
                </h4>

                <div className="space-y-2 text-xs divide-y divide-cream-2">
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted">Resident Name:</span>
                    <strong className="text-green-dark">{user?.fullName || "Resident Homeowner"}</strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted">Payment Amount:</span>
                    <strong className="text-base text-emerald-800 font-bold">{formatPHP(amount)}</strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted">GCash Reference:</span>
                    <strong className="font-mono text-slate-800">{gcashRef}</strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted">Current Period Payoff:</span>
                    <strong className="text-slate-800">{formatPHP(allocation.allocatedToOutstanding)}</strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted">Advance Cycles Covered:</span>
                    <strong className="text-emerald-700">
                      {allocation.advanceMonthsCovered > 0
                        ? `${allocation.advanceMonthsCovered} Months (${upcomingMonthsList.map(formatBillingPeriod).join(", ")})`
                        : "None (Buffer only)"}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted">Carried Credit Created:</span>
                    <strong className="text-sky-700">+{formatPHP(allocation.excessCredit)}</strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted">Verification Mode:</span>
                    <span className="font-bold text-emerald-700">
                      {autoApproveDemo ? "Instant Demonstration Confirmation" : "Pending HOA Admin Review"}
                    </span>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-cream-2">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  disabled={busy}
                  className="rounded-xl border border-cream-2 bg-white px-4 py-2.5 text-xs font-semibold text-muted hover:bg-cream transition cursor-pointer"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={busy}
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {busy ? "Processing Submission…" : "Confirm & Submit Advance Payment"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {step === "success" && (
            <div className="p-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 shadow-sm animate-bounce">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-green-dark">
                Advance Payment Submitted!
              </h3>
              <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                Your payment of <strong>{formatPHP(amount)}</strong> (Ref: {gcashRef}) has been processed.
                {upcomingMonthsList.length > 0 && (
                  <span>
                    {" "}Your upcoming dues for <strong>{upcomingMonthsList.map(formatBillingPeriod).join(", ")}</strong> have been settled in advance.
                  </span>
                )}
                {allocation.excessCredit > 0 && (
                  <span>
                    {" "}An excess credit of <strong>+{formatPHP(allocation.excessCredit)}</strong> is safely carried over to your account.
                  </span>
                )}
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-green-dark px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-green-mid transition cursor-pointer"
                >
                  Return to My Dues Ledger
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
