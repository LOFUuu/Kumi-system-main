"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  Home,
  Waves,
  CalendarDays,
  Coins,
  CreditCard,
  Megaphone,
  BarChart3,
  LogOut,
  Archive,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Eye,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useAdminNav } from "./AdminNavContext";

const LINKS: { href: string; label: string; icon: LucideIcon; sub?: boolean; amber?: boolean }[] = [
  { href: "/admin/residents", label: "Residents", icon: Users },
  { href: "/admin/listings", label: "Listings", icon: Home },
  { href: "/admin/viewings", label: "Property Viewings", icon: Eye },
  { href: "/admin/amenities", label: "Amenities", icon: Waves },
  { href: "/admin/reservations", label: "Reservations", icon: CalendarDays },
  { href: "/admin/dues", label: "Dues", icon: Coins },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/archive", label: "Archive", icon: Archive, amber: true },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useAdminNav();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-30 h-screen flex flex-shrink-0 flex-col border-r border-gray-100 bg-white transition-all duration-300 ease-in-out shadow-lg lg:shadow-xs ${
          sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-[68px]" : "lg:w-64"}`}
      >
        {/* Desktop collapse toggle button */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex absolute -right-3 top-6 z-40 h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white shadow-md text-gray-500 hover:text-[#123f2a] hover:border-[#45a057] hover:scale-110 active:scale-95 transition-all duration-200"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        <div className="flex flex-1 flex-col overflow-hidden p-3.5">
          {/* Logo / Brand & Mobile Close Button */}
          <div className="mb-5 flex items-center justify-between">
            <Link
              href="/admin"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2.5 rounded-2xl p-2 transition-all duration-300 hover:bg-[#e8f3ec] ${
                collapsed ? "justify-center" : ""
              }`}
              title="Admin Overview"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#123f2a] text-white shrink-0 shadow-xs">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <span
                className={`overflow-hidden whitespace-nowrap font-display text-xl font-bold tracking-[2px] text-[#123f2a] transition-all duration-300 ${
                  collapsed ? "w-0 opacity-0 lg:w-0" : "w-auto opacity-100"
                }`}
              >
                MABUHAY
              </span>
            </Link>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-xl text-gray-500 hover:bg-[#e8f3ec] hover:text-[#123f2a] transition cursor-pointer"
              title="Close Menu"
              aria-label="Close Menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Section label */}
          {(!collapsed || sidebarOpen) && (
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              ADMINISTRATIVE PANEL
            </p>
          )}

          {/* Nav links */}
          <nav className="space-y-1 scroll-thin overflow-y-auto flex-1 pr-1">
            {LINKS.map((l) => {
              const isArchive = l.amber || l.href === "/admin/archive" || l.href === "/admin/amenities/archive";
              let active = false;
              if (isArchive) {
                active =
                  pathname === "/admin/archive" ||
                  pathname.startsWith("/admin/archive") ||
                  pathname === "/admin/amenities/archive" ||
                  pathname.startsWith("/admin/amenities/archive");
              } else if (l.href === "/admin/amenities") {
                active =
                  pathname === "/admin/amenities" ||
                  (pathname.startsWith("/admin/amenities/") && !pathname.startsWith("/admin/amenities/archive"));
              } else {
                active = pathname === l.href || pathname.startsWith(l.href + "/");
              }

              return (
                <div key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setSidebarOpen(false)}
                    title={collapsed ? l.label : undefined}
                    className={`group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 ${
                      collapsed ? "justify-center" : ""
                    } ${
                      l.sub && !collapsed ? "ml-4 text-xs" : l.sub && collapsed ? "ml-0" : ""
                    } ${
                      active
                        ? isArchive
                          ? "bg-amber-100 text-amber-800 shadow-2xs"
                          : "bg-[#123f2a] text-white shadow-xs"
                        : isArchive
                        ? "text-amber-700 hover:bg-amber-50"
                        : "text-gray-700 hover:bg-[#e8f3ec] hover:text-[#123f2a]"
                    }`}
                  >
                    <l.icon
                      className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                        l.sub ? "h-[15px] w-[15px]" : "h-[17px] w-[17px]"
                      } ${active ? "text-[#86efac]" : ""}`}
                    />
                    <span
                      className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                        collapsed ? "w-0 opacity-0 lg:w-0" : "w-auto opacity-100"
                      }`}
                    >
                      {l.label}
                    </span>
                  </Link>

                  {/* Submenu for Payments when on Payments section */}
                  {l.href === "/admin/payments" && (!collapsed || sidebarOpen) && pathname.startsWith("/admin/payments") && (
                    <Suspense fallback={null}>
                      <PaymentsSubNav />
                    </Suspense>
                  )}
                </div>
              );
            })}
          </nav>

        {/* Logout at bottom */}
        <div className="pt-3 border-t border-gray-100 mt-2">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
            title={collapsed ? "Log out" : undefined}
          >
            <LogOut className="h-[17px] w-[17px] flex-shrink-0" />
            <span
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              }`}
            >
              Log out
            </span>
          </button>
        </div>

      </div>
    </aside>
    </>
  );
}

function PaymentsSubNav() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "amenity";

  return (
    <div className="ml-5 mt-1 space-y-0.5 border-l-2 border-emerald-100 pl-2">
      <Link
        href="/admin/payments?tab=amenity"
        className={`block rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
          currentTab === "amenity"
            ? "bg-[#e8f3ec] text-[#123f2a] font-bold"
            : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
        }`}
      >
        Amenity Payments
      </Link>
      <Link
        href="/admin/payments?tab=dues"
        className={`block rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
          currentTab === "dues"
            ? "bg-[#e8f3ec] text-[#123f2a] font-bold"
            : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
        }`}
      >
        Monthly Due Payments
      </Link>
      <Link
        href="/admin/payments?tab=settings"
        className={`block rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
          currentTab === "settings"
            ? "bg-[#e8f3ec] text-[#123f2a] font-bold"
            : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
        }`}
      >
        GCash Configuration
      </Link>
      <Link
        href="/admin/payments?tab=archive"
        className={`block rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
          currentTab === "archive"
            ? "bg-amber-100/70 text-amber-900 font-bold"
            : "text-amber-700/80 hover:text-amber-900 hover:bg-amber-50"
        }`}
      >
        Payment Archive
      </Link>
    </div>
  );
}
