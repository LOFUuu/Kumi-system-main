"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="card">
      <div className="text-sm text-muted">{label}</div>
      <div
        className={`font-serif text-3xl font-bold ${accent ?? "text-green-dark"}`}
      >
        {value}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [listings, setListings] = useState<HouseListing[]>([]);
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [dues, setDues] = useState<DuesRecord[]>([]);

  useEffect(() => {
    api
      .users()
      .then(setUsers)
      .catch(() => setUsers([]));
    api
      .transactions()
      .then(setTxns)
      .catch(() => setTxns([]));
    api
      .reservations()
      .then(setReservations)
      .catch(() => setReservations([]));
    api
      .listings()
      .then(setListings)
      .catch(() => setListings([]));
    api
      .announcements(true)
      .then(setAnns)
      .catch(() => setAnns([]));
    api
      .dues()
      .then(setDues)
      .catch(() => setDues([]));
  }, []);

  const residents = users.filter((u) => u.role === "resident").length;
  const nonRes = users.filter((u) => u.role === "non_resident").length;
  const userCount = users.filter((u) => u.role !== "admin").length;
  const active = users.filter((u) => u.isActive && u.role !== "admin").length;
  const pendingPay = txns.filter((t) => t.status === "pending").length;
  const approvedPay = txns.filter((t) => t.status === "approved").length;
  const revenue = txns
    .filter((t) => t.status === "approved")
    .reduce((s, t) => s + t.amount, 0);
  const pendingRes = reservations.filter((r) => r.status === "pending").length;
  const available = listings.filter((l) => l.status === "available").length;
  const annCount = anns.filter((a) => a.status === "active").length;
  const unpaid = dues.filter(
    (d) => d.status === "unpaid" || d.status === "delayed",
  ).length;
  const paidDues = dues.filter((d) => d.status === "paid").length;

  return (
    <div className="min-h-screen bg-cream/40">
      <div className="border-b border-cream-2 bg-gradient-to-br from-green-dark to-green-mid px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-serif text-4xl font-bold">
            Welcome, {user?.fullName ?? "Admin"} 👋
          </h1>
          <p className="text-white/70">
            Community overview &amp; management at a glance.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Residents" value={residents} />
          <Stat label="Non-Residents" value={nonRes} />
          <Stat label="Active Users" value={active} />
          <Stat label="Total Users" value={userCount} />
          <Stat
            label="Pending Payments"
            value={pendingPay}
            accent="text-green-mid"
          />
          <Stat
            label="Approved Payments"
            value={approvedPay}
            accent="text-green-mid"
          />
          <Stat
            label="Total Revenue"
            value={formatPHP(revenue)}
            accent="text-green-mid"
          />
          <Stat
            label="Pending Reservations"
            value={pendingRes}
            accent="text-green-mid"
          />
          <Stat label="Active Listings" value={available} />
          <Stat label="Announcements" value={annCount} />
          <Stat label="Unpaid Dues" value={unpaid} accent="text-danger" />
          <Stat label="Paid Dues" value={paidDues} accent="text-green-mid" />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="mb-4 font-serif text-xl font-bold text-green-dark">
              Recent Transactions
            </h2>
            <ul className="divide-y divide-cream-2">
              {txns.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <div className="font-semibold text-green-dark">
                      {t.residentName}
                    </div>
                    <div className="text-xs text-muted capitalize">
                      {t.refType} · {t.createdAt}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-mid">
                      {formatPHP(t.amount)}
                    </div>
                    <span
                      className={`badge ${t.status === "approved" ? "badge-green" : "badge-gold"}`}
                    >
                      {t.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2 className="mb-4 font-serif text-xl font-bold text-green-dark">
              Active Announcements
            </h2>
            <ul className="space-y-3">
              {anns
                .filter((a) => a.status === "active")
                .map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-cream-2 p-3"
                  >
                    <div className="font-semibold text-green-dark">
                      {a.title}
                    </div>
                    <div className="line-clamp-2 text-xs text-muted">
                      {a.content}
                    </div>
                  </li>
                ))}
            </ul>
            <div className="mt-4">
              <Link
                href="/admin/announcements"
                className="btn-ghost w-full !py-2 text-sm"
              >
                Manage Announcements →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/admin/residents" className="text-white btn-green">
            Manage Residents
          </Link>
          <Link href="/admin/listings" className="btn-green">
            Manage Listings
          </Link>
          <Link href="/admin/amenities" className="btn-green">
            Manage Amenities
          </Link>
          <Link href="/admin/reports" className="btn-green">
            Reports
          </Link>
        </div>
      </div>
    </div>
  );
}
