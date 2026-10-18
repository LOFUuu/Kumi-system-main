"use client";

import { useEffect, useMemo, useState } from "react";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
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

  /* Build cells: includes leading blanks from previous month and trailing from next */
  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();

    // Previous month trailing days
    const prevMonthDays = new Date(cursor.y, cursor.m, 0).getDate();
    const out: { day: number; current: boolean }[] = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      out.push({ day: prevMonthDays - i, current: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ day: d, current: true });
    }
    // Next month leading days to fill last row
    const remainder = out.length % 7;
    if (remainder > 0) {
      for (let d = 1; d <= 7 - remainder; d++) {
        out.push({ day: d, current: false });
      }
    }
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
    <div>
      {/* Month Header and Navigation */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="px-2 py-1 text-sm font-bold text-[#133E2B] hover:underline"
          aria-label="Previous month"
        >
          «
        </button>
        <div className="text-sm font-bold text-[#333]">{monthLabel}</div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="px-2 py-1 text-sm font-bold text-[#133E2B] hover:underline"
          aria-label="Next month"
        >
          »
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-[#ddd]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1.5 text-center text-[11px] font-bold text-[#555]">
            {w}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          if (!cell.current) {
            // Previous/next month day — light gray, not interactive
            return (
              <div
                key={`other-${i}`}
                className="flex h-9 items-center justify-center border-b border-r border-[#eee] text-xs text-[#ccc]"
              >
                {cell.day}
              </div>
            );
          }

          const d = cell.day;
          const iso = toISO(cursor.y, cursor.m, d);
          const cellTime = new Date(cursor.y, cursor.m, d).getTime();
          const isPast = cellTime < today;
          const statusInfo = datesStatus?.[iso];
          const isBlocked = statusInfo ? statusInfo.status === "booked" : blockedSet.has(iso);
          const isSelected = iso === selected;

          let bg = "";
          let textColor = "";
          let fontWeight = "";
          let cursorStyle = "cursor-pointer";

          if (isPast) {
            bg = "bg-white";
            textColor = "text-[#bbb]";
            cursorStyle = "cursor-not-allowed";
          } else if (isSelected) {
            bg = "bg-[#133E2B]";
            textColor = "text-white";
            fontWeight = "font-bold";
          } else if (isBlocked) {
            bg = "bg-[#ffe5e5]";
            textColor = "text-[#c00]";
            fontWeight = "font-bold";
            cursorStyle = "cursor-not-allowed";
          } else {
            // Available (includes "limited" — still bookable)
            bg = "bg-[#e8f5e9]";
            textColor = "text-[#1b5e20]";
            fontWeight = "font-bold";
          }

          return (
            <button
              key={iso}
              type="button"
              disabled={isPast || isBlocked}
              onClick={() => !(isPast || isBlocked) && onSelect(iso)}
              title={
                isPast
                  ? "Past date"
                  : isBlocked
                  ? "Fully booked"
                  : statusInfo?.status === "limited"
                  ? `Limited (${statusInfo?.remainingSlots ?? 0} slots left)`
                  : "Available"
              }
              className={`flex h-9 items-center justify-center border-b border-r border-[#eee] text-xs transition-colors ${bg} ${textColor} ${fontWeight} ${cursorStyle}`}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Legend — simple box style like passport.gov.ph */}
      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-[#555]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-5 border border-[#4caf50] bg-[#e8f5e9]" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-5 border border-[#c00] bg-[#ffe5e5]" /> Fully Booked
        </span>
      </div>
    </div>
  );
}
