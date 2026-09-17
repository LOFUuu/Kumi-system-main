"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatPHP } from "@/lib/mock-data";
import type { HouseListing, Amenity } from "@/lib/mock-data";

export type MapActive = { type: "listing" | "amenity"; id: number } | null;

function pin(kind: "house" | "amenity", active: boolean) {
  const svg =
    kind === "house"
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#52b788" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>';
  const cls = `kumi-pin ${kind}${active ? " active" : ""}`;
  return L.divIcon({
    className: "",
    html: `<div class="${cls}">${svg}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function MapController({ active, listings, amenities }: { active: MapActive; listings: HouseListing[]; amenities: Amenity[] }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const list = active.type === "listing" ? listings : amenities;
    const item = list.find((x) => x.id === active.id);
    if (item) map.flyTo([item.lat, item.lng], 17, { duration: 0.6 });
  }, [active, map, listings, amenities]);
  return null;
}

export default function CommunityMap({
  active,
  onSelect,
  listings,
  amenities,
}: {
  active: MapActive;
  onSelect: (a: { type: "listing" | "amenity"; id: number }) => void;
  listings: HouseListing[];
  amenities: Amenity[];
}) {
  const center: [number, number] = [14.3033, 120.9886];
  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom={true}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {listings.map((l) => {
        const isActive = active?.type === "listing" && active.id === l.id;
        return (
          <Marker
            key={`l-${l.id}`}
            position={[l.lat, l.lng]}
            icon={pin("house", isActive)}
            eventHandlers={{ click: () => onSelect({ type: "listing", id: l.id }) }}
          >
            <Popup>
              <strong>{l.houseName}</strong>
              <br />
              {l.address}
              <br />
              {l.listingType === "sale"
                ? formatPHP(l.price)
                : `${formatPHP(l.price)} / mo`}
            </Popup>
          </Marker>
        );
      })}

      {amenities.map((a) => {
        const isActive = active?.type === "amenity" && active.id === a.id;
        return (
          <Marker
            key={`a-${a.id}`}
            position={[a.lat, a.lng]}
            icon={pin("amenity", isActive)}
            eventHandlers={{ click: () => onSelect({ type: "amenity", id: a.id }) }}
          >
            <Popup>
              <strong>{a.name}</strong>
              <br />
              Capacity: {a.maxCapacity}
            </Popup>
          </Marker>
        );
      })}

      <MapController active={active} listings={listings} amenities={amenities} />
    </MapContainer>
  );
}
