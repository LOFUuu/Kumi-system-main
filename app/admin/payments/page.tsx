"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  Banknote,
  Smartphone,
  RefreshCw,
  Receipt,
  Calendar,
  User as UserIcon,
  Tag,
  Hash,
  TrendingUp,
  Download,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  FileText,
  ZoomIn,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPHP, type Transaction } from "@/lib/mock-data";

const ITEMS_PER_PAGE = 10;

function formatDate(d: string) {
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

function StatusBadge({ status }: { status: Transaction["status"] }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
      <XCircle className="h-3 w-3" /> Voided
    </span>
  );
}

function MethodBadge({ method }: { method: Transaction["paymentMethod"] }) {
  if (method === "gcash")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
        <Smartphone className="h-3 w-3" /> GCash
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700">
      <Banknote className="h-3 w-3" /> Cash
    </span>
  );
}

export default function AdminPaymentsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [receiptFilter, setReceiptFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Actions
  const [busy, setBusy] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const refresh = () => {
    setLoading(true);
    api
      .transactions()
      .then((data) => {
        setTxns(data);
        // Keep selected txn in sync
        if (selectedTxn) {
          const fresh = data.find((t) => t.id === selectedTxn.id);
          if (fresh) setSelectedTxn(fresh);
        }
      })
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open drawer with animation
  const openDrawer = (txn: Transaction) => {
    setSelectedTxn(txn);
    setDrawerVisible(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawerVisible(true));
    });
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    setTimeout(() => setSelectedTxn(null), 300);
  };

  // KPI stats
  const totalTxns = txns.length;
  const pendingCount = txns.filter((t) => t.status === "pending").length;
  const approvedCount = txns.filter((t) => t.status === "approved").length;
  const totalRevenue = txns
    .filter((t) => t.status === "approved")
    .reduce((sum, t) => sum + t.amount, 0);

  // Filter logic
  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.residentName.toLowerCase().includes(q);
        const matchId = String(t.id).includes(q);
        const matchRef = t.gcashRef ? t.gcashRef.toLowerCase().includes(q) : false;
        if (!matchName && !matchId && !matchRef) return false;
      }
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (methodFilter !== "all" && t.paymentMethod !== methodFilter) return false;
      if (typeFilter !== "all" && t.refType !== typeFilter) return false;
      if (receiptFilter === "with_receipt" && !t.receiptPath) return false;
      if (receiptFilter === "no_receipt" && t.receiptPath) return false;
      return true;
    });
  }, [txns, searchQuery, statusFilter, methodFilter, typeFilter, receiptFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const updateStatus = async (status: Transaction["status"]) => {
    if (!selectedTxn) return;
    setBusy(true);
    try {
      const res = await api.transactionUpdate(selectedTxn.id, { status });
      setTxns((prev) =>
        prev.map((t) => (t.id === selectedTxn.id ? res.transaction : t))
      );
      setSelectedTxn(res.transaction);
      setSuccessMsg(
        `Transaction #${selectedTxn.id} marked as ${status}.`
      );
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update status");
      setTimeout(() => setErrorMsg(""), 3500);
    } finally {
      setBusy(false);
    }
  };

  const handleAdminReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTxn) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const uploadRes = await api.uploadPaymentReceipt(file);
      const res = await api.transactionUpdate(selectedTxn.id, { receiptPath: uploadRes.path });
      setTxns((prev) =>
        prev.map((t) => (t.id === selectedTxn.id ? res.transaction : t))
      );
      setSelectedTxn(res.transaction);
      setSuccessMsg("Receipt attached to transaction successfully!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to upload receipt");
      setTimeout(() => setErrorMsg(""), 3500);
    } finally {
      setUploadingReceipt(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-[3000] flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-xl animate-fade-in">
          <Check className="h-4 w-4" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-6 right-6 z-[3000] flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-xl animate-fade-in">
          <XCircle className="h-4 w-4" /> {errorMsg}
        </div>
      )}

      {/* LIGHTBOX MODAL FOR RECEIPT INSPECTION */}
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
                  Payment Receipt Preview
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 text-muted hover:bg-cream hover:text-green-dark transition"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={lightboxUrl}
                  download
                  className="rounded-lg p-2 text-muted hover:bg-cream hover:text-green-dark transition"
                  title="Download receipt"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setLightboxUrl(null)}
                  className="rounded-lg p-2 text-muted hover:bg-cream hover:text-green-dark transition"
                  title="Close"
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
                  alt="Full receipt"
                  className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-sm"
                />
              )}
            </div>

            <p className="text-xs text-muted text-center">
              Click outside or press X to close this receipt viewer.
            </p>
          </div>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-black tracking-tight text-green-dark">
            Payments
          </h1>
          <p className="mt-1 text-sm text-muted">
            Review received payment receipts and manage resident transactions.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by name, ID, or GCash ref..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 w-full rounded-xl border border-cream-2 bg-white pl-9 pr-4 text-xs font-medium text-green-deep placeholder:text-muted/60 focus:border-green-mid focus:outline-none focus:ring-1 focus:ring-green-mid shadow-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs shadow-sm">
            <span className="font-bold text-muted uppercase text-[10px]">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent font-semibold text-green-dark outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="voided">Voided</option>
            </select>
          </div>

          {/* Method Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs shadow-sm">
            <span className="font-bold text-muted uppercase text-[10px]">Method</span>
            <select
              value={methodFilter}
              onChange={(e) => { setMethodFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent font-semibold text-green-dark outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs shadow-sm">
            <span className="font-bold text-muted uppercase text-[10px]">Type</span>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent font-semibold text-green-dark outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="amenity">Amenity</option>
              <option value="dues">Dues</option>
              <option value="listing">Listing</option>
            </select>
          </div>

          {/* Receipt Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs shadow-sm">
            <span className="font-bold text-muted uppercase text-[10px]">Receipt</span>
            <select
              value={receiptFilter}
              onChange={(e) => { setReceiptFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent font-semibold text-green-dark outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="with_receipt">With Receipt</option>
              <option value="no_receipt">No Receipt</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs font-semibold text-muted shadow-sm hover:bg-cream hover:text-green-dark transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">Total</div>
            <div className="font-serif text-2xl font-bold text-green-dark">{totalTxns}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">Pending</div>
            <div className="font-serif text-2xl font-bold text-green-dark">{pendingCount}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">Approved</div>
            <div className="font-serif text-2xl font-bold text-green-dark">{approvedCount}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">Total Revenue</div>
            <div className="font-serif text-xl font-bold text-green-dark">{formatPHP(totalRevenue)}</div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT: Table + Side Drawer */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* TABLE CARD */}
        <div
          className={`flex-1 overflow-hidden rounded-2xl border border-cream-2 bg-white shadow-sm transition-all duration-300 ${
            selectedTxn ? "lg:w-[calc(100%-420px)]" : "w-full"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-cream-2 bg-cream/50 text-[11px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3.5">ID</th>
                  <th className="px-4 py-3.5">Resident</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Amount</th>
                  <th className="px-4 py-3.5">Method</th>
                  <th className="px-4 py-3.5">Receipt</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-2">
                {paginated.map((t) => {
                  const isSelected = selectedTxn?.id === t.id;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => openDrawer(t)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isSelected
                          ? "bg-green-light/10 font-medium"
                          : "hover:bg-cream/40"
                      }`}
                    >
                      <td className="px-4 py-3.5 text-muted whitespace-nowrap">
                        #{t.id}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-green-dark whitespace-nowrap">
                        {t.residentName}
                      </td>
                      <td className="px-4 py-3.5 capitalize text-green-deep whitespace-nowrap">
                        {t.refType}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-green-mid whitespace-nowrap">
                        {formatPHP(t.amount)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <MethodBadge method={t.paymentMethod} />
                      </td>
                      {/* Receipt column */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {t.receiptPath ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxUrl(t.receiptPath!);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                            title="Click to view receipt image"
                          >
                            <ImageIcon className="h-3 w-3" />
                            View Receipt
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted whitespace-nowrap">
                        {formatDate(t.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          title="View Transaction Details"
                          onClick={(e) => { e.stopPropagation(); openDrawer(t); }}
                          className="rounded-lg p-1.5 text-muted hover:bg-cream hover:text-green-dark"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {paginated.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted">
                      No transactions match your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-cream-2 px-5 py-3.5 text-xs text-muted sm:flex-row">
            <div>
              Showing{" "}
              <span className="font-semibold text-green-dark">
                {filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>
              –
              <span className="font-semibold text-green-dark">
                {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-green-dark">{filtered.length}</span>{" "}
              transactions
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-cream-2 bg-white text-muted transition hover:bg-cream disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 5) return true;
                  return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                })
                .map((pageNum, idx, arr) => {
                  const showEllipsis = idx > 0 && pageNum - arr[idx - 1] > 1;
                  return (
                    <div key={pageNum} className="flex items-center">
                      {showEllipsis && <span className="px-1 text-muted">…</span>}
                      <button
                        onClick={() => setCurrentPage(pageNum)}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition ${
                          currentPage === pageNum
                            ? "bg-green-dark text-white"
                            : "border border-cream-2 bg-white text-muted hover:bg-cream"
                        }`}
                      >
                        {pageNum}
                      </button>
                    </div>
                  );
                })}
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-cream-2 bg-white text-muted transition hover:bg-cream disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* SIDE DRAWER: Transaction Details */}
        {selectedTxn && (
          <aside
            className={`w-full lg:w-[400px] flex-shrink-0 rounded-2xl border border-cream-2 bg-white shadow-xl transition-all duration-300 ease-out ${
              drawerVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-8"
            }`}
            style={{ overflow: "hidden" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cream-2 px-5 py-4">
              <h2 className="font-serif text-lg font-bold text-green-dark">
                Transaction Details
              </h2>
              <button
                onClick={closeDrawer}
                className="rounded-full p-1 text-muted transition hover:bg-cream hover:text-green-dark"
                aria-label="Close details panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Profile Strip */}
            <div className="flex items-center gap-3 border-b border-cream-2 px-5 py-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <Receipt className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-serif text-base font-bold text-green-dark">
                  {selectedTxn.residentName}
                </h3>
                <p className="text-xs text-muted">{selectedTxn.userEmail || "No email on record"}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={selectedTxn.status} />
                  <MethodBadge method={selectedTxn.paymentMethod} />
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="divide-y divide-cream-2 px-5 text-xs max-h-[calc(100vh-320px)] overflow-y-auto">
              {/* Receipt / Proof of Payment Section */}
              <div className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-green-dark flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-green-mid" /> Received Receipt
                  </h4>
                  {selectedTxn.receiptPath && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      ✓ Attached
                    </span>
                  )}
                </div>

                {selectedTxn.receiptPath ? (
                  <div className="rounded-xl border border-cream-2 bg-cream/30 p-3">
                    <div className="relative group cursor-pointer overflow-hidden rounded-lg border border-cream-2 bg-white"
                      onClick={() => setLightboxUrl(selectedTxn.receiptPath!)}
                    >
                      {selectedTxn.receiptPath.endsWith(".pdf") ? (
                        <div className="h-40 flex flex-col items-center justify-center bg-cream/50 p-4">
                          <FileText className="h-10 w-10 text-muted mb-2" />
                          <span className="text-xs font-bold text-green-dark">PDF Receipt Document</span>
                          <span className="text-[10px] text-muted">Click to view/download</span>
                        </div>
                      ) : (
                        <img
                          src={selectedTxn.receiptPath}
                          alt="Payment Receipt"
                          className="h-44 w-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 text-white">
                        <ZoomIn className="h-5 w-5" />
                        <span className="text-xs font-bold">Inspect Receipt</span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(selectedTxn.receiptPath!)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-green-mid hover:text-green-dark"
                      >
                        <ZoomIn className="h-3.5 w-3.5" /> Fullscreen View
                      </button>
                      <a
                        href={selectedTxn.receiptPath}
                        download
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-green-dark"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-cream-2 bg-cream/20 p-4 text-center">
                    <ImageIcon className="h-6 w-6 text-muted/60 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-muted">No receipt image uploaded by resident.</p>
                    <label className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-cream-2 bg-white px-3 py-1.5 text-[11px] font-bold text-green-dark hover:bg-cream cursor-pointer shadow-sm transition">
                      <Upload className="h-3 w-3" />
                      {uploadingReceipt ? "Uploading…" : "Attach Receipt Manually"}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleAdminReceiptUpload}
                        disabled={uploadingReceipt}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Transaction Info */}
              <div className="py-4">
                <h4 className="mb-3 font-serif text-xs font-bold uppercase tracking-wider text-green-dark">
                  Transaction Info
                </h4>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Hash className="h-3.5 w-3.5" /> Transaction ID
                    </span>
                    <span className="font-semibold text-green-deep">#{selectedTxn.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Tag className="h-3.5 w-3.5" /> Type
                    </span>
                    <span className="font-semibold capitalize text-green-deep">{selectedTxn.refType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Calendar className="h-3.5 w-3.5" /> Date
                    </span>
                    <span className="font-semibold text-green-deep">{formatDate(selectedTxn.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <UserIcon className="h-3.5 w-3.5" /> Resident
                    </span>
                    <span className="font-semibold text-green-deep">{selectedTxn.residentName}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="py-4">
                <h4 className="mb-3 font-serif text-xs font-bold uppercase tracking-wider text-green-dark">
                  Payment Info
                </h4>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <Banknote className="h-3.5 w-3.5" /> Amount
                    </span>
                    <span className="text-base font-black text-green-mid">{formatPHP(selectedTxn.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <CreditCard className="h-3.5 w-3.5" /> Method
                    </span>
                    <MethodBadge method={selectedTxn.paymentMethod} />
                  </div>
                  {selectedTxn.gcashRef && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted">
                        <Smartphone className="h-3.5 w-3.5" /> GCash Ref
                      </span>
                      <span className="font-mono font-semibold text-green-deep">
                        {selectedTxn.gcashRef}
                      </span>
                    </div>
                  )}
                  {selectedTxn.payment && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Payment Status
                      </span>
                      <span className="font-semibold capitalize text-green-deep">
                        {selectedTxn.payment.status.replace("_", " ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Actions */}
            <div className="px-5 pb-5 pt-4 border-t border-cream-2">
              <h4 className="mb-3 font-serif text-xs font-bold uppercase tracking-wider text-green-dark">
                Admin Actions
              </h4>
              <div className="flex flex-col gap-2">
                {selectedTxn.status === "pending" && (
                  <>
                    <button
                      disabled={busy}
                      onClick={() => updateStatus("approved")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {busy ? "Updating…" : "Approve Payment"}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => updateStatus("voided")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      {busy ? "Updating…" : "Void Payment"}
                    </button>
                  </>
                )}
                {selectedTxn.status === "approved" && (
                  <button
                    disabled={busy}
                    onClick={() => updateStatus("voided")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    {busy ? "Updating…" : "Void Payment"}
                  </button>
                )}
                {selectedTxn.status === "voided" && (
                  <button
                    disabled={busy}
                    onClick={() => updateStatus("pending")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {busy ? "Updating…" : "Reopen as Pending"}
                  </button>
                )}
                <button
                  onClick={closeDrawer}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-cream-2 bg-white px-4 py-2.5 text-xs font-semibold text-muted transition hover:bg-cream"
                >
                  Close
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
