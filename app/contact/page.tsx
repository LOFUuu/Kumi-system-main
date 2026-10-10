"use client";

import { useState } from "react";
import { MapPin, Phone, Mail, CheckCircle2, TriangleAlert, Loader2 } from "lucide-react";

export default function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message. Please try again.");
      }

      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
            <li className="flex gap-3"><span className="text-gold"><MapPin className="h-5 w-5" /></span> Mabuhay Homes 2000 Phase 5, Philippines</li>
            <li className="flex items-center gap-3"><span className="text-gold"><Phone className="h-5 w-5" /></span> +63 (XXX) XXX XXXX</li>
            <li className="flex items-center gap-3"><span className="text-gold"><Mail className="h-5 w-5" /></span> mabuhay2000phase5@gmail.com</li>
          </ul>
        </div>

        <div className="card">
          {sent ? (
            <div className="flex items-center gap-2 rounded-xl bg-green-light/15 p-4 text-green-mid">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" /> Thank you! Your message has been sent to the HOA.
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-danger-bg p-3 text-sm text-danger">
                  <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="field-label">Full Name</label>
                <input
                  className="field"
                  required
                  placeholder="Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input
                  type="email"
                  className="field"
                  required
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Subject</label>
                <input
                  className="field"
                  placeholder="Concern about…"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Message</label>
                <textarea
                  className="field min-h-32"
                  required
                  placeholder="How can we help?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <button type="submit" disabled={submitting} className="btn-green w-full disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Message"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
