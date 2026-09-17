"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Reveal from "@/components/Reveal";
import type { Announcement } from "@/lib/mock-data";

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      api
        .announcements(true)
        .then(setItems)
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="section">
        <div className="mx-auto max-w-md rounded-2xl border border-cream-2 bg-white p-8 text-center shadow-sm">
          <LogIn className="mx-auto h-10 w-10 text-green-mid" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-green-dark">
            Sign in to view announcements
          </h2>
          <p className="mt-2 text-sm text-muted">
            Community announcements are only available to registered residents and members.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/login?next=/announcements" className="btn-green text-center">
              Sign In
            </Link>
            <Link href="/register" className="btn-gold text-center">
              Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="section-head">
        <h2>Announcements</h2>
        <p>Official news and notices from the HOA</p>
      </div>

      <Reveal className="mx-auto flex flex-wrap justify-center gap-6 max-w-5xl" stagger deps={[items.length]}>
        {items.map((a) => (
          <article key={a.id} className="card w-full sm:w-[calc(50%-12px)]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-green-mid">{a.postDate}</span>
              <span className="badge badge-green">Active</span>
            </div>
            <h3 className="font-serif text-2xl font-bold text-green-dark">{a.title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{a.content}</p>
            <div className="mt-4 text-xs text-muted">Posted by {a.poster}</div>
          </article>
        ))}
        {items.length === 0 && !loading && (
          <p className="text-center text-muted">No active announcements at this time.</p>
        )}
      </Reveal>
    </div>
  );
}
