"use client";

import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";

function SocialIcon({ href = "#", children }: { href?: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all duration-200 hover:bg-gold hover:text-green-deep hover:scale-110"
    >
      {children}
    </a>
  );
}

export default function Footer() {
  const { user } = useAuth();

  if (user?.role === "admin") return null;

  return (
    <footer className="mt-auto bg-green-deep text-white/80">
      {/* Main grid */}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        {/* Newsletter */}
        <div>
          {/* Brand */}
          <div className="mb-5 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5 text-gold">
              <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" />
            </svg>
            <span className="font-display tracking-[2.5px] text-lg text-gold">MABUHAY HOMES</span>
          </div>
          <p className="mb-5 text-xs leading-relaxed text-white/55">
            Community portal for Mabuhay Homes 2000 Phase 5 — listings, amenities, dues & announcements.
          </p>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-gold/80">Newsletter</h4>
          <form className="flex overflow-hidden rounded-xl border border-white/15" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Your Email Address"
              className="w-full bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:bg-white/8"
            />
            <button type="submit" className="bg-gold px-3 text-green-deep transition-all hover:brightness-110" aria-label="Subscribe">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>
          <div className="mt-4 flex gap-2">
            {/* Facebook */}
            <SocialIcon>
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M13 22v-8h2.7l.4-3H13V9c0-.9.3-1.5 1.6-1.5H16V4.8a23 23 0 00-2.4-.1c-2.4 0-4 1.5-4 4.1V11H7v3h2.6v8H13z" />
              </svg>
            </SocialIcon>
            {/* Twitter/X */}
            <SocialIcon>
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M22 5.9c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 00-7 3.7A11.6 11.6 0 013 4.9a4.1 4.1 0 001.3 5.5c-.6 0-1.2-.2-1.8-.5v.1c0 2 1.4 3.6 3.3 4a4.1 4.1 0 01-1.9.1 4.1 4.1 0 003.8 2.8A8.2 8.2 0 012 18.4a11.6 11.6 0 006.3 1.8c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2.1z" />
              </svg>
            </SocialIcon>
            {/* YouTube */}
            <SocialIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4">
                <path d="M2.5 8.5a3 3 0 013-3h13a3 3 0 013 3v7a3 3 0 01-3 3h-13a3 3 0 01-3-3v-7z" />
                <path d="M10 9l6 3-6 3V9z" fill="currentColor" stroke="none" />
              </svg>
            </SocialIcon>
            {/* Instagram */}
            <SocialIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" />
              </svg>
            </SocialIcon>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gold">Quick Links</h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/house-listing" className="flex items-center gap-2 text-white/70 transition-colors hover:text-gold">
                <span className="h-1 w-1 rounded-full bg-gold/40" /> House Listings
              </Link>
            </li>
            <li>
              <Link href="/reservation" className="flex items-center gap-2 text-white/70 transition-colors hover:text-gold">
                <span className="h-1 w-1 rounded-full bg-gold/40" /> Book Amenity
              </Link>
            </li>
            {user && user.role !== "non_resident" && (
              <li>
                <Link href="/my-dues" className="flex items-center gap-2 text-white/70 transition-colors hover:text-gold">
                  <span className="h-1 w-1 rounded-full bg-gold/40" /> My Dues
                </Link>
              </li>
            )}
            {user && (
              <>
                <li>
                  <Link href="/map" className="flex items-center gap-2 text-white/70 transition-colors hover:text-gold">
                    <span className="h-1 w-1 rounded-full bg-gold/40" /> Community Map
                  </Link>
                </li>
                <li>
                  <Link href="/announcements" className="flex items-center gap-2 text-white/70 transition-colors hover:text-gold">
                    <span className="h-1 w-1 rounded-full bg-gold/40" /> Announcements
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gold">Our Support</h4>
          <ul className="space-y-2.5 text-sm">
            {[
              { label: "Contact HOA", href: "/contact" },
              { label: "Rules & Regulations", href: "#" },
              { label: "Privacy Policy", href: "#" },
              { label: "Terms & Conditions", href: "#" },
            ].map((item) => (
              <li key={item.label}>
                <a href={item.href} className="flex items-center gap-2 text-white/70 transition-colors hover:text-gold">
                  <span className="h-1 w-1 rounded-full bg-gold/40" /> {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gold">Our Contact</h4>
          <ul className="space-y-3.5 text-sm">
            <li className="flex gap-3 text-white/70">
              <span className="mt-0.5 shrink-0 text-gold"><MapPin className="h-4 w-4" /></span>
              Mabuhay Homes 2000 Phase 5, Philippines
            </li>
            <li className="flex items-center gap-3 text-white/70">
              <span className="text-gold"><Phone className="h-4 w-4" /></span>
              +63 (XXX) XXX XXXX
            </li>
            <li className="flex items-center gap-3 text-white/70">
              <span className="text-gold"><Mail className="h-4 w-4" /></span>
              <a href="mailto:mabuhay2000phase5@gmail.com" className="transition-colors hover:text-gold">
                mabuhay2000phase5@gmail.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-white/45 md:flex-row">
          <p>&copy; {new Date().getFullYear()} Mabuhay Homes. All rights reserved.</p>
          <div className="flex items-center gap-2 font-display tracking-[2px] text-gold/70">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4">
              <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" />
            </svg>
            Mabuhay Homes
          </div>
          <div className="flex gap-4">
            <a href="#" className="transition-colors hover:text-gold">Privacy</a>
            <a href="#" className="transition-colors hover:text-gold">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
