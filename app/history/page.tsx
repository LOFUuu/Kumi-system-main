"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  History,
  Calendar,
  CreditCard,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Filter,
  Eye,
  Download,
  ExternalLink,
  X,
  Image as ImageIcon,
  Smartphone,
  Banknote,
  Plus,
  ArrowRight,
  ShieldAlert,
  FileText,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  formatPHP,
  type Transaction,
  type Reservation,
  type DuesRecord,
} from "@/lib/mock-data";

function formatDate(d?: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

type TabType = "all" | "reservations" | "payments" | "dues";

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") || "";
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState(urlQ);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (urlQ) setSearchQuery(urlQ);
  }, [urlQ]);

  const [txns, setTxns] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [dues, setDues] = useState<DuesRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/history&reason=history");
    }
    // Non-residents don't have access to transaction history
    if (!authLoading && user && user.role === "non_resident") {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      api.transactions().catch(() => []),
      api.reservations().catch(() => []),
      api.dues().catch(() => []),
    ]).then(([txnData, resData, duesData]) => {
      setTxns(txnData);
      setReservations(resData);
      setDues(duesData);
      setLoading(false);
    });
  }, [user]);

  // STRICT USER FILTERING: Only show items belonging to THIS logged-in user
  const myReservations = useMemo(() => {
    if (!user) return [];
    return reservations.filter(
      (r) =>
        (r.userEmail && r.userEmail.toLowerCase() === user.email.toLowerCase()) ||
        (r.residentName && r.residentName.toLowerCase() === user.fullName.toLowerCase())
    );
  }, [reservations, user]);

  const myTxns = useMemo(() => {
    if (!user) return [];
    return txns.filter(
      (t) =>
        (t.userEmail && t.userEmail.toLowerCase() === user.email.toLowerCase()) ||
        (t.residentName && t.residentName.toLowerCase() === user.fullName.toLowerCase())
    );
  }, [txns, user]);

  const myDues = useMemo(() => {
    if (!user) return [];
    return dues.filter(
      (d) =>
        (d.residentName && d.residentName.toLowerCase() === user.fullName.toLowerCase())
    );
  }, [dues, user]);

  // Metrics
  const totalPaid = myTxns.reduce((s, t) => s + t.amount, 0);
  const pendingReservations = myReservations.filter((r) => r.status === "pending").length;
  const approvedReservations = myReservations.filter((r) => r.status === "approved").length;
  const receiptsCount = myTxns.filter((t) => Boolean(t.receiptPath)).length +
    myReservations.filter((r) => Boolean(r.receiptPath)).length;

  // Filtered lists
  const filteredReservations = useMemo(() => {
    return myReservations.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchAmenity = r.amenityName.toLowerCase().includes(q);
        const matchRef = r.gcashRef ? r.gcashRef.toLowerCase().includes(q) : false;
        const matchDate = r.date.includes(q);
        if (!matchAmenity && !matchRef && !matchDate) return false;
      }
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [myReservations, searchQuery, statusFilter]);

  const filteredTxns = useMemo(() => {
    return myTxns.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = String(t.id).includes(q);
        const matchType = t.refType.toLowerCase().includes(q);
        const matchRef = t.gcashRef ? t.gcashRef.toLowerCase().includes(q) : false;
        if (!matchId && !matchType && !matchRef) return false;
      }
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    });
  }, [myTxns, searchQuery, statusFilter]);

  const filteredDues = useMemo(() => {
    return myDues.filter((d) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchMonth = d.dueMonth.toLowerCase().includes(q);
        if (!matchMonth) return false;
      }
      if (statusFilter === "approved" && (d.status === "unpaid" || d.status === "delayed")) return false;
      if (statusFilter === "pending" && d.status === "paid") return false;
      return true;
    });
  }, [myDues, searchQuery, statusFilter]);

  if (authLoading || loading) {
    return (
      <div className="section min-h-[60vh] flex items-center justify-center">
        <p className="text-muted text-sm font-semibold animate-pulse">Loading your activity history…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="section">
        <div className="mx-auto max-w-md rounded-2xl border border-cream-2 bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-12 w-12 text-gold" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-green-dark">Sign In Required</h2>
          <p className="mt-2 text-xs text-muted">
            Please log in to view your personal booking and payment history.
          </p>
          <Link href="/login?next=/history" className="btn-gold mt-6 block w-full !py-2.5 text-xs">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream/30 pb-16">
      {/* LIGHTBOX MODAL */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-2xl w-full rounded-2xl bg-white p-4 shadow-2xl overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full pb-3 border-b border-cream-2">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-green-mid" />
                <h3 className="font-serif text-lg font-bold text-green-dark">
                  Payment Receipt Document
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 text-muted hover:bg-cream hover:text-green-dark"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={lightboxUrl}
                  download
                  className="rounded-lg p-2 text-muted hover:bg-cream hover:text-green-dark"
                  title="Download receipt"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setLightboxUrl(null)}
                  className="rounded-lg p-2 text-muted hover:bg-cream"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="my-4 w-full flex-1 overflow-auto flex items-center justify-center bg-cream/30 rounded-xl p-2 max-h-[70vh]">
              {lightboxUrl.endsWith(".pdf") ? (
                <iframe src={lightboxUrl} className="w-full h-[65vh] rounded-lg" title="PDF Receipt" />
              ) : (
                <img
                  src={lightboxUrl}
                  alt="Payment receipt"
                  className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="border-b border-cream-2 bg-gradient-to-br from-green-dark via-green-deep to-green-mid px-6 py-8 text-white shadow-md">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-gold mb-2 backdrop-blur-sm">
                <History className="h-3.5 w-3.5" />
                Personal Activity History
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold">
                My History
              </h1>
              <p className="mt-1 text-sm text-white/80">
                Track all your past amenity reservations, payments, and uploaded receipts.
              </p>
            </div>

            <div className="flex gap-2">
              <Link href="/reservation" className="btn-gold !py-2.5 !px-4 text-xs font-bold shadow-lg flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Book New Amenity
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* KPI SUMMARY CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Total Paid</div>
              <div className="font-serif text-2xl font-bold text-green-dark">{formatPHP(totalPaid)}</div>
              <div className="text-[11px] text-muted">{myTxns.length} payment transaction{myTxns.length === 1 ? "" : "s"}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Bookings</div>
              <div className="font-serif text-2xl font-bold text-green-dark">{myReservations.length}</div>
              <div className="text-[11px] text-muted">{approvedReservations} confirmed · {pendingReservations} pending</div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Dues Records</div>
              <div className="font-serif text-2xl font-bold text-green-dark">{myDues.length}</div>
              <div className="text-[11px] text-muted">Monthly billing cycles</div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Receipts Saved</div>
              <div className="font-serif text-2xl font-bold text-green-dark">{receiptsCount}</div>
              <div className="text-[11px] text-muted">Proof of payments attached</div>
            </div>
          </div>
        </div>

        {/* TABS & SEARCH BAR */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-cream-2 pb-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab("all")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-green-dark text-white shadow-sm"
                  : "bg-white border border-cream-2 text-muted hover:bg-cream"
              }`}
            >
              All Activities ({myReservations.length + myTxns.length})
            </button>
            <button
              onClick={() => setActiveTab("reservations")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "reservations"
                  ? "bg-green-dark text-white shadow-sm"
                  : "bg-white border border-cream-2 text-muted hover:bg-cream"
              }`}
            >
              Reservations ({myReservations.length})
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "payments"
                  ? "bg-green-dark text-white shadow-sm"
                  : "bg-white border border-cream-2 text-muted hover:bg-cream"
              }`}
            >
              Payments ({myTxns.length})
            </button>
            <button
              onClick={() => setActiveTab("dues")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "dues"
                  ? "bg-green-dark text-white shadow-sm"
                  : "bg-white border border-cream-2 text-muted hover:bg-cream"
              }`}
            >
              Monthly Dues ({myDues.length})
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history…"
                className="h-9 w-full rounded-xl border border-cream-2 bg-white pl-8 pr-7 text-xs font-medium placeholder:text-muted/60 focus:border-green-mid focus:outline-none"
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-cream-2 bg-white px-2.5 text-xs font-semibold text-green-dark outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="voided">Voided / Declined</option>
            </select>
          </div>
        </div>

        {/* CONTENT SECTIONS BASED ON ACTIVE TAB */}

        {/* 1. RESERVATIONS LIST */}
        {(activeTab === "all" || activeTab === "reservations") && (
          <div className="rounded-2xl border border-cream-2 bg-white overflow-hidden shadow-sm">
            <div className="flex items-center justify-between bg-cream/40 px-6 py-4 border-b border-cream-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-mid" />
                <h2 className="font-serif text-base font-bold text-green-dark">
                  Amenity Reservation History
                </h2>
              </div>
              <span className="text-xs font-semibold text-muted">
                {filteredReservations.length} record{filteredReservations.length === 1 ? "" : "s"}
              </span>
            </div>

            {filteredReservations.length === 0 ? (
              <div className="p-8 text-center text-muted text-xs">
                No reservation records match your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-cream-2 bg-cream/20 text-[11px] font-bold uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-5 py-3.5">Amenity</th>
                      <th className="px-5 py-3.5">Booking Date</th>
                      <th className="px-5 py-3.5">Session / Pax</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Downpayment</th>
                      <th className="px-5 py-3.5">Proof of Payment</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-2">
                    {filteredReservations.map((r) => (
                      <tr key={r.id} className="hover:bg-cream/20 transition">
                        <td className="px-5 py-4 font-bold text-green-dark whitespace-nowrap">
                          {r.amenityName}
                        </td>
                        <td className="px-5 py-4 font-semibold text-green-deep whitespace-nowrap">
                          {formatDate(r.date)}
                        </td>
                        <td className="px-5 py-4 text-muted whitespace-nowrap capitalize">
                          {r.bookingType} session · {r.paxCount} pax
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`badge ${r.reservationType === "private" ? "badge-gold" : "badge-green"}`}>
                            {r.reservationType}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-green-mid whitespace-nowrap">
                          {formatPHP(r.downpayment)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {r.receiptPath ? (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(r.receiptPath!)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              <ImageIcon className="h-3 w-3" /> View Receipt
                            </button>
                          ) : r.gcashRef ? (
                            <span className="font-mono text-[11px] text-muted font-semibold">
                              Ref: {r.gcashRef}
                            </span>
                          ) : (
                            <span className="text-muted/60">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              r.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : r.status === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {r.status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                            {r.status === "pending" && <Clock className="h-3 w-3" />}
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. PAYMENT TRANSACTIONS LIST */}
        {(activeTab === "all" || activeTab === "payments") && (
          <div className="rounded-2xl border border-cream-2 bg-white overflow-hidden shadow-sm">
            <div className="flex items-center justify-between bg-cream/40 px-6 py-4 border-b border-cream-2">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-green-mid" />
                <h2 className="font-serif text-base font-bold text-green-dark">
                  Payment Transactions &amp; Receipts
                </h2>
              </div>
              <span className="text-xs font-semibold text-muted">
                {filteredTxns.length} transaction{filteredTxns.length === 1 ? "" : "s"}
              </span>
            </div>

            {filteredTxns.length === 0 ? (
              <div className="p-8 text-center text-muted text-xs">
                No payment transaction records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-cream-2 bg-cream/20 text-[11px] font-bold uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-5 py-3.5">Transaction ID</th>
                      <th className="px-5 py-3.5">Payment For</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Method</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Receipt Attachment</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-2">
                    {filteredTxns.map((t) => (
                      <tr key={t.id} className="hover:bg-cream/20 transition">
                        <td className="px-5 py-4 text-muted font-mono font-semibold whitespace-nowrap">
                          #{t.id}
                        </td>
                        <td className="px-5 py-4 font-bold text-green-dark capitalize whitespace-nowrap">
                          {t.refType} Payment
                        </td>
                        <td className="px-5 py-4 text-muted whitespace-nowrap">
                          {formatDate(t.createdAt)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 uppercase">
                            {t.paymentMethod === "gcash" ? <Smartphone className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                            {t.paymentMethod}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-black text-green-mid whitespace-nowrap text-sm">
                          {formatPHP(t.amount)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {t.receiptPath ? (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(t.receiptPath!)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              <ImageIcon className="h-3 w-3" /> View Receipt
                            </button>
                          ) : t.gcashRef ? (
                            <span className="font-mono text-[11px] text-muted">Ref: {t.gcashRef}</span>
                          ) : (
                            <span className="text-muted/60">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              t.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : t.status === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {t.status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                            {t.status === "pending" && <Clock className="h-3 w-3" />}
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. DUES LIST */}
        {(activeTab === "all" || activeTab === "dues") && (
          <div className="rounded-2xl border border-cream-2 bg-white overflow-hidden shadow-sm">
            <div className="flex items-center justify-between bg-cream/40 px-6 py-4 border-b border-cream-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-mid" />
                <h2 className="font-serif text-base font-bold text-green-dark">
                  Monthly Homeownership Dues History
                </h2>
              </div>
              <Link href="/my-dues" className="text-xs font-bold text-green-mid hover:underline">
                Pay / Manage Dues →
              </Link>
            </div>

            {filteredDues.length === 0 ? (
              <div className="p-8 text-center text-muted text-xs">
                No monthly dues records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-cream-2 bg-cream/20 text-[11px] font-bold uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-5 py-3.5">Billing Month</th>
                      <th className="px-5 py-3.5">Block / Lot</th>
                      <th className="px-5 py-3.5">Due Date</th>
                      <th className="px-5 py-3.5">Amount Due</th>
                      <th className="px-5 py-3.5">Amount Paid</th>
                      <th className="px-5 py-3.5">Credit Balance</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-2">
                    {filteredDues.map((d) => (
                      <tr key={d.id} className="hover:bg-cream/20 transition">
                        <td className="px-5 py-4 font-bold text-green-dark whitespace-nowrap">
                          {d.dueMonth}
                        </td>
                        <td className="px-5 py-4 text-muted whitespace-nowrap">
                          {d.blockNo} / {d.lotNo}
                        </td>
                        <td className="px-5 py-4 text-muted whitespace-nowrap">
                          {d.dueDate}
                        </td>
                        <td className="px-5 py-4 font-semibold text-green-deep whitespace-nowrap">
                          {formatPHP(d.amountDue)}
                        </td>
                        <td className="px-5 py-4 font-bold text-green-mid whitespace-nowrap">
                          {formatPHP(d.amountPaid)}
                        </td>
                        <td className="px-5 py-4 text-gold-muted font-semibold whitespace-nowrap">
                          {formatPHP(d.creditBalance || 0)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`badge ${
                              d.status === "paid" || d.status === "on_time"
                                ? "badge-green"
                                : d.status === "unpaid"
                                ? "badge-danger"
                                : "badge-gold"
                            }`}
                          >
                            {d.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="section min-h-[60vh] flex items-center justify-center">
          <p className="text-muted text-sm font-semibold animate-pulse">Loading activity history…</p>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
