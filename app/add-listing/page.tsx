"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  X,
  LogIn,
  Lock,
  ShieldCheck,
  Check,
  Home,
  MapPin,
  ImagePlus,
  AlertTriangle,
  Plus,
  Pencil,
  Image as ImageIcon,
  Phone,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const ACCEPTED_DOCS = ".pdf,.jpg,.jpeg,.png";
const ACCEPTED_IMGS = "image/jpeg,image/jpg,image/png,image/webp";
const DOC_TYPES = [
  "Land Title / Deed of Sale",
  "Tax Declaration",
  "Lease Contract (if subletting)",
  "Utility bill matching your name/address",
  "Valid Government ID (KYC)",
];

// Step header component matching screenshot circles
function StepHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a3826] text-sm font-bold text-white shadow-sm">
        {number}
      </div>
      <h2 className="font-serif text-lg font-bold text-[#143424] tracking-tight">
        {title}
      </h2>
    </div>
  );
}

// Section card wrapper
function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e8e4da] bg-white p-5 sm:p-6 shadow-sm">
      {children}
    </div>
  );
}

export default function AddListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainPhotoRef = useRef<HTMLInputElement>(null);
  const additionalPhotosRef = useRef<HTMLInputElement>(null);

  const [units, setUnits] = useState<{ blockNo: string; lotNo: string }[]>([]);
  const [listingType, setListingType] = useState<"sale" | "rent">("rent");
  const [propertyType, setPropertyType] = useState("Single Family House");
  const [blockNo, setBlockNo] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [price, setPrice] = useState<number>(15000);
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [sqm, setSqm] = useState<number>(80);
  const [description, setDescription] = useState("");
  const [houseName, setHouseName] = useState("");
  const [ownerContactNumber, setOwnerContactNumber] = useState("");
  const [ownerMessengerLink, setOwnerMessengerLink] = useState("");

  // Photo states
  const [mainPhoto, setMainPhoto] = useState<File | null>(null);
  const [mainPhotoPreview, setMainPhotoPreview] = useState<string>("");
  const [additionalPhotos, setAdditionalPhotos] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);

  // Proof docs
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const isHowa = user?.role === "admin" || user?.role === "counselor";

  useEffect(() => {
    api
      .masterIndex()
      .then((u) => {
        setUnits(u);
        if (u[0]) {
          setBlockNo(u[0].blockNo);
          setLotNo(u[0].lotNo);
        }
      })
      .catch(() => {});
  }, []);

  const availableLots = units.filter((u) => u.blockNo === blockNo);

  // Main photo
  const handleMainPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMainPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setMainPhotoPreview(String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Additional photos
  const handleAdditionalPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - additionalPhotos.length;
    const toAdd = files.slice(0, remaining);
    setAdditionalPhotos((prev) => [...prev, ...toAdd]);
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () =>
        setAdditionalPreviews((prev) => [...prev, String(reader.result)]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeAdditionalPhoto = (idx: number) => {
    setAdditionalPhotos((prev) => prev.filter((_, i) => i !== idx));
    setAdditionalPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // Proof docs
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setSelectedFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...files.filter((f) => !names.has(f.name))];
    });
    e.target.value = "";
  };

  const removeFile = (name: string) =>
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!blockNo || !lotNo) {
      setError("Please select a valid Block and Lot number.");
      return;
    }

    if (!isHowa && selectedFiles.length === 0) {
      setError(
        "Please upload at least one proof of ownership or authority document."
      );
      return;
    }

    try {
      setUploading(true);
      let proofDocuments: string[] = [];
      let images: string[] = [];

      // Upload proof docs
      if (selectedFiles.length > 0) {
        const { paths } = await api.uploadListingDocs(selectedFiles);
        proofDocuments = paths;
      }

      // Upload property photos via listing docs endpoint (same multipart handler)
      const photoFiles: File[] = [];
      if (mainPhoto) photoFiles.push(mainPhoto);
      photoFiles.push(...additionalPhotos);
      if (photoFiles.length > 0) {
        const { paths } = await api.uploadListingDocs(photoFiles);
        images = paths;
      }

      setUploading(false);
      setSubmitting(true);

      const title =
        houseName.trim() ||
        `${bedrooms}BR ${propertyType} for ${listingType === "rent" ? "Rent" : "Sale"}`;

      if (!isHowa && !ownerContactNumber.trim()) {
        setError("Please provide your contact number so interested buyers/renters can reach you.");
        return;
      }

      await api.listingCreate({
        blockNo,
        lotNo,
        price,
        bedrooms,
        bathrooms,
        sqm,
        listingType,
        description,
        houseName: title,
        ownerName: user?.fullName || "HOA",
        ownerEmail: user?.email,
        ownerId: user?.id,
        proofDocuments,
        images,
        ownerContactNumber: ownerContactNumber.trim() || undefined,
        ownerMessengerLink: ownerMessengerLink.trim() || undefined,
      });

      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create listing.");
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  // ── Auth gates ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#faf8f2] px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-[#e8e4da] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf3ee]">
            <LogIn className="h-6 w-6 text-[#1a3826]" />
          </div>
          <h2 className="mt-4 font-serif text-2xl font-bold text-[#143424]">
            Sign in to list a property
          </h2>
          <p className="mt-2 text-sm text-[#5c6e60]">
            You must be signed in as a resident to submit a property listing.
          </p>
          <button
            onClick={() => router.push("/login?next=/add-listing")}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a3826] py-3 text-sm font-semibold text-white hover:bg-[#132c1e] transition"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (user.role === "non_resident") {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#faf8f2] px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-[#decb9e]/60 bg-[#f4efe4] p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e9d9a8]/60">
            <Lock className="h-6 w-6 text-[#a07c2e]" />
          </div>
          <h2 className="mt-4 font-serif text-2xl font-bold text-[#143424]">
            Resident access only
          </h2>
          <p className="mt-2 text-sm text-[#5c6e60]">
            Only verified homeowners and registered residents can post property
            listings.
          </p>
          <button
            onClick={() => router.push("/house-listing")}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a3826] py-3 text-sm font-semibold text-white hover:bg-[#132c1e] transition"
          >
            Browse House Listings
          </button>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#faf8f2] px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-[#e8e4da] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#edf3ee]">
            <CheckCircle2 className="h-8 w-8 text-[#2d6a4f]" />
          </div>
          <h2 className="mt-5 font-serif text-2xl font-bold text-[#143424]">
            {isHowa
              ? "Listing Created & Published!"
              : "Listing Submitted for Verification"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#5c6e60]">
            {isHowa
              ? "Your listing is now live on the public house listings page."
              : "Your listing is now pending review. Once our moderators verify your proof documents, it will be published to the public feed."}
          </p>
          <div className="mx-auto mt-6 flex max-w-xs flex-col gap-2.5">
            <Link
              href="/my-listings"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a3826] py-3 text-sm font-semibold text-white hover:bg-[#132c1e] transition"
            >
              View in My Listings
            </Link>
            <button
              type="button"
              onClick={() => {
                setDone(false);
                setSelectedFiles([]);
                setDescription("");
                setHouseName("");
                setMainPhoto(null);
                setMainPhotoPreview("");
                setAdditionalPhotos([]);
                setAdditionalPreviews([]);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#e8e4da] bg-[#faf8f2] py-3 text-sm font-semibold text-[#143424] hover:bg-white transition"
            >
              Add Another Listing
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#faf8f2] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Page title */}
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a3826] text-white shadow-sm">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#143424] sm:text-3xl leading-tight">
              Create House Listing
            </h1>
            <p className="mt-0.5 text-xs text-[#5c6e60] sm:text-sm">
              Fill in your property details and upload proof of ownership for verification.
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Step 1: House & Lot ─────────────────────────────────────────── */}
          <StepCard>
            <StepHeader number={1} title="House & Lot Location" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#5c6e60]">
                  Block No. <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-xl border border-[#dde5de] bg-[#f5f8f5] px-3.5 py-2.5 text-sm text-[#143424] outline-none transition focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10"
                  value={blockNo}
                  onChange={(e) => {
                    setBlockNo(e.target.value);
                    setLotNo(
                      units.find((u) => u.blockNo === e.target.value)?.lotNo ||
                        ""
                    );
                  }}
                >
                  {Array.from(new Set(units.map((u) => u.blockNo))).map(
                    (b) => (
                      <option key={b} value={b}>
                        Block {b}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#5c6e60]">
                  Lot No. <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-xl border border-[#dde5de] bg-[#f5f8f5] px-3.5 py-2.5 text-sm text-[#143424] outline-none transition focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10"
                  value={lotNo}
                  onChange={(e) => setLotNo(e.target.value)}
                >
                  {availableLots.map((u) => (
                    <option key={u.lotNo} value={u.lotNo}>
                      Lot {u.lotNo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </StepCard>

          {/* ── Step 2: Property Details ────────────────────────────────────── */}
          <StepCard>
            <StepHeader number={2} title="Property Details & Pricing" />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#5c6e60]">
                    Property Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#dde5de] bg-[#f5f8f5] px-3.5 py-2.5 text-sm text-[#143424] outline-none transition focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                  >
                    <option value="Single Family House">Single Family House</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Apartment Unit">Apartment Unit</option>
                    <option value="Villa">Villa</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#5c6e60]">
                    Purpose <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#dde5de] bg-[#f5f8f5] px-3.5 py-2.5 text-sm text-[#143424] outline-none transition focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10"
                    value={listingType}
                    onChange={(e) =>
                      setListingType(e.target.value === "sale" ? "sale" : "rent")
                    }
                  >
                    <option value="rent">For Rent (Monthly)</option>
                    <option value="sale">For Sale (Full Price)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#5c6e60]">
                  {listingType === "rent" ? "Monthly Price (₱)" : "Total Price (₱)"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-[#dde5de] bg-[#f5f8f5] px-3.5 py-2.5 text-sm text-[#143424] outline-none transition focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10"
                  required
                  min={1}
                  value={price || ""}
                  onChange={(e) => setPrice(Number(e.target.value) || 0)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#5c6e60]">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-[#dde5de] bg-[#f5f8f5] px-3.5 py-2.5 text-sm text-[#143424] outline-none transition focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10"
                    min={0}
                    value={bedrooms}
                    onChange={(e) => setBedrooms(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#5c6e60]">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-[#dde5de] bg-[#f5f8f5] px-3.5 py-2.5 text-sm text-[#143424] outline-none transition focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10"
                    min={0}
                    value={bathrooms}
                    onChange={(e) => setBathrooms(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#5c6e60]">
                    Area (sqm)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-[#dde5de] bg-[#f5f8f5] px-3.5 py-2.5 text-sm text-[#143424] outline-none transition focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10"
                    min={0}
                    value={sqm}
                    onChange={(e) => setSqm(Number(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#5c6e60]">
                  Listing Title (Optional)
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-[#dde5de] bg-[#f5f8f5] px-3.5 py-2.5 text-sm text-[#143424] outline-none transition focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10"
                  placeholder="e.g. 3BR House with Garden and Garage"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#5c6e60]">
                  Description
                </label>
                <textarea
                  className="w-full rounded-xl border border-[#dde5de] bg-[#f5f8f5] px-3.5 py-2.5 text-sm text-[#143424] outline-none transition focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10 min-h-24 resize-y"
                  placeholder="Describe your property, furnishings, amenities, terms…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* ── Owner Contact Info ── */}
              <div className="mt-1 rounded-xl border border-[#c8d8cc] bg-[#edf3ee] p-4">
                <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#1a3826]">
                  <Phone className="h-3.5 w-3.5" />
                  Owner Contact Details
                </div>
                <p className="mb-3 text-[11px] text-[#5c6e60]">
                  Provide your contact info so interested buyers/renters can reach you directly. This will be visible on your listing.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#5c6e60]">
                      Contact Number {!isHowa && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="tel"
                      className="w-full rounded-xl border border-[#dde5de] bg-white px-3.5 py-2.5 text-sm text-[#143424] outline-none transition focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10"
                      placeholder="e.g. 09171234567"
                      value={ownerContactNumber}
                      onChange={(e) => setOwnerContactNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#5c6e60]">
                      Messenger / Facebook Link
                      <span className="ml-1 font-normal normal-case text-[#5c6e60]">(optional)</span>
                    </label>
                    <input
                      type="url"
                      className="w-full rounded-xl border border-[#dde5de] bg-white px-3.5 py-2.5 text-sm text-[#143424] outline-none transition focus:border-[#2d6a4f] focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/10"
                      placeholder="https://m.me/your.name"
                      value={ownerMessengerLink}
                      onChange={(e) => setOwnerMessengerLink(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </StepCard>

          {/* ── Step 3: Property Photos ─────────────────────────────────────── */}
          <StepCard>
            <StepHeader number={3} title="Property Photos" />

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Main photo upload */}
              <div>
                <p className="mb-2 text-xs font-semibold text-[#143424]">
                  Upload Main Property Photo
                </p>
                <p className="mb-3 text-[11px] text-[#5c6e60]">
                  This will be the main photo shown on the listing. JPG, PNG (Max 10MB)
                </p>
                {!mainPhotoPreview ? (
                  <button
                    type="button"
                    onClick={() => mainPhotoRef.current?.click()}
                    className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#c8d8cc] bg-[#f3f8f4] text-center transition hover:border-[#2d6a4f] hover:bg-[#edf3ee]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-[#2d6a4f]">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-[#143424]">
                      Upload Main Photo
                    </span>
                  </button>
                ) : (
                  <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-[#e8e4da]">
                    <img
                      src={mainPhotoPreview}
                      alt="Main photo preview"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-end justify-center gap-2 bg-gradient-to-t from-black/50 p-3">
                      <button
                        type="button"
                        onClick={() => mainPhotoRef.current?.click()}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold text-[#143424] shadow hover:bg-white"
                      >
                        <Pencil className="h-3 w-3" /> Change
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMainPhoto(null);
                          setMainPhotoPreview("");
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600/90 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-red-600"
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    </div>
                    <div className="absolute top-2 right-2 rounded-full bg-[#1a3826] px-2 py-0.5 text-[10px] font-bold text-white">
                      Primary
                    </div>
                  </div>
                )}
                <input
                  ref={mainPhotoRef}
                  type="file"
                  accept={ACCEPTED_IMGS}
                  className="hidden"
                  onChange={handleMainPhoto}
                />
              </div>

              {/* Main photo preview (right side when no preview yet shows placeholder) */}
              <div className="flex flex-col">
                <p className="mb-2 text-xs font-semibold text-[#143424]">
                  Main Property Photo{" "}
                  <span className="rounded-full bg-[#eeb742]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#a07c2e]">
                    Required
                  </span>
                </p>
                <div className="flex flex-1 items-center justify-center rounded-2xl border border-[#e8e4da] bg-[#f5f8f5] h-40">
                  {mainPhotoPreview ? (
                    <img
                      src={mainPhotoPreview}
                      alt="Main property preview"
                      className="h-full w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#c8d8cc]">
                      <ImageIcon className="h-10 w-10" />
                      <span className="text-xs text-[#9aadA0]">Preview</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Photos */}
            <div className="mt-5">
              <p className="mb-1.5 text-xs font-semibold text-[#143424]">
                Additional Photos{" "}
                <span className="font-normal text-[#5c6e60]">
                  (2–5 recommended)
                </span>
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {additionalPreviews.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#e8e4da]"
                  >
                    <img
                      src={src}
                      alt={`Photo ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAdditionalPhoto(idx)}
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {additionalPhotos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => additionalPhotosRef.current?.click()}
                    className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#c8d8cc] bg-[#f3f8f4] text-[#2d6a4f] hover:border-[#2d6a4f] transition"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-[10px] font-semibold">
                      Add More
                    </span>
                    <span className="text-[9px] text-[#5c6e60]">
                      Up to {5 - additionalPhotos.length}
                    </span>
                  </button>
                )}
              </div>
              <input
                ref={additionalPhotosRef}
                type="file"
                accept={ACCEPTED_IMGS}
                multiple
                className="hidden"
                onChange={handleAdditionalPhotos}
              />
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-[#5c6e60]">
                <ImagePlus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Upload clear photos of the actual property. Your main photo will be shown on the house listing.
              </p>
            </div>
          </StepCard>

          {/* ── Step 4: Proof of Ownership ─────────────────────────────────── */}
          <StepCard>
            <StepHeader number={4} title="Proof of Ownership / Authority (Required)" />

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Acceptable docs list */}
              <div className="rounded-xl border border-[#c8d8cc] bg-[#edf3ee] p-4">
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#1a3826]">
                  <ShieldCheck className="h-4 w-4 text-[#2d6a4f]" />
                  Acceptable Documents:
                </div>
                <ul className="space-y-1.5">
                  {DOC_TYPES.map((d) => (
                    <li
                      key={d}
                      className="flex items-start gap-2 text-xs text-[#2d4a35]"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2d6a4f]" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Upload button */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-1 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-[#c8d8cc] bg-[#f3f8f4] py-6 text-center transition hover:border-[#2d6a4f] hover:bg-[#edf3ee]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-[#2d6a4f]">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-[#143424]">
                      Click to upload document
                    </span>
                    <p className="text-[11px] text-[#5c6e60]">
                      PDF, JPG, PNG (Max 10MB each)
                    </p>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_DOCS}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Uploaded files list */}
            {selectedFiles.length > 0 && (
              <ul className="mt-4 space-y-2">
                {selectedFiles.map((f) => (
                  <li
                    key={f.name}
                    className="flex items-center justify-between rounded-xl border border-[#e8e4da] bg-white px-3 py-2.5 text-xs"
                  >
                    <span className="flex items-center gap-2 truncate font-medium text-[#143424]">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-[#2d6a4f]" />
                      {f.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(f.name)}
                      className="ml-2 text-[#5c6e60] hover:text-red-600 transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </StepCard>

          {/* ── Note banner ────────────────────────────────────────────────── */}
          <div className="flex items-start gap-3 rounded-xl border border-[#decb9e]/60 bg-[#f4efe4] px-4 py-3.5 text-xs text-[#38483c]">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#a07c2e]" />
            <span>
              <strong>Note:</strong> Your listing will be set to{" "}
              <strong>Pending Verification</strong>. It will only become publicly
              visible after Mabuhay Homes approves.
            </span>
          </div>

          {/* ── Submit button ───────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={uploading || submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a3826] py-4 text-sm font-bold text-white shadow-md transition hover:bg-[#132c1e] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Uploading documents…
              </>
            ) : submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Submitting listing…
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                Submit Listing for Verification
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
