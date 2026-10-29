"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Home,
  LogIn,
  Calendar,
  CreditCard,
  ShieldCheck,
  TreePine,
  HandshakeIcon,
  Building2,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { ListingCard } from "@/components/ui";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { HouseListing, Announcement, User } from "@/lib/mock-data";

const WHY_ITEMS = [
  {
    icon: <ShieldCheck className="h-6 w-6 text-white" />,
    title: "Secure & Verified",
    desc: "Every listing is admin-verified before it goes live, giving buyers and renters peace of mind.",
  },
  {
    icon: <TreePine className="h-6 w-6 text-white" />,
    title: "Green Community",
    desc: "Mabuhay Homes 2000 Phase 5 is designed around nature — tree-lined streets and open parks.",
  },
  {
    icon: <HandshakeIcon className="h-6 w-6 text-white" />,
    title: "HOA Support",
    desc: "Our Homeowners' Association actively manages amenities, dues, and community programs.",
  },
  {
    icon: <Building2 className="h-6 w-6 text-white" />,
    title: "Premium Amenities",
    desc: "Enjoy a swimming pool, basketball court, and function hall — all bookable online.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [listings, setListings] = useState<HouseListing[]>([]);
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Redirect admins/counselors away from the public home page
  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin" || user.role === "counselor") {
        router.replace("/admin");
      }
      // Regular users (resident / non_resident) stay on the public home page
    }
  }, [user, loading, router]);

  useEffect(() => {
    api.listingsVerified().then(setListings).catch(() => setListings([]));
    api.users().then(setUsers).catch(() => setUsers([]));
    if (user) {
      api.announcements(true).then(setAnns).catch(() => setAnns([]));
    } else {
      setAnns([]);
    }
  }, [user]);

  const featured = listings.filter((l) => l.status === "available").slice(0, 3);
  const totalResidents = users.filter((u) => u.role === "resident" && !u.isArchived).length;
  const totalHouses = listings.filter((l) => l.status === "available").length;

  return (
    <div className="min-h-screen bg-[#f8faf7] text-[#123f2a]">
      
      {/* ── HERO BANNER (MODERNIZED BENTO HERO) ───────────────────────────── */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-4 pb-8 max-w-7xl 2xl:max-w-[1400px] mx-auto">
        <div className="relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-br from-[#0d3b22] via-[#134e2e] to-[#092716] text-white shadow-2xl border border-emerald-900/40">
          
          {/* Subtle Ambient Decorative Glows & Grid Pattern */}
          <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
          <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 right-1/4 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="pointer-events-none absolute top-1/2 -right-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[480px] p-6 sm:p-10 lg:p-12 relative z-10">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 flex flex-col items-start justify-center z-10">
              
              {/* WELCOME TO Pill Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="uppercase tracking-widest text-[10px] font-bold">WELCOME TO</span>
              </div>

              {/* Main Headline */}
              <h1 className="mt-4 font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-white">
                Mabuhay <span className="text-[#86efac] drop-shadow-xs">Homes</span>
              </h1>

              {/* Subtitle */}
              <p className="mt-2 text-xs font-bold uppercase tracking-[3px] text-emerald-200/90">
                MABUHAY HOMES 2000 PHASE 5
              </p>

              {/* Description */}
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-emerald-50/85 max-w-xl">
                Your community hub for house listings, amenities reservations, monthly dues tracking, and official announcements.
              </p>

              {/* Action Buttons */}
              <div className="mt-7 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/house-listing"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-[#45a057] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 transition-all duration-300 hover:brightness-110 hover:shadow-xl hover:shadow-emerald-900/30 hover:-translate-y-0.5 active:scale-95"
                >
                  <Home className="h-4 w-4" />
                  <span>View Listings</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>

                {user ? (
                  <>
                    <Link
                      href="/reservation"
                      className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:border-white/45 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                    >
                      <Calendar className="h-4 w-4 text-emerald-300" />
                      <span>Book Amenity</span>
                    </Link>
                    {user.role !== "non_resident" && (
                      <Link
                        href="/my-dues"
                        className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:border-white/45 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                      >
                        <CreditCard className="h-4 w-4 text-emerald-300" />
                        <span>My Dues</span>
                      </Link>
                    )}
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:border-white/45 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                  >
                    <LogIn className="h-4 w-4 text-emerald-300" />
                    <span>Log In</span>
                  </Link>
                )}
              </div>

            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5 relative h-72 sm:h-96 lg:h-[400px] w-full">
              <div className="relative h-full w-full overflow-hidden p-2 sm:p-2.5 bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/15 shadow-2xl transition-all duration-500 hover:border-white/30">
                <div className="relative h-full w-full overflow-hidden rounded-xl sm:rounded-2xl">
                  <img
                    src="/images/mabuhay-banner.jpg"
                    alt="Mabuhay Homes Subdivision Entrance"
                    className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#092716]/85 via-[#092716]/25 to-transparent" />
                  
                  {/* Floating glass badge sa ibaba ng image */}
                  <div className="absolute bottom-3.5 left-3.5 right-3.5 sm:bottom-4 sm:left-4 sm:right-auto inline-flex items-center gap-2 rounded-xl bg-black/45 backdrop-blur-md border border-white/20 px-3.5 py-2 text-xs font-medium text-white shadow-lg">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate">📍 Mabuhay Homes 2000 Phase 5</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── FLOATING STATS OVERLAY (BALANCED BENTO KPI CARDS) ─────────────── */}
      <div className="-mt-8 sm:-mt-12 relative z-20 mx-auto max-w-7xl 2xl:max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <Reveal
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
          stagger
          deps={[totalResidents, totalHouses]}
        >
          {/* Card 1: Total Residents */}
          <div className="group relative overflow-hidden rounded-3xl border border-emerald-950/10 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-[0_8px_25px_-5px_rgba(18,63,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_35px_-5px_rgba(18,63,42,0.12)] hover:border-emerald-700/25">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800/70">Community</div>
                <div className="mt-1 font-serif text-3xl sm:text-4xl font-bold text-[#123f2a] tracking-tight">
                  {totalResidents}
                </div>
                <div className="mt-1 text-xs font-semibold text-gray-500">
                  Registered portal members
                </div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-800 ring-1 ring-emerald-500/15 transition-transform duration-300 group-hover:scale-105">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Verified Homeowners</span>
            </div>
          </div>

          {/* Card 2: Total Houses / Available Properties */}
          <div className="group relative overflow-hidden rounded-3xl border border-emerald-950/10 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-[0_8px_25px_-5px_rgba(18,63,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_35px_-5px_rgba(18,63,42,0.12)] hover:border-emerald-700/25">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800/70">Real Estate</div>
                <div className="mt-1 font-serif text-3xl sm:text-4xl font-bold text-[#123f2a] tracking-tight">
                  {totalHouses}
                </div>
                <div className="mt-1 text-xs font-semibold text-gray-500">
                  Properties listed in Phase 5
                </div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-800 ring-1 ring-emerald-500/15 transition-transform duration-300 group-hover:scale-105">
                <Home className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>For Sale &amp; Rent</span>
            </div>
          </div>

          {/* Card 3: Phase 5 Amenities */}
          <div className="group relative overflow-hidden rounded-3xl border border-emerald-950/10 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-[0_8px_25px_-5px_rgba(18,63,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_35px_-5px_rgba(18,63,42,0.12)] hover:border-emerald-700/25">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800/70">Recreation</div>
                <div className="mt-1 font-serif text-3xl sm:text-4xl font-bold text-[#123f2a] tracking-tight">
                  3
                </div>
                <div className="mt-1 text-xs font-semibold text-gray-500">
                  Pool, court &amp; function hall
                </div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-800 ring-1 ring-emerald-500/15 transition-transform duration-300 group-hover:scale-105">
                <Building2 className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Online Reservation</span>
            </div>
          </div>

          {/* Card 4: Community Status */}
          <div className="group relative overflow-hidden rounded-3xl border border-emerald-950/10 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-[0_8px_25px_-5px_rgba(18,63,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_35px_-5px_rgba(18,63,42,0.12)] hover:border-emerald-700/25">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800/70">HOA Services</div>
                <div className="mt-1 font-serif text-3xl sm:text-4xl font-bold text-[#123f2a] tracking-tight">
                  Active
                </div>
                <div className="mt-1 text-xs font-semibold text-gray-500">
                  Dues, map &amp; announcements
                </div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-800 ring-1 ring-emerald-500/15 transition-transform duration-300 group-hover:scale-105">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>24/7 Portal Access</span>
            </div>
          </div>
        </Reveal>
      </div>

      {/* ── WHY MABUHAY HOMES SECTION (MODERN BENTO FEATURE GRID) ─────────── */}
      <section className="relative py-20 mt-4 overflow-hidden">
        
        {/* Subtle Side Organic Leaf Vector Background Accents */}
        <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 opacity-10 select-none">
          <svg width="220" height="440" viewBox="0 0 220 440" fill="none">
            <ellipse cx="0" cy="220" rx="220" ry="180" fill="#45a057" />
          </svg>
        </div>
        <div className="pointer-events-none absolute right-0 top-1/3 opacity-10 select-none">
          <svg width="180" height="360" viewBox="0 0 180 360" fill="none">
            <ellipse cx="180" cy="180" rx="180" ry="140" fill="#123f2a" />
          </svg>
        </div>

        <div className="mx-auto max-w-7xl 2xl:max-w-[1400px] px-4 sm:px-6 lg:px-8 relative z-10">
          
          <Reveal>
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3.5 py-1 text-xs font-bold text-emerald-800 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                COMMUNITY HIGHLIGHTS
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#123f2a] tracking-tight">
                Why Mabuhay Homes?
              </h2>
              <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#54b868]" />
              <p className="mt-3.5 text-sm sm:text-base text-gray-600 leading-relaxed">
                A community built on trust, greenery, and modern convenience.
              </p>
            </div>
          </Reveal>

          {/* 4 Bento Feature Cards */}
          <Reveal className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" stagger>
            {WHY_ITEMS.map((item, idx) => (
              <div
                key={item.title}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#123f2a]/10 bg-white p-7 shadow-[0_4px_20px_-2px_rgba(18,63,42,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_36px_-4px_rgba(18,63,42,0.12)] hover:border-emerald-600/25"
              >
                {/* Subtle card top gradient accent */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-[#123f2a] text-white shadow-md shadow-emerald-900/15 transition-transform duration-300 group-hover:scale-105">
                      {item.icon}
                    </div>
                    <span className="text-xs font-bold text-emerald-800/40 font-mono">
                      0{idx + 1}
                    </span>
                  </div>

                  <h3 className="mt-6 font-serif text-xl font-bold text-[#123f2a] group-hover:text-[#45a057] transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-xs sm:text-[13px] leading-relaxed text-gray-500">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 opacity-80 group-hover:opacity-100 transition-opacity">
                  <span>Learn more</span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </div>
            ))}
          </Reveal>

        </div>
      </section>

      {/* ── FEATURED LISTINGS SECTION ───────────────────────────────────── */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="mx-auto max-w-7xl 2xl:max-w-[1400px] px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-serif text-3xl font-bold text-[#123f2a]">
                Featured Listings
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Premium homes available in Mabuhay Homes.
              </p>
            </div>

            <Link
              href="/house-listing"
              className="inline-flex items-center gap-2 rounded-full border border-[#123f2a]/20 bg-white px-5 py-2.5 text-xs font-bold text-[#123f2a] hover:bg-[#123f2a] hover:text-white transition-all shadow-2xs self-start sm:self-auto"
            >
              <span>View All Listings</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <Reveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger deps={[featured.length]}>
            {featured.map((h) => (
              <ListingCard key={h.id} listing={h} />
            ))}
          </Reveal>

        </div>
      </section>

      {/* ── ABOUT & COMMUNITY SECTION ────────────────────────────────────── */}
      <section className="py-20 bg-[#f8faf7] relative overflow-hidden">
        <div className="mx-auto max-w-7xl 2xl:max-w-[1400px] px-4 sm:px-6 lg:px-8">
          
          <div className="rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-br from-[#0d3b22] via-[#134e2e] to-[#092716] p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl border border-emerald-900/40">
            
            {/* Subtle decorative glow */}
            <div className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />

            <div className="grid lg:grid-cols-12 gap-8 items-center relative z-10">
              
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[2px] uppercase text-[#86efac]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#86efac]" />
                  About Mabuhay Homes
                </div>
                
                <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
                  A Thriving Community in the Heart of the Subdivision
                </h2>

                <p className="text-xs sm:text-sm leading-relaxed text-white/80">
                  Mabuhay Homes 2000 Phase 5 is a well-established residential subdivision that blends nature-inspired living with modern conveniences. Managed by an active HOA, we ensure safety, cleanliness, and a high quality of life for all residents.
                </p>

                <div className="pt-2 flex flex-wrap gap-3">
                  <Link
                    href="/house-listing"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-[#45a057] px-6 py-2.5 text-xs font-bold text-white hover:brightness-110 transition-all shadow-md shadow-emerald-950/20"
                  >
                    Browse Available Properties
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-md border border-white/15 text-center shadow-lg">
                  <div className="font-serif text-3xl font-bold text-[#86efac]">100+</div>
                  <div className="mt-1 text-[11px] font-semibold text-white/80">Resident Families</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-md border border-white/15 text-center shadow-lg">
                  <div className="font-serif text-3xl font-bold text-[#86efac]">24/7</div>
                  <div className="mt-1 text-[11px] font-semibold text-white/80">Community Security</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-md border border-white/15 text-center shadow-lg">
                  <div className="font-serif text-3xl font-bold text-[#86efac]">3</div>
                  <div className="mt-1 text-[11px] font-semibold text-white/80">Major Amenities</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-md border border-white/15 text-center shadow-lg">
                  <div className="font-serif text-3xl font-bold text-[#86efac]">100%</div>
                  <div className="mt-1 text-[11px] font-semibold text-white/80">Verified Listings</div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

    </div>
  );
}
