"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { type Announcement } from "@/lib/mock-data";
import { Plus, Edit2, Trash2, X, AlertCircle, CheckCircle2, Loader2, Megaphone } from "lucide-react";

export default function AdminAnnouncementsPage() {
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [deletingAnn, setDeletingAnn] = useState<Announcement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [category, setCategory] = useState("Community");

  const loadAnnouncements = () => {
    setLoading(true);
    api
      .announcements()
      .then((data) => setAnns(data || []))
      .catch(() => setAnns([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const openCreateModal = () => {
    setTitle("");
    setContent("");
    setStatus("active");
    setCategory("Community");
    setFeedback(null);
    setShowCreateModal(true);
  };

  const openEditModal = (a: Announcement) => {
    setEditingAnn(a);
    setTitle(a.title);
    setContent(a.content);
    setStatus(a.status);
    setCategory((a as any).category || "Community");
    setFeedback(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.announcementCreate({
        title: title.trim(),
        content: content.trim(),
        status,
        category,
      });
      setShowCreateModal(false);
      setFeedback({ type: "success", message: "Announcement published successfully and notified eligible residents!" });
      loadAnnouncements();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to create announcement.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnn || !title.trim() || !content.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.announcementUpdate(editingAnn.id, {
        title: title.trim(),
        content: content.trim(),
        status,
        category,
      });
      setEditingAnn(null);
      setFeedback({ type: "success", message: "Announcement updated successfully." });
      loadAnnouncements();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update announcement.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAnn) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.announcementDelete(deletingAnn.id);
      setDeletingAnn(null);
      setFeedback({ type: "success", message: "Announcement deleted successfully." });
      loadAnnouncements();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to delete announcement.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-green-dark">Announcements</h1>
          <p className="mt-1 text-sm text-muted">
            Create, publish, edit, and manage HOA announcements. Active announcements notify residents in real time.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="btn-green inline-flex items-center gap-2 justify-center shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Announcement</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Announcements List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-green-mid">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : anns.length === 0 ? (
        <div className="card p-12 text-center text-muted">
          <Megaphone className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-green-dark">No announcements found</h3>
          <p className="mt-1 text-xs">Click "+ New Announcement" above to create and publish your first announcement.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {anns.map((a) => (
            <div key={a.id} className="card transition-all hover:border-green-light/40">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif text-xl font-bold text-green-dark">{a.title}</span>
                    <span className={`badge ${a.status === "active" ? "badge-green" : "badge-muted"}`}>
                      {a.status}
                    </span>
                    {(a as any).category && (
                      <span className="rounded-full bg-cream-2/80 px-2.5 py-0.5 text-[11px] font-semibold text-green-dark">
                        {(a as any).category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{a.content}</p>
                  <div className="text-xs text-muted pt-1">
                    Posted by <strong className="text-green-dark">{a.poster || "HOA Admin"}</strong> · {a.postDate}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2 border-t border-cream-2 pt-3">
                <button
                  type="button"
                  onClick={() => openEditModal(a)}
                  className="btn-ghost !px-3 !py-1.5 text-xs inline-flex items-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingAnn(a)}
                  className="btn-ghost !px-3 !py-1.5 text-xs text-danger hover:bg-danger-bg inline-flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-cream-2 pb-3">
              <h3 className="font-serif text-lg font-bold text-green-dark">New Announcement</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted hover:text-green-dark"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="field-label">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="field"
                  placeholder="e.g. Scheduled Water Interruption"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="field"
                  >
                    <option value="Community">Community</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Events">Events</option>
                    <option value="Important Notices">Important Notices</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "active" | "archived")}
                    className="field"
                  >
                    <option value="active">Active (Published)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="field-label">Content *</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="field"
                  placeholder="Provide the complete details of the announcement here…"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cream-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-green text-xs inline-flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{submitting ? "Publishing..." : "Publish Announcement"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingAnn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-cream-2 pb-3">
              <h3 className="font-serif text-lg font-bold text-green-dark">Edit Announcement</h3>
              <button
                type="button"
                onClick={() => setEditingAnn(null)}
                className="text-muted hover:text-green-dark"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="field-label">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="field"
                  >
                    <option value="Community">Community</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Events">Events</option>
                    <option value="Important Notices">Important Notices</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "active" | "archived")}
                    className="field"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="field-label">Content *</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="field"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cream-2">
                <button
                  type="button"
                  onClick={() => setEditingAnn(null)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-green text-xs inline-flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{submitting ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingAnn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-lg font-bold text-green-dark">Delete Announcement?</h3>
                <p className="mt-1 text-xs text-muted">
                  Are you sure you want to permanently delete{" "}
                  <strong>"{deletingAnn.title}"</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-cream-2">
              <button
                type="button"
                onClick={() => setDeletingAnn(null)}
                className="btn-ghost text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="btn-danger text-xs inline-flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{submitting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
