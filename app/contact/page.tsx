"use client";

import { useState } from "react";
import { MapPin, Phone, Mail, CheckCircle2 } from "lucide-react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="section">
      <div className="section-head">
        <h2>Contact HOA</h2>
        <p>We&apos;re here to help with your concerns and inquiries</p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
        <div>
          <h3 className="font-serif text-2xl font-bold text-green-dark">Get in touch</h3>
          <p className="mt-2 text-muted">
            For concerns about dues, amenities, or community matters, reach out to the Homeowners&apos; Association.
          </p>
          <ul className="mt-6 space-y-4 text-sm">
            <li className="flex gap-3"><span className="text-gold"><MapPin className="h-5 w-5" /></span> Building W 13th Parks, Suite 559, Denver</li>
            <li className="flex items-center gap-3"><span className="text-gold"><Phone className="h-5 w-5" /></span> +0 (555) 123 45 67</li>
            <li className="flex items-center gap-3"><span className="text-gold"><Mail className="h-5 w-5" /></span> hoa@mabuhayhomes.ph</li>
          </ul>
        </div>

        <div className="card">
          {sent ? (
            <div className="flex items-center gap-2 rounded-xl bg-green-light/15 p-4 text-green-mid">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" /> Thank you! Your message has been sent to the HOA.
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <div>
                <label className="field-label">Full Name</label>
                <input className="field" required placeholder="Juan Dela Cruz" />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input type="email" className="field" required placeholder="you@email.com" />
              </div>
              <div>
                <label className="field-label">Subject</label>
                <input className="field" placeholder="Concern about…" />
              </div>
              <div>
                <label className="field-label">Message</label>
                <textarea className="field min-h-32" required placeholder="How can we help?" />
              </div>
              <button type="submit" className="btn-green w-full">Send Message</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
