"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Home, LogIn, Calendar, CreditCard, ShieldCheck, TreePine, HandshakeIcon, Star } from "lucide-react";
import { ListingCard, StatBox } from "@/components/ui";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { HouseListing, Announcement, User } from "@/lib/mock-data";

const WHY_ITEMS = [
  {
    icon: <ShieldCheck className="h-7 w-7" />,
    title: "Secure & Verified",
    desc: "Every listing is admin-verified before it goes live, giving buyers and renters peace of mind.",
  },
  {
    icon: <TreePine className="h-7 w-7" />,
    title: "Green Community",
    desc: "Mabuhay Homes 2000 Phase 5 is designed around nature — tree-lined streets and open parks.",
  },
  {
    icon: <HandshakeIcon className="h-7 w-7" />,
    title: "HOA Support",
    desc: "Our Homeowners Association actively manages amenities, dues, and community programs.",
  },
  {
    icon: <Star className="h-7 w-7" />,
    title: "Premium Amenities",
    desc: "Enjoy a swimming pool, basketball court, and function hall — all bookable online.",
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<HouseListing[]>([]);
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    api.listingsVerified().then(setListings).catch(() => setListings([]));
    api.users().then(setUsers).catch(() => setUsers([]));
    if (user) {
      api.announcements(true).then(setAnns).catch(() => setAnns([]));
    } else {
      setAnns([]);
    }
  }, [user]);

  const featured = listings.filter((l) => l.status === "available").slice(0, 4);
  const totalResidents = users.filter((u) => u.role === "resident").length;
  const totalHouses = listings.filter((l) => l.status === "available").length;

  return (
    <>
      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative min-h-[420px] lg:min-h-[440px] w-full overflow-hidden bg-[#0a271a]">
        {/* Full right-side image that fades into green on the left */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/mabuhay-banner.jpg"
            alt="Mabuhay Homes 2000 Phase V"
            className="h-full w-full object-cover object-[60%_center] filter brightness-[1.08] contrast-[1.05]"
          />
          {/* Left fade: solid dark green → transparent */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a271a] from-[30%] via-[#0a271a]/85 via-[50%] to-transparent" />
          {/* Top & bottom vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a271a]/40 via-transparent to-[#0a271a]/50" />
        </div>

        {/* Subtle leaf / organic shape bottom-right decoration */}
        <div className="absolute bottom-0 right-0 z-0 pointer-events-none select-none opacity-30">
          <svg width="260" height="120" viewBox="0 0 260 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="200" cy="100" rx="160" ry="60" fill="#1a4a2e" />
            <ellipse cx="240" cy="115" rx="90" ry="35" fill="#1e5235" />
          </svg>
        </div>

        {/* Hero Content: Left-aligned */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-12 py-12 sm:py-16 flex items-center min-h-[420px] lg:min-h-[440px]">
          <div className="max-w-lg text-left">
            {/* WELCOME TO + gold line */}
            <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold tracking-[3px] uppercase text-white/85">
              <span>WELCOME TO</span>
              <span className="h-[2px] w-12 sm:w-16 bg-gold rounded-full" />
            </div>

            {/* MABUHAY HOMES */}
            <h1 className="mt-2 font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-gold drop-shadow-sm">
              Mabuhay Homes
            </h1>

            {/* SUBTITLE */}
            <p className="mt-2 text-[11px] sm:text-xs font-bold tracking-[2.5px] uppercase text-white/90">
              MABUHAY HOMES 2000 PHASE 5
            </p>

            {/* DESCRIPTION */}
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-white/75 max-w-sm">
              Your community hub for house listings, amenity reservations,
              monthly dues tracking, and official announcements.
            </p>

            {/* BUTTONS */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/house-listing"
                className="inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-2.5 text-sm font-bold text-[#0a271a] shadow-md transition-all duration-200 hover:brightness-110 hover:scale-[1.03] active:scale-[0.98]"
              >
                <Home className="h-4 w-4" />
                View Listings
              </Link>

              {user ? (
                <>
                  <Link
                    href="/reservation"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:border-white/50"
                  >
                    <Calendar className="h-4 w-4" />
                    Book Amenity
                  </Link>
                  <Link
                    href="/my-dues"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:border-white/50"
                  >
                    <CreditCard className="h-4 w-4" />
                    My Dues
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:border-white/50"
                >
                  <LogIn className="h-4 w-4" />
                  Log In
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────── */}
      <Reveal
        className="mx-auto grid max-w-5xl gap-5 px-4 sm:grid-cols-2 -mt-10"
        stagger
        deps={[totalResidents, totalHouses]}
      >
        <StatBox icon={<Users className="h-6 w-6" />} value={totalResidents} label="Total Residents" />
        <StatBox icon={<Home className="h-6 w-6" />} value={totalHouses} label="Total Houses" />
      </Reveal>

      {/* ── WHY CHOOSE US ────────────────────────────────────────── */}
      <section className="bg-cream/60 border-y border-cream-2 py-16 mt-12">
        <div className="mx-auto max-w-7xl px-4">
          <Reveal>
            <div className="section-head">
              <h2>Why Mabuhay Homes?</h2>
              <div className="section-rule mx-auto" />
              <p className="mt-4">A community built on trust, greenery, and modern convenience.</p>
            </div>
          </Reveal>
          <Reveal className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" stagger>
            {WHY_ITEMS.map((item) => (
              <div
                key={item.title}
                className="flex flex-col items-start gap-4 rounded-2xl border border-cream-2 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-mid/10 text-green-mid">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-green-dark">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── FEATURED LISTINGS ────────────────────────────────────── */}
      <section className="section">
        <div className="section-head">
          <h2>Featured Listings</h2>
          <div className="section-rule mx-auto" />
          <p className="mt-4">Premium homes available in Mabuhay Homes</p>
        </div>
        <Reveal className="flex flex-wrap justify-center gap-6" stagger deps={[featured.length]}>
          {featured.map((h) => (
            <div key={h.id} className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
              <ListingCard listing={h} />
            </div>
          ))}
        </Reveal>
        {featured.length > 0 && (
          <div className="mt-10 text-center">
            <Link href="/house-listing" className="btn-ghost">
              Browse All Listings →
            </Link>
          </div>
        )}
      </section>

      {/* ── ABOUT ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-green-dark text-white">
        {/* Decorative background shapes */}
        <div className="pointer-events-none absolute inset-0 opacity-10 select-none">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold" />
          <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-green-light" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: text */}
            <Reveal>
              <div>
                <div className="flex items-center gap-3 text-xs font-semibold tracking-[3px] uppercase text-gold/80">
                  <span className="h-[2px] w-10 bg-gold/60 rounded-full" />
                  About Us
                </div>
                <h2 className="mt-3 font-serif text-4xl font-bold leading-snug text-white">
                  A Thriving Community in the Heart of the City
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-white/75">
                  Mabuhay Homes 2000 Phase 5 is a well-established residential subdivision that
                  blends nature-inspired living with modern conveniences. With over a hundred
                  families calling it home, the community is managed by an active HOA that ensures
                  safety, cleanliness, and a high quality of life for all residents.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/75">
                  Our digital portal makes it easy to view available houses, book amenities online,
                  track monthly dues, and stay informed with official announcements — all in one place.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/house-listing" className="btn-gold">
                    View Properties
                  </Link>
                  <Link href="/reservation" className="btn-outline-w">
                    Book an Amenity
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* Right: image card */}
            <Reveal y={40}>
              <div className="relative">
                <div className="overflow-hidden rounded-3xl shadow-2xl border-2 border-white/10">
                  <img
                    src="/images/mabuhay-banner.jpg"
                    alt="Mabuhay Homes Community"
                    className="h-72 w-full object-cover object-center brightness-90"
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── ANNOUNCEMENTS PREVIEW (logged-in only) ──────────────── */}
      {user && (
        <section className="section !pt-0 mt-4">
          <div className="section-head">
            <h2>Latest Announcements</h2>
            <div className="section-rule mx-auto" />
            <p className="mt-4">Stay up to date with community news</p>
          </div>
          <Reveal className="flex flex-wrap justify-center gap-6" stagger deps={[anns.length]}>
            {anns.map((a) => (
              <div key={a.id} className="card w-full sm:w-[calc(50%-12px)]">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-mid">
                  {a.postDate}
                </div>
                <h3 className="font-serif text-xl font-bold text-green-dark">
                  {a.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted">
                  {a.content}
                </p>
              </div>
            ))}
          </Reveal>
          <div className="mt-8 text-center">
            <Link href="/announcements" className="btn-ghost">
              View All Announcements →
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
