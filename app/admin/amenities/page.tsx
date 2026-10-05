"use client";

import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Edit2,
  Archive,
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Upload,
  Image as ImageIcon,
  Loader2,
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

  // Sorting & Pagination State
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [formData, setFormData] = useState<AmenityFormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (submitting || uploadingPhoto) return;
    setIsModalOpen(false);
    setEditingAmenity(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError("");

    try {
      const data = new FormData();
      data.append("file", file);

      const res = await fetch("/api/amenities/upload", {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to upload photo");
      }

      const result = await res.json();
      if (result.url) {
        setFormData((prev) => ({ ...prev, image: result.url }));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, image: "" }));
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

  const sortedAmenities = [...amenities].sort((a, b) => {
    const idA = a.id ?? 0;
    const idB = b.id ?? 0;
    return sortOrder === "newest" ? idB - idA : idA - idB;
  });

  const totalPages = Math.max(1, Math.ceil(sortedAmenities.length / ITEMS_PER_PAGE));
  const paginatedAmenities = sortedAmenities.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

      {/* Sort Toolbar */}
      {!loading && amenities.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream-2 bg-cream/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-green-mid" />
            <span className="text-xs font-bold text-green-dark">Sort by Date:</span>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as "newest" | "oldest");
                setCurrentPage(1);
              }}
              className="rounded-xl border border-cream-2 bg-white px-3 py-1.5 text-xs font-semibold text-green-dark outline-none shadow-2xs hover:border-green-mid transition"
            >
              <option value="newest">Newest → Oldest</option>
              <option value="oldest">Oldest → Newest</option>
            </select>
          </div>
          <div className="text-xs text-muted font-medium">
            Showing {paginatedAmenities.length} of {amenities.length} amenities (max 20 per page)
          </div>
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
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedAmenities.map((a) => (
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between rounded-2xl border border-cream-2 bg-white px-5 py-3 text-xs text-muted shadow-2xs">
              <span>
                Page {currentPage} of {totalPages} ({amenities.length} total entries)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 rounded-xl border border-cream-2 bg-white px-3 py-1.5 text-xs font-semibold text-green-dark hover:bg-cream disabled:opacity-40 transition"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`h-8 w-8 rounded-xl text-xs font-bold transition ${
                      currentPage === p
                        ? "bg-green-dark text-white shadow-xs"
                        : "border border-cream-2 bg-white text-green-dark hover:bg-cream"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="flex items-center gap-1 rounded-xl border border-cream-2 bg-white px-3 py-1.5 text-xs font-semibold text-green-dark hover:bg-cream disabled:opacity-40 transition"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl scroll-thin"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-cream-2 pb-4">
              <div>
                <h3 className="font-serif text-2xl font-bold text-green-dark">
                  {editingAmenity ? "Edit Amenity" : "Add New Amenity"}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {editingAmenity
                    ? "Update amenity rates, capacity, and details."
                    : "Fill in the details to register a community facility."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-muted hover:text-green-dark transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-danger-bg p-3.5 text-xs font-semibold text-danger">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* 2-Column Main Layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Photo Upload & Preview */}
                <div className="md:col-span-5 space-y-3">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-green-dark">
                    Amenity Photo *
                  </label>

                  <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-cream-2 bg-cream/30 shadow-inner group">
                    {formData.image ? (
                      <>
                        <img
                          src={formData.image}
                          alt="Amenity Preview"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://picsum.photos/seed/amenity/800/600";
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black transition shadow-md"
                          title="Remove Photo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-muted p-4 text-center">
                        <ImageIcon className="h-10 w-10 text-muted/60 mb-2" />
                        <span className="text-xs font-medium">No photo selected</span>
                      </div>
                    )}

                    {uploadingPhoto && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs text-green-dark">
                        <Loader2 className="h-7 w-7 animate-spin text-green-mid mb-2" />
                        <span className="text-xs font-bold">Uploading photo...</span>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-cream-2 bg-cream/40 py-2.5 text-xs font-bold text-green-dark hover:bg-cream transition shadow-2xs disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4 text-green-mid" />
                    {uploadingPhoto ? "Uploading..." : "Change Photo"}
                  </button>
                </div>

                {/* Right Column: Details & Rates */}
                <div className="md:col-span-7 space-y-4">
                  {/* Amenity Name */}
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-green-dark mb-1">
                      Amenity Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="field"
                      placeholder="e.g. Covered Court"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-green-dark mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      className="field min-h-[80px]"
                      placeholder="Multi-purpose covered court for basketball and badminton."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-green-dark mb-1">
                      Image URL
                    </label>
                    <input
                      type="text"
                      className="field"
                      placeholder="/images/amenities/court.jpg or https://..."
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    />
                  </div>

                  {/* Capacity & Rates Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-green-dark mb-1">
                        Max Capacity (Pax) *
                      </label>
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
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-green-dark mb-1">
                        Public Day Rate (₱/Head) *
                      </label>
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

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-green-dark mb-1">
                        Public Night Rate (₱/Head)
                      </label>
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
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-green-dark mb-1">
                        Private Flat Rate (₱) *
                      </label>
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

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-green-dark mb-1">
                        Public Downpayment (₱)
                      </label>
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
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-green-dark mb-1">
                        Private Downpayment (₱)
                      </label>
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

                  {/* Active Checkbox */}
                  <div className="pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer">
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
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-cream-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting || uploadingPhoto}
                  className="rounded-xl border border-cream-2 bg-cream/30 px-6 py-2.5 text-xs font-bold text-green-dark hover:bg-cream transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingPhoto}
                  className="rounded-xl bg-green-dark px-6 py-2.5 text-xs font-bold text-white hover:bg-green-mid shadow-md transition disabled:opacity-60"
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
