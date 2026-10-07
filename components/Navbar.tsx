"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

function MapIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admin pages or logged-in admin user — hide the public navbar
  if (pathname.startsWith("/admin") || user?.role === "admin") return null;

  const nav: { label: string; href: string; map?: boolean }[] = [
    { label: "Home", href: "/" },
    { label: "House Listing", href: "/house-listing" },
    { label: "Amenities", href: "/reservation" },
  ];
  if (user && user.role !== "non_resident") nav.push({ label: "My Dues", href: "/my-dues" });
  if (user) {
    nav.push({ label: "Map", href: "/map", map: true });
    nav.push({ label: "Announcements", href: "/announcements" });
  }
  // My Listings and History are for verified residents only
  if (user && user.role !== "non_resident") nav.push({ label: "My Listings", href: "/my-listings" });
  if (user && user.role !== "non_resident") nav.push({ label: "History", href: "/history" });

  return (
    <nav className="sticky top-0 z-[2000] bg-gradient-to-br from-green-dark to-green-mid text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-display text-2xl tracking-[3px] text-gold hover:opacity-90 transition-opacity">
          MABUHAY HOMES
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-0.5 md:flex">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
                    ${active
                      ? "text-gold font-semibold"
                      : "text-white/85 hover:text-white hover:bg-white/10"
                    }`}
                >
                  {item.map && <MapIcon />}
                  {item.label}
                  {/* Active underline indicator */}
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-gold" />
                  )}
                </Link>
                {item.map && !active && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-green-deep bg-danger" />
                )}
              </li>
            );
          })}
        </ul>

        {/* Right: user / auth controls */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm sm:flex border border-white/10">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                  <UserIcon />
                </span>
                {user.fullName}
                {user.role === "non_resident" ? (
                  <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200 border border-amber-400/30">
                    Pending
                  </span>
                ) : (
                  <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-semibold capitalize text-green-deep">
                    {user.role.replace("_", " ")}
                  </span>
                )}
              </div>

              {user.role === "counselor" && (
                <Link href="/admin" className="btn-gold btn-sm flex items-center gap-1 !px-3 !py-2 text-xs">
                  <GearIcon />
                  Admin Panel
                </Link>
              )}

              <button
                onClick={() => setShowLogout(true)}
                className="rounded-lg bg-danger px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-sm"
                title="Log out"
                aria-label="Log out"
              >
                <LogoutIcon />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-2 text-sm text-white/85 transition-all duration-200 hover:bg-white/10 hover:text-white hover:border-white/50">
                <LoginIcon />
                Log In
              </Link>
              <Link href="/register" className="btn-gold btn-sm !px-4 !py-2 text-xs">
                Register
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            className="flex md:hidden rounded-lg p-2 text-white/80 hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
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

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-green-dark/95 backdrop-blur-sm px-4 pb-4 pt-2 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors
                  ${active ? "bg-gold/15 text-gold" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
              >
                {item.map && <MapIcon />}
                {item.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Logout modal */}
      {showLogout && (
        <div
          className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowLogout(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-green-deep shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-lg font-bold">Log out?</h3>
            <p className="mt-1 text-sm text-muted">
              Are you sure you want to log out? You&apos;ll return to guest mode.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowLogout(false)}
                className="rounded-lg border border-cream-2 px-4 py-2 text-sm font-semibold hover:bg-cream transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowLogout(false);
                  window.location.href = "/";
                }}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
