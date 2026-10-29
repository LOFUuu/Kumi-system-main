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
  getDetailedDuesStatus,
  type DetailedDuesStatus,
} from "@/lib/dues";
import { formatPHP, type DuesRecord, type PaymentConfig, type Transaction } from "@/lib/mock-data";
import QRCode from "react-qr-code";
import { buildPlaceholderQR, HOAGCashNumber } from "@/lib/payment";
import { sanitizeReferenceInput, validateReferenceNumber, validateAmount } from "@/lib/validation";
import StatementOfAccountModal from "@/components/StatementOfAccountModal";
import DuesDetailModal from "@/components/DuesDetailModal";
import AdvancePaymentModal from "@/components/AdvancePaymentModal";
import CreditDetailsModal from "@/components/CreditDetailsModal";
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
  AlertTriangle,
  Clock,
  History,
  Coins,
  Building,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Eye,
  Search,
} from "lucide-react";

export default function MyDuesPage() {
  const { user } = useAuth();
  const [dues, setDues] = useState<DuesRecord[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DuesRecord | null>(null);
  const [payId, setPayId] = useState<DuesRecord | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"gcash">("gcash");
  const [gcashConfig, setGcashConfig] = useState<PaymentConfig | null>(null);
  const [soaOpen, setSoaOpen] = useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  useEffect(() => {
    api.paymentConfig("dues").then(setGcashConfig).catch(() => {});
  }, []);
  const [gcashRef, setGcashRef] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [modalStep, setModalStep] = useState<"form" | "review" | "success">("form");

  const load = () => {
    api.dues().then(setDues).catch(() => setDues([]));
    api.transactions({ refType: "dues" }).then(setTxns).catch(() => setTxns([]));
  };
  useEffect(() => {
    load();
  }, []);

  const myDues = useMemo(() => {
    const rawName = user?.fullName?.trim().toLowerCase() || "";
    const userIdStr = user?.id != null ? String(user.id).trim() : "";
    const userBlock = user?.blockNo ? String(user.blockNo).trim().toLowerCase() : "";
    const userLot = user?.lotNo ? String(user.lotNo).trim().toLowerCase() : "";

    return dues
      .filter((d) => {
        const idMatch = userIdStr && d.residentId != null && String(d.residentId).trim() === userIdStr;
        const nameMatch = rawName && d.residentName && d.residentName.trim().toLowerCase() === rawName;
        const blockLotMatch =
          userBlock &&
          userLot &&
          d.blockNo &&
          d.lotNo &&
          String(d.blockNo).trim().toLowerCase() === userBlock &&
          String(d.lotNo).trim().toLowerCase() === userLot;
        return idMatch || nameMatch || blockLotMatch;
      })
      .sort((a, b) => b.dueMonth.localeCompare(a.dueMonth));
  }, [dues, user?.fullName, user?.id, user?.blockNo, user?.lotNo]);

  // Map user transactions for dues
  const userTxns = useMemo(() => {
    if (!user) return [];
    const userEmail = (user.email || "").toLowerCase().trim();
    const userName = (user.fullName || "").toLowerCase().trim();
    return txns.filter(
      (t) =>
        (t.userEmail && t.userEmail.toLowerCase().trim() === userEmail) ||
        (t.residentName && t.residentName.toLowerCase().trim() === userName)
    );
  }, [txns, user]);

  const txnsByDueId = useMemo(() => {
    const map = new Map<number, Transaction[]>();
    userTxns.forEach((t) => {
      if (t.refId) {
        const list = map.get(t.refId) || [];
        list.push(t);
        map.set(t.refId, list);
      }
    });
    return map;
  }, [userTxns]);

  const currentMonth = getCurrentDueMonth();
  const currentRecord = myDues.find(
    (d) => (d.dueMonth || "").slice(0, 7) === currentMonth.slice(0, 7)
  );

  const paid = myDues.reduce((s, d) => s + d.amountPaid, 0);
  const outstanding = myDues.reduce((s, d) => s + outstandingFor(d), 0);
  const credit = myDues.reduce((s, d) => s + creditFor(d.amountDue, d.amountPaid), 0);
  const fullyPaidPeriodsCount = myDues.filter((d) => d.amountPaid >= d.amountDue).length;
  const outstandingPeriodsCount = myDues.filter((d) => outstandingFor(d) > 0).length;

  const latestPaymentRecord = useMemo(() => {
    const withPaid = myDues.filter((d) => d.amountPaid > 0 && d.paidAt);
    if (withPaid.length === 0) return null;
    return withPaid.reduce((latest, curr) => {
      if (!latest.paidAt) return curr;
      if (!curr.paidAt) return latest;
      return curr.paidAt.localeCompare(latest.paidAt) > 0 ? curr : latest;
    });
  }, [myDues]);

  const latestPaymentFormatted = latestPaymentRecord?.paidAt
    ? new Date(latestPaymentRecord.paidAt + "T00:00:00").toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const filteredDues = useMemo(() => {
    return myDues.filter((d) => {
      const hasPendingTxn = txnsByDueId.get(d.id)?.some((t) => t.status === "pending");
      const st = getDetailedDuesStatus(d, { hasPendingTxn });

      // 1. Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "paid" && !st.isPaid) return false;
        if (statusFilter === "unpaid" && st.paymentStatus !== "unpaid") return false;
        if (
          statusFilter === "delayed" &&
          !(
            st.daysLate > 0 ||
            st.isOverdue ||
            st.paymentStatus === "partial" ||
            (st.remainingBalance > 0 && st.daysOverdue > 0)
          )
        ) {
          return false;
        }
        if (
          statusFilter === "advance" &&
          !(
            st.paymentStatus === "advance" ||
            st.credit > 0 ||
            (d.appliedCredit && d.appliedCredit > 0) ||
            d.source === "advance_payment"
          )
        ) {
          return false;
        }
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        const monthMatch = d.dueMonth ? d.dueMonth.toLowerCase().includes(term) : false;
        const periodMatch = formatBillingPeriod(d.dueMonth).toLowerCase().includes(term);
        const blockMatch = d.blockNo ? d.blockNo.toLowerCase().includes(term) : false;
        const lotMatch = d.lotNo ? d.lotNo.toLowerCase().includes(term) : false;
        const paidAtMatch = d.paidAt ? d.paidAt.includes(term) : false;
        const paymentStatusMatch = st.paymentStatusLabel.toLowerCase().includes(term);
        const balanceStatusMatch = st.balanceStatusLabel.toLowerCase().includes(term);
        const linkedTxns = txnsByDueId.get(d.id) || [];
        const refMatch = linkedTxns.some((t) => t.gcashRef && t.gcashRef.toLowerCase().includes(term));

        return (
          monthMatch ||
          periodMatch ||
          blockMatch ||
          lotMatch ||
          paidAtMatch ||
          paymentStatusMatch ||
          balanceStatusMatch ||
          refMatch
        );
      }

      return true;
    });
  }, [myDues, statusFilter, searchQuery, txnsByDueId]);

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
    const amtErr = validateAmount(amount, { required: true, label: "Payment amount", min: 1 });
    if (amtErr) {
      setMsg(amtErr);
      return;
    }
    const refErr = validateReferenceNumber(gcashRef, { required: true, label: "GCash Reference Number" });
    if (refErr) {
      setMsg(refErr);
      return;
    }
    if (!receiptFile) {
      setMsg("Please attach a screenshot of your payment receipt (proof of payment).");
      return;
    }
    setMsg("");
    setModalStep("review");
  };

  /** Step 2: User clicks "Confirm & Submit Payment" on the review step */
  const confirmPaymentSubmission = async () => {
    if (!payId || busy) return;
    const refErr = validateReferenceNumber(gcashRef, { required: true, label: "GCash Reference Number" });
    if (refErr) {
      setMsg(refErr);
      return;
    }
    if (!receiptFile) {
      setMsg("Please attach a screenshot of your payment receipt (proof of payment).");
      return;
    }
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

  // ── Access Guard ──────────────────────────────────────────────────────────
  // Unauthenticated users and non-residents (pending verification) should not
  // have unrestricted access to this page. Show a restricted-access screen
  // instead of the full dues ledger.
  if (!user) {
    return (
      <div className="section flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full rounded-2xl border border-cream-2 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500 mb-4" />
          <h2 className="font-serif text-2xl font-bold text-green-dark">Login Required</h2>
          <p className="mt-2 text-sm text-muted">
            Please log in to view your monthly dues.
          </p>
          <a href="/login" className="btn-green mt-6 inline-flex w-full justify-center">
            Go to Log In
          </a>
        </div>
      </div>
    );
  }

  if (user.role === "non_resident") {
    return (
      <div className="section flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500 mb-4" />
          <h2 className="font-serif text-2xl font-bold text-amber-900">Account Pending Verification</h2>
          <p className="mt-2 text-sm text-amber-800 leading-relaxed">
            Your account is currently awaiting resident verification by the HOA administrator.
            Once your residency details are verified, you will gain access to your monthly dues ledger.
          </p>
          <p className="mt-3 text-xs text-amber-700">
            If you believe this is an error, please contact the HOA office.
          </p>
          <a href="/" className="btn-green mt-6 inline-flex w-full justify-center">
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="section">


      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold text-green-dark">Monthly Homeownership Dues</h1>
          <p className="mt-1 text-sm text-muted">
            Track your fixed ₱100 monthly HOA dues. For amenity reservation payments and complete transaction receipts, view <a href="/history" className="font-semibold text-green-mid underline">History</a>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setAdvanceModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-green-dark text-white px-4 py-2.5 shadow-sm text-xs font-bold hover:bg-green-mid hover:scale-105 transition cursor-pointer"
          >
            <CalendarDays className="h-4 w-4 text-emerald-300" />
            <span>Make an Advance Payment</span>
          </button>

          <button
            type="button"
            onClick={() => setSoaOpen(true)}
            className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50/80 px-4 py-2.5 shadow-sm text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition cursor-pointer"
          >
            <FileText className="h-4 w-4 text-emerald-700" />
            <span>View Statement of Account (SOA)</span>
          </button>

          {user?.blockNo && user?.lotNo && (
            <div className="flex items-center gap-2 rounded-2xl border border-cream-2 bg-white px-4 py-2.5 shadow-sm text-xs text-green-dark">
              <Building className="h-4 w-4 text-green-mid" />
              <span>
                Block <strong>{user.blockNo}</strong> / Lot <strong>{user.lotNo}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Hero Current Month Banner */}
      {currentRecord && (
        <div className="mb-8 rounded-3xl border border-green-light/40 bg-gradient-to-r from-green-dark via-green-mid to-green-deep p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                <CalendarDays className="h-3.5 w-3.5 text-white/80" />
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

            <div className="flex flex-wrap items-center gap-3">
              {currentRecord.amountPaid >= currentRecord.amountDue ? (
                <>
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 px-5 py-3 text-emerald-100 backdrop-blur-sm">
                    <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                    <div>
                      <div className="text-sm font-bold">Fully Paid</div>
                      <div className="text-[11px] text-emerald-200">
                        Paid: {formatPHP(currentRecord.amountPaid)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdvanceModalOpen(true)}
                    className="btn-gold !px-5 !py-3 text-xs font-bold shadow-lg hover:scale-105 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <CalendarDays className="h-4 w-4" />
                    <span>Pay Next Cycle in Advance →</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => openPay(currentRecord)}
                    className="btn-gold !px-6 !py-3 text-sm font-bold shadow-lg hover:scale-105 transition cursor-pointer"
                  >
                    Pay {formatBillingPeriod(currentRecord.dueMonth)} Due →
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvanceModalOpen(true)}
                    className="rounded-2xl border border-white/30 bg-white/10 hover:bg-white/20 text-white px-4 py-3 text-xs font-bold backdrop-blur-sm transition cursor-pointer flex items-center gap-1.5"
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-white/90" />
                    <span>Advance Options</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        {/* Card 1: Total Paid */}
        <div className="card flex items-start gap-4 p-5 rounded-2xl border border-cream-2 bg-white shadow-2xs hover:shadow-xs transition">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-700 shrink-0 shadow-2xs">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Paid (All Time)
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-green-dark mt-0.5">
              {formatPHP(paid)}
            </div>
            <div className="mt-1 flex flex-col gap-0.5 text-xs">
              <span className="font-medium text-slate-700">
                {fullyPaidPeriodsCount} of {myDues.length} billing {myDues.length === 1 ? "period" : "periods"} settled
              </span>
              <span className="text-[11px] text-muted">
                {latestPaymentFormatted ? `Latest payment: ${latestPaymentFormatted}` : "No payment history yet"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Outstanding Balance */}
        <div className={`card flex items-start gap-4 p-5 rounded-2xl border shadow-2xs hover:shadow-xs transition ${
          outstanding > 0 ? "border-rose-200/90 bg-rose-50/20" : "border-cream-2 bg-white"
        }`}>
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 shadow-2xs ${
            outstanding > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100/70 text-emerald-700"
          }`}>
            {outstanding > 0 ? <AlertCircle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className={`text-[11px] font-bold uppercase tracking-wider ${
              outstanding > 0 ? "text-rose-700" : "text-muted"
            }`}>
              Outstanding Balance
            </div>
            <div className={`font-serif text-2xl sm:text-3xl font-bold mt-0.5 ${
              outstanding > 0 ? "text-rose-600" : "text-green-dark"
            }`}>
              {formatPHP(outstanding)}
            </div>
            <div className="mt-1 flex flex-col gap-0.5 text-xs">
              <span className={`font-medium ${outstanding > 0 ? "text-rose-700 font-bold" : "text-slate-700"}`}>
                {outstandingPeriodsCount > 0
                  ? `${outstandingPeriodsCount} billing ${outstandingPeriodsCount === 1 ? "period" : "periods"} with balance`
                  : "All dues settled on time"}
              </span>
              <span className="text-[11px] text-muted">
                {outstanding > 0 ? "Action required • Settle via GCash" : "Zero outstanding balance"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Carried Credit */}
        <div className="card flex items-start gap-4 p-5 rounded-2xl border border-cream-2 bg-white shadow-2xs hover:shadow-xs transition">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100/80 text-sky-700 shrink-0 shadow-2xs">
            <Coins className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Carried Credit
              </div>
              <button
                type="button"
                onClick={() => setCreditModalOpen(true)}
                className="inline-flex items-center gap-0.5 text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer transition"
              >
                <span>View Details</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-sky-700 mt-0.5">
              {formatPHP(credit)}
            </div>
            <div className="mt-1 flex flex-col gap-0.5 text-xs">
              <span className="font-medium text-slate-700">
                {credit > 0 ? "Advance credit buffer available" : "No excess credit carried"}
              </span>
              <span className="text-[11px] text-muted">
                {credit > 0 ? "Will automatically apply to next cycle" : "Applied automatically to upcoming dues"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Payment & Dues History */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-xl font-bold text-green-dark flex items-center gap-2">
              <History className="h-5 w-5 text-green-mid" />
              Complete Payment & Dues History
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Click &quot;View Details&quot; on any billing period to inspect full payment timeline, receipts, and breakdown.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search month, status, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-cream-2 bg-white pl-8 pr-7 text-xs font-medium placeholder:text-muted/60 focus:border-green-mid focus:outline-none shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-green-dark"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 rounded-xl border border-cream-2 bg-white p-1 text-xs shadow-2xs">
              {[
                { id: "all", label: "All" },
                { id: "paid", label: "Paid" },
                { id: "unpaid", label: "Unpaid" },
                { id: "delayed", label: "Overdue / Partial" },
                { id: "advance", label: "Advance Payments" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`rounded-lg px-3 py-1 font-semibold transition cursor-pointer ${
                    statusFilter === st.id
                      ? "bg-green-mid text-white shadow-2xs"
                      : "text-muted hover:text-green-dark hover:bg-cream"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-cream-2 bg-white shadow-2xs">
          <table className="w-full text-sm text-left">
            <thead className="bg-cream/80 text-[11px] uppercase tracking-wider text-muted border-b border-cream-2">
              <tr>
                <th className="p-4 font-bold">Billing Month</th>
                <th className="p-4 font-bold">Due Date</th>
                <th className="p-4 font-bold">Due Amount</th>
                <th className="p-4 font-bold">Paid Amount</th>
                <th className="p-4 font-bold">Credit</th>
                <th className="p-4 font-bold">Payment Date</th>
                <th className="p-4 font-bold">Payment Status</th>
                <th className="p-4 font-bold">Balance Status</th>
                <th className="p-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-2">
              {filteredDues.map((d) => {
                const hasPendingTxn = txnsByDueId.get(d.id)?.some((t) => t.status === "pending");
                const st = getDetailedDuesStatus(d, { hasPendingTxn });

                return (
                  <tr key={d.id} className="hover:bg-cream/30 transition">
                    <td className="p-4 font-bold text-green-dark whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-green-mid/70 shrink-0" />
                        <span>{formatBillingPeriod(d.dueMonth)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-muted whitespace-nowrap">
                      {st.formattedDueDate}
                    </td>
                    <td className="p-4 font-bold text-green-dark whitespace-nowrap">
                      {formatPHP(d.amountDue)}
                    </td>
                    <td className="p-4 font-bold text-emerald-700 whitespace-nowrap">
                      {formatPHP(d.amountPaid)}
                    </td>
                    <td className="p-4 text-xs whitespace-nowrap">
                      {st.credit > 0 ? (
                        <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/80">
                          +{formatPHP(st.credit)}
                        </span>
                      ) : (
                        <span className="text-muted font-medium">₱0.00</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-muted whitespace-nowrap">
                      {st.formattedPaidDate}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${st.paymentBadgeClass}`}
                      >
                        {st.paymentStatus === "paid_on_time" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                        {st.paymentStatus === "paid_late" && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                        {st.paymentStatus === "advance" && <CalendarDays className="h-3.5 w-3.5 text-indigo-600" />}
                        {st.paymentStatus === "partial" && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                        {st.paymentStatus === "unpaid" && <AlertCircle className="h-3.5 w-3.5 text-rose-600" />}
                        {st.paymentStatus === "pending_verification" && <Clock className="h-3.5 w-3.5 text-sky-600" />}
                        <span>{st.paymentStatusLabel}</span>
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${st.balanceBadgeClass}`}
                      >
                        {st.isFullySettled ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Coins className="h-3.5 w-3.5 text-rose-600" />
                        )}
                        <span>{st.balanceStatusLabel}</span>
                      </span>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(d)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3 py-1.5 text-xs font-bold text-green-dark hover:bg-cream hover:border-green-mid/40 shadow-2xs transition cursor-pointer"
                          title="View complete billing & payment details"
                        >
                          <Eye className="h-3.5 w-3.5 text-green-mid" />
                          <span>View Details</span>
                        </button>

                        {st.remainingBalance > 0 && (
                          <button
                            type="button"
                            onClick={() => openPay(d)}
                            className="btn-gold !px-3 !py-1.5 text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1 hover:scale-105 transition"
                          >
                            <span>Pay Now</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDues.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-muted text-sm">
                    <AlertCircle className="mx-auto h-8 w-8 text-muted/60 mb-2" />
                    <p className="font-bold text-green-dark">No billing records found</p>
                    <p className="text-xs text-muted mt-0.5">
                      {searchQuery
                        ? `No results matching "${searchQuery}". Try a different keyword.`
                        : "There are currently no dues records under your account."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Dues Modal */}
      {payId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-xs">
          <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* ════════════════════════════════════════════════════════ */}
            {/* MODAL STEP 1: PAYMENT INPUT FORM                         */}
            {/* ════════════════════════════════════════════════════════ */}
            {modalStep === "form" && (
              <form onSubmit={handleProceedToReview} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 pb-3 border-b border-cream-2 shrink-0">
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
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="rounded-xl bg-cream/40 p-3 text-xs text-muted border border-cream-2">
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

                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-center">
                    <div className="mx-auto w-fit rounded-xl bg-white p-2.5 shadow-xs mb-2.5">
                      {gcashConfig?.qrCodeUrl ? (
                        <img
                          src={gcashConfig.qrCodeUrl}
                          alt="GCash QR Code"
                          className="h-28 w-28 object-contain mx-auto rounded-md"
                        />
                      ) : (
                        <QRCode
                          value={buildPlaceholderQR(amount || 100, gcashConfig?.accountNumber || HOAGCashNumber)}
                          size={112}
                        />
                      )}
                    </div>
                    <div className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                      {gcashConfig?.accountName || "MABUHAY HOMES HOA GCASH"}
                    </div>
                    <div className="font-mono text-base font-bold text-blue-600 mt-0.5">
                      {gcashConfig?.accountNumber || "0917 123 4567"}
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      {gcashConfig?.instructions || "Official HOA Monthly Dues Account · Scan or send payment"}
                    </p>
                  </div>

                  <div>
                    <label className="field-label">GCash Reference Number</label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        className="field pl-9"
                        value={gcashRef}
                        onChange={(e) => setGcashRef(sanitizeReferenceInput(e.target.value))}
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
                </div>

                <div className="p-4 pt-3 border-t border-cream-2 bg-cream/20 shrink-0 flex gap-3">
                  <button
                    type="submit"
                    className="btn-green flex-1 !py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Submit Payment <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayId(null)}
                    className="btn-ghost flex-1 !py-2.5 text-sm cursor-pointer"
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
              <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 pb-3 border-b border-cream-2 shrink-0">
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
                    className="rounded-full p-1 text-muted hover:bg-cream cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                      <div className="col-span-2 rounded-lg bg-white p-2.5 border border-cream-2 space-y-1">
                        <span className="text-muted block text-[10px] font-bold">
                          GCash Reference Number <span className="text-rose-500">*</span>
                        </span>
                        <input
                          type="text"
                          className="w-full rounded-lg border border-cream-2 bg-cream/30 px-2.5 py-1.5 font-mono text-xs font-bold text-green-dark outline-none focus:border-green-mid"
                          value={gcashRef}
                          onChange={(e) => {
                            setGcashRef(sanitizeReferenceInput(e.target.value));
                            if (msg) setMsg("");
                          }}
                          placeholder="e.g. 1002 9384 7561"
                        />
                      </div>
                    </div>

                    {/* Receipt Preview & Direct Upload on Review Step */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-green-dark">
                          Proof of Payment <span className="text-rose-500">*</span>
                        </span>
                        {receiptPreview && (
                          <label className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
                            <Upload className="h-3 w-3" /> Change Receipt
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={handleReceiptChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
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
                        <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-center cursor-pointer hover:bg-amber-100/50 transition">
                          <Upload className="h-4 w-4 text-amber-700" />
                          <span className="text-xs font-bold text-amber-900 mt-1">Upload Receipt Screenshot</span>
                          <span className="text-[10px] text-amber-700">Proof of payment is required</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleReceiptChange}
                            className="hidden"
                          />
                        </label>
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
                </div>

                {/* Confirmation Actions */}
                <div className="p-4 pt-3 border-t border-cream-2 bg-cream/20 shrink-0 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalStep("form")}
                    disabled={busy}
                    className="btn-ghost flex-1 !py-2.5 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> ← Back & Edit
                  </button>
                  <button
                    type="button"
                    onClick={confirmPaymentSubmission}
                    disabled={busy}
                    className="btn-green flex-1 !py-2.5 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
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
              <div className="p-6 space-y-4 text-center overflow-y-auto">
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
                  className="btn-green w-full !py-2.5 text-sm font-bold mt-2 cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Details Modal */}
      <DuesDetailModal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        statusDetails={
          selectedRecord
            ? getDetailedDuesStatus(selectedRecord, {
                hasPendingTxn: txnsByDueId.get(selectedRecord.id)?.some((t) => t.status === "pending"),
              })
            : null
        }
        transactions={selectedRecord ? txnsByDueId.get(selectedRecord.id) || [] : []}
        onPayClick={(rec) => openPay(rec)}
        user={user}
      />

      {/* Statement of Account Modal */}
      <StatementOfAccountModal
        isOpen={soaOpen}
        onClose={() => setSoaOpen(false)}
        residentName={user?.fullName || "Resident"}
        residentId={user?.id}
        blockNo={user?.blockNo}
        lotNo={user?.lotNo}
        email={user?.email}
        phone={user?.phone}
        dues={myDues}
      />

      {/* Advance Payment Modal */}
      <AdvancePaymentModal
        isOpen={advanceModalOpen}
        onClose={() => setAdvanceModalOpen(false)}
        onSuccess={() => {
          load();
        }}
        currentOutstanding={outstanding}
        currentBillingPeriod={currentRecord?.dueMonth || currentMonth}
        configuredMonthlyDue={gcashConfig?.monthlyDue || DEFAULT_MONTHLY_DUE}
        existingCredit={credit}
        user={user}
        gcashConfig={gcashConfig}
        currentRecord={currentRecord}
      />

      {/* Carried Credit Ledger & Audit Modal */}
      <CreditDetailsModal
        isOpen={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        availableCredit={credit}
        appliedCredit={currentRecord?.appliedCredit || 0}
        remainingCredit={credit}
        currentBillingPeriod={currentRecord?.dueMonth}
        dues={myDues}
        transactions={userTxns}
        residentName={user?.fullName}
      />
    </div>
  );
}

