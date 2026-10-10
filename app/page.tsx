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
  Star,
  ChevronRight,
  ArrowRight,
  Megaphone,
} from "lucide-react";
import { ListingCard, StatBox } from "@/components/ui";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { HouseListing, Announcement, User } from "@/lib/mock-data";

const WHY_ITEMS = [
  {
    icon: <ShieldCheck className="h-6 w-6 text-[#123f2a]" />,
    title: "Secure & Verified",
    desc: "Every listing is admin-verified before it goes live, giving buyers and renters peace of mind.",
  },
  {
    icon: <TreePine className="h-6 w-6 text-[#123f2a]" />,
    title: "Green Community",
    desc: "Mabuhay Homes 2000 Phase 5 is designed around nature — tree-lined streets and open parks.",
  },
  {
    icon: <HandshakeIcon className="h-6 w-6 text-[#123f2a]" />,
    title: "HOA Support",
    desc: "Our Homeowners' Association actively manages amenities, dues, and community programs.",
  },
  {
    icon: <Star className="h-6 w-6 text-[#123f2a]" />,
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

  useEffect(() => {
    if (!loading && user?.role === "admin") {
      router.replace("/admin");
      return;
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
  const totalResidents = users.filter((u) => u.role === "resident").length || 7;
  const totalHouses = listings.filter((l) => l.status === "available").length || 4;

  return (
    <div className="min-h-screen bg-[#f8faf7] text-[#123f2a]">
      
      {/* ── HERO BANNER (INSPIRED BY REFERENCE DESIGN) ────────────────────── */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-4 pb-8 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] bg-[#123f2a] text-white shadow-2xl">
          
          <div className="grid lg:grid-cols-12 gap-8 items-center min-h-[460px] p-6 sm:p-10 lg:p-12 relative z-10">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 flex flex-col items-start justify-center z-10">
              
              {/* WELCOME TO Pill Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#205439] border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90">
                <Home className="h-3.5 w-3.5 text-[#86efac]" />
                <span className="uppercase tracking-widest text-[10px] font-bold">WELCOME TO</span>
              </div>

              {/* Main Headline */}
              <h1 className="mt-4 font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-white">
                Mabuhay <span className="text-[#86efac]">Homes</span>
              </h1>

              {/* Subtitle */}
              <p className="mt-2 text-xs font-bold uppercase tracking-[3px] text-white/70">
                MABUHAY HOMES 2000 PHASE 5
              </p>

              {/* Description */}
              <p className="mt-3.5 text-sm sm:text-base leading-relaxed text-white/80 max-w-lg">
                Your community hub for house listings, amenities reservations, monthly dues tracking, and official announcements.
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/house-listing"
                  className="inline-flex items-center gap-2 rounded-full bg-[#54b868] px-6 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-[#45a057] hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                >
                  <Home className="h-4 w-4" />
                  <span>View Listings</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>

                {user ? (
                  <>
                    <Link
                      href="/reservation"
                      className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-xs transition-all duration-200 hover:bg-white/20 hover:border-white/50"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Book Amenity</span>
                    </Link>
                    {user.role !== "non_resident" && (
                      <Link
                        href="/my-dues"
                        className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-xs transition-all duration-200 hover:bg-white/20 hover:border-white/50"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>My Dues</span>
                      </Link>
                    )}
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-xs transition-all duration-200 hover:bg-white/20 hover:border-white/50"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Log In</span>
                  </Link>
                )}
              </div>

            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5 relative h-64 sm:h-80 lg:h-full min-h-[300px] w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 shadow-lg">
              <img
                src="/images/mabuhay-banner.jpg"
                alt="Mabuhay Homes Subdivision Entrance"
                className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#123f2a]/60 via-transparent to-transparent" />
            </div>

          </div>


        </div>
      </section>

      {/* ── FLOATING STATS OVERLAY ────────────────────────────────────────── */}
      <div className="-mt-8 sm:-mt-12 relative z-20 mx-auto max-w-5xl px-4">
        <Reveal
          className="grid gap-4 sm:grid-cols-2"
          stagger
          deps={[totalResidents, totalHouses]}
        >
          <StatBox icon={<Users className="h-6 w-6 text-[#123f2a]" />} value={totalResidents} label="Total Residents" />
          <StatBox icon={<Home className="h-6 w-6 text-[#123f2a]" />} value={totalHouses} label="Total Houses" />
        </Reveal>
      </div>

      {/* ── WHY MABUHAY HOMES SECTION ────────────────────────────────────── */}
      <section className="relative py-20 mt-4 overflow-hidden">
        
        {/* Subtle Side Organic Leaf Vector Background Accents */}
        <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 opacity-10 select-none">
          <svg width="180" height="360" viewBox="0 0 180 360" fill="none">
            <ellipse cx="0" cy="180" rx="180" ry="140" fill="#45a057" />
          </svg>
        </div>
        <div className="pointer-events-none absolute right-0 top-1/3 opacity-10 select-none">
          <svg width="140" height="280" viewBox="0 0 140 280" fill="none">
            <ellipse cx="140" cy="140" rx="140" ry="100" fill="#123f2a" />
          </svg>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          
          <Reveal>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#123f2a]">
                Why Mabuhay Homes?
              </h2>
              <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#54b868]" />
              <p className="mt-3.5 text-sm sm:text-base text-gray-600 leading-relaxed">
                A community built on trust, greenery, and modern convenience.
              </p>
            </div>
          </Reveal>

          {/* 4 Feature Cards */}
          <Reveal className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" stagger>
            {WHY_ITEMS.map((item) => (
              <div
                key={item.title}
                className="group flex flex-col items-start gap-4 rounded-3xl border border-[#123f2a]/10 bg-white p-6 shadow-[0_4px_20px_-2px_rgba(18,63,42,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_30px_-4px_rgba(18,63,42,0.12)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f3ec] text-[#123f2a] transition-transform duration-300 group-hover:scale-110">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#123f2a] group-hover:text-[#45a057] transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </Reveal>

        </div>
      </section>

      {/* ── FEATURED LISTINGS SECTION ───────────────────────────────────── */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="rounded-3xl sm:rounded-[2.5rem] bg-[#123f2a] p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
            
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
                    className="inline-flex items-center gap-2 rounded-full bg-[#54b868] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#45a057] transition-all shadow-xs"
                  >
                    Browse Available Properties
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-xs border border-white/10 text-center">
                  <div className="font-serif text-3xl font-bold text-[#86efac]">100+</div>
                  <div className="mt-1 text-[11px] font-semibold text-white/80">Resident Families</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-xs border border-white/10 text-center">
                  <div className="font-serif text-3xl font-bold text-[#86efac]">24/7</div>
                  <div className="mt-1 text-[11px] font-semibold text-white/80">Community Security</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-xs border border-white/10 text-center">
                  <div className="font-serif text-3xl font-bold text-[#86efac]">3</div>
                  <div className="mt-1 text-[11px] font-semibold text-white/80">Major Amenities</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-xs border border-white/10 text-center">
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
