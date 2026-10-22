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
  AlertTriangle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  formatPHP,
  getCancellationEligibility,
  type Transaction,
  type Reservation,
  type DuesRecord,
  type PropertyViewing,
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

const HISTORY_CACHE_KEY = "mh_history_cache";

function getCachedHistory() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(HISTORY_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCachedHistory(data: {
  txns?: Transaction[];
  reservations?: Reservation[];
  viewings?: PropertyViewing[];
  dues?: DuesRecord[];
}) {
  if (typeof window === "undefined") return;
  try {
    const existing = getCachedHistory() || {};
    sessionStorage.setItem(
      HISTORY_CACHE_KEY,
      JSON.stringify({ ...existing, ...data, timestamp: Date.now() })
    );
  } catch {}
}

type TabType = "all" | "reservations" | "viewings" | "payments" | "dues";

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") || "";
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState(urlQ);
  const [statusFilter, setStatusFilter] = useState("all");

  const isNonResident = user?.role === "non_resident";

  useEffect(() => {
    if (urlQ) setSearchQuery(urlQ);
  }, [urlQ]);

  // Instant hydration from cache for sub-50ms page appearance
  const cached = useMemo(() => getCachedHistory(), []);
  const [txns, setTxns] = useState<Transaction[]>(() => cached?.txns || []);
  const [reservations, setReservations] = useState<Reservation[]>(() => cached?.reservations || []);
  const [viewings, setViewings] = useState<PropertyViewing[]>(() => cached?.viewings || []);
  const [dues, setDues] = useState<DuesRecord[]>(() => cached?.dues || []);
  const [loading, setLoading] = useState(() => !cached);

  // Cancellation Modal State
  const [cancelTarget, setCancelTarget] = useState<{
    type: "reservation" | "viewing";
    id: number;
    title: string;
    scheduleStr: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      // Double check localStorage before redirecting to prevent accidental logout on reload
      const stored = typeof window !== "undefined" ? localStorage.getItem("mh_user") : null;
      if (!stored) {
        router.replace("/login?next=/history&reason=history");
      }
    }
  }, [authLoading, user, router]);

  const loadData = () => {
    if (!user) return;
    const isNonRes = user.role === "non_resident";

    // Fetch endpoints in parallel and stream results into state as soon as each arrives
    api.transactions()
      .then((txnData) => {
        setTxns(txnData);
        saveCachedHistory({ txns: txnData });
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    api.reservations()
      .then((resData) => {
        setReservations(resData);
        saveCachedHistory({ reservations: resData });
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    api.myViewings()
      .then((viewingData) => {
        setViewings(viewingData);
        saveCachedHistory({ viewings: viewingData });
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    if (!isNonRes) {
      api.dues()
        .then((duesData) => {
          setDues(duesData);
          saveCachedHistory({ dues: duesData });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, user?.email, user?.role]);

  // STRICT USER FILTERING: Only show items belonging to THIS logged-in user
  const myReservations = useMemo(() => {
    if (!user) return [];
    const userEmail = (user.email || "").toLowerCase().trim();
    const userName = (user.fullName || "").toLowerCase().trim();
    return reservations.filter(
      (r) =>
        (r.userEmail && r.userEmail.toLowerCase().trim() === userEmail) ||
        (r.residentName && r.residentName.toLowerCase().trim() === userName)
    );
  }, [reservations, user]);

  const myViewings = useMemo(() => {
    if (!user) return [];
    const userEmail = (user.email || "").toLowerCase().trim();
    const userName = (user.fullName || "").toLowerCase().trim();
    return viewings.filter(
      (v) =>
        (v.residentEmail && v.residentEmail.toLowerCase().trim() === userEmail) ||
        (v.residentName && v.residentName.toLowerCase().trim() === userName)
    );
  }, [viewings, user]);

  const myTxns = useMemo(() => {
    if (!user) return [];
    const userEmail = (user.email || "").toLowerCase().trim();
    const userName = (user.fullName || "").toLowerCase().trim();
    return txns.filter((t) => {
      const matchesUser =
        (t.userEmail && t.userEmail.toLowerCase().trim() === userEmail) ||
        (t.residentName && t.residentName.toLowerCase().trim() === userName);
      if (!matchesUser) return false;
      // Non-residents only see eligible payments (no dues records)
      if (isNonResident && t.refType === "dues") return false;
      return true;
    });
  }, [txns, user, isNonResident]);

  const myDues = useMemo(() => {
    if (!user || isNonResident) return [];
    const userName = (user.fullName || "").toLowerCase().trim();
    return dues.filter(
      (d) =>
        d.residentName && d.residentName.toLowerCase().trim() === userName
    );
  }, [dues, user, isNonResident]);

  // Metrics
  const totalPaid = myTxns.reduce((s, t) => s + t.amount, 0);
  const pendingReservations = myReservations.filter((r) => r.status === "pending").length;
  const approvedReservations = myReservations.filter((r) => r.status === "approved").length;
  const receiptsCount = myTxns.filter((t) => Boolean(t.receiptPath)).length +
    myReservations.filter((r) => Boolean(r.receiptPath)).length;
  const totalActivitiesCount =
    myReservations.length + myViewings.length + myTxns.length + (isNonResident ? 0 : myDues.length);

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

  const filteredViewings = useMemo(() => {
    return myViewings.filter((v) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchHouse = ((v.listingName || v.houseName || "")).toLowerCase().includes(q);
        const matchDate = (v.preferredDate || "").includes(q) || (v.scheduledAt || "").includes(q);
        if (!matchHouse && !matchDate) return false;
      }
      if (statusFilter !== "all") {
        if (statusFilter === "approved" && v.status !== "viewing_scheduled" && v.status !== "viewing_completed") return false;
        if (statusFilter === "pending" && v.status !== "viewing_requested") return false;
        if (statusFilter === "voided" && v.status !== "viewing_declined" && v.status !== "viewing_cancelled" && v.status !== "cancelled") return false;
      }
      return true;
    });
  }, [myViewings, searchQuery, statusFilter]);

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      if (cancelTarget.type === "reservation") {
        await api.cancelReservation(cancelTarget.id, cancelReason);
        setCancelFeedback({
          type: "success",
          message: `Reservation for "${cancelTarget.title}" was cancelled successfully. Reserved slot has been released.`,
        });
      } else {
        await api.cancelViewing(cancelTarget.id, cancelReason);
        setCancelFeedback({
          type: "success",
          message: `Property viewing for "${cancelTarget.title}" was cancelled successfully.`,
        });
      }
      setCancelTarget(null);
      setCancelReason("");
      loadData();
      setTimeout(() => setCancelFeedback(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  const hasLocalSession = typeof window !== "undefined" && Boolean(localStorage.getItem("mh_user"));

  if (authLoading && !user && !hasLocalSession) {
    return (
      <div className="section min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#123f2a] border-t-transparent" />
          <p className="text-muted text-xs font-semibold">Loading your activity history…</p>
        </div>
      </div>
    );
  }

  if (!authLoading && !user && !hasLocalSession) {
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

      {/* CANCELLATION CONFIRMATION MODAL */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => !cancelling && setCancelTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-lg font-bold text-green-dark">
                  Cancel {cancelTarget.type === "reservation" ? "Amenity Reservation" : "Property Viewing"}?
                </h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Are you sure you want to cancel this booking? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5 text-xs text-rose-950 space-y-1">
              <div>
                <span className="font-semibold text-rose-800">Booking: </span>
                <span className="font-bold">{cancelTarget.title}</span>
              </div>
              <div>
                <span className="font-semibold text-rose-800">Schedule: </span>
                <span>{cancelTarget.scheduleStr}</span>
              </div>
              <div className="text-[11px] text-rose-700 pt-1 border-t border-rose-200/60">
                ℹ️ <strong>48-Hour Cancellation Policy:</strong> Your slot will be released and made available to other residents immediately.
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-green-dark mb-1">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Change of plans, personal emergency..."
                className="field text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setCancelTarget(null)}
                className="btn-ghost flex-1 justify-center !py-2.5 text-xs font-semibold text-green-dark border-cream-2 hover:bg-cream"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-center text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-1.5"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cancelling...
                  </>
                ) : (
                  "Confirm Cancellation"
                )}
              </button>
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
        <div className={`grid gap-4 ${isNonResident ? "grid-cols-1 sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
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

          {!isNonResident && (
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
          )}

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
              All Activities ({totalActivitiesCount})
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
              onClick={() => setActiveTab("viewings")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "viewings"
                  ? "bg-green-dark text-white shadow-sm"
                  : "bg-white border border-cream-2 text-muted hover:bg-cream"
              }`}
            >
              Property Viewings ({myViewings.length})
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
            {!isNonResident && (
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
            )}
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

        {/* Cancel Feedback Banner */}
        {cancelFeedback && (
          <div
            className={`rounded-2xl border p-4 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
              cancelFeedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {cancelFeedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{cancelFeedback.message}</span>
            </div>
            <button
              onClick={() => setCancelFeedback(null)}
              className="text-muted hover:text-green-dark p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* CONTENT SECTIONS BASED ON ACTIVE TAB */}
        {totalActivitiesCount === 0 && !searchQuery.trim() && statusFilter === "all" ? (
          loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-cream-2 bg-white p-5 shadow-xs flex items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-48 bg-cream-2/80 rounded-md" />
                    <div className="h-3 w-72 bg-cream-2/50 rounded-md" />
                  </div>
                  <div className="h-7 w-20 bg-cream-2/70 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-cream-2 bg-white p-12 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cream text-muted">
                <History className="h-7 w-7 text-green-mid" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold text-green-dark">
                No activity history available
              </h3>
              <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                {isNonResident
                  ? "You have not made any amenity reservations or payments yet. Once you make a booking, it will appear here."
                  : "You have not made any amenity bookings, payments, or dues records yet."}
              </p>
              <div className="mt-5">
                <Link
                  href="/reservation"
                  className="btn-green inline-flex items-center gap-1.5 !py-2.5 !px-5 text-xs font-bold shadow-xs"
                >
                  <Plus className="h-4 w-4" /> Book an Amenity
                </Link>
              </div>
            </div>
          )
        ) : (
          <>
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
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-2">
                        {filteredReservations.map((r) => {
                          const scheduledStartTime = `${r.date}T${r.bookingType === "night" ? "18:00:00" : "06:00:00"}+08:00`;
                          const eligibility = getCancellationEligibility(scheduledStartTime, false);
                          const isCancellable = (r.status === "pending" || r.status === "approved") && Boolean(eligibility.canCancel ?? eligibility.eligible);

                          return (
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
                                      : r.status === "cancelled"
                                      ? "bg-neutral-100 text-neutral-700 border border-neutral-300"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {r.status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                                  {r.status === "pending" && <Clock className="h-3 w-3" />}
                                  {r.status === "cancelled" && <XCircle className="h-3 w-3 text-neutral-500" />}
                                  {r.status === "declined" && <XCircle className="h-3 w-3" />}
                                  <span className="capitalize">{r.status}</span>
                                </span>
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap text-right">
                                {isCancellable ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCancelTarget({
                                        type: "reservation",
                                        id: r.id,
                                        title: `${r.amenityName} (${r.bookingType} session)`,
                                        scheduleStr: `${formatDate(r.date)} · ${r.bookingType} session`,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                                  >
                                    <X className="h-3 w-3" /> Cancel Booking
                                  </button>
                                ) : (r.status === "pending" || r.status === "approved") ? (
                                  <span className="text-[11px] text-muted italic" title={eligibility.reason}>
                                    Non-cancellable (&lt;48h)
                                  </span>
                                ) : (
                                  <span className="text-muted/50 text-[11px]">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. PROPERTY VIEWINGS LIST */}
            {(activeTab === "all" || activeTab === "viewings") && (
              <div className="rounded-2xl border border-cream-2 bg-white overflow-hidden shadow-sm">
                <div className="flex items-center justify-between bg-cream/40 px-6 py-4 border-b border-cream-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-green-mid" />
                    <h2 className="font-serif text-base font-bold text-green-dark">
                      Property Viewing Appointments
                    </h2>
                  </div>
                  <span className="text-xs font-semibold text-muted">
                    {filteredViewings.length} appointment{filteredViewings.length === 1 ? "" : "s"}
                  </span>
                </div>

                {filteredViewings.length === 0 ? (
                  <div className="p-8 text-center text-muted text-xs">
                    No property viewing records match your criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-cream-2 bg-cream/20 text-[11px] font-bold uppercase tracking-wider text-muted">
                        <tr>
                          <th className="px-5 py-3.5">Property Listing</th>
                          <th className="px-5 py-3.5">Requested Date</th>
                          <th className="px-5 py-3.5">Time</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-2">
                        {filteredViewings.map((v) => {
                          const scheduledStartTime = v.scheduledAt || (v.preferredDate && v.preferredTime ? `${v.preferredDate}T${v.preferredTime}:00+08:00` : "");
                          const eligibility = getCancellationEligibility(scheduledStartTime, false);
                          const isCancellable = (v.status === "viewing_requested" || v.status === "viewing_scheduled") && Boolean(eligibility.canCancel ?? eligibility.eligible);

                          return (
                            <tr key={v.id} className="hover:bg-cream/20 transition">
                              <td className="px-5 py-4 font-bold text-green-dark whitespace-nowrap">
                                <Link href={`/house/${v.listingId}`} className="hover:underline flex items-center gap-1.5 text-green-dark">
                                  {v.listingName || v.houseName || `Listing #${v.listingId}`}
                                  <ExternalLink className="h-3 w-3 text-muted" />
                                </Link>
                              </td>
                              <td className="px-5 py-4 font-semibold text-green-deep whitespace-nowrap">
                                {formatDate(v.preferredDate || v.scheduledAt)}
                              </td>
                              <td className="px-5 py-4 text-muted whitespace-nowrap">
                                {v.preferredTime || "—"}
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                    v.status === "viewing_scheduled"
                                      ? "bg-blue-100 text-blue-800"
                                      : v.status === "viewing_completed"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : v.status === "viewing_requested"
                                      ? "bg-amber-100 text-amber-800"
                                      : v.status === "viewing_cancelled" || v.status === "cancelled"
                                      ? "bg-neutral-100 text-neutral-700 border border-neutral-300"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {v.status === "viewing_scheduled" && <Calendar className="h-3 w-3" />}
                                  {v.status === "viewing_completed" && <CheckCircle2 className="h-3 w-3" />}
                                  {v.status === "viewing_requested" && <Clock className="h-3 w-3" />}
                                  {(v.status === "viewing_cancelled" || v.status === "cancelled") && <XCircle className="h-3 w-3 text-neutral-500" />}
                                  {v.status === "viewing_cancelled" || v.status === "cancelled"
                                    ? "Cancelled"
                                    : v.status === "viewing_scheduled"
                                    ? "Scheduled"
                                    : v.status === "viewing_completed"
                                    ? "Completed"
                                    : v.status === "viewing_declined"
                                    ? "Declined"
                                    : "Requested"}
                                </span>
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap text-right">
                                {isCancellable ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCancelTarget({
                                        type: "viewing",
                                        id: v.id,
                                        title: v.listingName || v.houseName || `Listing #${v.listingId}`,
                                        scheduleStr: `${formatDate(v.preferredDate)} at ${v.preferredTime || ""}`,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                                  >
                                    <X className="h-3 w-3" /> Cancel Viewing
                                  </button>
                                ) : (v.status === "viewing_requested" || v.status === "viewing_scheduled") ? (
                                  <span className="text-[11px] text-muted italic" title={eligibility.reason}>
                                    Non-cancellable (&lt;48h)
                                  </span>
                                ) : (
                                  <span className="text-muted/50 text-[11px]">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
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

        {/* 3. DUES LIST (Resident only) */}
        {!isNonResident && (activeTab === "all" || activeTab === "dues") && (
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
      </>
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
