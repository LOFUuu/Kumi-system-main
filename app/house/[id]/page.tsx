"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  BedDouble,
  ShowerHead,
  Ruler,
  Lock,
  CheckCircle2,
  Calendar,
  MessageSquare,
  X,
  Phone,
  Mail,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPHP, type HouseListing } from "@/lib/mock-data";

export default function HouseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const id = Number(params.id);
  const [listing, setListing] = useState<HouseListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);

  // Reservation / Inquiry Modal
  const [showModal, setShowModal] = useState(false);
  const [inquiryType, setInquiryType] = useState<"reserve" | "viewing">("reserve");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setLoading(false);
      return;
    }
    api
      .listing(id)
      .then((data) => {
        setListing(data);
      })
      .catch(() => {
        setListing(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="section">
        <p className="py-20 text-center text-muted">Loading property details…</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="section">
        <div className="mx-auto max-w-md rounded-2xl border border-cream-2 bg-white p-8 text-center shadow-sm">
          <h2 className="font-serif text-2xl font-bold text-green-dark">
            Property Not Found
          </h2>
          <p className="mt-2 text-sm text-muted">
            The house listing you are looking for does not exist or is no longer available.
          </p>
          <Link href="/house-listing" className="btn-green mt-6 inline-flex w-full justify-center">
            Browse All Listings
          </Link>
        </div>
      </div>
    );
  }

  const isRent = listing.listingType === "rent";
  const images = listing.images && listing.images.length > 0
    ? listing.images
    : ["https://picsum.photos/seed/casa-1/800/600"];

  const handleReserveClick = () => {
    if (!user) {
      // Need login before reserving
      router.push(`/login?next=/house/${listing.id}&reason=reserve`);
      return;
    }
    setShowModal(true);
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="section">
      <Link
        href="/house-listing"
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-green-mid hover:underline"
      >
        ← Back to Listings
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div
            className="h-80 w-full rounded-2xl bg-cover bg-center transition-all duration-300 lg:h-[460px]"
            style={{ backgroundImage: `url(${images[selectedImg] || images[0]})` }}
          />
          {images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto scroll-thin pb-2">
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImg(i)}
                  className={`h-20 w-28 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    selectedImg === i ? "border-green-mid scale-105" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${src})` }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className={`badge ${isRent ? "badge-rent" : "badge-sale"}`}>
              {isRent ? "FOR RENT" : "FOR SALE"}
            </span>
            <span className={`badge ${listing.status === "available" ? "badge-green" : "badge-gold"}`}>
              {listing.status.toUpperCase()}
            </span>
          </div>

          <h1 className="mt-3 font-serif text-4xl font-bold text-green-dark">
            {listing.houseName}
          </h1>
          <div className="mt-2 flex items-center gap-1.5 text-muted">
            <MapPin className="h-4 w-4 text-green-mid" /> {listing.address}
          </div>

          <div className="mt-5 font-serif text-3xl font-bold text-green-mid">
            {formatPHP(listing.price)}
            {isRent && <span className="text-base font-normal text-muted">/mo</span>}
          </div>

          <div className="mt-5 flex gap-6 border-y border-cream-2 py-4 text-green-mid">
            <div className="flex items-center gap-2">
              <BedDouble className="h-5 w-5" />
              <div>
                <div className="text-xl font-bold">{listing.bedrooms}</div>
                <div className="text-xs text-muted">Bedrooms</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShowerHead className="h-5 w-5" />
              <div>
                <div className="text-xl font-bold">{listing.bathrooms}</div>
                <div className="text-xs text-muted">Bathrooms</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              <div>
                <div className="text-xl font-bold">{listing.sqm}</div>
                <div className="text-xs text-muted">Sqm Area</div>
              </div>
            </div>
          </div>

          <p className="mt-5 leading-relaxed text-muted whitespace-pre-line">
            {listing.description || "No specific description provided for this property."}
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={handleReserveClick}
              className="btn-green flex-1 justify-center !py-3.5 text-sm"
            >
              {!user ? "Sign In to Reserve / Inquire" : "Reserve / Inquire Property"}
            </button>
            <Link
              href="/contact"
              className="btn-ghost flex-1 justify-center !py-3.5 text-sm text-green-dark"
            >
              Contact HOA
            </Link>
          </div>

          {!user && (
            <p className="mt-3 flex items-center gap-1 text-xs text-muted">
              <Lock className="h-3.5 w-3.5 text-gold-muted" />
              Please sign in with your Mabuhay Homes account to book a reservation.
            </p>
          )}
        </div>
      </div>

      {/* Reservation / Inquiry Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 text-green-deep shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-cream-2 pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-green-dark">
                  Property Reservation &amp; Inquiry
                </h3>
                <p className="text-xs text-muted">{listing.houseName} — Block {listing.blockNo} / Lot {listing.lotNo}</p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSubmitted(false);
                }}
                className="text-muted hover:text-green-dark"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitted ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-mid" />
                <h4 className="mt-3 font-serif text-xl font-bold text-green-dark">
                  Inquiry Received!
                </h4>
                <p className="mt-2 text-sm text-muted">
                  Your {inquiryType === "reserve" ? "reservation request" : "viewing request"} for{" "}
                  <strong>{listing.houseName}</strong> has been sent to the HOA Administration. We will contact you via email ({user?.email}) or phone shortly.
                </p>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSubmitted(false);
                  }}
                  className="btn-green mt-6 w-full justify-center !py-2.5 text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="mt-4 space-y-4">
                <div>
                  <label className="field-label">Your Name</label>
                  <input
                    type="text"
                    disabled
                    className="field bg-cream-2/50 text-muted"
                    value={user?.fullName || ""}
                  />
                </div>

                <div>
                  <label className="field-label">Contact Email</label>
                  <input
                    type="text"
                    disabled
                    className="field bg-cream-2/50 text-muted"
                    value={user?.email || ""}
                  />
                </div>

                <div>
                  <label className="field-label">Request Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setInquiryType("reserve")}
                      className={`rounded-xl border-2 p-3 text-left transition ${
                        inquiryType === "reserve"
                          ? "border-green-mid bg-green-light/10"
                          : "border-cream-2"
                      }`}
                    >
                      <div className="text-sm font-bold text-green-dark">
                        Reserve Property
                      </div>
                      <div className="text-xs text-muted">Hold &amp; process paperwork</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInquiryType("viewing")}
                      className={`rounded-xl border-2 p-3 text-left transition ${
                        inquiryType === "viewing"
                          ? "border-gold bg-gold/10"
                          : "border-cream-2"
                      }`}
                    >
                      <div className="text-sm font-bold text-green-dark">
                        Schedule Viewing
                      </div>
                      <div className="text-xs text-muted">Visit the unit with HOA</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="field-label">Preferred Date</label>
                  <input
                    type="date"
                    className="field"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Message / Questions</label>
                  <textarea
                    className="field min-h-20"
                    placeholder="Any questions or special requests for the owner and HOA…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-ghost flex-1 justify-center !py-2.5 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-green flex-1 justify-center !py-2.5 text-sm"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
