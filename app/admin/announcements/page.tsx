"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { type Announcement } from "@/lib/mock-data";

export default function AdminAnnouncementsPage() {
  const [anns, setAnns] = useState<Announcement[]>([]);
  useEffect(() => {
    api.announcements().then(setAnns).catch(() => setAnns([]));
  }, []);
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold text-green-dark">Announcements</h1>
        <button className="btn-green">+ New Announcement</button>
      </div>

      <div className="space-y-3">
        {anns.map((a) => (
          <div key={a.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-serif text-xl font-bold text-green-dark">{a.title}</div>
                <p className="text-sm text-muted">{a.content}</p>
                <div className="mt-2 text-xs text-muted">Posted by {a.poster} · {a.postDate}</div>
              </div>
              <span className={`badge ${a.status === "active" ? "badge-green" : "badge-muted"}`}>{a.status}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="btn-ghost !px-3 !py-1.5 text-xs">Edit</button>
              <button className="btn-ghost !px-3 !py-1.5 text-xs text-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
