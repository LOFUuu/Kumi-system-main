"use client";

import { useMemo, useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  blocked: string[];
  selected: string;
  onSelect: (iso: string) => void;
}

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function AvailabilityCalendar({ blocked, selected, onSelect }: Props) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  }, []);

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });

  const blockedSet = useMemo(() => new Set(blocked), [blocked]);

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(d);
    return out;
  }, [cursor]);

  const monthLabel = `${MONTHS[cursor.m]} ${cursor.y}`;

  return (
    <div className="rounded-2xl border border-cream-2 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}
          className="rounded-lg px-2.5 py-1 text-sm font-bold text-muted hover:bg-cream"
        >
          ←
        </button>
        <div className="text-sm font-bold text-green-dark">{monthLabel}</div>
        <button
          type="button"
          onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}
          className="rounded-lg px-2.5 py-1 text-sm font-bold text-muted hover:bg-cream"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-[10px] font-bold uppercase text-muted">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const iso = toISO(cursor.y, cursor.m, d);
          const isPast = new Date(cursor.y, cursor.m, d).getTime() < today;
          const isBlocked = blockedSet.has(iso);
          const isSelected = iso === selected;

          let cls = "cursor-pointer text-green-dark hover:bg-green-light/40";
          let disabled = false;
          if (isPast) {
            cls = "text-muted/40 cursor-not-allowed";
            disabled = true;
          } else if (isBlocked) {
            cls = "bg-danger/10 text-danger line-through cursor-not-allowed";
            disabled = true;
          }
          if (isSelected && !disabled) {
            cls = "bg-green-mid text-white font-bold hover:bg-green-mid";
          }

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect(iso)}
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-xs transition ${cls}`}
            >
              {d}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-green-mid" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-danger/20" /> Booked / Locked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded border border-cream-2 bg-white" /> Past
        </span>
      </div>
    </div>
  );
}
