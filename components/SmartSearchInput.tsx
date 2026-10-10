"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Building2,
  Calendar,
  CreditCard,
  MapPin,
  Sparkles,
  ArrowRight,
  Compass,
  Tag,
  CheckCircle2,
  X,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { findSmartSuggestions, SYSTEM_SEARCH_TARGETS, type SearchTarget } from "@/lib/fuzzy-search";

interface SmartSearchInputProps {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  onSelectCallback?: () => void;
  variant?: "navbar" | "hero" | "page";
}

export default function SmartSearchInput({
  placeholder = "Search...",
  className = "",
  inputClassName = "",
  onSelectCallback,
  variant = "navbar",
}: SmartSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute context-aware default recommendations when input is empty
  const defaultRecommendations: SearchTarget[] = SYSTEM_SEARCH_TARGETS.filter((t) => {
    if (t.roleRequired === "authenticated" && !user) return false;
    if (t.roleRequired === "resident" && user?.role === "non_resident") return false;
    if (t.roleRequired === "resident" && !user) return false;
    return true;
  });

  // Compute live suggestions & typo corrections
  const { suggestions, didYouMean } = findSmartSuggestions(query, user?.role);

  // Combine items for keyboard navigation index
  const currentItems: SearchTarget[] = query.trim()
    ? suggestions.map((s) => s.target)
    : defaultRecommendations.slice(0, 6);

  const executeTarget = useCallback(
    (target: SearchTarget) => {
      setQuery(target.title);
      setIsOpen(false);
      setSelectedIndex(-1);
      if (onSelectCallback) onSelectCallback();
      router.push(target.href);
    },
    [router, onSelectCallback]
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && currentItems[selectedIndex]) {
      executeTarget(currentItems[selectedIndex]);
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) return;

    setIsOpen(false);
    if (onSelectCallback) onSelectCallback();

    if (pathname === "/house-listing") {
      router.push(`/house-listing?q=${encodeURIComponent(trimmed)}`);
    } else if (pathname === "/reservation") {
      router.push(`/reservation?q=${encodeURIComponent(trimmed)}`);
    } else if (pathname === "/my-dues") {
      router.push(`/my-dues?q=${encodeURIComponent(trimmed)}`);
    } else if (pathname === "/history") {
      router.push(`/history?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push(`/house-listing?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") setIsOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < currentItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : currentItems.length - 1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  const getIconForCategory = (cat: SearchTarget["category"]) => {
    switch (cat) {
      case "House Listing":
        return <Building2 className="h-3.5 w-3.5 text-[#45a057]" />;
      case "Amenity":
        return <Calendar className="h-3.5 w-3.5 text-[#45a057]" />;
      case "Resident Feature":
        return <CreditCard className="h-3.5 w-3.5 text-amber-600" />;
      case "Navigation":
      default:
        return <Compass className="h-3.5 w-3.5 text-emerald-600" />;
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Search Input Form */}
      <form onSubmit={handleFormSubmit} className="relative w-full">
        <button
          type="submit"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#123f2a] transition-colors"
          title="Submit Search"
          aria-label="Submit Search"
        >
          <Search className="h-3.5 w-3.5" />
        </button>

        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className={`h-9 w-full rounded-full border border-gray-200 bg-gray-50/80 pl-8 pr-7 text-xs text-[#123f2a] placeholder-gray-400 outline-none transition-all focus:border-[#45a057] focus:bg-white focus:ring-2 focus:ring-[#45a057]/15 flex items-center ${inputClassName}`}
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(true);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Clear text"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {/* Smart Suggestions Dropdown Popup */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[3500] w-full min-w-[280px] max-w-md rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-fade-in">
          {/* Header Title */}
          <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
            <span>{query.trim() ? "Search Suggestions" : "Recommended for You"}</span>
            <Sparkles className="h-3 w-3 text-[#45a057]" />
          </div>

          {/* Typo "Did you mean?" Correction Banner */}
          {didYouMean && query.trim() && (
            <div
              onClick={() => executeTarget(didYouMean)}
              className="mt-1.5 mb-1 flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200/80 px-3 py-2 text-xs text-amber-900 cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  Did you mean <strong className="font-bold text-[#123f2a] underline">&ldquo;{didYouMean.title}&rdquo;</strong>?
                </span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-amber-700 shrink-0" />
            </div>
          )}

          {/* Default Recommendations List (Empty query) */}
          {!query.trim() && (
            <div className="py-1 space-y-0.5">
              {defaultRecommendations.slice(0, 6).map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={item.id}
                    onClick={() => executeTarget(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                      isSelected ? "bg-[#e8f3ec] text-[#123f2a]" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 text-gray-600 shrink-0">
                        {getIconForCategory(item.category)}
                      </div>
                      <span>{item.title}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Live Autocomplete Results (User typing) */}
          {query.trim() && (
            <div className="py-1 space-y-0.5">
              {suggestions.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-gray-400">
                  No matching features or properties found. Press <strong className="font-bold text-[#123f2a]">Enter</strong> to search.
                </div>
              ) : (
                suggestions.map((res, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <div
                      key={res.target.id}
                      onClick={() => executeTarget(res.target)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                        isSelected ? "bg-[#e8f3ec] text-[#123f2a]" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 shrink-0">
                          {getIconForCategory(res.target.category)}
                        </div>
                        <span className="truncate">{res.target.title}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {res.target.category}
                        </span>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Footer instruction */}
          <div className="mt-1 pt-1.5 border-t border-gray-100 px-3 text-[10px] text-gray-400 flex items-center justify-between">
            <span>Press <kbd className="rounded bg-gray-100 px-1 font-mono">↵</kbd> to search</span>
            <span>Use <kbd className="rounded bg-gray-100 px-1 font-mono">↑</kbd> <kbd className="rounded bg-gray-100 px-1 font-mono">↓</kbd> to navigate</span>
          </div>
        </div>
      )}
    </div>
  );
}
