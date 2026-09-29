"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { formatPHP } from "@/lib/mock-data";
import type { HouseListing, Amenity } from "@/lib/mock-data";

export type MapActive = { type: "listing" | "amenity" | "landmark"; id: number | string } | null;

// Helper to build 2D subdivision badge markers matching the screenshot design system
function createBadgeIcon(
  category: "house" | "park" | "pool" | "court" | "clubhouse" | "gate",
  label: string,
  active: boolean
) {
  let iconSvg = "";
  if (category === "house") {
    iconSvg =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
  } else if (category === "park") {
    iconSvg =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M12 5L7 11h10l-5-6z"/><path d="M12 11L5 18h14l-7-7z"/></svg>';
  } else if (category === "pool") {
    iconSvg =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>';
  } else if (category === "court") {
    iconSvg =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M3 12h18"/></svg>';
  } else if (category === "clubhouse") {
    iconSvg =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>';
  } else if (category === "gate") {
    iconSvg =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16"/><path d="M9 21V9h6v12"/></svg>';
  }

  const cls = `kumi-map-badge ${category}${active ? " active" : ""}`;
  return L.divIcon({
    className: "",
    html: `<div class="${cls}">${iconSvg}<span>${label}</span></div>`,
    iconSize: [120, 28],
    iconAnchor: [60, 14],
    popupAnchor: [0, -16],
  });
}

function MapController({
  active,
  listings,
  amenities,
}: {
  active: MapActive;
  listings: HouseListing[];
  amenities: Amenity[];
}) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    if (active.type === "listing") {
      const item = listings.find((x) => x.id === active.id);
      if (item) map.flyTo([item.lat, item.lng], 17, { duration: 0.8 });
    } else if (active.type === "amenity") {
      const item = amenities.find((x) => x.id === active.id);
      if (item) map.flyTo([item.lat, item.lng], 17, { duration: 0.8 });
    } else if (active.type === "landmark") {
      if (active.id === "gate") map.flyTo([14.3015, 120.9855], 17, { duration: 0.8 });
    }
  }, [active, map, listings, amenities]);
  return null;
}

// Map Controls: Top Left Compass, Top Right Zoom
function CustomMapControls() {
  const map = useMap();
  return (
    <>
      {/* Top Left: Compass / Reset View */}
      <div className="leaflet-top leaflet-left !top-4 !left-4">
        <div className="leaflet-control flex flex-col gap-2">
          <button
            type="button"
            onClick={() => map.flyTo([14.304, 120.988], 16, { duration: 0.6 })}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1a3826] shadow-md border border-[#e8e4da] transition hover:bg-[#edf3ee]"
            title="Reset Map Orientation (North)"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 19 21 12 17 5 21 12 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Top Right: Zoom controls */}
      <div className="leaflet-top leaflet-right !top-4 !right-4">
        <div className="leaflet-control flex flex-col overflow-hidden rounded-xl border border-[#e8e4da] bg-white shadow-md">
          <button
            type="button"
            onClick={() => map.zoomIn()}
            className="flex h-9 w-9 items-center justify-center text-base font-bold text-[#143424] transition hover:bg-[#f5f8f5]"
            title="Zoom In"
          >
            +
          </button>
          <div className="h-[1px] w-full bg-[#e8e4da]" />
          <button
            type="button"
            onClick={() => map.zoomOut()}
            className="flex h-9 w-9 items-center justify-center text-base font-bold text-[#143424] transition hover:bg-[#f5f8f5]"
            title="Zoom Out"
          >
            −
          </button>
        </div>
      </div>
    </>
  );
}

export default function CommunityMap({
  active,
  onSelect,
  listings,
  amenities,
}: {
  active: MapActive;
  onSelect: (a: { type: "listing" | "amenity" | "landmark"; id: number | string }) => void;
  listings: HouseListing[];
  amenities: Amenity[];
}) {
  const center: [number, number] = [14.304, 120.988];

  // Helper to categorize amenities into custom 2D badge styles
  const getAmenityCategory = (name: string): "pool" | "court" | "clubhouse" | "park" => {
    const n = name.toLowerCase();
    if (n.includes("pool") || n.includes("swim")) return "pool";
    if (n.includes("court") || n.includes("sports") || n.includes("basketball")) return "court";
    if (n.includes("clubhouse") || n.includes("hall")) return "clubhouse";
    return "park";
  };

  return (
    <MapContainer
      center={center}
      zoom={16}
      zoomControl={false}
      scrollWheelZoom={true}
      className="h-full w-full bg-[#e6efe8]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <CustomMapControls />

      {/* ── Entrance Gate Landmark ────────────────────────────────────────── */}
      <Marker
        position={[14.3015, 120.9855]}
        icon={createBadgeIcon(
          "gate",
          "Entrance Gate",
          active?.type === "landmark" && active.id === "gate"
        )}
        eventHandlers={{ click: () => onSelect({ type: "landmark", id: "gate" }) }}
      >
        <Popup>
          <div className="p-3 font-sans text-xs">
            <strong className="text-sm font-bold text-[#143424]">Entrance Gate</strong>
            <p className="mt-1 text-[#5c6e60]">Mabuhay Homes 2000 Phase 5 Main Entrance (Salawag)</p>
          </div>
        </Popup>
      </Marker>

      {/* ── Verified & Available House Listings ───────────────────────────── */}
      {listings.map((l) => {
        const isActive = active?.type === "listing" && active.id === l.id;
        const cover = l.images && l.images[0] ? l.images[0] : "https://picsum.photos/seed/home/600/400";
        const shortName = l.houseName.length > 18 ? l.houseName.slice(0, 18) + "…" : l.houseName;

        return (
          <Marker
            key={`l-${l.id}`}
            position={[l.lat, l.lng]}
            icon={createBadgeIcon("house", shortName, isActive)}
            eventHandlers={{ click: () => onSelect({ type: "listing", id: l.id }) }}
          >
            <Popup>
              <div className="w-64 overflow-hidden font-sans text-xs">
                <div
                  className="relative h-28 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${cover})` }}
                >
                  <span className="absolute top-2 left-2 rounded-full bg-[#1a3826] px-2 py-0.5 text-[10px] font-bold text-white uppercase shadow-sm">
                    {l.listingType === "rent" ? "For Rent" : "For Sale"}
                  </span>
                  <span className="absolute top-2 right-2 rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    ✔ Verified
                  </span>
                </div>
                <div className="p-3 bg-white">
                  <h4 className="font-serif text-sm font-bold text-[#143424] leading-tight">
                    {l.houseName}
                  </h4>
                  <p className="text-[11px] text-[#5c6e60] mt-0.5">
                    Block {l.blockNo}, Lot {l.lotNo}, Mabuhay Homes
                  </p>
                  <div className="mt-2 font-serif text-base font-bold text-[#2d6a4f]">
                    {formatPHP(l.price)}
                    {l.listingType === "rent" ? (
                      <span className="text-[10px] font-normal text-[#5c6e60]"> / month</span>
                    ) : (
                      ""
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-[#5c6e60] border-t border-[#e8e4da] pt-2">
                    <span>🛏️ {l.bedrooms} Beds</span>
                    <span>🚿 {l.bathrooms} Baths</span>
                    <span>📐 {l.sqm} sqm</span>
                  </div>
                  <Link
                    href={`/house/${l.id}`}
                    className="mt-3 block w-full rounded-xl bg-[#1a3826] py-2 text-center text-xs font-bold text-white shadow-xs transition hover:bg-[#132c1e]"
                  >
                    View Property →
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* ── Community Amenities ───────────────────────────────────────────── */}
      {amenities
        .filter((a) => a.id !== 3 && !a.name.toLowerCase().includes("clubhouse") && !a.name.toLowerCase().includes("park"))
        .map((a) => {
        const isActive = active?.type === "amenity" && active.id === a.id;
        const category = getAmenityCategory(a.name);
        return (
          <Marker
            key={`a-${a.id}`}
            position={[a.lat, a.lng]}
            icon={createBadgeIcon(category, a.name, isActive)}
            eventHandlers={{ click: () => onSelect({ type: "amenity", id: a.id }) }}
          >
            <Popup>
              <div className="w-56 p-3 font-sans text-xs bg-white">
                <div className="flex items-center justify-between">
                  <strong className="font-serif text-sm font-bold text-[#143424]">{a.name}</strong>
                  <span className="rounded-full bg-[#edf3ee] px-2 py-0.5 text-[10px] font-bold text-[#1a3826]">
                    Cap: {a.maxCapacity}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#5c6e60]">{a.description}</p>
                <Link
                  href="/reservation"
                  className="mt-3 block w-full rounded-xl bg-[#2d6a4f] py-1.5 text-center text-xs font-bold text-white shadow-xs transition hover:bg-[#1f4a37]"
                >
                  Book Amenity →
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}

      <MapController active={active} listings={listings} amenities={amenities} />
    </MapContainer>
  );
}
