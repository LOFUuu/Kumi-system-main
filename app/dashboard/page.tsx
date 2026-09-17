"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  CreditCard,
  Home,
  Megaphone,
  Clock,
  CheckCircle2,
  XCircle,
  Receipt,
  MapPin,
  Plus,
  ArrowRight,
  Eye,
  X,
  ExternalLink,
  Download,
  ZoomIn,
  Image as ImageIcon,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  formatPHP,
  type User,
  type Transaction,
  type Reservation,
  type HouseListing,
  type Announcement,
  type DuesRecord,
} from "@/lib/mock-data";
import { outstandingFor } from "@/lib/dues";

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

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [listings, setListings] = useState<HouseListing[]>([]);
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [dues, setDues] = useState<DuesRecord[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    api.users().then(setUsers).catch(() => setUsers([]));
    api.transactions().then(setTxns).catch(() => setTxns([]));
    api.reservations().then(setReservations).catch(() => setReservations([]));
    api.listings().then(setListings).catch(() => setListings([]));
    api.announcements(true).then(setAnns).catch(() => setAnns([]));
    api.dues().then(setDues).catch(() => setDues([]));
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "counselor";

  // Filter items specifically for the current logged-in user
  const myReservations = useMemo(() => {
    if (!user) return [];
    return reservations.filter(
      (r) =>
        (r.userEmail && r.userEmail === user.email) ||
        (r.residentName && r.residentName.toLowerCase() === user.fullName.toLowerCase())
    );
  }, [reservations, user]);

  const myTxns = useMemo(() => {
    if (!user) return [];
    return txns.filter(
      (t) =>
        (t.userEmail && t.userEmail === user.email) ||
        (t.residentName && t.residentName.toLowerCase() === user.fullName.toLowerCase())
    );
  }, [txns, user]);

  const myDues = useMemo(() => {
    if (!user) return [];
    return dues.filter(
      (d) => d.residentName.toLowerCase() === user.fullName.toLowerCase()
    );
  }, [dues, user]);

  const myListings = useMemo(() => {
    if (!user) return [];
    return listings.filter((l) => l.uploadedBy === user.id);
  }, [listings, user]);

  // Admin community stats
  const adminResidents = users.filter((u) => u.role === "resident").length;
  const adminNonRes = users.filter((u) => u.role === "non_resident").length;
  const adminActive = users.filter((u) => u.isActive && u.role !== "admin").length;
  const adminUserCount = users.filter((u) => u.role !== "admin").length;
  const adminPendingPay = txns.filter((t) => t.status === "pending").length;
  const adminApprovedPay = txns.filter((t) => t.status === "approved").length;
  const adminRevenue = txns
    .filter((t) => t.status === "approved")
    .reduce((s, t) => s + t.amount, 0);
  const adminPendingRes = reservations.filter((r) => r.status === "pending").length;

  // Resident personal stats
  const myPendingBookings = myReservations.filter((r) => r.status === "pending").length;
  const myApprovedBookings = myReservations.filter((r) => r.status === "approved").length;
  const myTotalOutstanding = myDues.reduce((s, d) => s + outstandingFor(d), 0);
  const myTotalPaidDues = myDues.reduce((s, d) => s + (d.amountPaid || 0), 0);
  const myTotalPayments = myTxns.reduce((s, t) => s + t.amount, 0);

  if (loading) {
    return (
      <div className="section">
        <p className="text-muted">Loading your dashboard…</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. ADMIN / COUNSELOR DASHBOARD VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-cream/40 pb-12">
        <div className="border-b border-cream-2 bg-gradient-to-br from-green-dark to-green-mid px-6 py-8 text-white">
          <div className="mx-auto max-w-7xl flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold text-gold mb-2">
                <Shield className="h-3.5 w-3.5" /> HOA Administration
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold">
                Welcome, {user?.fullName ?? "Admin"}
              </h1>
              <p className="text-white/80 text-sm">
                Community overview, resident records &amp; payment management.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/payments" className="btn-gold !text-sm !py-2 shadow-md">
                Review Payments ({adminPendingPay})
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Residents</div>
              <div className="font-serif text-3xl font-bold text-green-dark">{adminResidents}</div>
            </div>
            <div className="card">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Active Users</div>
              <div className="font-serif text-3xl font-bold text-green-dark">{adminActive}</div>
            </div>
            <div className="card">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Pending Payments</div>
              <div className="font-serif text-3xl font-bold text-amber-600">{adminPendingPay}</div>
            </div>
            <div className="card">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Total Revenue</div>
              <div className="font-serif text-3xl font-bold text-green-mid">{formatPHP(adminRevenue)}</div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-bold text-green-dark">Recent Transactions</h2>
                <Link href="/admin/payments" className="text-xs font-bold text-green-mid hover:underline">
                  View All →
                </Link>
              </div>
              <ul className="divide-y divide-cream-2 text-xs">
                {txns.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-bold text-green-dark">{t.residentName}</div>
                      <div className="text-muted capitalize">{t.refType} · {formatDate(t.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-mid">{formatPHP(t.amount)}</div>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        t.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-bold text-green-dark">Pending Reservations</h2>
                <Link href="/admin/reservations" className="text-xs font-bold text-green-mid hover:underline">
                  Manage →
                </Link>
              </div>
              <ul className="divide-y divide-cream-2 text-xs">
                {reservations.filter((r) => r.status === "pending").slice(0, 6).map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-bold text-green-dark">{r.residentName}</div>
                      <div className="text-muted">{r.amenityName} · {r.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-mid">{formatPHP(r.downpayment)}</div>
                      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Pending Approval
                      </span>
                    </div>
                  </li>
                ))}
                {reservations.filter((r) => r.status === "pending").length === 0 && (
                  <li className="py-6 text-center text-muted">No pending reservations.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/residents" className="btn-green !text-white">Manage Residents</Link>
            <Link href="/admin/payments" className="btn-green !text-white">Manage Payments</Link>
            <Link href="/admin/reservations" className="btn-green !text-white">Manage Reservations</Link>
            <Link href="/admin/listings" className="btn-green !text-white">Manage Listings</Link>
            <Link href="/admin/amenities" className="btn-green !text-white">Manage Amenities</Link>
            <Link href="/admin/reports" className="btn-green !text-white">Reports</Link>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. RESIDENT / USER PERSONAL DASHBOARD VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream/30 pb-16">
      {/* RECEIPT LIGHTBOX MODAL */}
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
                  My Payment Receipt
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
              <img
                src={lightboxUrl}
                alt="My Receipt"
                className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* HERO HEADER */}
      <div className="border-b border-cream-2 bg-gradient-to-br from-green-dark via-green-deep to-green-mid px-6 py-8 text-white shadow-md">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-gold mb-2 backdrop-blur-sm">
                <UserIcon className="h-3.5 w-3.5" />
                {user?.role === "resident" ? "Verified Resident" : "Member"}
                {user?.blockNo && user?.lotNo && ` · Block ${user.blockNo}, Lot ${user.lotNo}`}
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold">
                Welcome back, {user?.fullName || "Resident"}
              </h1>
              <p className="mt-1 text-sm text-white/80">
                Track your amenity bookings, monthly dues, and community announcements.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link href="/reservation" className="btn-gold !py-2.5 !px-4 text-xs font-bold shadow-lg flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> Book Amenity
              </Link>
              <Link href="/my-dues" className="btn-green !bg-white/20 !hover:bg-white/30 !py-2.5 !px-4 text-xs font-bold text-white border border-white/30 flex items-center gap-1.5">
                <CreditCard className="h-4 w-4" /> Pay Dues
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* PERSONAL KPI CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: My Bookings */}
          <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                My Bookings
              </div>
              <div className="font-serif text-2xl font-bold text-green-dark">
                {myReservations.length}
              </div>
              <div className="text-[11px] text-muted">
                {myPendingBookings > 0 ? `${myPendingBookings} pending approval` : "All confirmed"}
              </div>
            </div>
          </div>

          {/* Card 2: Dues Outstanding */}
          <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                Dues Balance
              </div>
              <div className={`font-serif text-2xl font-bold ${myTotalOutstanding > 0 ? "text-amber-700" : "text-green-mid"}`}>
                {formatPHP(myTotalOutstanding)}
              </div>
              <div className="text-[11px] text-muted">
                {myTotalOutstanding > 0 ? "Due this cycle" : "Up to date ✓"}
              </div>
            </div>
          </div>

          {/* Card 3: Total Paid */}
          <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                My Payments
              </div>
              <div className="font-serif text-2xl font-bold text-green-dark">
                {formatPHP(myTotalPayments)}
              </div>
              <div className="text-[11px] text-muted">
                {myTxns.length} total transaction{myTxns.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          {/* Card 4: My Property Listings */}
          <div className="flex items-center gap-4 rounded-2xl border border-cream-2 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-700">
              <Home className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                My Listings
              </div>
              <div className="font-serif text-2xl font-bold text-green-dark">
                {myListings.length}
              </div>
              <div className="text-[11px] text-muted">
                <Link href="/my-listings" className="text-green-mid hover:underline">
                  Manage properties →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN 2-COLUMN SECTION: MY BOOKINGS & RECENT PAYMENTS */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* MY BOOKINGS / RESERVATIONS */}
          <div className="rounded-2xl border border-cream-2 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-cream-2 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-mid" />
                  <h2 className="font-serif text-lg font-bold text-green-dark">
                    My Amenity Reservations
                  </h2>
                </div>
                <Link
                  href="/reservation"
                  className="inline-flex items-center gap-1 text-xs font-bold text-green-mid hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Book New
                </Link>
              </div>

              {myReservations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-cream-2 bg-cream/20 p-8 text-center text-muted">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted/50" />
                  <p className="text-xs font-semibold">You have no amenity reservations yet.</p>
                  <Link href="/reservation" className="btn-green inline-block mt-3 !py-1.5 !px-3 text-xs">
                    Book Swimming Pool or Court
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-cream-2 text-xs">
                  {myReservations.slice(0, 5).map((r) => (
                    <li key={r.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-green-dark text-sm">{r.amenityName}</div>
                        <div className="text-muted flex items-center gap-2 mt-0.5">
                          <span>{formatDate(r.date)}</span>
                          <span>•</span>
                          <span className="capitalize">{r.bookingType} session</span>
                          <span>•</span>
                          <span>{r.paxCount} pax</span>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        <div className="font-bold text-green-mid">{formatPHP(r.downpayment)}</div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
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
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {myReservations.length > 5 && (
              <div className="pt-3 border-t border-cream-2 text-center">
                <span className="text-xs text-muted">Showing 5 of {myReservations.length} reservations</span>
              </div>
            )}
          </div>

          {/* MY RECENT PAYMENTS & RECEIPTS */}
          <div className="rounded-2xl border border-cream-2 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-cream-2 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-green-mid" />
                  <h2 className="font-serif text-lg font-bold text-green-dark">
                    My Payment History
                  </h2>
                </div>
                <Link
                  href="/my-dues"
                  className="inline-flex items-center gap-1 text-xs font-bold text-green-mid hover:underline"
                >
                  View Dues →
                </Link>
              </div>

              {myTxns.length === 0 ? (
                <div className="rounded-xl border border-dashed border-cream-2 bg-cream/20 p-8 text-center text-muted">
                  <Receipt className="h-8 w-8 mx-auto mb-2 text-muted/50" />
                  <p className="text-xs font-semibold">No payment transactions recorded yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-cream-2 text-xs">
                  {myTxns.slice(0, 5).map((t) => (
                    <li key={t.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-green-dark capitalize">
                          {t.refType} Payment
                        </div>
                        <div className="text-muted flex items-center gap-2 mt-0.5">
                          <span>{formatDate(t.createdAt)}</span>
                          <span>•</span>
                          <span className="uppercase font-semibold text-blue-700">{t.paymentMethod}</span>
                          {t.gcashRef && (
                            <span className="font-mono text-[10px] text-muted">Ref: {t.gcashRef}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        <div className="font-bold text-green-mid text-sm">{formatPHP(t.amount)}</div>
                        <div className="flex items-center gap-1.5">
                          {t.receiptPath && (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(t.receiptPath!)}
                              className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                              title="View receipt"
                            >
                              <ImageIcon className="h-3 w-3" /> Receipt
                            </button>
                          )}
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              t.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : t.status === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {myTxns.length > 5 && (
              <div className="pt-3 border-t border-cream-2 text-center">
                <span className="text-xs text-muted">Showing 5 of {myTxns.length} payments</span>
              </div>
            )}
          </div>
        </div>

        {/* COMMUNITY ANNOUNCEMENTS */}
        <div className="rounded-2xl border border-cream-2 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-cream-2 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-gold" />
              <h2 className="font-serif text-lg font-bold text-green-dark">
                Latest Community Announcements
              </h2>
            </div>
            <Link
              href="/announcements"
              className="text-xs font-bold text-green-mid hover:underline"
            >
              View All Announcements →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {anns.slice(0, 3).map((a) => (
              <div key={a.id} className="rounded-xl border border-cream-2 bg-cream/20 p-4">
                <div className="font-bold text-green-dark text-sm">{a.title}</div>
                <p className="mt-1 line-clamp-3 text-xs text-muted">{a.content}</p>
                <div className="mt-3 text-[10px] text-muted font-semibold">{a.postDate || "Recent"}</div>
              </div>
            ))}
            {anns.length === 0 && (
              <p className="text-xs text-muted col-span-3 py-4 text-center">No announcements at this time.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
