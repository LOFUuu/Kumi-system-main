"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  LogIn,
  Search,
  X,
  Calendar,
  User as UserIcon,
  Users,
  Wrench,
  ShieldAlert,
  Megaphone,
  PartyPopper,
  ArrowRight,
  Bell,
  Clock,
  Sparkles,
  Info,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Reveal from "@/components/Reveal";
import type { Announcement } from "@/lib/mock-data";

type CategoryType = "All" | "Community" | "Maintenance" | "Events" | "Important Notices";

const CATEGORIES: CategoryType[] = [
  "All",
  "Community",
  "Maintenance",
  "Events",
  "Important Notices",
];

/**
 * Derive announcement category dynamically from optional field or text content
 */
function getAnnouncementCategory(a: Announcement): CategoryType {
  if ((a as any).category && CATEGORIES.includes((a as any).category)) {
    return (a as any).category as CategoryType;
  }
  const text = `${a.title} ${a.content}`.toLowerCase();
  if (
    text.includes("water") ||
    text.includes("power") ||
    text.includes("maintenance") ||
    text.includes("pipe") ||
    text.includes("repair") ||
    text.includes("interruption") ||
    text.includes("electric") ||
    text.includes("cleanup") ||
    text.includes("clean-up")
  ) {
    return "Maintenance";
  }
  if (
    text.includes("meeting") ||
    text.includes("event") ||
    text.includes("assembly") ||
    text.includes("festival") ||
    text.includes("party") ||
    text.includes("gathering") ||
    text.includes("tournament") ||
    text.includes("celebration")
  ) {
    return "Events";
  }
  if (
    text.includes("notice") ||
    text.includes("urgent") ||
    text.includes("important") ||
    text.includes("policy") ||
    text.includes("dues") ||
    text.includes("fee") ||
    text.includes("rule") ||
    text.includes("security")
  ) {
    return "Important Notices";
  }
  return "Community";
}

/**
 * Get visual icon corresponding to announcement category
 */
function getCategoryIcon(cat: CategoryType) {
  switch (cat) {
    case "Maintenance":
      return <Wrench className="h-4 w-4" />;
    case "Events":
      return <PartyPopper className="h-4 w-4" />;
    case "Important Notices":
      return <ShieldAlert className="h-4 w-4" />;
    default:
      return <Megaphone className="h-4 w-4" />;
  }
}

/**
 * Get category badge color styling
 */
function getCategoryBadgeStyle(cat: CategoryType) {
  switch (cat) {
    case "Maintenance":
      return "bg-amber-50 text-amber-800 border-amber-200/80";
    case "Events":
      return "bg-sky-50 text-sky-800 border-sky-200/80";
    case "Important Notices":
      return "bg-rose-50 text-rose-800 border-rose-200/80";
    default:
      return "bg-emerald-50 text-emerald-800 border-emerald-200/80";
  }
}

/**
 * Map status values to visual badge styling
 */
function getStatusBadgeStyle(status: string) {
  switch (status?.toLowerCase()) {
    case "active":
      return "bg-emerald-100/80 text-emerald-800 border-emerald-300/60";
    case "upcoming":
      return "bg-amber-100/80 text-amber-800 border-amber-300/60";
    case "expired":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "archived":
      return "bg-gray-100 text-gray-700 border-gray-300";
    default:
      return "bg-emerald-100/80 text-emerald-800 border-emerald-300/60";
  }
}

/**
 * Format post date into a human-friendly string
 */
function formatDate(dateStr: string) {
  if (!dateStr) return "";
  try {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Check if announcement is considered a high-priority / important notice
 */
function isImportantNotice(a: Announcement): boolean {
  const cat = getAnnouncementCategory(a);
  if (cat === "Important Notices") return true;
  const text = `${a.title} ${a.content}`.toLowerCase();
  return (
    text.includes("important") ||
    text.includes("urgent") ||
    text.includes("interruption") ||
    text.includes("notice")
  );
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("All");

  // Modal Detail State
  const [activeModal, setActiveModal] = useState<Announcement | null>(null);

  useEffect(() => {
    if (user) {
      setLoading(true);
      api
        .announcements(true)
        .then((res) => setItems(res || []))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryType, number> = {
      All: items.length,
      Community: 0,
      Maintenance: 0,
      Events: 0,
      "Important Notices": 0,
    };
    items.forEach((item) => {
      const cat = getAnnouncementCategory(item);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [items]);

  // Filtered Announcements
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const cat = getAnnouncementCategory(item);
      const matchesCategory = selectedCategory === "All" || cat === selectedCategory;

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        (item.poster && item.poster.toLowerCase().includes(query)) ||
        cat.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Handle escape key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveModal(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Unauthenticated State
  if (!user) {
    return (
      <div className="section min-h-[70vh] flex items-center justify-center py-16">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-cream-2 bg-white p-8 sm:p-10 text-center shadow-xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gold/10 pointer-events-none" />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-dark/10 text-green-dark">
            <Lock className="h-8 w-8" />
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-gold-muted">
            <Sparkles className="h-3.5 w-3.5" />
            RESIDENT PORTAL ACCESS
          </div>
          <h2 className="mt-2 font-serif text-3xl font-bold text-green-dark">
            Sign in to View Announcements
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Official news, maintenance notices, and HOA updates are reserved exclusively for registered Mabuhay Homes residents and members.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login?next=/announcements" className="btn-green text-center">
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
            <Link href="/register" className="btn-ghost text-center">
              Register Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section pb-24">
      {/* ── 1. ANNOUNCEMENT PAGE HEADER ───────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[2.5px] text-green-dark">
              <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
              COMMUNITY UPDATES
            </div>
            <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-bold text-green-dark tracking-tight">
              Announcements
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-muted leading-relaxed">
              Stay informed with the latest news, notices, events, and important updates from Mabuhay Homes.
            </p>
            <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gold/60" />
          </div>
        </Reveal>

        {/* ── 2. FILTER & SEARCH TOOLBAR ────────────────────────────────────────── */}
        <Reveal className="mt-10" y={20}>
          <div className="rounded-3xl border border-cream-2 bg-white p-4 sm:p-5 shadow-sm space-y-4">
            {/* Top row: Search input & counts */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted/70 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search announcements by title, content, or author..."
                  className="w-full rounded-2xl border border-cream-2 bg-cream/30 pl-11 pr-10 py-2.5 text-sm text-green-dark placeholder:text-muted/60 focus:border-green-mid focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-mid/20 transition-all duration-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted/60 hover:bg-cream-2 hover:text-green-dark transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="text-xs font-semibold text-muted self-end sm:self-center">
                Showing <span className="text-green-dark font-bold">{filteredItems.length}</span> of{" "}
                <span className="text-green-dark font-bold">{items.length}</span> notices
              </div>
            </div>

            {/* Bottom row: Category filter tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-cream-2/60">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                const count = categoryCounts[cat] || 0;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-green-dark text-white shadow-md shadow-green-dark/15 translate-y-[-1px]"
                        : "bg-cream/80 text-muted border border-cream-2 hover:bg-cream hover:text-green-dark"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {cat !== "All" && getCategoryIcon(cat)}
                      {cat}
                    </span>
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isActive
                          ? "bg-gold text-green-deep"
                          : "bg-cream-2 text-muted group-hover:text-green-dark"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* ── 3. ANNOUNCEMENT CARDS GRID & LOADING SKELETON ───────────────────── */}
        <div className="mt-8">
          {loading ? (
            /* 9. LOADING STATE */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="rounded-3xl border border-cream-2 bg-white p-6 shadow-sm animate-pulse flex flex-col justify-between h-64"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-24 bg-gray-200 rounded-full" />
                      <div className="h-5 w-16 bg-gray-200 rounded-full" />
                    </div>
                    <div className="mt-4 h-6 w-3/4 bg-gray-200 rounded-lg" />
                    <div className="mt-3 space-y-2">
                      <div className="h-4 w-full bg-gray-150 rounded" />
                      <div className="h-4 w-5/6 bg-gray-150 rounded" />
                      <div className="h-4 w-2/3 bg-gray-150 rounded" />
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-cream-2/60 pt-4">
                    <div className="h-4 w-28 bg-gray-200 rounded" />
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <Reveal
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              stagger
              deps={[filteredItems.length, selectedCategory, searchQuery]}
            >
              {filteredItems.map((a) => {
                const category = getAnnouncementCategory(a);
                const isPriority = isImportantNotice(a);
                const formattedDate = formatDate(a.postDate);

                return (
                  <article
                    key={a.id}
                    onClick={() => setActiveModal(a)}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-cream-2 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-gold/50 hover:shadow-xl hover:shadow-green-900/5 cursor-pointer"
                  >
                    {/* Top Gold Border Accent for Important Notices */}
                    {isPriority && (
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-gold via-amber-400 to-gold" />
                    )}

                    <div>
                      {/* Category & Status Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getCategoryBadgeStyle(
                            category
                          )}`}
                        >
                          {getCategoryIcon(category)}
                          {category}
                        </span>

                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${getStatusBadgeStyle(
                              a.status
                            )}`}
                          >
                            {a.status || "active"}
                          </span>
                        </div>
                      </div>

                      {/* Date & Priority Tag */}
                      <div className="mt-3.5 flex items-center justify-between text-xs text-muted">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-green-mid" />
                          {formattedDate}
                        </span>
                        {isPriority && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                            <Sparkles className="h-3 w-3 text-gold" /> Priority
                          </span>
                        )}
                      </div>

                      {/* Announcement Title */}
                      <h3 className="mt-3 font-serif text-xl font-bold text-green-dark group-hover:text-green-mid transition-colors duration-200 line-clamp-2 leading-snug">
                        {a.title}
                      </h3>

                      {/* Content Snippet */}
                      <p className="mt-2.5 text-sm leading-relaxed text-muted line-clamp-3">
                        {a.content}
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-6 flex items-center justify-between border-t border-cream-2/70 pt-4 text-xs">
                      <div className="flex items-center gap-2 text-muted font-medium">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cream-2 text-green-dark">
                          <UserIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="truncate max-w-[120px]">
                          {a.poster || "HOA Admin"}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-bold text-green-mid group-hover:text-gold transition-colors duration-200"
                      >
                        Read Announcement
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </Reveal>
          ) : (
            /* 8. EMPTY STATE */
            <Reveal y={20}>
              <div className="rounded-3xl border border-cream-2 bg-white p-12 text-center shadow-sm max-w-lg mx-auto my-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/10 text-gold-muted">
                  <Bell className="h-8 w-8" />
                </div>
                <h3 className="mt-4 font-serif text-2xl font-bold text-green-dark">
                  No announcements found
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  {searchQuery || selectedCategory !== "All"
                    ? "No notices match your current category or search keyword. Try clearing filters to see all community updates."
                    : "Stay tuned for important community updates, events, and notices from the HOA."}
                </p>
                {(searchQuery || selectedCategory !== "All") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("All");
                    }}
                    className="mt-6 btn-ghost text-xs font-semibold"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </div>

      {/* ── 6. ANNOUNCEMENT DETAILS MODAL ─────────────────────────────────────── */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-cream-2 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="flex items-start justify-between gap-4 border-b border-cream-2/70 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getCategoryBadgeStyle(
                      getAnnouncementCategory(activeModal)
                    )}`}
                  >
                    {getCategoryIcon(getAnnouncementCategory(activeModal))}
                    {getAnnouncementCategory(activeModal)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${getStatusBadgeStyle(
                      activeModal.status
                    )}`}
                  >
                    {activeModal.status || "active"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="rounded-full p-2 text-muted hover:bg-cream-2 hover:text-green-dark transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Main Title & Meta */}
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-green-dark leading-snug">
                {activeModal.title}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted font-medium">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-green-mid" />
                  {formatDate(activeModal.postDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <UserIcon className="h-4 w-4 text-green-mid" />
                  Posted by <span className="font-semibold text-green-dark">{activeModal.poster || "HOA Admin"}</span>
                </span>
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="rounded-2xl border border-cream-2/60 bg-cream/20 p-5 text-sm sm:text-base leading-relaxed text-gray-800 whitespace-pre-wrap font-sans">
              {activeModal.content}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-cream-2/70">
              <div className="flex items-center gap-2 text-xs text-muted">
                <Info className="h-4 w-4 text-gold-muted shrink-0" />
                Official notice published by Mabuhay Homes HOA.
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="btn-green text-xs font-semibold px-6 py-2.5 w-full sm:w-auto text-center"
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

