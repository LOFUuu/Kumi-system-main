"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Edit2,
  Archive,
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPHP, type Amenity } from "@/lib/mock-data";

interface AmenityFormState {
  name: string;
  description: string;
  maxCapacity: number;
  rateWalkin: number;
  rateWhole: number;
  ratePrivate: number;
  downpayment: number;
  downpaymentPrivate: number;
  isActive: boolean;
  image: string;
}

const DEFAULT_FORM: AmenityFormState = {
  name: "",
  description: "",
  maxCapacity: 50,
  rateWalkin: 100,
  rateWhole: 100,
  ratePrivate: 1000,
  downpayment: 200,
  downpaymentPrivate: 500,
  isActive: true,
  image: "https://picsum.photos/seed/amenity/800/600",
};

export default function AdminAmenitiesPage() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [formData, setFormData] = useState<AmenityFormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Archive Confirmation State
  const [archiveTarget, setArchiveTarget] = useState<Amenity | null>(null);
  const [archiving, setArchiving] = useState(false);

  const loadAmenities = () => {
    setLoading(true);
    api
      .amenities()
      .then(setAmenities)
      .catch(() => setAmenities([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAmenities();
  }, []);

  const openAddModal = () => {
    setEditingAmenity(null);
    setFormData(DEFAULT_FORM);
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (amenity: Amenity) => {
    setEditingAmenity(amenity);
    setFormData({
      name: amenity.name || "",
      description: amenity.description || "",
      maxCapacity: amenity.maxCapacity ?? 50,
      rateWalkin: amenity.rateWalkin ?? 0,
      rateWhole: amenity.rateWhole ?? 0,
      ratePrivate: amenity.ratePrivate ?? 0,
      downpayment: amenity.downpayment ?? 200,
      downpaymentPrivate: amenity.downpaymentPrivate ?? 500,
      isActive: amenity.isActive ?? true,
      image: amenity.image || "https://picsum.photos/seed/amenity/800/600",
    });
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingAmenity(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Please provide an amenity name.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      if (editingAmenity) {
        // Update existing amenity
        await api.amenityUpdate(editingAmenity.id, formData);
        setSuccessMsg(`Amenity "${formData.name}" updated successfully!`);
      } else {
        // Create new amenity
        await api.amenityCreate(formData);
        setSuccessMsg(`Amenity "${formData.name}" added successfully!`);
      }

      setIsModalOpen(false);
      loadAmenities();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save amenity.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.amenityArchive(archiveTarget.id);
      setSuccessMsg(`Amenity "${archiveTarget.name}" has been archived.`);
      setArchiveTarget(null);
      loadAmenities();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to archive amenity.");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-3xl font-bold text-green-dark">Amenities Management</h1>
          <p className="text-sm text-muted">
            Configure rates, session pricing, capacities, and availability for community facilities.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-green flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Amenity
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-light/40 bg-green-light/10 p-3.5 text-xs font-semibold text-green-dark">
          <CheckCircle2 className="h-4 w-4 text-green-mid flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Amenities Grid */}
      {loading ? (
        <p className="py-20 text-center text-muted">Loading amenities…</p>
      ) : amenities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-2 p-16 text-center text-muted">
          <p>No amenities registered yet.</p>
          <button onClick={openAddModal} className="btn-ghost mt-3">
            + Add the first amenity
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {amenities.map((a) => (
            <div
              key={a.id}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-cream-2 bg-white shadow-sm transition hover:shadow-md"
            >
              <div>
                <div
                  className="relative h-44 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${a.image || "https://picsum.photos/seed/amenity/800/600"})` }}
                >
                  <span
                    className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                      a.isActive
                        ? "bg-green-dark text-white"
                        : "bg-danger text-white"
                    }`}
                  >
                    {a.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl font-bold text-green-dark">{a.name}</h3>
                    <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                      <Users className="h-3.5 w-3.5 text-green-mid" /> {a.maxCapacity} pax
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-muted line-clamp-2 leading-relaxed">
                    {a.description || "No description provided."}
                  </p>

                  <div className="mt-4 space-y-1.5 rounded-xl border border-cream-2 bg-cream/40 p-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">Public (Walk-in):</span>
                      <strong className="text-green-dark">{formatPHP(a.rateWalkin)} / head</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Public (Night):</span>
                      <strong className="text-green-dark">{formatPHP(a.rateWhole)} / head</strong>
                    </div>
                    <div className="flex justify-between border-t border-cream-2 pt-1">
                      <span className="text-muted">Private Flat Rate:</span>
                      <strong className="text-green-mid">{formatPHP(a.ratePrivate)}</strong>
                    </div>
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>Downpayment:</span>
                      <span>{formatPHP(a.downpayment)} (Pub) / {formatPHP(a.downpaymentPrivate)} (Priv)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 border-t border-cream-2 p-3 bg-cream/20">
                <button
                  onClick={() => openEditModal(a)}
                  className="btn-ghost flex-1 justify-center !py-2 text-xs font-semibold flex items-center gap-1.5 text-green-dark hover:bg-cream"
                >
                  <Edit2 className="h-3.5 w-3.5 text-green-mid" /> Edit
                </button>
                <button
                  onClick={() => setArchiveTarget(a)}
                  className="btn-ghost flex-1 justify-center !py-2 text-xs font-semibold flex items-center gap-1.5 text-amber-700 hover:bg-amber-50"
                >
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl scroll-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-cream-2 pb-3">
              <div>
                <h3 className="font-serif text-2xl font-bold text-green-dark">
                  {editingAmenity ? "Edit Amenity" : "Add New Amenity"}
                </h3>
                <p className="text-xs text-muted">
                  {editingAmenity
                    ? "Update amenity rates, capacity, and details."
                    : "Fill in the details to register a community facility."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-muted hover:text-green-dark transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-danger-bg p-3 text-xs font-semibold text-danger">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Amenity Name */}
              <div>
                <label className="field-label">Amenity Name *</label>
                <input
                  type="text"
                  required
                  className="field"
                  placeholder="e.g. Swimming Pool, Clubhouse, Covered Court"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="field-label">Description</label>
                <textarea
                  className="field min-h-20"
                  placeholder="Short description of the facility, rules, or features…"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="field-label">Image URL</label>
                <input
                  type="text"
                  className="field"
                  placeholder="https://…"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
              </div>

              {/* Capacity & Walk-in Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Max Capacity (pax) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="field"
                    value={formData.maxCapacity}
                    onChange={(e) =>
                      setFormData({ ...formData, maxCapacity: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Public Day Rate (₱/head) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    className="field"
                    value={formData.rateWalkin}
                    onChange={(e) =>
                      setFormData({ ...formData, rateWalkin: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              {/* Night Rate & Private Flat Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Public Night Rate (₱/head)</label>
                  <input
                    type="number"
                    min={0}
                    className="field"
                    value={formData.rateWhole}
                    onChange={(e) =>
                      setFormData({ ...formData, rateWhole: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Private Flat Rate (₱) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    className="field"
                    value={formData.ratePrivate}
                    onChange={(e) =>
                      setFormData({ ...formData, ratePrivate: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              {/* Downpayment Rates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Public Downpayment (₱)</label>
                  <input
                    type="number"
                    min={0}
                    className="field"
                    value={formData.downpayment}
                    onChange={(e) =>
                      setFormData({ ...formData, downpayment: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Private Downpayment (₱)</label>
                  <input
                    type="number"
                    min={0}
                    className="field"
                    value={formData.downpaymentPrivate}
                    onChange={(e) =>
                      setFormData({ ...formData, downpaymentPrivate: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-cream-2 text-green-mid focus:ring-green-mid"
                />
                <span className="text-xs font-semibold text-green-dark">
                  Facility is active and available for booking
                </span>
              </label>

              {/* Modal Buttons */}
              <div className="flex gap-2 pt-4 border-t border-cream-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="btn-ghost flex-1 justify-center !py-2.5 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-green flex-1 justify-center !py-2.5 text-xs font-bold shadow-md disabled:opacity-60"
                >
                  {submitting
                    ? "Saving…"
                    : editingAmenity
                    ? "Save Changes"
                    : "Create Amenity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {archiveTarget && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4"
          onClick={() => !archiving && setArchiveTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Archive className="h-5 w-5 text-amber-600" />
              </span>
              <h3 className="font-serif text-lg font-bold text-amber-700">Archive Amenity?</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Are you sure you want to archive{" "}
              <strong>&ldquo;{archiveTarget.name}&rdquo;</strong>? It will be hidden from bookings and
              the public. You can restore it anytime from the{" "}
              <strong>Archive</strong> page.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                disabled={archiving}
                className="btn-ghost flex-1 justify-center !py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={archiving}
                className="flex-1 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
              >
                {archiving ? "Archiving…" : "Yes, Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
