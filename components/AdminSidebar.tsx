"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth";

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
  const router = useRouter();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside
      className={`sticky top-0 h-screen z-30 flex flex-shrink-0 flex-col border-r border-cream-2 bg-white transition-all duration-300 ease-in-out ${
        collapsed ? "w-[68px]" : "w-60"
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-6 z-40 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-cream-2 bg-white shadow-md text-muted hover:text-green-dark hover:border-green-mid hover:scale-110 active:scale-95 transition-all duration-200"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      <div className="flex flex-1 flex-col overflow-hidden p-3">
        {/* Logo / Brand */}
        <Link
          href="/admin"
          className={`mb-4 flex items-center gap-2.5 rounded-xl px-2 py-2 font-display text-gold transition-all duration-300 hover:bg-cream ${
            collapsed ? "justify-center" : ""
          }`}
          title="Admin Overview"
        >
          <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
          <span
            className={`overflow-hidden whitespace-nowrap text-xl tracking-[2px] transition-all duration-300 ${
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            }`}
          >
            MABUHAY
          </span>
        </Link>

        {/* Section label */}
        {!collapsed && (
          <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-muted">
            Admin Panel
          </p>
        )}

        {/* Nav links */}
        <nav className="space-y-0.5">
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
              <Link
                key={l.href}
                href={l.href}
                title={collapsed ? l.label : undefined}
                className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  collapsed ? "justify-center" : ""
                } ${
                  l.sub && !collapsed ? "ml-4 text-xs" : l.sub && collapsed ? "ml-0" : ""
                } ${
                  active
                    ? isArchive
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-mid text-white"
                    : isArchive
                    ? "text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                    : "text-green-dark hover:bg-green-mid hover:text-white"
                }`}
              >
                <l.icon
                  className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    l.sub ? "h-[16px] w-[16px]" : "h-[18px] w-[18px]"
                  }`}
                />
                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                    collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  }`}
                >
                  {l.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="border-t border-cream-2 p-3">
        <button
          onClick={handleLogout}
          title={collapsed ? "Log out" : undefined}
          className={`group flex w-full items-center gap-2.5 rounded-xl border border-cream-2 px-3 py-2.5 text-sm font-semibold text-green-dark transition-all duration-200 hover:bg-danger hover:text-white hover:border-transparent ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
          <span
            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            }`}
          >
            Log out
          </span>
        </button>
      </div>
    </aside>
  );
}
