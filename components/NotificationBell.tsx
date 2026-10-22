"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { InAppNotification } from "@/lib/mock-data";
import {
  Bell,
  Megaphone,
  CalendarDays,
  Eye,
  X,
  Clock,
  Coins,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  CreditCard,
} from "lucide-react";

interface NotificationBellProps {
  align?: "left" | "right";
  compact?: boolean;
  onNotificationsUpdate?: (notifications: InAppNotification[], unreadCount: number) => void;
}

const emptySubscribe = () => () => {};

export default function NotificationBell({
  align = "right",
  compact = false,
  onNotificationsUpdate,
}: NotificationBellProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [selectedNotification, setSelectedNotification] = useState<InAppNotification | null>(null);
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications belonging to current user
  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    const loadNotifications = () => {
      api
        .notifications()
        .then((res) => {
          if (!active) return;
          const notifs = res.notifications || [];
          const count = res.unreadCount || 0;
          setNotifications(notifs);
          setUnreadCount(count);
          if (onNotificationsUpdate) {
            onNotificationsUpdate(notifs, count);
          }
        })
        .catch(() => {});
    };

    loadNotifications();

    const interval = setInterval(loadNotifications, 15000);
    const handleFocus = () => loadNotifications();
    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, onNotificationsUpdate]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation (Escape to close dropdown or modal)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selectedNotification) {
          setSelectedNotification(null);
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedNotification]);

  // Handle clicking a notification: opens detail modal and marks as read in database
  const handleNotificationClick = async (notif: InAppNotification) => {
    setSelectedNotification(notif);
    setIsOpen(false);

    if (!notif.isRead) {
      try {
        await api.markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        const newCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newCount);
        if (onNotificationsUpdate) {
          onNotificationsUpdate(
            notifications.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
            newCount
          );
        }
      } catch {
        // Fallback optimistic update
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      }
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      const updated = notifications.map((n) => ({ ...n, isRead: true }));
      setNotifications(updated);
      setUnreadCount(0);
      if (onNotificationsUpdate) {
        onNotificationsUpdate(updated, 0);
      }
    } catch {}
  };

  // Helper to get notification type display properties
  const getTypeInfo = (type: string) => {
    if (type === "reservation") {
      return {
        label: "Amenity Booking",
        icon: CalendarDays,
        badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        iconBg: "bg-emerald-100 text-emerald-800",
      };
    }
    if (type === "viewing") {
      return {
        label: "Property Viewing",
        icon: Eye,
        badgeBg: "bg-sky-50 text-sky-800 border-sky-200",
        iconBg: "bg-sky-100 text-sky-800",
      };
    }
    if (type === "announcement") {
      return {
        label: "HOA Announcement",
        icon: Megaphone,
        badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
        iconBg: "bg-amber-100 text-amber-800",
      };
    }
    if (type === "dues") {
      return {
        label: "Monthly Dues",
        icon: Coins,
        badgeBg: "bg-purple-50 text-purple-800 border-purple-200",
        iconBg: "bg-purple-100 text-purple-800",
      };
    }
    if (type === "payment") {
      return {
        label: "Payment & Verification",
        icon: CreditCard,
        badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        iconBg: "bg-emerald-100 text-emerald-800",
      };
    }
    return {
      label: "System Notice",
      icon: Bell,
      badgeBg: "bg-gray-100 text-gray-800 border-gray-200",
      iconBg: "bg-gray-100 text-gray-700",
    };
  };

  // Format relative timestamp
  const getRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Format full timestamp for modal
  const getFullTimestamp = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Extract or resolve structured details for modal
  const resolveDetails = (notif: InAppNotification) => {
    const meta = notif.metadata || {};
    const lowerTitle = notif.title.toLowerCase();

    // Amenity details
    let amenity = meta.amenityName;
    let date = meta.date;
    const time = meta.time;
    let guests = meta.guests;
    let amount = meta.totalAmount;
    let status = meta.status;
    const reason = meta.reason;
    let listing = meta.listingName;

    // Fallback parsing for notifications without saved metadata
    if (notif.type === "reservation") {
      if (!amenity) {
        const m = notif.message.match(/for ([\w\s]+) on ([\d-]+)/i);
        if (m) {
          amenity = m[1].trim();
          date = m[2].trim();
        }
      }
      if (!guests) {
        const m = notif.message.match(/(\d+)\s*(pax|guests)/i);
        if (m) guests = parseInt(m[1], 10);
      }
      if (!amount) {
        const m = notif.message.match(/₱([\d,]+)/);
        if (m) amount = parseInt(m[1].replace(/,/g, ""), 10);
      }
      if (!status) {
        if (lowerTitle.includes("approved")) status = "Approved";
        else if (lowerTitle.includes("cancelled")) status = "Cancelled";
        else if (lowerTitle.includes("declined") || lowerTitle.includes("rejected")) status = "Declined";
        else status = "Pending";
      }
    } else if (notif.type === "viewing") {
      if (!listing) {
        const m = notif.message.match(/for ([\w\s#-]+) on ([\d-]+)/i);
        if (m) {
          listing = m[1].trim();
          date = m[2].trim();
        }
      }
      if (!status) {
        if (lowerTitle.includes("confirmed") || lowerTitle.includes("scheduled")) status = "Confirmed";
        else if (lowerTitle.includes("cancelled")) status = "Cancelled";
        else if (lowerTitle.includes("declined")) status = "Declined";
        else status = "Pending";
      }
    }

    return { amenity, listing, date, time, guests, amount, status, reason };
  };

  if (!user) return null;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Bell Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative group flex items-center justify-center rounded-full border transition-all duration-200 cursor-pointer shadow-2xs ${
            isOpen
              ? "bg-[#e8f3ec] text-[#123f2a] border-[#45a057]/60 ring-2 ring-[#45a057]/20"
              : "border-gray-200 bg-gray-50/80 text-gray-600 hover:bg-[#e8f3ec] hover:text-[#123f2a] hover:border-[#45a057]/40"
          } ${compact ? "h-8 w-8" : "h-9 w-9"}`}
          title="Notifications"
          aria-label="Notifications"
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <Bell className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} group-hover:rotate-12 transition-transform duration-200`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
              <span className="relative flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className={`absolute mt-2.5 w-[calc(100vw-2rem)] sm:w-96 max-w-[390px] rounded-2xl border border-gray-100 bg-white/98 shadow-[0_20px_50px_-10px_rgba(18,63,42,0.18),0_10px_20px_-5px_rgba(0,0,0,0.06)] ring-1 ring-black/5 z-[100] overflow-hidden animate-popup transform ${
              align === "left" ? "left-0 origin-top-left" : "right-0 origin-top-right"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 bg-gradient-to-r from-gray-50/90 to-[#e8f3ec]/30">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#123f2a] text-white shadow-2xs">
                  <Bell className="h-3.5 w-3.5" />
                </div>
                <span className="font-serif text-sm font-bold text-[#123f2a]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-[#1b5338] hover:text-[#123f2a] hover:underline cursor-pointer transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Scrollable Notifications List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 scroll-thin">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                    <Bell className="h-5 w-5 opacity-60" />
                  </div>
                  <p className="font-medium text-gray-500">No notifications yet.</p>
                  <p className="text-[11px] text-gray-400">You&apos;re completely up to date.</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const info = getTypeInfo(n.type);
                  const Icon = info.icon;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left flex items-start gap-3 p-3.5 transition-all duration-150 cursor-pointer border-l-4 ${
                        !n.isRead
                          ? "bg-[#e8f3ec]/40 hover:bg-[#e8f3ec]/70 border-[#45a057]"
                          : "bg-white hover:bg-gray-50/90 border-transparent"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          !n.isRead ? info.iconBg : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-xs truncate ${
                              !n.isRead ? "font-bold text-[#123f2a]" : "font-medium text-gray-700"
                            }`}
                          >
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span
                              className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-200"
                              title="Unread notification"
                            />
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        {n.createdAt && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                            <Clock className="h-3 w-3" />
                            {getRelativeTime(n.createdAt)}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Note: "View all announcements" has been permanently removed per requirements */}
          </div>
        )}
      </div>

      {/* ── NOTIFICATION DETAIL MODAL ────────────────────────────────────── */}
      {selectedNotification && isClient && createPortal(
        <div
          className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity duration-200 animate-fade-in"
          onClick={() => setSelectedNotification(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 text-[#123f2a] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] animate-modal-popup border border-gray-100 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar: Category Pill & Close 'X' Button */}
            <div className="flex items-center justify-between gap-2">
              {(() => {
                const info = getTypeInfo(selectedNotification.type);
                const Icon = info.icon;
                return (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${info.badgeBg}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{info.label}</span>
                  </span>
                );
              })()}

              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                title="Close notification"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Title */}
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#123f2a] mt-3.5 leading-snug">
              {selectedNotification.title}
            </h3>

            {/* Timestamp */}
            {selectedNotification.createdAt && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                <span>{getFullTimestamp(selectedNotification.createdAt)}</span>
              </div>
            )}

            <div className="my-4 border-t border-gray-100" />

            {/* Complete Message Content */}
            <div className="text-sm sm:text-[15px] text-gray-700 leading-relaxed font-normal whitespace-pre-line">
              {selectedNotification.message}
            </div>

            {/* Structured Details Card (for Amenities, Property Viewings, or Announcements) */}
            {(() => {
              const details = resolveDetails(selectedNotification);
              const hasBookingInfo = details.amenity || details.listing || details.date || details.status;

              if (!hasBookingInfo) return null;

              return (
                <div className="mt-5 rounded-2xl bg-[#e8f3ec]/40 border border-[#45a057]/20 p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="h-4 w-4 text-[#123f2a]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#123f2a]">
                      {selectedNotification.type === "reservation"
                        ? "Booking Details"
                        : selectedNotification.type === "viewing"
                        ? "Viewing Details"
                        : "Notice Information"}
                    </h4>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                    {details.amenity && (
                      <div>
                        <dt className="text-gray-500 font-medium">Amenity</dt>
                        <dd className="font-bold text-[#123f2a] mt-0.5">{details.amenity}</dd>
                      </div>
                    )}

                    {details.listing && (
                      <div>
                        <dt className="text-gray-500 font-medium">Property</dt>
                        <dd className="font-bold text-[#123f2a] mt-0.5">{details.listing}</dd>
                      </div>
                    )}

                    {details.date && (
                      <div>
                        <dt className="text-gray-500 font-medium">Scheduled Date</dt>
                        <dd className="font-bold text-[#123f2a] mt-0.5">{details.date}</dd>
                      </div>
                    )}

                    {details.time && (
                      <div>
                        <dt className="text-gray-500 font-medium">Time / Session</dt>
                        <dd className="font-bold text-[#123f2a] mt-0.5">{details.time}</dd>
                      </div>
                    )}

                    {typeof details.guests === "number" && (
                      <div>
                        <dt className="text-gray-500 font-medium">Guests</dt>
                        <dd className="font-bold text-[#123f2a] mt-0.5">{details.guests} pax</dd>
                      </div>
                    )}

                    {typeof details.amount === "number" && (
                      <div>
                        <dt className="text-gray-500 font-medium">Total Price</dt>
                        <dd className="font-bold text-[#123f2a] mt-0.5">₱{details.amount.toLocaleString()}</dd>
                      </div>
                    )}

                    {details.status && (
                      <div className="sm:col-span-2 mt-1">
                        <dt className="text-gray-500 font-medium">Status</dt>
                        <dd className="mt-1">
                          {details.status.toLowerCase().includes("approved") ||
                          details.status.toLowerCase().includes("confirmed") ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              {details.status}
                            </span>
                          ) : details.status.toLowerCase().includes("cancelled") ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                              <XCircle className="h-3 w-3" />
                              {details.status}
                            </span>
                          ) : details.status.toLowerCase().includes("declined") ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-700 border border-gray-200">
                              <AlertCircle className="h-3 w-3" />
                              {details.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                              <Clock className="h-3 w-3" />
                              {details.status}
                            </span>
                          )}
                        </dd>
                      </div>
                    )}

                    {details.reason && (
                      <div className="sm:col-span-2 mt-1">
                        <dt className="text-gray-500 font-medium">Reason / Remarks</dt>
                        <dd className="font-medium text-rose-800 bg-rose-50/60 rounded-xl p-2.5 mt-1 border border-rose-100">
                          {details.reason}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              );
            })()}

            {/* Bottom Modal Actions */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
              {selectedNotification.link && (
                <Link
                  href={selectedNotification.link}
                  onClick={() => setSelectedNotification(null)}
                  className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {selectedNotification.type === "announcement"
                    ? "Open Announcements →"
                    : "View in History →"}
                </Link>
              )}

              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="rounded-full bg-[#123f2a] px-6 py-2 text-xs font-bold text-white hover:bg-[#1b5338] transition-colors shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
