"use client";

import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Users,
  Coins,
  RotateCcw,
  Clock,
  Layers,
} from "lucide-react";
import { formatPHP } from "@/lib/mock-data";
import { formatBillingPeriod, getCurrentDueMonth, getCycleDueDate, DEFAULT_MONTHLY_DUE } from "@/lib/dues";
import { api } from "@/lib/api";

interface GenerateBillingCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  configuredMonthlyDue?: number;
}

export default function GenerateBillingCycleModal({
  isOpen,
  onClose,
  onSuccess,
  configuredMonthlyDue = DEFAULT_MONTHLY_DUE,
}: GenerateBillingCycleModalProps) {
  const currentMonth = getCurrentDueMonth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [amountDue, setAmountDue] = useState(configuredMonthlyDue);
  const [mode, setMode] = useState<"standard" | "demo_reset">("standard");
  const [demoResident, setDemoResident] = useState("axzel");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (configuredMonthlyDue) {
      setAmountDue(configuredMonthlyDue);
    }
  }, [configuredMonthlyDue]);

  if (!isOpen) return null;

  const dueDate = getCycleDueDate(selectedMonth);

  const handleGenerate = async () => {
    setBusy(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      if (mode === "standard") {
        const res = await api.generateDues(selectedMonth, amountDue);
        setSuccessMsg(
          `Successfully initialized billing cycle for ${formatBillingPeriod(selectedMonth)}! (${res.createdCount} new billing record(s) created at ${formatPHP(amountDue)}).`
        );
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        const res = await api.resetDemoDues(demoResident, selectedMonth, amountDue);
        setSuccessMsg(
          `Demonstration cycle for ${demoResident} in ${formatBillingPeriod(selectedMonth)} successfully reset to clean state (₱0.00 paid, ${formatPHP(amountDue)} due, Unpaid)!`
        );
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate billing cycle.");
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
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-cream-2 overflow-hidden space-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-cream-2 bg-gradient-to-r from-emerald-50 via-white to-cream/50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-2xs">
              <Calendar className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl font-bold text-green-dark">
                  Initialize Billing Cycle
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Admin Control
                </span>
              </div>
              <p className="text-xs text-muted">
                Start a fresh monthly billing cycle for all homeowners or configure a clean demonstration cycle
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

        {/* Tab Selector */}
        <div className="px-6 pt-4 border-b border-cream-2 bg-cream/20 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("standard")}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              mode === "standard"
                ? "border-green-mid text-green-dark"
                : "border-transparent text-muted hover:text-green-dark"
            }`}
          >
            All Residents (New Cycle)
          </button>
          <button
            type="button"
            onClick={() => setMode("demo_reset")}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              mode === "demo_reset"
                ? "border-green-mid text-green-dark"
                : "border-transparent text-muted hover:text-green-dark"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
            <span>Reset Demo Cycle (Classroom)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {mode === "standard" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">
                    Billing Month (YYYY-MM) *
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs font-bold text-green-dark shadow-2xs focus:border-green-mid focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">
                    Configured Due (PHP) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={amountDue}
                    onChange={(e) => setAmountDue(Number(e.target.value) || DEFAULT_MONTHLY_DUE)}
                    className="w-full mt-1 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs font-bold text-green-dark shadow-2xs focus:border-green-mid focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Cycle Info Banner */}
              <div className="rounded-2xl border border-cream-2 bg-cream/30 p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Target Period:</span>
                  <strong className="text-green-dark font-serif text-sm">
                    {formatBillingPeriod(selectedMonth)}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Fixed Due Date:</span>
                  <strong className="text-slate-800">
                    {new Date(dueDate + "T00:00:00").toLocaleDateString("en-PH", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Initial Status:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    Unpaid (₱0.00 paid)
                  </span>
                </div>
              </div>

              {/* Safety Safeguards Note */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  Duplicate Prevention & Carried Credit Safeguards
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-800">
                  Residents who already have a record for {formatBillingPeriod(selectedMonth)} will not be duplicated. Confirmed carried credits from past overpayments will be automatically and safely applied without double-counting.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <RotateCcw className="h-4 w-4 text-amber-700" />
                  Controlled Demonstration Reset
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  This explicitly initializes a clean billing cycle for the selected demonstration resident (starts at ₱0.00 paid, {formatPHP(amountDue)} due, Unpaid). All other resident records and historical audit trails remain completely preserved.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">
                    Demonstration Resident Account *
                  </label>
                  <input
                    type="text"
                    value={demoResident}
                    onChange={(e) => setDemoResident(e.target.value)}
                    placeholder="Enter resident username, full name, or email (e.g. axzel)"
                    className="w-full mt-1 rounded-xl border border-cream-2 bg-white px-3.5 py-2 text-xs font-bold text-green-dark shadow-2xs focus:border-green-mid focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">
                      Target Month *
                    </label>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs font-bold text-green-dark shadow-2xs focus:border-green-mid focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">
                      Monthly Due (PHP) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={amountDue}
                      onChange={(e) => setAmountDue(Number(e.target.value) || DEFAULT_MONTHLY_DUE)}
                      className="w-full mt-1 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs font-bold text-green-dark shadow-2xs focus:border-green-mid focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-cream-2 bg-cream/30">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-cream-2 bg-white px-4 py-2.5 text-xs font-semibold text-muted hover:bg-cream transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy}
            className="rounded-xl bg-green-dark px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-green-mid transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy ? "Processing…" : mode === "standard" ? "Initialize Billing Cycle" : "Apply Demo Reset"}
          </button>
        </div>
      </div>
    </div>
  );
}
