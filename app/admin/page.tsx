import Link from "next/link";
import { getUsers, getListings, getReservations, getDues, getTransactions } from "@/lib/db";

export default async function AdminHome() {
  const [users, listings, reservations, dues, transactions] = await Promise.all([
    getUsers(),
    getListings(),
    getReservations(),
    getDues(),
    getTransactions(),
  ]);

  const stats = [
    { label: "Residents", value: users.filter((u) => u.role === "resident").length, href: "/admin/residents" },
    { label: "Listings", value: listings.length, href: "/admin/listings" },
    { label: "Reservations", value: reservations.length, href: "/admin/reservations" },
    { label: "Dues Records", value: dues.length, href: "/admin/dues" },
    { label: "Transactions", value: transactions.length, href: "/admin/payments" },
  ];
  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl font-bold text-green-dark">Admin Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-sm text-muted">{s.label}</div>
            <div className="font-serif text-4xl font-bold text-green-mid">{s.value}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
