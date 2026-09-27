"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Home, LogIn, Calendar, CreditCard } from "lucide-react";
import { ListingCard, StatBox } from "@/components/ui";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { HouseListing, Announcement, User } from "@/lib/mock-data";

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
      {/* HERO */}
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

            {/* MABUHAY HOMES — single line, original font preserved */}
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
                className="inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-2.5 text-sm font-bold text-[#0a271a] shadow-md transition hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Home className="h-4 w-4" />
                View Listings
              </Link>

              {user ? (
                <>
                  <Link
                    href="/reservation"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                  >
                    <Calendar className="h-4 w-4" />
                    Book Amenity
                  </Link>
                  <Link
                    href="/my-dues"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                  >
                    <CreditCard className="h-4 w-4" />
                    My Dues
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <LogIn className="h-4 w-4" />
                  Log In
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <Reveal
        className="mx-auto grid max-w-5xl gap-5 px-4 sm:grid-cols-2 -mt-10"
        stagger
        deps={[totalResidents, totalHouses]}
      >
        <StatBox icon={<Users className="h-6 w-6" />} value={totalResidents} label="Total Residents" />
        <StatBox icon={<Home className="h-6 w-6" />} value={totalHouses} label="Total Houses" />
      </Reveal>

      {/* FEATURED */}
      <section className="section">
        <div className="section-head">
          <h2>Featured Listings</h2>
          <p>Premium homes available in Mabuhay Homes</p>
        </div>
        <Reveal className="flex flex-wrap justify-center gap-6" stagger deps={[featured.length]}>
          {featured.map((h) => (
            <div key={h.id} className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
              <ListingCard listing={h} />
            </div>
          ))}
        </Reveal>
      </section>

      {/* ANNOUNCEMENTS PREVIEW */}
      {user && (
        <section className="section !pt-0">
          <div className="section-head">
            <h2>Latest Announcements</h2>
            <p>Stay up to date with community news</p>
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
