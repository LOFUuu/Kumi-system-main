"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatPHP, type User, type Transaction, type DuesRecord, type Reservation } from "@/lib/mock-data";
import { CalendarDays, Waves, CheckCircle2, Clock, XCircle, FileText, Info } from "lucide-react";

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
  const revenue = txns.filter((t) => t.status === "approved").reduce((s, t) => s + t.amount, 0);
  const paid = dues.filter((d) => d.status === "paid" || d.status === "advance").length;
  const delayed = dues.filter((d) => d.status === "delayed" || d.status === "unpaid").length;
  const maxRev = Math.max(...REV);

  return (
    <div className="pb-12">
      <h1 className="mb-6 font-serif text-3xl font-bold text-green-dark">Reports & Analytics</h1>

      {/* Overview Metric Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="card"><div className="text-sm text-muted">Residents</div><div className="font-serif text-3xl font-bold text-green-dark">{residents}</div></div>
        <div className="card"><div className="text-sm text-muted">Revenue</div><div className="font-serif text-3xl font-bold text-green-mid">{formatPHP(revenue)}</div></div>
        <div className="card"><div className="text-sm text-muted">Total Reservations</div><div className="font-serif text-3xl font-bold text-green-dark">{reservations.length}</div></div>
      </div>

      {/* Revenue & Dues Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
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

      {/* ── Reservation Details Report Section ── */}
      <div className="overflow-hidden rounded-2xl border border-cream-2 bg-white shadow-xs">
        <div className="border-b border-cream-2 bg-[#FAF8F3] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-green-mid" />
              <h2 className="font-serif text-xl font-bold text-green-dark">
                Reservation Details Report
              </h2>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Comprehensive report detailing amenity bookings, guest details, session types, and financial status.
            </p>
          </div>
          <span className="rounded-full bg-cream px-3 py-1 text-xs font-bold text-green-dark border border-cream-2">
            {reservations.length} {reservations.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-cream/40 border-b border-cream-2 text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="p-3.5">Res ID</th>
                <th className="p-3.5">Facility / Amenity</th>
                <th className="p-3.5">Guest / Resident</th>
                <th className="p-3.5">Type & Session</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Pax & Downpay</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Notes / Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-2">
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    No reservation records found.
                  </td>
                </tr>
              ) : (
                reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-cream/20 transition">
                    {/* Res ID */}
                    <td className="p-3.5 font-mono text-[11px] font-bold text-green-dark">
                      #{r.id}
                    </td>

                    {/* Facility / Amenity */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 font-bold text-green-dark">
                        <Waves className="h-3.5 w-3.5 text-green-mid flex-shrink-0" />
                        <span>{r.amenityName}</span>
                      </div>
                    </td>

                    {/* Guest / Resident */}
                    <td className="p-3.5">
                      <div className="font-semibold text-green-dark">{r.residentName}</div>
                      {r.userEmail && <div className="text-[10px] text-muted">{r.userEmail}</div>}
                    </td>

                    {/* Type & Session */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          r.reservationType === "private"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        }`}>
                          {r.reservationType}
                        </span>
                        <span className="text-[11px] capitalize text-muted">
                          ({r.bookingType})
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="p-3.5 font-semibold text-green-dark whitespace-nowrap">
                      {r.date}
                    </td>

                    {/* Pax & Downpay */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-bold text-green-mid">{formatPHP(r.downpayment)}</div>
                      <div className="text-[10px] text-muted">{r.paxCount} pax</div>
                    </td>

                    {/* Status */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                        r.status === "approved"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : r.status === "pending"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}>
                        {r.status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                        {r.status === "pending" && <Clock className="h-3 w-3" />}
                        {r.status === "declined" && <XCircle className="h-3 w-3" />}
                        {r.status}
                      </span>
                    </td>

                    {/* Notes / Ref */}
                    <td className="p-3.5 text-muted text-[11px] max-w-[200px]">
                      {r.notes ? (
                        <span className="truncate block" title={r.notes}>{r.notes}</span>
                      ) : r.gcashRef ? (
                        <span className="font-mono text-[10px] text-green-dark">Ref: {r.gcashRef}</span>
                      ) : (
                        <span className="text-muted/40">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

