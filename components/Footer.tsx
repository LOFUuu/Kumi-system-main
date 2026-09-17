"use client";

import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";

function SocialIcon({ children }: { children: React.ReactNode }) {
  return (
    <a href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-gold hover:text-green-deep">
      {children}
    </a>
  );
}

export default function Footer() {
  const { user } = useAuth();

  if (user?.role === "admin") return null;

  return (
    <footer className="mt-auto bg-green-deep text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gold">Our Newsletter</h4>
          <form className="flex overflow-hidden rounded-xl border border-white/15" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Your Email Address"
              className="w-full bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
            />
            <button type="submit" className="bg-gold px-3 text-green-deep" aria-label="Subscribe">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>
          <div className="mt-4 flex gap-2">
            <SocialIcon><svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M13 22v-8h2.7l.4-3H13V9c0-.9.3-1.5 1.6-1.5H16V4.8a23 23 0 00-2.4-.1c-2.4 0-4 1.5-4 4.1V11H7v3h2.6v8H13z" /></svg></SocialIcon>
            <SocialIcon><svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M22 5.9c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 00-7 3.7A11.6 11.6 0 013 4.9a4.1 4.1 0 001.3 5.5c-.6 0-1.2-.2-1.8-.5v.1c0 2 1.4 3.6 3.3 4a4.1 4.1 0 01-1.9.1 4.1 4.1 0 003.8 2.8A8.2 8.2 0 012 18.4a11.6 11.6 0 006.3 1.8c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2.1z" /></svg></SocialIcon>
            <SocialIcon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4"><path d="M2.5 8.5a3 3 0 013-3h13a3 3 0 013 3v7a3 3 0 01-3 3h-13a3 3 0 01-3-3v-7z" /><path d="M10 9l6 3-6 3V9z" fill="currentColor" stroke="none" /></svg></SocialIcon>
            <SocialIcon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" /></svg></SocialIcon>
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gold">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/house-listing" className="hover:text-gold">House Listings</Link></li>
            <li><Link href="/reservation" className="hover:text-gold">Book Amenity</Link></li>
            {user && user.role !== "non_resident" && (
              <li><Link href="/my-dues" className="hover:text-gold">My Dues</Link></li>
            )}
            {user && (
              <>
                <li><Link href="/map" className="hover:text-gold">Community Map</Link></li>
                <li><Link href="/announcements" className="hover:text-gold">Announcements</Link></li>
              </>
            )}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gold">Our Support</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-gold">Contact HOA</a></li>
            <li><a href="#" className="hover:text-gold">Rules &amp; Regulations</a></li>
            <li><a href="#" className="hover:text-gold">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-gold">Terms &amp; Conditions</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gold">Our Contact</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2"><span className="text-gold"><MapPin className="h-5 w-5" /></span> Building W 13th Parks, Suite 559, Denver</li>
            <li className="flex items-center gap-2"><span className="text-gold"><Phone className="h-5 w-5" /></span> +0 (555) 123 45 67</li>
            <li className="flex items-center gap-2"><span className="text-gold"><Mail className="h-5 w-5" /></span> <a href="mailto:hoa@mabuhayhomes.ph" className="hover:text-gold">hoa@mabuhayhomes.ph</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-sm md:flex-row">
          <p>&copy; {new Date().getFullYear()} Mabuhay Homes. All rights reserved.</p>
          <div className="flex items-center gap-2 font-display tracking-[2px] text-gold">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-5 w-5"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
            Mabuhay Homes
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-gold">Privacy</a>
            <a href="#" className="hover:text-gold">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
