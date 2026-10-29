"use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import QRCode from "react-qr-code";
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
  Archive,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Settings,
  Waves,
  Coins,
  Copy,
  Sparkles,
  CheckCheck,
  Building,
  Layers,
  QrCode as QrCodeIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  formatPHP,
  type Transaction,
  type PaymentConfig,
} from "@/lib/mock-data";
import { buildPlaceholderQR, HOAGCashNumber } from "@/lib/payment";
import { sanitizePhoneInput, validatePhone, validateName } from "@/lib/validation";

const ITEMS_PER_PAGE = 10;

type TabKey = "amenity" | "dues" | "settings" | "archive";

function formatDate(d?: string) {
  if (!d) return "—";
  try {
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) {
      // If it's a date-only string like "2026-08-30"
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
        const parts = d.slice(0, 10).split("-");
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const day = Number(parts[2]);
        const dt = new Date(y, m, day);
        if (!isNaN(dt.getTime())) {
          return dt.toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          });
        }
      }
      return d || "—";
    }
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return d || "—";
  }
}

function StatusBadge({ status }: { status: Transaction["status"] }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Approved
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200/60">
        <Clock className="h-3 w-3 text-amber-600" /> Pending
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200/60">
      <XCircle className="h-3 w-3 text-rose-600" /> Voided
    </span>
  );
}

function MethodBadge({ method }: { method: Transaction["paymentMethod"] }) {
  if (method === "gcash")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/60">
        <Smartphone className="h-3 w-3 text-blue-600" /> GCash
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 border border-teal-200/60">
      <Banknote className="h-3 w-3 text-teal-600" /> Cash
    </span>
  );
}

export default function AdminPaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-green-mid" />
        </div>
      }
    >
      <PaymentsContent />
    </Suspense>
  );
}

function PaymentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "amenity";

  // Tab State
  const [activeTab, setActiveTab] = useState<TabKey>(
    ["amenity", "dues", "settings", "archive"].includes(initialTab) ? initialTab : "amenity"
  );

  // Synchronize tab with URL query parameter
  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedTxn(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/admin/payments?${params.toString()}`, { scroll: false });
  };

  // Transactions State
  const [activeTxns, setActiveTxns] = useState<Transaction[]>([]);
  const [archivedTxns, setArchivedTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState<string>("all");
  const [receiptFilter, setReceiptFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Action States
  const [busy, setBusy] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modals
  const [archiveModalTxn, setArchiveModalTxn] = useState<Transaction | null>(null);
  const [archiveReasonInput, setArchiveReasonInput] = useState("");
  const [deleteModalTxn, setDeleteModalTxn] = useState<Transaction | null>(null);

  // ── GCash Settings State ──────────────────────────────────────────────────
  const [amenityConfig, setAmenityConfig] = useState<PaymentConfig>({
    category: "amenity",
    accountName: "MABUHAY HOMES HOA",
    accountNumber: HOAGCashNumber,
    qrCodeUrl: "",
    instructions: "Amount updates automatically with your reservation type, session, and pax. Send downpayment now, or upload your receipt and enter your reference number below.",
    isActive: true,
  });

  const [duesConfig, setDuesConfig] = useState<PaymentConfig>({
    category: "dues",
    accountName: "MABUHAY HOMES HOA",
    accountNumber: HOAGCashNumber,
    qrCodeUrl: "",
    instructions: "Please send your exact monthly dues via GCash. Keep your reference number and upload your receipt screenshot for swift verification.",
    isActive: true,
  });

  const [settingsActiveCategory, setSettingsActiveCategory] = useState<"amenity" | "dues">("amenity");
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 3500);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 3500);
    }
  };

  // ── Fetch Data ────────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.transactions({ isArchived: false }).catch(() => []),
      api.archivedTransactions().catch(() => []),
      api.paymentConfigs().catch(() => null),
    ])
      .then(([activeData, archData, configs]) => {
        setActiveTxns(activeData);
        setArchivedTxns(archData);

        if (configs) {
          if (configs.amenity) setAmenityConfig(configs.amenity);
          if (configs.dues) setDuesConfig(configs.dues);
        }

        // Keep selected transaction in sync if open
        if (selectedTxn) {
          const all = [...activeData, ...archData];
          const fresh = all.find((t) => t.id === selectedTxn.id);
          if (fresh) setSelectedTxn(fresh);
        }
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : "Failed to load payment data", true);
      })
      .finally(() => setLoading(false));
  }, [selectedTxn]);

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
    setTimeout(() => setSelectedTxn(null), 250);
  };

  // ── Segregated Data Lists ─────────────────────────────────────────────────
  const amenityTxns = useMemo(
    () => activeTxns.filter((t) => t.refType === "amenity"),
    [activeTxns]
  );

  const duesTxns = useMemo(
    () => activeTxns.filter((t) => t.refType === "dues"),
    [activeTxns]
  );

  // ── KPI Statistics ────────────────────────────────────────────────────────
  // Active Amenity KPIs
  const amenityPending = amenityTxns.filter((t) => t.status === "pending").length;
  const amenityApproved = amenityTxns.filter((t) => t.status === "approved").length;
  const amenityRevenue = amenityTxns
    .filter((t) => t.status === "approved")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Active Dues KPIs
  const duesPending = duesTxns.filter((t) => t.status === "pending").length;
  const duesApproved = duesTxns.filter((t) => t.status === "approved").length;
  const duesCollections = duesTxns
    .filter((t) => t.status === "approved")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Archive KPIs
  const archivedAmenityCount = archivedTxns.filter((t) => t.refType === "amenity").length;
  const archivedDuesCount = archivedTxns.filter((t) => t.refType === "dues").length;
  const archivedTotalValue = archivedTxns.reduce((sum, t) => sum + (t.amount || 0), 0);

  // ── Active Tab Dataset & Filter Logic ─────────────────────────────────────
  const currentDataset = useMemo(() => {
    if (activeTab === "amenity") return amenityTxns;
    if (activeTab === "dues") return duesTxns;
    if (activeTab === "archive") return archivedTxns;
    return [];
  }, [activeTab, amenityTxns, duesTxns, archivedTxns]);

  const filtered = useMemo(() => {
    return currentDataset.filter((t) => {
      // Search query across name, ID, GCash ref, or amenity name
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.residentName.toLowerCase().includes(q);
        const matchId = String(t.id).includes(q);
        const matchRef = t.gcashRef ? t.gcashRef.toLowerCase().includes(q) : false;
        const matchAmenity = t.amenityName ? t.amenityName.toLowerCase().includes(q) : false;
        const matchDue = t.dueMonth ? t.dueMonth.toLowerCase().includes(q) : false;
        if (!matchName && !matchId && !matchRef && !matchAmenity && !matchDue) return false;
      }

      // Status filter
      if (statusFilter !== "all" && t.status !== statusFilter) return false;

      // Method filter
      if (methodFilter !== "all" && t.paymentMethod !== methodFilter) return false;

      // Archive category filter (only applicable in archive tab)
      if (activeTab === "archive" && archiveCategoryFilter !== "all") {
        if (t.refType !== archiveCategoryFilter) return false;
      }

      // Receipt filter
      if (receiptFilter === "with_receipt" && !t.receiptPath) return false;
      if (receiptFilter === "no_receipt" && t.receiptPath) return false;

      return true;
    });
  }, [currentDataset, searchQuery, statusFilter, methodFilter, activeTab, archiveCategoryFilter, receiptFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // ── Status Updates (Approve / Void / Reopen) ──────────────────────────────
  const updateStatus = async (status: Transaction["status"]) => {
    if (!selectedTxn) return;
    setBusy(true);
    try {
      const res = await api.transactionUpdate(selectedTxn.id, { status });
      const updated = res.transaction;

      // Update in active state or archive state
      setActiveTxns((prev) => prev.map((t) => (t.id === updated.id ? { ...t, status: updated.status } : t)));
      setArchivedTxns((prev) => prev.map((t) => (t.id === updated.id ? { ...t, status: updated.status } : t)));
      setSelectedTxn((prev) => (prev ? { ...prev, status: updated.status } : null));

      showToast(`Transaction #${selectedTxn.id} marked as ${status}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update status", true);
    } finally {
      setBusy(false);
    }
  };

  // ── Manual Admin Receipt Upload ───────────────────────────────────────────
  const handleAdminReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTxn) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const uploadRes = await api.uploadPaymentReceipt(file);
      const res = await api.transactionUpdate(selectedTxn.id, { receiptPath: uploadRes.path });
      const updated = res.transaction;

      setActiveTxns((prev) => prev.map((t) => (t.id === updated.id ? { ...t, receiptPath: updated.receiptPath } : t)));
      setArchivedTxns((prev) => prev.map((t) => (t.id === updated.id ? { ...t, receiptPath: updated.receiptPath } : t)));
      setSelectedTxn((prev) => (prev ? { ...prev, receiptPath: updated.receiptPath } : null));

      showToast("Receipt attached to transaction successfully!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to upload receipt", true);
    } finally {
      setUploadingReceipt(false);
    }
  };

  // ── Archiving Operations ──────────────────────────────────────────────────
  const handleArchiveConfirm = async () => {
    if (!archiveModalTxn) return;
    setBusy(true);
    try {
      await api.archiveTransaction(archiveModalTxn.id, archiveReasonInput.trim() || "Archived by Admin");

      // Move transaction from active to archived list
      const archivedItem = activeTxns.find((t) => t.id === archiveModalTxn.id);
      if (archivedItem) {
        const enriched: Transaction = {
          ...archivedItem,
          isArchived: true,
          archiveReason: archiveReasonInput.trim() || "Archived by Admin",
          archivedAt: new Date().toISOString(),
        };
        setActiveTxns((prev) => prev.filter((t) => t.id !== archiveModalTxn.id));
        setArchivedTxns((prev) => [enriched, ...prev]);
      }

      if (selectedTxn?.id === archiveModalTxn.id) {
        closeDrawer();
      }

      showToast(`Transaction #${archiveModalTxn.id} moved to Payment Archive.`);
      setArchiveModalTxn(null);
      setArchiveReasonInput("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to archive transaction", true);
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (txn: Transaction) => {
    setBusy(true);
    try {
      await api.restoreTransaction(txn.id);

      // Move transaction from archived to active list
      const restoredItem = archivedTxns.find((t) => t.id === txn.id);
      if (restoredItem) {
        const unarchived: Transaction = {
          ...restoredItem,
          isArchived: false,
          archiveReason: undefined,
          archivedAt: undefined,
        };
        setArchivedTxns((prev) => prev.filter((t) => t.id !== txn.id));
        setActiveTxns((prev) => [unarchived, ...prev]);
      }

      if (selectedTxn?.id === txn.id) {
        setSelectedTxn((prev) => (prev ? { ...prev, isArchived: false } : null));
      }

      showToast(`Transaction #${txn.id} restored to active ${txn.refType === "amenity" ? "Amenity" : "Monthly Due"} payments.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to restore transaction", true);
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePermanent = async () => {
    if (!deleteModalTxn) return;
    setBusy(true);
    try {
      await api.deleteTransaction(deleteModalTxn.id);

      setArchivedTxns((prev) => prev.filter((t) => t.id !== deleteModalTxn.id));
      setActiveTxns((prev) => prev.filter((t) => t.id !== deleteModalTxn.id));

      if (selectedTxn?.id === deleteModalTxn.id) {
        closeDrawer();
      }

      showToast(`Transaction #${deleteModalTxn.id} permanently deleted.`);
      setDeleteModalTxn(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to permanently delete transaction", true);
    } finally {
      setBusy(false);
    }
  };

  // ── GCash Settings Handlers ───────────────────────────────────────────────
  const activeSettingsConfig = settingsActiveCategory === "amenity" ? amenityConfig : duesConfig;

  const handleSettingsFieldChange = (field: keyof PaymentConfig, value: any) => {
    if (settingsActiveCategory === "amenity") {
      setAmenityConfig((prev) => ({ ...prev, [field]: value }));
    } else {
      setDuesConfig((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please upload a valid image file (JPG, PNG, or WEBP).", true);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("QR code image must be under 5MB.", true);
      return;
    }

    setUploadingQR(true);
    try {
      const res = await api.uploadPaymentReceipt(file);
      handleSettingsFieldChange("qrCodeUrl", res.path);
      showToast("QR Code uploaded! Click Save to apply changes.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to upload QR image", true);
    } finally {
      setUploadingQR(false);
    }
  };

  const handleSaveSettings = async (syncBoth = false) => {
    setSavingSettings(true);
    try {
      const targetCategory = settingsActiveCategory;
      const targetConfig = targetCategory === "amenity" ? amenityConfig : duesConfig;

      const nameErr = validateName(targetConfig.accountName, { required: true, label: "GCash account name" });
      if (nameErr) {
        showToast(nameErr, true);
        setSavingSettings(false);
        return;
      }
      const phoneErr = validatePhone(targetConfig.accountNumber, { required: true, label: "GCash mobile number" });
      if (phoneErr) {
        showToast(phoneErr, true);
        setSavingSettings(false);
        return;
      }

      await api.updatePaymentConfig(targetCategory, {
        ...targetConfig,
        syncBoth,
      });

      if (syncBoth) {
        if (targetCategory === "amenity") {
          setDuesConfig({
            ...amenityConfig,
            category: "dues",
          });
        } else {
          setAmenityConfig({
            ...duesConfig,
            category: "amenity",
          });
        }
        showToast(`Saved and applied GCash details to BOTH Amenity and Monthly Due payments!`);
      } else {
        showToast(
          `${targetCategory === "amenity" ? "Amenity" : "Monthly Due"} GCash configuration saved successfully!`
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save GCash settings", true);
    } finally {
      setSavingSettings(false);
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
                  download="Payment_Receipt"
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

      {/* ARCHIVE CONFIRMATION MODAL */}
      {archiveModalTxn && (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setArchiveModalTxn(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-green-dark">Archive Transaction</h3>
                <p className="text-xs text-muted">Transaction #{archiveModalTxn.id} · {archiveModalTxn.residentName}</p>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Archiving moves this transaction out of the active{" "}
              <strong>{archiveModalTxn.refType === "amenity" ? "Amenity Payments" : "Monthly Due Payments"}</strong>{" "}
              list and into the Payment Archive. All audit records, receipts, and payment statuses are securely preserved.
            </p>

            <div>
              <label className="field-label text-xs">Reason for Archiving (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Audit complete, historical record, duplicate inquiry..."
                value={archiveReasonInput}
                onChange={(e) => setArchiveReasonInput(e.target.value)}
                className="field text-xs py-2"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-cream-2">
              <button
                type="button"
                onClick={() => setArchiveModalTxn(null)}
                className="rounded-xl border border-cream-2 bg-white px-4 py-2 text-xs font-semibold text-muted hover:bg-cream"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleArchiveConfirm}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
              >
                {busy ? "Archiving…" : "Confirm Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT DELETE CONFIRMATION MODAL */}
      {deleteModalTxn && (
        <div
          className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setDeleteModalTxn(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-rose-700">Permanently Delete Transaction</h3>
                <p className="text-xs text-muted">Transaction #{deleteModalTxn.id} · {deleteModalTxn.residentName}</p>
              </div>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800 leading-relaxed">
              <strong>Warning:</strong> This action cannot be undone. This transaction will be permanently purged from the database. Linked resident profiles and HOA accounts will not be deleted.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-cream-2">
              <button
                type="button"
                onClick={() => setDeleteModalTxn(null)}
                className="rounded-xl border border-cream-2 bg-white px-4 py-2 text-xs font-semibold text-muted hover:bg-cream"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDeletePermanent}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-black tracking-tight text-green-dark">
            Payment Management
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage segregated Amenity and Monthly Due transactions, configure GCash accounts, and audit archived records.
          </p>
        </div>

        {/* Global Refresh Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3.5 py-2 text-xs font-semibold text-muted shadow-sm hover:bg-cream hover:text-green-dark transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* MAIN NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-cream-2 pb-2">
        <button
          onClick={() => switchTab("amenity")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "amenity"
              ? "bg-[#123f2a] text-white shadow-sm"
              : "border border-cream-2 bg-white text-gray-700 hover:bg-[#e8f3ec] hover:text-[#123f2a]"
          }`}
        >
          <Waves className="h-4 w-4 text-[#86efac]" />
          <span>Amenity Payments</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              activeTab === "amenity" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {amenityTxns.length}
          </span>
          {amenityPending > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-black text-white">
              {amenityPending}
            </span>
          )}
        </button>

        <button
          onClick={() => switchTab("dues")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "dues"
              ? "bg-[#123f2a] text-white shadow-sm"
              : "border border-cream-2 bg-white text-gray-700 hover:bg-[#e8f3ec] hover:text-[#123f2a]"
          }`}
        >
          <Coins className="h-4 w-4 text-[#86efac]" />
          <span>Monthly Due Payments</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              activeTab === "dues" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {duesTxns.length}
          </span>
          {duesPending > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-black text-white">
              {duesPending}
            </span>
          )}
        </button>

        <button
          onClick={() => switchTab("settings")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "settings"
              ? "bg-[#123f2a] text-white shadow-sm"
              : "border border-cream-2 bg-white text-gray-700 hover:bg-[#e8f3ec] hover:text-[#123f2a]"
          }`}
        >
          <Settings className="h-4 w-4 text-[#86efac]" />
          <span>GCash Configuration</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
            Active
          </span>
        </button>

        <button
          onClick={() => switchTab("archive")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "archive"
              ? "bg-amber-700 text-white shadow-sm"
              : "border border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100"
          }`}
        >
          <Archive className="h-4 w-4" />
          <span>Payment Archive</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              activeTab === "archive" ? "bg-white/20 text-white" : "bg-amber-200 text-amber-900"
            }`}
          >
            {archivedTxns.length}
          </span>
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1 & 2 & 4: TRANSACTION KPI METRIC CARDS                              */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab !== "settings" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
          {activeTab === "amenity" && (
            <>
              <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Waves className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Amenity Bookings</div>
                  <div className="font-serif text-2xl font-bold text-green-dark">{amenityTxns.length}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Pending Verification</div>
                  <div className="font-serif text-2xl font-bold text-green-dark">{amenityPending}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Approved Payments</div>
                  <div className="font-serif text-2xl font-bold text-green-dark">{amenityApproved}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Amenity Revenue</div>
                  <div className="font-serif text-xl font-bold text-green-dark">{formatPHP(amenityRevenue)}</div>
                </div>
              </div>
            </>
          )}

          {activeTab === "dues" && (
            <>
              <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Coins className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Total Monthly Dues</div>
                  <div className="font-serif text-2xl font-bold text-green-dark">{duesTxns.length}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Pending Dues</div>
                  <div className="font-serif text-2xl font-bold text-green-dark">{duesPending}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Approved Dues</div>
                  <div className="font-serif text-2xl font-bold text-green-dark">{duesApproved}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Dues Collections</div>
                  <div className="font-serif text-xl font-bold text-green-dark">{formatPHP(duesCollections)}</div>
                </div>
              </div>
            </>
          )}

          {activeTab === "archive" && (
            <>
              <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                  <Archive className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Total Archived</div>
                  <div className="font-serif text-2xl font-bold text-amber-900">{archivedTxns.length}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Waves className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Archived Amenity</div>
                  <div className="font-serif text-2xl font-bold text-green-dark">{archivedAmenityCount}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Coins className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Archived Dues</div>
                  <div className="font-serif text-2xl font-bold text-green-dark">{archivedDuesCount}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream">
                  <TrendingUp className="h-6 w-6 text-green-deep" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Archived Value</div>
                  <div className="font-serif text-xl font-bold text-green-dark">{formatPHP(archivedTotalValue)}</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: GCASH CONFIGURATION VIEW                                         */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "settings" && (
        <div className="space-y-6 animate-fade-in">
          {/* Sub-selector: Amenity vs Monthly Dues GCash Configuration */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-cream-2 bg-white p-4 shadow-sm">
            <div>
              <h2 className="font-serif text-lg font-bold text-green-dark">
                Configure GCash Details for Resident Forms
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Update account details, mobile numbers, and QR codes displayed on user payment forms without editing code.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-cream/50 p-1.5 rounded-xl border border-cream-2">
              <button
                type="button"
                onClick={() => setSettingsActiveCategory("amenity")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  settingsActiveCategory === "amenity"
                    ? "bg-[#123f2a] text-white shadow-xs"
                    : "text-muted hover:text-green-dark"
                }`}
              >
                <Waves className="h-3.5 w-3.5" /> Amenity Settings
              </button>
              <button
                type="button"
                onClick={() => setSettingsActiveCategory("dues")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  settingsActiveCategory === "dues"
                    ? "bg-[#123f2a] text-white shadow-xs"
                    : "text-muted hover:text-green-dark"
                }`}
              >
                <Coins className="h-3.5 w-3.5" /> Monthly Due Settings
              </button>
            </div>
          </div>

          {/* Form and Live Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Fields Card */}
            <div className="lg:col-span-7 rounded-2xl border border-cream-2 bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-cream-2 pb-3">
                <div className="flex items-center gap-2">
                  {settingsActiveCategory === "amenity" ? (
                    <Waves className="h-5 w-5 text-green-mid" />
                  ) : (
                    <Coins className="h-5 w-5 text-green-mid" />
                  )}
                  <h3 className="font-serif text-base font-bold text-green-dark">
                    {settingsActiveCategory === "amenity" ? "Amenity Payments GCash Settings" : "Monthly Due Payments GCash Settings"}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-muted bg-cream px-2 py-0.5 rounded-md">
                  Independent Category
                </span>
              </div>

              {/* Account Name */}
              <div>
                <label className="field-label text-xs font-bold">
                  Registered GCash Account Holder Name *
                </label>
                <input
                  type="text"
                  value={activeSettingsConfig.accountName}
                  onChange={(e) => handleSettingsFieldChange("accountName", e.target.value)}
                  placeholder="e.g. MABUHAY HOMES HOA or Juan Dela Cruz"
                  className="field text-xs py-2.5 font-medium"
                />
                <p className="text-[11px] text-muted mt-1">
                  Shown as the registered account name on resident scan-to-pay dialogs.
                </p>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="field-label text-xs font-bold">
                  GCash Mobile Number *
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={activeSettingsConfig.accountNumber}
                    onChange={(e) => handleSettingsFieldChange("accountNumber", sanitizePhoneInput(e.target.value))}
                    placeholder="e.g. 0917 123 4567"
                    className="field pl-9 text-xs py-2.5 font-mono font-bold text-blue-900"
                  />
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Official 11-digit mobile number residents send GCash payments to.
                </p>
              </div>

              {/* QR Code Upload */}
              <div>
                <label className="field-label text-xs font-bold">
                  GCash QR Code Image
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-cream-2 bg-cream/20 p-4">
                  {activeSettingsConfig.qrCodeUrl ? (
                    <div className="relative group rounded-xl border border-cream-2 bg-white p-2 shadow-xs flex-shrink-0">
                      <img
                        src={activeSettingsConfig.qrCodeUrl}
                        alt="Current QR Code"
                        className="h-24 w-24 object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleSettingsFieldChange("qrCodeUrl", "")}
                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 transition"
                        title="Remove custom QR image and revert to dynamic QR code"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-cream-2 bg-white text-muted flex-shrink-0">
                      <QrCodeIcon className="h-10 w-10 text-muted/60" />
                    </div>
                  )}

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-xs font-bold text-green-dark">
                      {activeSettingsConfig.qrCodeUrl
                        ? "Custom QR image uploaded"
                        : "Currently using dynamic auto-generated QR code"}
                    </p>
                    <p className="text-[11px] text-muted">
                      Upload your official GCash merchant QR code image, or leave empty to automatically generate one from the mobile number.
                    </p>
                    <label className="inline-flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3.5 py-1.5 text-xs font-bold text-green-dark hover:bg-cream cursor-pointer shadow-xs transition">
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingQR ? "Uploading…" : "Upload QR Code Image"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleQrUpload}
                        disabled={uploadingQR}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Payment Instructions */}
              <div>
                <label className="field-label text-xs font-bold">
                  Payment Instructions for Residents (Optional)
                </label>
                <textarea
                  rows={3}
                  value={activeSettingsConfig.instructions || ""}
                  onChange={(e) => handleSettingsFieldChange("instructions", e.target.value)}
                  placeholder="Instructions displayed below the QR code to guide residents..."
                  className="field text-xs py-2 leading-relaxed"
                />
              </div>

              {/* Standard Monthly Due Configuration (Dues Category) */}
              {settingsActiveCategory === "dues" && (
                <div>
                  <label className="field-label text-xs font-bold">
                    Standard Monthly HOA Due (PHP) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-green-mid">
                      ₱
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={activeSettingsConfig.monthlyDue ?? 100}
                      onChange={(e) =>
                        handleSettingsFieldChange("monthlyDue", Number(e.target.value) || 100)
                      }
                      placeholder="100.00"
                      className="field pl-8 text-xs py-2.5 font-bold text-green-dark"
                    />
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    Standard monthly fee applied to homeowners for newly generated billing cycles. Default is ₱100.00.
                  </p>
                </div>
              )}

              {/* Status Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-cream-2 bg-cream/30 p-3.5">
                <div>
                  <span className="text-xs font-bold text-green-dark block">Payment Configuration Status</span>
                  <span className="text-[11px] text-muted">
                    When active, residents can scan and pay via GCash on this category.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeSettingsConfig.isActive}
                    onChange={(e) => handleSettingsFieldChange("isActive", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-cream-2">
                <button
                  type="button"
                  disabled={savingSettings}
                  onClick={() => handleSaveSettings(true)}
                  className="flex items-center justify-center gap-1.5 w-full sm:w-auto rounded-xl border border-cream-2 bg-cream/50 px-4 py-2.5 text-xs font-bold text-green-deep hover:bg-cream transition shadow-2xs disabled:opacity-50"
                  title="Applies the current account name, number, QR and instructions to BOTH Amenity and Dues categories"
                >
                  <Copy className="h-3.5 w-3.5 text-green-mid" />
                  Apply to Both Categories
                </button>

                <button
                  type="button"
                  disabled={savingSettings}
                  onClick={() => handleSaveSettings(false)}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <CheckCheck className="h-4 w-4" />
                  {savingSettings ? "Saving Changes…" : `Save ${settingsActiveCategory === "amenity" ? "Amenity" : "Monthly Due"} Settings`}
                </button>
              </div>
            </div>

            {/* Live Resident UI Preview Card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-green-dark">
                <Sparkles className="h-4 w-4 text-gold" /> Live User-Side Preview
              </div>

              {/* Exact Mock Preview Container mirroring user reservation/dues card */}
              <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-white p-5 shadow-sm space-y-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-5 text-center">
                  <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-xs">
                    {activeSettingsConfig.qrCodeUrl ? (
                      <img
                        src={activeSettingsConfig.qrCodeUrl}
                        alt="GCash QR Code"
                        className="h-36 w-36 object-contain mx-auto rounded-lg"
                      />
                    ) : (
                      <QRCode
                        value={buildPlaceholderQR(
                          settingsActiveCategory === "amenity" ? 200 : 100,
                          activeSettingsConfig.accountNumber || HOAGCashNumber
                        )}
                        size={144}
                      />
                    )}
                  </div>
                  <div className="mt-3 font-serif text-2xl font-bold tracking-[3px] text-blue-600">
                    {activeSettingsConfig.accountNumber || "0917 123 4567"}
                  </div>
                  <div className="text-xs font-semibold text-muted">
                    {activeSettingsConfig.accountName || "MABUHAY HOMES HOA — Scan to Pay"}
                  </div>
                  <p className="mt-1.5 inline-block rounded-full bg-blue-100 px-3 py-0.5 text-[10px] font-semibold text-blue-700">
                    Official {settingsActiveCategory === "amenity" ? "Amenity Payment" : "Monthly Dues"} Account
                  </p>
                  <p className="mt-3 text-[11px] text-muted leading-relaxed">
                    {activeSettingsConfig.instructions ||
                      "Amount updates automatically with your reservation type, session, and pax. Send downpayment now, or upload your receipt and enter your reference number below."}
                  </p>
                </div>

                <div className="rounded-xl border border-cream-2 bg-cream/30 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Target Category</span>
                    <span className="font-bold text-green-dark capitalize">
                      {settingsActiveCategory} Payments
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Display Status</span>
                    <span
                      className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                        activeSettingsConfig.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {activeSettingsConfig.isActive ? "Active (Displayed to residents)" : "Inactive (Hidden)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TABS 1, 2, 4: TRANSACTION TABLE & CONTROLS                              */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab !== "settings" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative min-w-[220px] flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder={
                    activeTab === "amenity"
                      ? "Search resident, ID, amenity, ref..."
                      : activeTab === "dues"
                      ? "Search resident, ID, billing month, ref..."
                      : "Search archived resident, ID, ref..."
                  }
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
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent font-semibold text-green-dark outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="voided">Voided</option>
                </select>
              </div>

              {/* Payment Method Filter */}
              <div className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs shadow-sm">
                <span className="font-bold text-muted uppercase text-[10px]">Method</span>
                <select
                  value={methodFilter}
                  onChange={(e) => {
                    setMethodFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent font-semibold text-green-dark outline-none cursor-pointer"
                >
                  <option value="all">All Methods</option>
                  <option value="gcash">GCash</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              {/* Archive Category Filter (Only on Archive Tab) */}
              {activeTab === "archive" && (
                <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs shadow-sm">
                  <span className="font-bold text-amber-800 uppercase text-[10px]">Category</span>
                  <select
                    value={archiveCategoryFilter}
                    onChange={(e) => {
                      setArchiveCategoryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent font-semibold text-amber-900 outline-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="amenity">Amenity Payments Only</option>
                    <option value="dues">Monthly Dues Only</option>
                  </select>
                </div>
              )}

              {/* Receipt Filter */}
              <div className="flex items-center gap-1.5 rounded-xl border border-cream-2 bg-white px-3 py-2 text-xs shadow-sm">
                <span className="font-bold text-muted uppercase text-[10px]">Receipt</span>
                <select
                  value={receiptFilter}
                  onChange={(e) => {
                    setReceiptFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent font-semibold text-green-dark outline-none cursor-pointer"
                >
                  <option value="all">All Receipts</option>
                  <option value="with_receipt">With Receipt Attached</option>
                  <option value="no_receipt">No Receipt</option>
                </select>
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
                      {activeTab === "amenity" && (
                        <>
                          <th className="px-4 py-3.5">Amenity</th>
                          <th className="px-4 py-3.5">Reservation Date</th>
                        </>
                      )}
                      {activeTab === "dues" && (
                        <>
                          <th className="px-4 py-3.5">Billing Period</th>
                          <th className="px-4 py-3.5">Unit / Lot</th>
                        </>
                      )}
                      {activeTab === "archive" && (
                        <>
                          <th className="px-4 py-3.5">Category</th>
                          <th className="px-4 py-3.5">Archived Date</th>
                        </>
                      )}
                      <th className="px-4 py-3.5">Amount</th>
                      <th className="px-4 py-3.5">Method</th>
                      <th className="px-4 py-3.5">GCash Ref</th>
                      <th className="px-4 py-3.5">Receipt</th>
                      <th className="px-4 py-3.5">Payment Date</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
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
                            isSelected ? "bg-green-light/10 font-medium" : "hover:bg-cream/40"
                          }`}
                        >
                          <td className="px-4 py-3.5 text-muted whitespace-nowrap font-mono font-semibold">
                            #{t.id}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-green-dark whitespace-nowrap">
                            {t.residentName}
                          </td>

                          {/* Specific columns for Amenity */}
                          {activeTab === "amenity" && (
                            <>
                              <td className="px-4 py-3.5 text-green-deep font-semibold whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-800">
                                  <Waves className="h-3 w-3 text-green-mid" />
                                  {t.amenityName || "Amenity Booking"}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-muted whitespace-nowrap">
                                {t.reservationDate ? (
                                  <div>
                                    <div className="font-semibold text-green-deep">{formatDate(t.reservationDate)}</div>
                                    <div className="text-[10px] text-muted capitalize">
                                      {t.bookingType || "Day"} · {t.reservationType || "Public"}
                                    </div>
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </>
                          )}

                          {/* Specific columns for Monthly Dues */}
                          {activeTab === "dues" && (
                            <>
                              <td className="px-4 py-3.5 font-semibold text-green-deep whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                  <Calendar className="h-3 w-3 text-emerald-600" />
                                  {t.dueMonth || (t.billingMonth ? `${t.billingMonth} ${t.billingYear || ""}` : "Monthly Due")}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-muted whitespace-nowrap font-mono text-[11px]">
                                {t.blockNo && t.lotNo ? `Blk ${t.blockNo} / Lot ${t.lotNo}` : "Registered Unit"}
                              </td>
                            </>
                          )}

                          {/* Specific columns for Payment Archive */}
                          {activeTab === "archive" && (
                            <>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                    t.refType === "amenity"
                                      ? "bg-blue-50 text-blue-800"
                                      : "bg-emerald-50 text-emerald-800"
                                  }`}
                                >
                                  {t.refType === "amenity" ? <Waves className="h-3 w-3" /> : <Coins className="h-3 w-3" />}
                                  {t.refType === "amenity" ? "Amenity" : "Monthly Due"}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-muted whitespace-nowrap">
                                {formatDate(t.archivedAt)}
                              </td>
                            </>
                          )}

                          {/* Amount */}
                          <td className="px-4 py-3.5 font-bold text-green-mid whitespace-nowrap">
                            {formatPHP(t.amount)}
                          </td>

                          {/* Method */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <MethodBadge method={t.paymentMethod} />
                          </td>

                          {/* GCash Reference */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {t.gcashRef ? (
                              <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-50/80 px-2 py-0.5 rounded-md">
                                {t.gcashRef}
                              </span>
                            ) : (
                              <span className="text-muted/60">—</span>
                            )}
                          </td>

                          {/* Receipt */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {t.receiptPath ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxUrl(t.receiptPath!);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
                                title="Click to preview receipt image"
                              >
                                <ImageIcon className="h-3 w-3" /> View Receipt
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted/60">—</span>
                            )}
                          </td>

                          {/* Payment Date */}
                          <td className="px-4 py-3.5 text-muted whitespace-nowrap font-medium">
                            {formatDate(t.createdAt)}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <StatusBadge status={t.status} />
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                title="Inspect Transaction Details"
                                onClick={() => openDrawer(t)}
                                className="rounded-lg p-1.5 text-muted hover:bg-cream hover:text-green-dark transition"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {activeTab !== "archive" && (
                                <button
                                  title="Archive this transaction"
                                  onClick={() => {
                                    setArchiveModalTxn(t);
                                    setArchiveReasonInput("");
                                  }}
                                  className="rounded-lg p-1.5 text-muted hover:bg-amber-50 hover:text-amber-700 transition"
                                >
                                  <Archive className="h-4 w-4" />
                                </button>
                              )}

                              {activeTab === "archive" && (
                                <>
                                  <button
                                    title="Restore to active transactions"
                                    onClick={() => handleRestore(t)}
                                    className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-50 transition"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                  <button
                                    title="Permanently Delete"
                                    onClick={() => setDeleteModalTxn(t)}
                                    className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 transition"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {paginated.length === 0 && !loading && (
                      <tr>
                        <td colSpan={12} className="p-10 text-center text-muted">
                          <Receipt className="h-8 w-8 text-muted/40 mx-auto mb-2" />
                          <p className="text-sm font-semibold">No transactions found.</p>
                          <p className="text-xs text-muted/80 mt-0.5">
                            {searchQuery
                              ? "Try adjusting your search query or filters."
                              : activeTab === "archive"
                              ? "The payment archive is currently empty."
                              : "No transactions currently recorded in this category."}
                          </p>
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
                  of <span className="font-semibold text-green-dark">{filtered.length}</span>{" "}
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
                  drawerVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
                }`}
                style={{ overflow: "hidden" }}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-cream-2 px-5 py-4">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-green-dark">
                      Transaction Details
                    </h2>
                    <span className="text-[10px] text-muted font-bold uppercase tracking-wider">
                      {selectedTxn.refType === "amenity" ? "Amenity Booking" : "Monthly Dues"} · #{selectedTxn.id}
                    </span>
                  </div>
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
                    <p className="text-xs text-muted truncate">
                      {selectedTxn.userEmail || "Resident Account"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={selectedTxn.status} />
                      <MethodBadge method={selectedTxn.paymentMethod} />
                      {selectedTxn.isArchived && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          <Archive className="h-2.5 w-2.5" /> Archived
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scrollable Details */}
                <div className="divide-y divide-cream-2 px-5 text-xs max-h-[calc(100vh-340px)] overflow-y-auto">
                  {/* Proof of Payment / Receipt */}
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
                        <div
                          className="relative group cursor-pointer overflow-hidden rounded-lg border border-cream-2 bg-white"
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
                            download="Payment_Receipt"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-green-dark"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-cream-2 bg-cream/20 p-4 text-center">
                        <ImageIcon className="h-6 w-6 text-muted/60 mx-auto mb-1" />
                        <p className="text-xs font-semibold text-muted">No receipt uploaded by resident.</p>
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

                  {/* Context-Specific Info (Amenity Booking or Monthly Dues Record) */}
                  <div className="py-4">
                    <h4 className="mb-3 font-serif text-xs font-bold uppercase tracking-wider text-green-dark flex items-center gap-1.5">
                      {selectedTxn.refType === "amenity" ? (
                        <>
                          <Waves className="h-3.5 w-3.5 text-green-mid" /> Reservation Information
                        </>
                      ) : (
                        <>
                          <Building className="h-3.5 w-3.5 text-green-mid" /> Monthly Due Information
                        </>
                      )}
                    </h4>

                    <div className="space-y-2.5">
                      {selectedTxn.refType === "amenity" && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted">Amenity Name</span>
                            <span className="font-bold text-green-deep">{selectedTxn.amenityName || "Amenity"}</span>
                          </div>
                          {selectedTxn.reservationDate && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted">Booking Date</span>
                              <span className="font-semibold text-green-deep">
                                {formatDate(selectedTxn.reservationDate)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-muted">Booking Session</span>
                            <span className="font-semibold capitalize text-green-deep">
                              {selectedTxn.bookingType || "Day"} Session · {selectedTxn.reservationType || "Public"}
                            </span>
                          </div>
                        </>
                      )}

                      {selectedTxn.refType === "dues" && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted">Billing Cycle</span>
                            <span className="font-bold text-green-deep">
                              {selectedTxn.dueMonth || (selectedTxn.billingMonth ? `${selectedTxn.billingMonth} ${selectedTxn.billingYear || ""}` : "Monthly Due")}
                            </span>
                          </div>
                          {selectedTxn.dueDate && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted">Due Date</span>
                              <span className="font-semibold text-green-deep">
                                {formatDate(selectedTxn.dueDate)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-muted">Assigned Unit</span>
                            <span className="font-mono font-semibold text-green-deep">
                              {selectedTxn.blockNo && selectedTxn.lotNo
                                ? `Block ${selectedTxn.blockNo} / Lot ${selectedTxn.lotNo}`
                                : "Master Unit"}
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted">
                          <Hash className="h-3.5 w-3.5" /> Transaction ID
                        </span>
                        <span className="font-mono font-semibold text-green-deep">#{selectedTxn.id}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted">
                          <Calendar className="h-3.5 w-3.5" /> Payment Date
                        </span>
                        <span className="font-semibold text-green-deep">{formatDate(selectedTxn.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment & GCash Info */}
                  <div className="py-4">
                    <h4 className="mb-3 font-serif text-xs font-bold uppercase tracking-wider text-green-dark">
                      Payment Verification
                    </h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted">
                          <Banknote className="h-3.5 w-3.5" /> Amount Paid
                        </span>
                        <span className="text-base font-black text-green-mid">{formatPHP(selectedTxn.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted">
                          <CreditCard className="h-3.5 w-3.5" /> Payment Method
                        </span>
                        <MethodBadge method={selectedTxn.paymentMethod} />
                      </div>
                      {selectedTxn.gcashRef && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-muted">
                            <Smartphone className="h-3.5 w-3.5" /> GCash Ref
                          </span>
                          <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md">
                            {selectedTxn.gcashRef}
                          </span>
                        </div>
                      )}
                      {selectedTxn.isArchived && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 mt-2 space-y-1">
                          <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                            <Archive className="h-3 w-3" /> Archived Record
                          </div>
                          <p className="text-[10px] text-amber-800">
                            Archived on {formatDate(selectedTxn.archivedAt)}
                            {selectedTxn.archiveReason ? ` · Reason: ${selectedTxn.archiveReason}` : ""}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin Actions Footer */}
                <div className="px-5 pb-5 pt-4 border-t border-cream-2 bg-cream/10 space-y-2">
                  <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-green-dark">
                    Administrator Controls
                  </h4>

                  {/* Workflow Approval Buttons */}
                  {selectedTxn.status === "pending" && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        disabled={busy}
                        onClick={() => updateStatus("approved")}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => updateStatus("voided")}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Void
                      </button>
                    </div>
                  )}

                  {selectedTxn.status === "approved" && (
                    <button
                      disabled={busy}
                      onClick={() => updateStatus("voided")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Void Payment
                    </button>
                  )}

                  {selectedTxn.status === "voided" && (
                    <button
                      disabled={busy}
                      onClick={() => updateStatus("pending")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Reopen as Pending
                    </button>
                  )}

                  {/* Archive vs Restore Buttons */}
                  {!selectedTxn.isArchived ? (
                    <button
                      disabled={busy}
                      onClick={() => {
                        setArchiveModalTxn(selectedTxn);
                        setArchiveReasonInput("");
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-white px-4 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
                    >
                      <Archive className="h-3.5 w-3.5" /> Move to Payment Archive
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        disabled={busy}
                        onClick={() => handleRestore(selectedTxn)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => setDeleteModalTxn(selectedTxn)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  )}

                  <button
                    onClick={closeDrawer}
                    className="flex w-full items-center justify-center rounded-xl border border-cream-2 bg-white px-4 py-2 text-xs font-medium text-muted transition hover:bg-cream"
                  >
                    Close Panel
                  </button>
                </div>
              </aside>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
