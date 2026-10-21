"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ChevronDown, LogOut, Shield, Menu, X } from "lucide-react";
import SmartSearchInput from "./SmartSearchInput";
import SyncStatusBadge from "./SyncStatusBadge";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState<number>(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch: don't render auth-dependent content until client mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setShowMoreMenu(false);
    setShowProfileMenu(false);
  }, [pathname]);

  // Fetch homeowner viewings summary to show "Viewings" tab + pending badge
  const [ownerSummary, setOwnerSummary] = useState<{ hasListings: boolean; pendingCount: number } | null>(null);

  useEffect(() => {
    if (!user || user.role === "non_resident" || user.role === "admin") {
      setOwnerSummary(null);
      return;
    }
    let isMounted = true;
    api
      .ownerViewingsSummary()
      .then((res) => {
        if (isMounted) {
          setOwnerSummary({
            hasListings: res.hasListings,
            pendingCount: res.pendingCount,
          });
        }
      })
      .catch(() => {
        if (isMounted) setOwnerSummary(null);
      });
    return () => {
      isMounted = false;
    };
  }, [user, pathname]);



  // Only use auth state after mounting to avoid server/client HTML mismatch
  const activeUser = mounted ? user : null;

  // Admin pages or logged-in admin user — hide the public navbar (only after mount)
  if (mounted && (pathname.startsWith("/admin") || activeUser?.role === "admin")) return null;

  const nav: { label: string; href: string; badge?: number }[] = [
    { label: "Home", href: "/" },
    { label: "House Listing", href: "/house-listing" },
    { label: "Amenities", href: "/reservation" },
  ];
  if (activeUser && activeUser.role !== "non_resident") nav.push({ label: "My Dues", href: "/my-dues" });
  if (activeUser) {
    nav.push({ label: "Map", href: "/map" });
    nav.push({
      label: "Announcements",
      href: "/announcements",
      badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : undefined,
    });
  }
  if (activeUser && activeUser.role !== "non_resident") nav.push({ label: "My Listings", href: "/my-listings" });
  if (activeUser) nav.push({ label: "History", href: "/history" });

  // Up to 5 items shown on standard desktop (lg/xl); remainder in "More" dropdown
  // On 2xl (wide screens), all items are shown directly
  const primaryNav = nav.slice(0, 5);
  const secondaryNav = nav.slice(5);
  const isSecondaryActive = secondaryNav.some((item) => pathname === item.href);

  return (
    <header className="sticky top-0 z-[2000] w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_2px_15px_-3px_rgba(18,63,42,0.04)]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-3 sm:px-6 py-2.5 gap-2 sm:gap-4">
        
        {/* ── BRAND LOGO ────────────────────────────────── */}
        <div className="flex items-center shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#123f2a] text-white shadow-xs group-hover:bg-[#1b5338] transition-colors shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l9-8 9 8" />
                <path d="M5 10v10h14V10" />
                <path d="M10 20v-6h4v6" />
              </svg>
            </div>
            <span className="font-display text-lg sm:text-xl md:text-2xl tracking-[1.5px] font-bold text-[#123f2a] group-hover:text-[#1b5338] transition-colors whitespace-nowrap leading-none">
              MABUHAY HOMES
            </span>
          </Link>
        </div>


        {/* ── DESKTOP NAV LINKS ─────────────────────────── */}
        <nav className="hidden lg:flex items-center justify-center gap-1 shrink min-w-0">
          {/* Primary Nav Links (Always visible on lg+) */}
          {primaryNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative inline-flex items-center justify-center h-9 whitespace-nowrap px-3 text-[13px] font-semibold tracking-wide transition-all duration-200 rounded-full ${
                  active
                    ? "text-[#123f2a] bg-[#e8f3ec]"
                    : "text-gray-600 hover:text-[#123f2a] hover:bg-[#e8f3ec]/60"
                }`}
              >
                <span>{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                    {item.badge}
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#45a057]" />
                )}
              </Link>
            );
          })}

          {/* Secondary Nav Links on 2xl screens (directly visible) */}
          {secondaryNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`hidden 2xl:inline-flex relative items-center justify-center h-9 whitespace-nowrap px-3 text-[13px] font-semibold tracking-wide transition-all duration-200 rounded-full ${
                  active
                    ? "text-[#123f2a] bg-[#e8f3ec]"
                    : "text-gray-600 hover:text-[#123f2a] hover:bg-[#e8f3ec]/60"
                }`}
              >
                <span>{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                    {item.badge}
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#45a057]" />
                )}
              </Link>
            );
          })}

          {/* "More" dropdown on lg and xl screens when secondary links exist */}
          {secondaryNav.length > 0 && (
            <div className="relative 2xl:hidden" ref={moreRef}>
              <button
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className={`relative inline-flex items-center justify-center h-9 whitespace-nowrap px-3 text-[13px] font-semibold tracking-wide transition-all duration-200 rounded-full gap-1 ${
                  isSecondaryActive
                    ? "text-[#123f2a] bg-[#e8f3ec]"
                    : "text-gray-600 hover:text-[#123f2a] hover:bg-[#e8f3ec]/60"
                }`}
                aria-haspopup="true"
                aria-expanded={showMoreMenu}
              >
                <span>More</span>
                {secondaryNav.some((s) => typeof s.badge === "number" && s.badge > 0) && (
                  <span className="inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                    {secondaryNav.reduce((acc, curr) => acc + (curr.badge || 0), 0)}
                  </span>
                )}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showMoreMenu ? "rotate-180" : ""}`} />
                {isSecondaryActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#45a057]" />
                )}
              </button>

              {showMoreMenu && (
                <div className="absolute left-0 mt-1.5 w-48 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50">
                  {secondaryNav.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowMoreMenu(false)}
                        className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                          active
                            ? "bg-[#e8f3ec] text-[#123f2a]"
                            : "text-gray-600 hover:bg-gray-50 hover:text-[#123f2a]"
                        }`}
                      >
                        <span>{item.label}</span>
                        {typeof item.badge === "number" && item.badge > 0 && (
                          <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* ── RIGHT CONTROLS (SEARCH, PROFILE, LOGOUT) ─────── */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          
          <div className="hidden sm:flex items-center mr-1">
            <SyncStatusBadge compact />
          </div>

          {/* Smart Autocomplete Search (responsive width, shrinks nicely) */}
          <div className="hidden xl:block w-32 2xl:w-44">
            <SmartSearchInput placeholder="Search..." variant="navbar" />
          </div>

          {/* User Profile Pill & Logout Section */}
          {activeUser ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Notification Bell Dropdown & Modal */}
              <NotificationBell
                onNotificationsUpdate={(notifs) => {
                  setUnreadAnnouncementsCount(
                    notifs.filter((n) => !n.isRead && n.type === "announcement").length
                  );
                }}
              />

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  className="flex h-9 items-center gap-1.5 sm:gap-2 rounded-full border border-gray-200 bg-gray-50/80 pl-1 pr-2.5 sm:pr-3 text-xs font-semibold text-[#123f2a] hover:bg-[#e8f3ec] hover:border-[#45a057]/40 transition-all shadow-2xs"
                  aria-haspopup="true"
                  aria-expanded={showProfileMenu}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#123f2a] text-white font-bold text-xs shrink-0">
                    {activeUser.fullName ? activeUser.fullName.charAt(0).toUpperCase() : "U"}
                  </span>
                  <span
                    className="max-w-[85px] sm:max-w-[120px] xl:max-w-[150px] truncate text-[11px] sm:text-xs uppercase font-bold tracking-tight"
                    title={activeUser.fullName}
                  >
                    {activeUser.fullName}
                  </span>
                  <ChevronDown className={`h-3 w-3 text-gray-500 shrink-0 transition-transform duration-200 ${showProfileMenu ? "rotate-180" : ""}`} />
                </button>

                {/* Profile Dropdown Popup */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5 z-50">
                    <div className="px-3 py-2.5 border-b border-gray-100">
                      <p className="text-xs font-bold text-[#123f2a] truncate" title={activeUser.fullName}>
                        {activeUser.fullName}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{activeUser.email}</p>
                      <div className="mt-1.5">
                        {activeUser.role === "non_resident" ? (
                          <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Non-Resident
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-[#e8f3ec] px-2 py-0.5 text-[10px] font-bold text-[#123f2a] capitalize">
                            {activeUser.role.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      {activeUser.role === "counselor" && (
                        <Link
                          href="/admin"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#123f2a] hover:bg-[#e8f3ec] transition-colors"
                        >
                          <Shield className="h-3.5 w-3.5 text-[#45a057]" />
                          Admin Panel
                        </Link>
                      )}
                      {activeUser.role !== "non_resident" && (
                        <Link
                          href="/my-dues"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#123f2a] hover:bg-[#e8f3ec] transition-colors"
                        >
                          My Dues
                        </Link>
                      )}
                      <Link
                        href="/history"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#123f2a] hover:bg-[#e8f3ec] transition-colors"
                      >
                        Activity History
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowLogout(true);
                        }}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Visible Logout Icon Button on Desktop */}
              <button
                onClick={() => setShowLogout(true)}
                className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200/60 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-2xs shrink-0"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-full px-4 text-xs sm:text-sm font-semibold text-[#123f2a] hover:bg-[#e8f3ec] transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#54b868] px-5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#45a057] transition-all hover:shadow-sm"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile / Tablet Hamburger Button (visible on < lg) */}
          <button
            className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* ── MOBILE / TABLET SLIDE-DOWN DRAWER ──────────────── */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 shadow-lg">
          {/* Search Input on Mobile */}
          <div className="my-2">
            <SmartSearchInput
              placeholder="Search listings, amenities..."
              variant="navbar"
              onSelectCallback={() => setMobileOpen(false)}
            />
          </div>

          {/* Navigation Links */}
          <div className="space-y-1 mt-2">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[#e8f3ec] text-[#123f2a]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{item.label}</span>
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-[#45a057]" />}
                </Link>
              );
            })}
          </div>

          {/* Account Controls in Mobile Drawer */}
          <div className="pt-3 mt-3 border-t border-gray-100 space-y-2">
            {activeUser ? (
              <>
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-50">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#123f2a] text-white font-bold text-sm shrink-0">
                    {activeUser.fullName ? activeUser.fullName.charAt(0).toUpperCase() : "U"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#123f2a] truncate">{activeUser.fullName}</p>
                    <p className="text-[11px] text-gray-500 truncate">{activeUser.email}</p>
                  </div>
                </div>

                {activeUser.role === "counselor" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#123f2a] hover:bg-[#e8f3ec] transition-colors"
                  >
                    <Shield className="h-4 w-4 text-[#45a057]" />
                    Admin Panel
                  </Link>
                )}

                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setShowLogout(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#123f2a] hover:bg-gray-50 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center rounded-xl bg-[#54b868] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#45a057] transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LOGOUT CONFIRMATION MODAL ────────────────────── */}
      {showLogout && (
        <div
          className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={() => setShowLogout(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 text-[#123f2a] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-3">
              <LogOut className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-lg font-bold">Log out?</h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Are you sure you want to log out? You&apos;ll return to guest mode.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowLogout(false)}
                className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await logout();
                  setShowLogout(false);
                  window.location.href = "/";
                }}
                className="rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-xs"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
