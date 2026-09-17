"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatPHP, type User, type Transaction, type DuesRecord, type Reservation } from "@/lib/mock-data";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const REV = [1200, 1500, 900, 2100, 1800, 2400, 1700, 2600, 0, 0, 0, 0];

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-32 w-10 items-end overflow-hidden rounded-t bg-cream">
        <div className={`w-full ${color}`} style={{ height: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

export default function AdminReportsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [dues, setDues] = useState<DuesRecord[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    api.users().then(setUsers).catch(() => setUsers([]));
    api.transactions().then(setTxns).catch(() => setTxns([]));
    api.dues().then(setDues).catch(() => setDues([]));
    api.reservations().then(setReservations).catch(() => setReservations([]));
  }, []);

  const residents = users.filter((u) => u.role === "resident").length;
  const nonRes = users.filter((u) => u.role === "non_resident").length;
  const revenue = txns.filter((t) => t.status === "approved").reduce((s, t) => s + t.amount, 0);
  const paid = dues.filter((d) => d.status === "paid" || d.status === "advance").length;
  const delayed = dues.filter((d) => d.status === "delayed" || d.status === "unpaid").length;
  const maxRev = Math.max(...REV);

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl font-bold text-green-dark">Reports</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <div className="card"><div className="text-sm text-muted">Residents</div><div className="font-serif text-3xl font-bold text-green-dark">{residents}</div></div>
        <div className="card"><div className="text-sm text-muted">Non-Residents</div><div className="font-serif text-3xl font-bold text-green-dark">{nonRes}</div></div>
        <div className="card"><div className="text-sm text-muted">Revenue</div><div className="font-serif text-3xl font-bold text-green-mid">{formatPHP(revenue)}</div></div>
        <div className="card"><div className="text-sm text-muted">Reservations</div><div className="font-serif text-3xl font-bold text-green-dark">{reservations.length}</div></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-serif text-xl font-bold text-green-dark">Monthly Revenue</h2>
          <div className="flex justify-between gap-1">
            {MONTHS.map((m, i) => (
              <Bar key={m} label={m} value={REV[i]} max={maxRev} color="bg-green-mid" />
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 font-serif text-xl font-bold text-green-dark">Dues Status</h2>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm"><span>Paid / Advance</span><span>{paid}</span></div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-cream"><div className="h-full bg-green-mid" style={{ width: `${(paid / (paid + delayed || 1)) * 100}%` }} /></div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm"><span>Delayed / Unpaid</span><span>{delayed}</span></div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-cream"><div className="h-full bg-gold" style={{ width: `${(delayed / (paid + delayed || 1)) * 100}%` }} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
