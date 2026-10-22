"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Home, ExternalLink, Shield, Menu } from "lucide-react";
import SyncStatusBadge from "./SyncStatusBadge";
import NotificationBell from "./NotificationBell";
import { useAdminNav } from "./AdminNavContext";

export default function AdminHeader() {
  const { user } = useAuth();
  const { toggleSidebar } = useAdminNav();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-gray-100 bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md shadow-[0_1px_10px_-2px_rgba(18,63,42,0.04)]">
      {/* Left: Mobile hamburger & Breadcrumb / Portal link */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          type="button"
          onClick={toggleSidebar}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 hover:bg-[#e8f3ec] hover:text-[#123f2a] transition cursor-pointer"
          title="Open Menu"
          aria-label="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-[#e8f3ec] hover:text-[#123f2a] transition-all"
          title="Return to Community Portal"
        >
          <Home className="h-3.5 w-3.5 text-[#45a057]" />
          <span className="hidden sm:inline">Community Portal</span>
        </Link>
        <span className="text-gray-300">/</span>
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-[#123f2a]" />
          <span className="text-xs font-bold text-[#123f2a] tracking-wide uppercase">
            Admin Panel
          </span>
        </div>
      </div>

      {/* Right: Controls & Notification Bell */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sync Status Badge */}
        <div className="hidden sm:flex items-center">
          <SyncStatusBadge compact />
        </div>

        {/* Public Portal external button */}
        <Link
          href="/"
          className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50/80 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-[#e8f3ec] hover:text-[#123f2a] hover:border-[#45a057]/40 transition-all shadow-2xs"
          title="Visit Live Public Portal"
        >
          <span>Visit Portal</span>
          <ExternalLink className="h-3 w-3 text-gray-400" />
        </Link>

        {/* Notification Bell (Right Aligned so dropdown opens smoothly into page content) */}
        <NotificationBell align="right" />

        {/* Admin Profile Pill */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#123f2a] text-white font-bold text-xs shadow-xs">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : "A"}
            </span>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-[#123f2a] leading-none truncate max-w-[120px]">
                {user.fullName || "Admin"}
              </p>
              <span className="text-[10px] font-semibold text-amber-700 capitalize">
                {user.role === "admin" ? "Administrator" : user.role.replace("_", " ")}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
