"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/mock-data";

const ROLE_OPTIONS: { role: Role; label: string }[] = [
  { role: "admin", label: "Admin" },
  { role: "counselor", label: "Counselor" },
  { role: "resident", label: "Resident" },
  { role: "non_resident", label: "Non-resident" },
];

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
  const { user, logout, setRolePreview } = useAuth();
  const [showLogout, setShowLogout] = useState(false);

  // Admin pages have their own sidebar — hide the public navbar there
  if (pathname.startsWith("/admin")) return null;

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
  if (user && (user.role === "resident" || user.role === "counselor" || user.role === "admin"))
    nav.push({ label: "My Listings", href: "/my-listings" });
  if (user) {
    nav.push({ label: "History", href: "/history" });
  }

  return (
    <nav className="sticky top-0 z-[2000] bg-gradient-to-br from-green-dark to-green-mid text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-display text-2xl tracking-[3px] text-gold">
          MABUHAY HOMES
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition hover:bg-white/10 ${
                    active ? "bg-white/15 font-semibold" : ""
                  }`}
                >
                  {item.map && <MapIcon />}
                  {item.label}
                </Link>
                {item.map && !active && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full border-2 border-green-deep bg-danger" />
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm sm:flex">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                  <UserIcon />
                </span>
                {user.fullName}
                {user.role !== "non_resident" && (
                  <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-semibold capitalize text-green-deep">
                    {user.role.replace("_", " ")}
                  </span>
                )}
              </div>

              {(user.role === "counselor" || user.role === "admin") && (
                <Link href="/admin" className="btn-gold btn-sm flex items-center gap-1 !px-3 !py-2 text-xs">
                  <GearIcon />
                  Admin Panel
                </Link>
              )}

              <div className="relative group">
                <button
                  onClick={() => setShowLogout(true)}
                  className="rounded-lg bg-danger px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                >
                  <LogoutIcon />
                </button>
                <div className="absolute right-0 z-50 mt-2 hidden w-48 rounded-xl bg-white p-2 text-green-deep shadow-xl group-hover:block">
                  <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">
                    Preview as role
                  </p>
                  {ROLE_OPTIONS.map((o) => (
                    <button
                      key={o.role}
                      onClick={() => setRolePreview(o.role)}
                      className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-cream"
                    >
                      {o.label}
                    </button>
                  ))}
                  <hr className="my-1 border-cream-2" />
                  <button
                    onClick={() => setShowLogout(true)}
                    className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-danger hover:bg-danger-bg"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="flex items-center gap-1 rounded-lg border border-white/30 px-3 py-2 text-sm text-white/80 hover:bg-white/10">
                <LoginIcon />
                Log In
              </Link>
              <Link href="/register" className="btn-gold btn-sm !px-3 !py-2 text-xs">
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      {showLogout && (
        <div
          className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 p-4"
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
                className="rounded-lg border border-cream-2 px-4 py-2 text-sm font-semibold hover:bg-cream"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowLogout(false);
                  router.push("/");
                }}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
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
