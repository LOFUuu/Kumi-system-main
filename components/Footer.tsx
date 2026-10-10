"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Phone, Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

function SocialIcon({ href = "#", label, children }: { href?: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onClick={(e) => {
        if (href === "#") e.preventDefault();
      }}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all duration-200 hover:bg-[#54b868] hover:text-white hover:scale-110"
    >
      {children}
    </a>
  );
}

export default function Footer() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Hide footer while auth state is resolving or for admin users
  if (loading || user?.role === "admin") return null;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setIsSuccess(false);
      setMessage("Please enter an email address.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIsSuccess(false);
        setMessage(data.error || "Failed to subscribe. Please try again.");
      } else {
        setIsSuccess(true);
        setMessage(data.message || "Subscribed successfully!");
        setEmail("");
      }
    } catch {
      setIsSuccess(false);
      setMessage("Failed to subscribe. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="mt-auto bg-[#0e3020] text-white/80 border-t border-[#123f2a]">
      {/* Main grid */}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 py-14 md:grid-cols-4">
        
        {/* Brand & Newsletter */}
        <div>
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#54b868] text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" />
              </svg>
            </div>
            <span className="font-display tracking-[2px] text-xl font-bold text-white">MABUHAY HOMES</span>
          </div>

          <p className="mb-5 text-xs leading-relaxed text-white/60">
            Community portal for Mabuhay Homes 2000 Phase 5 — listings, amenities, dues & official announcements.
          </p>

          <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#86efac]">Subscribe to Newsletter</h4>
          <form className="flex flex-col gap-2" onSubmit={handleSubscribe}>
            <div className="flex overflow-hidden rounded-full border border-white/20 bg-white/5 focus-within:border-[#54b868] transition-colors p-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full bg-transparent px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/40"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[#54b868] px-4 py-1.5 text-xs font-bold text-white transition-all hover:bg-[#45a057] disabled:opacity-60 flex items-center justify-center shrink-0"
                aria-label="Subscribe"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                ) : (
                  <span>Subscribe</span>
                )}
              </button>
            </div>
            {message && (
              <p className={`flex items-center gap-1.5 text-xs ${isSuccess ? "text-[#86efac]" : "text-rose-400"}`}>
                {isSuccess ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                <span>{message}</span>
              </p>
            )}
          </form>

          {/* Social Icons */}
          <div className="mt-5 flex gap-2">
            <SocialIcon href="https://facebook.com" label="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M13 22v-8h2.7l.4-3H13V9c0-.9.3-1.5 1.6-1.5H16V4.8a23 23 0 00-2.4-.1c-2.4 0-4 1.5-4 4.1V11H7v3h2.6v8H13z" />
              </svg>
            </SocialIcon>
            <SocialIcon href="https://x.com" label="Twitter">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M22 5.9c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 00-7 3.7A11.6 11.6 0 013 4.9a4.1 4.1 0 001.3 5.5c-.6 0-1.2-.2-1.8-.5v.1c0 2 1.4 3.6 3.3 4a4.1 4.1 0 01-1.9.1 4.1 4.1 0 003.8 2.8A8.2 8.2 0 012 18.4a11.6 11.6 0 006.3 1.8c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2.1z" />
              </svg>
            </SocialIcon>
            <SocialIcon href="https://youtube.com" label="YouTube">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4">
                <path d="M2.5 8.5a3 3 0 013-3h13a3 3 0 013 3v7a3 3 0 01-3 3h-13a3 3 0 01-3-3v-7z" />
                <path d="M10 9l6 3-6 3V9z" fill="currentColor" stroke="none" />
              </svg>
            </SocialIcon>
            <SocialIcon href="https://instagram.com" label="Instagram">
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
          <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#86efac]">Quick Links</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/house-listing" className="flex items-center gap-2 text-white/70 transition-colors hover:text-[#86efac]">
                <span className="h-1 w-1 rounded-full bg-[#54b868]" /> House Listings
              </Link>
            </li>
            <li>
              <Link href="/reservation" className="flex items-center gap-2 text-white/70 transition-colors hover:text-[#86efac]">
                <span className="h-1 w-1 rounded-full bg-[#54b868]" /> Book Amenity
              </Link>
            </li>
            {user && user.role !== "non_resident" && (
              <li>
                <Link href="/my-dues" className="flex items-center gap-2 text-white/70 transition-colors hover:text-[#86efac]">
                  <span className="h-1 w-1 rounded-full bg-[#54b868]" /> My Dues
                </Link>
              </li>
            )}
            {user && (
              <>
                <li>
                  <Link href="/map" className="flex items-center gap-2 text-white/70 transition-colors hover:text-[#86efac]">
                    <span className="h-1 w-1 rounded-full bg-[#54b868]" /> Community Map
                  </Link>
                </li>
                <li>
                  <Link href="/announcements" className="flex items-center gap-2 text-white/70 transition-colors hover:text-[#86efac]">
                    <span className="h-1 w-1 rounded-full bg-[#54b868]" /> Announcements
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#86efac]">Our Support</h4>
          <ul className="space-y-2 text-xs">
            {[
              { label: "Contact HOA", href: "/contact" },
              { label: "Rules & Regulations", href: "#" },
              { label: "Privacy Policy", href: "#" },
              { label: "Terms & Conditions", href: "#" },
            ].map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={(e) => { if (item.href === "#") e.preventDefault(); }}
                  className="flex items-center gap-2 text-white/70 transition-colors hover:text-[#86efac]"
                >
                  <span className="h-1 w-1 rounded-full bg-[#54b868]" /> {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#86efac]">Our Contact</h4>
          <ul className="space-y-3 text-xs">
            <li className="flex gap-2.5 text-white/70">
              <span className="mt-0.5 shrink-0 text-[#86efac]"><MapPin className="h-4 w-4" /></span>
              Mabuhay Homes 2000 Phase 5, Philippines
            </li>
            <li className="flex items-center gap-2.5 text-white/70">
              <span className="text-[#86efac]"><Phone className="h-4 w-4" /></span>
              +63 (XXX) XXX XXXX
            </li>
            <li className="flex items-center gap-2.5 text-white/70">
              <span className="text-[#86efac]"><Mail className="h-4 w-4" /></span>
              <a href="mailto:mabuhay2000phase5@gmail.com" className="transition-colors hover:text-[#86efac]">
                mabuhay2000phase5@gmail.com
              </a>
            </li>
          </ul>
        </div>

      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 bg-[#0a2317]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-white/50 md:flex-row">
          <p>&copy; {new Date().getFullYear()} Mabuhay Homes. All rights reserved.</p>
          <div className="flex items-center gap-2 font-display tracking-[2px] text-white/80">
            <div className="h-2 w-2 rounded-full bg-[#54b868]" />
            MABUHAY HOMES
          </div>
          <div className="flex gap-4 text-xs">
            <a href="#" onClick={(e) => e.preventDefault()} className="transition-colors hover:text-white">Privacy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="transition-colors hover:text-white">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
