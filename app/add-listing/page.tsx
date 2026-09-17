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
} from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const ACCEPTED = ".pdf,.jpg,.jpeg,.png";
const DOC_TYPES = [
  "Land Title / Deed of Sale",
  "Tax Declaration",
  "Lease Contract (if subletting)",
  "Utility bill matching your name/address",
  "Valid Government ID (KYC)",
];

export default function AddListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setError("Please upload at least one proof of ownership or authority document.");
      return;
    }

    try {
      setUploading(true);
      let proofDocuments: string[] = [];

      if (selectedFiles.length > 0) {
        const { paths } = await api.uploadListingDocs(selectedFiles);
        proofDocuments = paths;
      }

      setUploading(false);
      setSubmitting(true);

      const title = houseName.trim() || `${bedrooms}BR ${propertyType} for ${listingType === "rent" ? "Rent" : "Sale"}`;

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
      });

      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create listing.");
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="section">
        <div className="mx-auto max-w-md rounded-2xl border border-cream-2 bg-white p-8 text-center shadow-sm">
          <LogIn className="mx-auto h-10 w-10 text-green-mid" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-green-dark">
            Sign in to list a property
          </h2>
          <p className="mt-2 text-sm text-muted">
            You must be signed in as a resident to submit a property listing.
          </p>
          <button
            onClick={() => router.push("/login?next=/add-listing")}
            className="btn-green mt-6 inline-flex w-full justify-center"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (user.role === "non_resident") {
    return (
      <div className="section">
        <div className="mx-auto max-w-md rounded-2xl border border-gold/30 bg-gold/5 p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-gold" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-green-dark">
            Resident access only
          </h2>
          <p className="mt-2 text-sm text-muted">
            Only verified homeowners and registered residents can post property listings.
          </p>
          <button
            onClick={() => router.push("/house-listing")}
            className="btn-green mt-6 inline-flex w-full justify-center"
          >
            Browse House Listings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-bold text-green-dark sm:text-4xl">
            Create House Listing
          </h1>
          <p className="mt-1 text-sm text-muted">
            Fill in your property details and upload proof of ownership for verification.
          </p>
        </div>

        {done ? (
          <div className="card text-center py-10">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-mid" />
            <h2 className="mt-4 font-serif text-2xl font-bold text-green-dark">
              {isHowa ? "Listing Created & Published!" : "Listing Submitted for Verification"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              {isHowa
                ? "Your listing is now live on the public house listings page."
                : "Your listing is now pending review. Once our moderators verify your proof documents, it will be published to the public feed."}
            </p>

            <div className="mx-auto mt-6 flex max-w-xs flex-col gap-2">
              <Link
                href="/my-listings"
                className="btn-green w-full justify-center !py-3 text-sm text-center"
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
                }}
                className="btn-ghost w-full justify-center !py-2.5 text-sm"
              >
                Add Another Listing
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-6 shadow-sm">
            {error && (
              <div className="rounded-xl bg-danger-bg p-3.5 text-sm font-semibold text-danger">
                {error}
              </div>
            )}

            {/* 1. House / Lot info */}
            <div>
              <h3 className="font-serif text-lg font-bold text-green-dark border-b border-cream-2 pb-2 mb-4">
                1. House &amp; Lot Location
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">Block No. *</label>
                  <select
                    className="field"
                    value={blockNo}
                    onChange={(e) => {
                      setBlockNo(e.target.value);
                      setLotNo(
                        units.find((u) => u.blockNo === e.target.value)?.lotNo || ""
                      );
                    }}
                  >
                    {Array.from(new Set(units.map((u) => u.blockNo))).map((b) => (
                      <option key={b} value={b}>
                        Block {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Lot No. *</label>
                  <select
                    className="field"
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
            </div>

            {/* 2. Property Specs */}
            <div>
              <h3 className="font-serif text-lg font-bold text-green-dark border-b border-cream-2 pb-2 mb-4">
                2. Property Details &amp; Pricing
              </h3>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="field-label">Property Type</label>
                    <select
                      className="field"
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
                    <label className="field-label">Purpose *</label>
                    <select
                      className="field"
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
                  <label className="field-label">
                    {listingType === "rent" ? "Monthly Rent (₱) *" : "Total Price (₱) *"}
                  </label>
                  <input
                    type="number"
                    className="field"
                    required
                    min={1}
                    value={price || ""}
                    onChange={(e) => setPrice(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="field-label">Bedrooms</label>
                    <input
                      type="number"
                      className="field"
                      min={0}
                      value={bedrooms}
                      onChange={(e) => setBedrooms(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Bathrooms</label>
                    <input
                      type="number"
                      className="field"
                      min={0}
                      value={bathrooms}
                      onChange={(e) => setBathrooms(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Area (sqm)</label>
                    <input
                      type="number"
                      className="field"
                      min={0}
                      value={sqm}
                      onChange={(e) => setSqm(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">Listing Title (Optional)</label>
                  <input
                    type="text"
                    className="field"
                    placeholder="e.g. 3BR House with Garden and Garage"
                    value={houseName}
                    onChange={(e) => setHouseName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Description</label>
                  <textarea
                    className="field min-h-24"
                    placeholder="Describe your property, furnishings, amenities, terms…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 3. Proof of Ownership */}
            <div>
              <h3 className="font-serif text-lg font-bold text-green-dark border-b border-cream-2 pb-2 mb-3">
                3. Proof of Ownership / Authority (Required)
              </h3>

              <div className="rounded-xl border border-green-light/40 bg-green-light/10 p-4 mb-4">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-green-dark">
                  <ShieldCheck className="h-4 w-4 text-green-mid" /> Acceptable Documents:
                </div>
                <ul className="space-y-1 text-xs text-green-deep">
                  {DOC_TYPES.map((d) => (
                    <li key={d} className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-green-mid" /> {d}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-green-mid/40 bg-cream/40 py-6 text-center transition hover:border-green-mid hover:bg-cream"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-green-mid shadow-xs">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-green-dark">
                    Click to upload document
                  </span>
                  <p className="text-[11px] text-muted">
                    PDF, JPG, PNG (Max 10MB each)
                  </p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED}
                className="hidden"
                onChange={handleFileChange}
              />

              {selectedFiles.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {selectedFiles.map((f) => (
                    <li
                      key={f.name}
                      className="flex items-center justify-between rounded-xl border border-cream-2 bg-white p-2.5 text-xs"
                    >
                      <span className="flex items-center gap-2 truncate text-green-dark font-medium">
                        <FileText className="h-3.5 w-3.5 text-green-mid flex-shrink-0" />
                        {f.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(f.name)}
                        className="text-muted hover:text-danger ml-2"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Bottom info note */}
            <div className="rounded-xl border border-gold/40 bg-gold/10 p-3.5 text-xs text-green-deep flex items-start gap-2">
              <Clock className="h-4 w-4 text-gold-muted flex-shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> Your listing will be set to <strong>Pending Verification</strong>. It will only become publicly visible after moderator approval.
              </span>
            </div>

            <button
              type="submit"
              disabled={uploading || submitting}
              className="btn-green w-full justify-center !py-3.5 text-sm font-bold shadow-md disabled:opacity-60"
            >
              {uploading
                ? "Uploading documents…"
                : submitting
                ? "Submitting listing…"
                : "Submit Listing for Verification"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
