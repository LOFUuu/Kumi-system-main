"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Search, ChevronDown, LogOut, Shield } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Admin pages or logged-in admin user — hide the public navbar
  if (pathname.startsWith("/admin") || user?.role === "admin") return null;

  const nav: { label: string; href: string }[] = [
    { label: "Home", href: "/" },
    { label: "House Listing", href: "/house-listing" },
    { label: "Amenities", href: "/reservation" },
  ];
  if (user && user.role !== "non_resident") nav.push({ label: "My Dues", href: "/my-dues" });
  if (user) {
    nav.push({ label: "Map", href: "/map" });
    nav.push({ label: "Announcements", href: "/announcements" });
  }
  if (user && user.role !== "non_resident") nav.push({ label: "My Listings", href: "/my-listings" });
  if (user && user.role !== "non_resident") nav.push({ label: "History", href: "/history" });

  return (
    <header className="sticky top-0 z-[2000] w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_2px_15px_-3px_rgba(18,63,42,0.04)]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-3 sm:px-6 py-3 gap-2 sm:gap-4">
        
        {/* BRAND LOGO */}
        <div className="flex items-center justify-start shrink-0 md:flex-1">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#123f2a] text-white shadow-xs group-hover:bg-[#1b5338] transition-colors shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l9-8 9 8" />
                <path d="M5 10v10h14V10" />
                <path d="M10 20v-6h4v6" />
              </svg>
            </div>
            <span className="font-display text-lg sm:text-xl md:text-2xl tracking-[1.5px] sm:tracking-[2px] font-bold text-[#123f2a] group-hover:text-[#1b5338] transition-colors whitespace-nowrap leading-none flex items-center">
              MABUHAY HOMES
            </span>
          </Link>
        </div>

        {/* DESKTOP NAV LINKS - CENTERED IN NAVBAR */}
        <nav className="hidden md:flex items-center justify-center gap-1 sm:gap-1.5 md:flex-1 shrink-0">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative inline-flex items-center justify-center h-9 whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm font-bold tracking-wide transition-all duration-200 ${
                  active
                    ? "text-[#123f2a]"
                    : "text-gray-600 hover:text-[#123f2a] hover:bg-[#e8f3ec]/60 rounded-full"
                }`}
              >
                {item.label}
                {/* Active indicator line */}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2.5px] rounded-full bg-[#45a057]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT CONTROLS (SEARCH, NOTIF, PROFILE, LOGOUT) */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0 md:flex-1">
          
          {/* Search Input */}
          <div className="relative hidden lg:block w-36 xl:w-44">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-full border border-gray-200 bg-gray-50/80 pl-8 pr-3 text-xs text-[#123f2a] placeholder-gray-400 outline-none transition-all focus:border-[#45a057] focus:bg-white focus:ring-2 focus:ring-[#45a057]/15 flex items-center"
            />
          </div>


          {/* User Profile Pill Dropdown */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  className="flex h-9 items-center gap-1.5 sm:gap-2 rounded-full border border-gray-200 bg-gray-50/80 pl-1 pr-3 text-xs font-semibold text-[#123f2a] hover:bg-gray-100/90 transition-all shadow-2xs"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#123f2a] text-white font-bold text-xs shrink-0">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                  </span>
                  <span className="max-w-[100px] sm:max-w-[140px] truncate text-[11px] sm:text-xs uppercase font-bold tracking-tight">
                    {user.fullName}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                </button>

                {/* Profile Dropdown Popup */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5 z-50">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-bold text-[#123f2a]">{user.fullName}</p>
                      <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                      <div className="mt-1">
                        {user.role === "non_resident" ? (
                          <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Non-Resident
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-[#e8f3ec] px-2 py-0.5 text-[10px] font-bold text-[#123f2a] capitalize">
                            {user.role.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {user.role === "counselor" && (
                      <Link
                        href="/admin"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#123f2a] hover:bg-[#e8f3ec] transition-colors"
                      >
                        <Shield className="h-3.5 w-3.5 text-[#45a057]" />
                        Admin Panel
                      </Link>
                    )}

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
                )}
              </div>

              {/* DEDICATED VISIBLE LOGOUT BUTTON */}
              <button
                onClick={() => setShowLogout(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200/60 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-2xs shrink-0"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
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

          {/* Mobile hamburger button */}
          <button
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              {mobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="7" x2="21" y2="7" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="17" x2="21" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN DRAWER */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-1 shadow-lg">
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
                <span>{item.label}</span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-[#45a057]" />}
              </Link>
            );
          })}

          {user && (
            <div className="pt-2 border-t border-gray-100 mt-2">
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
            </div>
          )}
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
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
