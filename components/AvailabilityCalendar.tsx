"use client";

import { useEffect, useMemo, useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface CalendarDateStatus {
  status: "available" | "limited" | "booked";
  remainingSlots?: number;
}

interface Props {
  blocked: string[];
  selected: string;
  onSelect: (iso: string) => void;
  datesStatus?: Record<string, CalendarDateStatus>;
  onMonthChange?: (year: number, month: number) => void;
}

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function AvailabilityCalendar({
  blocked,
  selected,
  onSelect,
  datesStatus,
  onMonthChange,
}: Props) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  }, []);

  const [cursor, setCursor] = useState(() => {
    if (selected && selected.length >= 10) {
      const [y, m] = selected.split("-").map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        return { y, m: m - 1 };
      }
    }
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });

  // Automatically navigate month if selected date is in a different month
  useEffect(() => {
    if (selected && selected.length >= 10) {
      const [y, m] = selected.split("-").map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setCursor((prev) => {
          if (prev.y !== y || prev.m !== m - 1) {
            return { y, m: m - 1 };
          }
          return prev;
        });
      }
    }
  }, [selected]);

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

  const handlePrevMonth = () => {
    setCursor((c) => {
      const next = c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 };
      onMonthChange?.(next.y, next.m);
      return next;
    });
  };

  const handleNextMonth = () => {
    setCursor((c) => {
      const next = c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 };
      onMonthChange?.(next.y, next.m);
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-cream-2 bg-white p-4 shadow-sm">
      {/* Month Header and Navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-cream-2 text-sm font-bold text-green-dark hover:bg-cream transition"
          aria-label="Previous month"
        >
          ←
        </button>
        <div className="font-serif text-base font-bold text-green-dark">{monthLabel}</div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-cream-2 text-sm font-bold text-green-dark hover:bg-cream transition"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
            {w}
          </div>
        ))}

        {/* Days Grid */}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const iso = toISO(cursor.y, cursor.m, d);
          const cellTime = new Date(cursor.y, cursor.m, d).getTime();
          const isPast = cellTime < today;
          const statusInfo = datesStatus?.[iso];
          const isBlocked = statusInfo ? statusInfo.status === "booked" : blockedSet.has(iso);
          const isLimited = statusInfo?.status === "limited";
          const isSelected = iso === selected;

          let cls = "";
          let disabled = false;
          let dotColor = "";

          if (isPast) {
            cls = "bg-gray-50/50 text-gray-300 border-transparent cursor-not-allowed";
            disabled = true;
          } else if (isSelected) {
            cls = "bg-[#123f2a] text-white font-bold ring-2 ring-emerald-500 shadow-md";
          } else if (isBlocked) {
            cls = "bg-rose-50/70 text-rose-400 line-through cursor-not-allowed border border-rose-100";
            disabled = true;
            dotColor = "bg-rose-400";
          } else if (isLimited) {
            cls = "bg-amber-50 text-amber-900 font-semibold border border-amber-300 hover:bg-amber-100 hover:border-amber-400";
            dotColor = "bg-amber-500";
          } else {
            cls = "bg-emerald-50/70 text-emerald-900 font-medium border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300";
            dotColor = "bg-emerald-500";
          }

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect(iso)}
              title={
                isPast
                  ? "Past date"
                  : isBlocked
                  ? "Fully booked or unavailable"
                  : isLimited
                  ? `Limited availability (${statusInfo?.remainingSlots ?? 0} slots left)`
                  : "Available"
              }
              className={`group relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-xl text-xs transition duration-150 ${cls}`}
            >
              <span>{d}</span>
              {!isPast && !isSelected && dotColor && (
                <span className={`h-1 w-1 rounded-full ${dotColor} mt-0.5`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-cream-2 pt-3 text-[11px] text-muted">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-2xs" /> Available
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-2xs" /> Limited Slots
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-2xs" /> Fully Booked / Locked
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-gray-300 shadow-2xs" /> Past
          </span>
        </div>
        <span className="flex items-center gap-1.5 font-medium text-green-dark">
          <span className="h-2.5 w-2.5 rounded-full bg-[#123f2a] shadow-2xs" /> Selected Date
        </span>
      </div>
    </div>
  );
}
