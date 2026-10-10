"use client";

import { useState, useRef, useMemo } from "react";
import {
  Database,
  Key,
  Link as LinkIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Search,
  Layers,
  FileText,
  Table as TableIcon,
  CheckCircle2,
  HelpCircle,
  Eye,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Definition of an entity field
interface FieldDef {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
  fkTarget?: string;
  required?: boolean;
  enumVals?: string[];
  defaultVal?: string;
  description?: string;
}

// Definition of an entity (Mongoose collection / table)
interface EntityDef {
  id: string;
  name: string;
  collection: string;
  description: string;
  color: string;
  x: number;
  y: number;
  fields: FieldDef[];
}

// Relationship definition
interface RelationshipDef {
  id: string;
  fromEntity: string;
  fromField: string;
  toEntity: string;
  toField: string;
  type: "1:N" | "1:1" | "1:N (Polymorphic)";
  description: string;
}

// Exact 8 models defined in models/index.ts
const ENTITIES: EntityDef[] = [
  {
    id: "user",
    name: "User",
    collection: "users",
    description: "System accounts (Admins, Counselors, Residents, Non-Residents)",
    color: "#10b981", // Emerald
    x: 60,
    y: 220,
    fields: [
      { name: "_id", type: "Number", isPk: true, required: true, description: "Primary Key" },
      { name: "fullName", type: "String", required: true },
      { name: "email", type: "String", required: true },
      { name: "role", type: "String", required: true, enumVals: ["admin", "counselor", "resident", "non_resident"] },
      { name: "isActive", type: "Boolean", defaultVal: "true" },
      { name: "address", type: "String" },
      { name: "blockNo", type: "String" },
      { name: "lotNo", type: "String" },
      { name: "phone", type: "String" },
      { name: "gender", type: "String" },
      { name: "householdMembers", type: "Number" },
      { name: "householdHead", type: "String" },
      { name: "password", type: "String" },
      { name: "passwordHash", type: "String" },
      { name: "resetToken", type: "String" },
      { name: "resetTokenExpiry", type: "Date" },
      { name: "emailVerified", type: "Boolean" },
      { name: "verificationToken", type: "String" },
      { name: "verificationTokenExpiry", type: "Date" },
      { name: "cedula", type: "String" },
      { name: "isArchived", type: "Boolean", defaultVal: "false" },
      { name: "archiveReason", type: "String" },
      { name: "archivedAt", type: "String" },
      { name: "createdAt", type: "Date" },
      { name: "updatedAt", type: "Date" },
    ],
  },
  {
    id: "listing",
    name: "Listing",
    collection: "listings",
    description: "Properties listed for sale or rent by residents/admins",
    color: "#3b82f6", // Blue
    x: 440,
    y: 60,
    fields: [
      { name: "_id", type: "Number", isPk: true, required: true, description: "Primary Key" },
      { name: "houseName", type: "String", required: true },
      { name: "address", type: "String", required: true },
      { name: "blockNo", type: "String" },
      { name: "lotNo", type: "String" },
      { name: "price", type: "Number", required: true },
      { name: "listingType", type: "String", required: true, enumVals: ["sale", "rent"] },
      { name: "bedrooms", type: "Number" },
      { name: "bathrooms", type: "Number" },
      { name: "sqm", type: "Number" },
      { name: "status", type: "String", required: true, enumVals: ["available", "reserved", "sold", "off_market"] },
      { name: "transactionStatus", type: "String", enumVals: ["available", "reserved", "sold_rented", "sold"] },
      { name: "ownerContactNumber", type: "String" },
      { name: "ownerMessengerLink", type: "String" },
      { name: "description", type: "String" },
      { name: "ownerId", type: "Number", isFk: true, fkTarget: "User._id" },
      { name: "ownerName", type: "String" },
      { name: "images", type: "Array<String>" },
      { name: "lat", type: "Number" },
      { name: "lng", type: "Number" },
      { name: "verificationStatus", type: "String", enumVals: ["pending", "verified", "rejected"] },
      { name: "proofDocuments", type: "Array<String>" },
      { name: "rejectionReason", type: "String" },
      { name: "uploadedBy", type: "Number", isFk: true, fkTarget: "User._id" },
      { name: "showOnMap", type: "Boolean", defaultVal: "true" },
      { name: "siteVisitRecommended", type: "Boolean", defaultVal: "false" },
      { name: "isArchived", type: "Boolean", defaultVal: "false" },
      { name: "archiveReason", type: "String" },
      { name: "archivedBy", type: "String" },
      { name: "archivedAt", type: "String" },
      { name: "createdAt", type: "Date" },
      { name: "updatedAt", type: "Date" },
    ],
  },
  {
    id: "propertyViewing",
    name: "PropertyViewing",
    collection: "propertyviewings",
    description: "Property viewing appointment requests from residents",
    color: "#8b5cf6", // Purple
    x: 840,
    y: 60,
    fields: [
      { name: "_id", type: "Number", isPk: true, required: true, description: "Primary Key" },
      { name: "listingId", type: "Number", isFk: true, fkTarget: "Listing._id", required: true },
      { name: "listingName", type: "String", required: true },
      { name: "residentName", type: "String", required: true },
      { name: "residentEmail", type: "String", isFk: true, fkTarget: "User.email", required: true },
      { name: "preferredDate", type: "String", required: true },
      { name: "preferredTime", type: "String", required: true },
      { name: "message", type: "String", defaultVal: '""' },
      { name: "status", type: "String", required: true, enumVals: ["viewing_requested", "viewing_scheduled", "viewing_completed", "viewing_declined"] },
      { name: "adminNotes", type: "String" },
      { name: "scheduledAt", type: "String" },
      { name: "createdAt", type: "Date" },
      { name: "updatedAt", type: "Date" },
    ],
  },
  {
    id: "amenity",
    name: "Amenity",
    collection: "amenities",
    description: "HOA facilities available for public or private booking",
    color: "#f59e0b", // Amber
    x: 60,
    y: 800,
    fields: [
      { name: "_id", type: "Number", isPk: true, required: true, description: "Primary Key" },
      { name: "name", type: "String", required: true },
      { name: "description", type: "String" },
      { name: "maxCapacity", type: "Number", defaultVal: "50" },
      { name: "rateWalkin", type: "Number", defaultVal: "0" },
      { name: "rateWhole", type: "Number", defaultVal: "0" },
      { name: "ratePrivate", type: "Number", defaultVal: "0" },
      { name: "downpayment", type: "Number", defaultVal: "200" },
      { name: "downpaymentPrivate", type: "Number", defaultVal: "500" },
      { name: "isActive", type: "Boolean", defaultVal: "true" },
      { name: "isArchived", type: "Boolean", defaultVal: "false" },
      { name: "image", type: "String" },
      { name: "lat", type: "Number" },
      { name: "lng", type: "Number" },
      { name: "createdAt", type: "Date" },
      { name: "updatedAt", type: "Date" },
    ],
  },
  {
    id: "reservation",
    name: "Reservation",
    collection: "reservations",
    description: "Facility reservations made by residents/guests",
    color: "#ec4899", // Pink
    x: 440,
    y: 720,
    fields: [
      { name: "_id", type: "Number", isPk: true, required: true, description: "Primary Key" },
      { name: "amenityId", type: "Number", isFk: true, fkTarget: "Amenity._id" },
      { name: "amenityName", type: "String" },
      { name: "residentName", type: "String" },
      { name: "phone", type: "String" },
      { name: "bookingType", type: "String", required: true, enumVals: ["day", "night"] },
      { name: "reservationType", type: "String", required: true, enumVals: ["public", "private"] },
      { name: "date", type: "String" },
      { name: "paxCount", type: "Number", defaultVal: "1" },
      { name: "downpayment", type: "Number", defaultVal: "0" },
      { name: "totalAmount", type: "Number", defaultVal: "0" },
      { name: "status", type: "String", required: true, enumVals: ["pending", "approved", "declined"] },
      { name: "notes", type: "String" },
      { name: "userEmail", type: "String", isFk: true, fkTarget: "User.email" },
      { name: "approvedAt", type: "String" },
      { name: "gcashRef", type: "String" },
      { name: "receiptPath", type: "String" },
      { name: "createdAt", type: "Date" },
      { name: "updatedAt", type: "Date" },
    ],
  },
  {
    id: "duesRecord",
    name: "DuesRecord",
    collection: "duesrecords",
    description: "Monthly HOA dues records and billing statuses per resident",
    color: "#06b6d4", // Cyan
    x: 60,
    y: 1220,
    fields: [
      { name: "_id", type: "Number", isPk: true, required: true, description: "Primary Key" },
      { name: "residentId", type: "Number", isFk: true, fkTarget: "User._id" },
      { name: "residentName", type: "String", required: true },
      { name: "blockNo", type: "String" },
      { name: "lotNo", type: "String" },
      { name: "dueMonth", type: "String", required: true },
      { name: "dueDate", type: "String" },
      { name: "amountDue", type: "Number", defaultVal: "100" },
      { name: "amountPaid", type: "Number", defaultVal: "0" },
      { name: "paidAt", type: "String" },
      { name: "creditBalance", type: "Number", defaultVal: "0" },
      { name: "status", type: "String", required: true, enumVals: ["paid", "unpaid", "delayed", "advance", "on_time"] },
      { name: "source", type: "String", enumVals: ["imported", "system", "manual"], defaultVal: "system" },
      { name: "billingMonth", type: "String" },
      { name: "billingYear", type: "Number" },
      { name: "createdAt", type: "Date" },
      { name: "updatedAt", type: "Date" },
    ],
  },
  {
    id: "transaction",
    name: "Transaction",
    collection: "transactions",
    description: "Financial transactions & GCash/Cash payment ledgers",
    color: "#10b981", // Emerald
    x: 840,
    y: 720,
    fields: [
      { name: "_id", type: "Number", isPk: true, required: true, description: "Primary Key" },
      { name: "residentName", type: "String" },
      { name: "refType", type: "String", enumVals: ["amenity", "dues", "listing"] },
      { name: "refId", type: "Number", isFk: true, fkTarget: "Polymorphic (Amenity/Dues/Listing)", description: "Polymorphic reference" },
      { name: "userEmail", type: "String", isFk: true, fkTarget: "User.email" },
      { name: "amount", type: "Number" },
      { name: "paymentMethod", type: "String", enumVals: ["cash", "gcash"], defaultVal: "gcash" },
      { name: "gcashRef", type: "String" },
      { name: "receiptPath", type: "String" },
      { name: "status", type: "String", required: true, enumVals: ["approved", "pending", "voided"] },
      { name: "payment.provider", type: "String", defaultVal: '"gcash"' },
      { name: "payment.intentId", type: "String" },
      { name: "payment.qrPayload", type: "String" },
      { name: "payment.status", type: "String", enumVals: ["awaiting_payment", "paid", "expired", "failed"] },
      { name: "payment.paidAt", type: "String" },
      { name: "payment.gcashRef", type: "String" },
      { name: "createdAt", type: "Date" },
      { name: "updatedAt", type: "Date" },
    ],
  },
  {
    id: "announcement",
    name: "Announcement",
    collection: "announcements",
    description: "Community news and HOA broadcast announcements",
    color: "#64748b", // Slate
    x: 840,
    y: 1220,
    fields: [
      { name: "_id", type: "Number", isPk: true, required: true, description: "Primary Key" },
      { name: "title", type: "String", required: true },
      { name: "content", type: "String" },
      { name: "postDate", type: "String" },
      { name: "status", type: "String", required: true, enumVals: ["active", "archived"] },
      { name: "poster", type: "String" },
      { name: "createdAt", type: "Date" },
      { name: "updatedAt", type: "Date" },
    ],
  },
];

// Relationships derived directly from system code
const RELATIONSHIPS: RelationshipDef[] = [
  {
    id: "r1",
    fromEntity: "user",
    fromField: "_id",
    toEntity: "listing",
    toField: "ownerId",
    type: "1:N",
    description: "A User can own multiple House Listings",
  },
  {
    id: "r2",
    fromEntity: "user",
    fromField: "_id",
    toEntity: "listing",
    toField: "uploadedBy",
    type: "1:N",
    description: "A User can upload multiple House Listings",
  },
  {
    id: "r3",
    fromEntity: "user",
    fromField: "_id",
    toEntity: "duesRecord",
    toField: "residentId",
    type: "1:N",
    description: "A Resident User has multiple monthly Dues Records",
  },
  {
    id: "r4",
    fromEntity: "user",
    fromField: "email",
    toEntity: "reservation",
    toField: "userEmail",
    type: "1:N",
    description: "A User can make multiple Amenity Reservations",
  },
  {
    id: "r5",
    fromEntity: "user",
    fromField: "email",
    toEntity: "transaction",
    toField: "userEmail",
    type: "1:N",
    description: "A User can perform multiple payment Transactions",
  },
  {
    id: "r6",
    fromEntity: "user",
    fromField: "email",
    toEntity: "propertyViewing",
    toField: "residentEmail",
    type: "1:N",
    description: "A Resident User can request multiple Property Viewings",
  },
  {
    id: "r7",
    fromEntity: "listing",
    fromField: "_id",
    toEntity: "propertyViewing",
    toField: "listingId",
    type: "1:N",
    description: "A Listing can have multiple Viewing requests",
  },
  {
    id: "r8",
    fromEntity: "amenity",
    fromField: "_id",
    toEntity: "reservation",
    toField: "amenityId",
    type: "1:N",
    description: "An Amenity can be reserved multiple times",
  },
  {
    id: "r9",
    fromEntity: "reservation",
    fromField: "_id",
    toEntity: "transaction",
    toField: "refId",
    type: "1:N (Polymorphic)",
    description: "A Reservation can link to a Payment Transaction via refId (refType: 'amenity')",
  },
  {
    id: "r10",
    fromEntity: "duesRecord",
    fromField: "_id",
    toEntity: "transaction",
    toField: "refId",
    type: "1:N (Polymorphic)",
    description: "A Dues Record can link to a Payment Transaction via refId (refType: 'dues')",
  },
];

export default function ErdPage() {
  const [activeTab, setActiveTab] = useState<"diagram" | "dictionary" | "schema">("diagram");
  const [zoom, setZoom] = useState(0.85);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [expandedEntities, setExpandedEntities] = useState<Record<string, boolean>>({
    user: true,
    listing: true,
    propertyViewing: true,
    amenity: true,
    reservation: true,
    duesRecord: true,
    transaction: true,
    announcement: true,
  });

  const svgRef = useRef<SVGSVGElement>(null);

  // Toggle card expansion
  const toggleExpand = (id: string) => {
    setExpandedEntities((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter entities & fields based on search query
  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return ENTITIES;
    const q = searchQuery.toLowerCase();
    return ENTITIES.map((e) => {
      const matchName = e.name.toLowerCase().includes(q) || e.collection.toLowerCase().includes(q);
      const matchingFields = e.fields.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.type.toLowerCase().includes(q) ||
          (f.fkTarget && f.fkTarget.toLowerCase().includes(q))
      );
      return {
        ...e,
        highlight: matchName || matchingFields.length > 0,
        matchingFields: matchingFields.map((f) => f.name),
      };
    });
  }, [searchQuery]);

  // Export diagram as printable layout
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-6 shadow-sm border border-cream-2">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-emerald-400 shadow-md">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-slate-900">
                System Entity Relationship Diagram (ERD)
              </h1>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-300">
                Mongoose / MongoDB Schema
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Complete production database structure and model relationships for Mabuhay Phase 5 System.
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab("diagram")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "diagram"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Layers className="h-4 w-4" />
            Visual ERD
          </button>
          <button
            onClick={() => setActiveTab("dictionary")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "dictionary"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <TableIcon className="h-4 w-4" />
            Data Dictionary
          </button>
          <button
            onClick={() => setActiveTab("schema")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "schema"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <FileText className="h-4 w-4" />
            Mermaid & Schema
          </button>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-cream-2 shadow-sm">
        {/* Search */}
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tables, fields, types, or foreign keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeTab === "diagram" && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
                className="p-1.5 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-semibold text-slate-600 min-w-[45px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
                className="p-1.5 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoom(0.85)}
                className="p-1.5 rounded text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                title="Reset Zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Export / Print ERD
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === "diagram" && (
        <div className="relative overflow-auto rounded-2xl bg-[#0b1329] border border-slate-800 shadow-2xl min-h-[850px] p-8">
          {/* Compass grid background effect */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#38bdf8 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Compass Canvas Header Banner */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-4 py-2 rounded-xl text-slate-300 text-xs shadow-lg">
            <div className="flex items-center gap-2 text-emerald-400 font-mono font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              cluster0.mongodb.net &gt; mabuhay_phase5_db
            </div>
            <div className="h-3 w-px bg-slate-700"></div>
            <span className="text-slate-400">8 Collections • 10 Foreign Key References</span>
          </div>

          {/* Canvas container with zoom transform */}
          <div
            className="relative transition-transform duration-200 origin-top-left pt-12"
            style={{ transform: `scale(${zoom})`, width: "1250px", height: "1650px" }}
          >
            {/* SVG Connecting lines for relationships */}
            <svg
              ref={svgRef}
              className="absolute inset-0 pointer-events-none z-0"
              style={{ width: "100%", height: "100%" }}
            >
              <defs>
                <marker
                  id="arrow-emerald"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
                <marker
                  id="arrow-blue"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                </marker>
                <marker
                  id="arrow-purple"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6" />
                </marker>
                <marker
                  id="arrow-pink"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ec4899" />
                </marker>
                <marker
                  id="arrow-cyan"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
                </marker>
              </defs>

              {/* Relationship lines between entity cards */}
              {/* 1. User -> Listing (ownerId) */}
              <path
                d="M 390 280 C 410 280, 410 160, 440 160"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
                markerEnd="url(#arrow-emerald)"
              />
              <text x="410" y="210" fill="#10b981" fontSize="10" fontWeight="bold">1 : N</text>

              {/* 2. User -> Listing (uploadedBy) */}
              <path
                d="M 390 320 C 420 320, 410 230, 440 230"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
                markerEnd="url(#arrow-emerald)"
              />

              {/* 3. User -> DuesRecord (residentId) */}
              <path
                d="M 220 700 L 220 1220"
                stroke="#06b6d4"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrow-cyan)"
              />
              <text x="228" y="960" fill="#06b6d4" fontSize="10" fontWeight="bold">1 : N</text>

              {/* 4. User -> Reservation (userEmail) */}
              <path
                d="M 390 420 C 430 420, 420 780, 440 780"
                stroke="#ec4899"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrow-pink)"
              />
              <text x="405" y="600" fill="#ec4899" fontSize="10" fontWeight="bold">1 : N</text>

              {/* 5. User -> PropertyViewing (residentEmail) */}
              <path
                d="M 390 260 C 600 120, 780 120, 840 180"
                stroke="#8b5cf6"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrow-purple)"
              />
              <text x="610" y="110" fill="#8b5cf6" fontSize="10" fontWeight="bold">1 : N</text>

              {/* 6. Listing -> PropertyViewing (listingId) */}
              <path
                d="M 770 140 L 840 140"
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrow-blue)"
              />
              <text x="795" y="130" fill="#3b82f6" fontSize="10" fontWeight="bold">1 : N</text>

              {/* 7. Amenity -> Reservation (amenityId) */}
              <path
                d="M 390 840 L 440 840"
                stroke="#f59e0b"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrow-pink)"
              />
              <text x="405" y="830" fill="#f59e0b" fontSize="10" fontWeight="bold">1 : N</text>

              {/* 8. Reservation -> Transaction (refId) */}
              <path
                d="M 770 780 L 840 780"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4,4"
                fill="none"
                markerEnd="url(#arrow-emerald)"
              />
              <text x="785" y="770" fill="#10b981" fontSize="10" fontWeight="bold">Ref</text>

              {/* 9. DuesRecord -> Transaction (refId) */}
              <path
                d="M 390 1340 C 600 1340, 780 1000, 840 820"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeDasharray="4,4"
                fill="none"
                markerEnd="url(#arrow-cyan)"
              />

              {/* 10. User -> Transaction (userEmail) */}
              <path
                d="M 390 460 C 650 460, 800 680, 840 740"
                stroke="#10b981"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrow-emerald)"
              />
            </svg>

            {/* Render entity boxes */}
            {ENTITIES.map((entity) => {
              const isSelected = selectedEntityId === entity.id;
              const isExpanded = expandedEntities[entity.id] !== false;

              return (
                <div
                  key={entity.id}
                  onClick={() => setSelectedEntityId(isSelected ? null : entity.id)}
                  style={{ left: `${entity.x}px`, top: `${entity.y}px` }}
                  className={`absolute w-[330px] rounded-xl border transition-all duration-200 cursor-pointer shadow-xl ${
                    isSelected
                      ? "ring-2 ring-emerald-400 border-emerald-400 bg-slate-900 z-30"
                      : "border-slate-700/80 bg-slate-950/95 hover:border-slate-500 z-10"
                  }`}
                >
                  {/* Entity Header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 rounded-t-xl border-b border-slate-800"
                    style={{ backgroundColor: `${entity.color}15` }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: entity.color }}
                      />
                      <div>
                        <span className="font-mono text-sm font-bold text-white tracking-wide">
                          {entity.name}
                        </span>
                        <p className="text-[10px] font-mono text-slate-400">
                          collection: <span className="text-slate-300">{entity.collection}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(entity.id);
                      }}
                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Field list inside box */}
                  {isExpanded && (
                    <div className="p-2 space-y-0.5 font-mono text-[11px] max-h-[480px] overflow-y-auto custom-scrollbar">
                      {entity.fields.map((field) => {
                        const isMatch =
                          searchQuery &&
                          (field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            field.type.toLowerCase().includes(searchQuery.toLowerCase()));

                        return (
                          <div
                            key={field.name}
                            className={`flex items-center justify-between px-2.5 py-1 rounded transition-colors ${
                              isMatch
                                ? "bg-amber-500/20 text-amber-200 font-bold"
                                : "hover:bg-slate-800/80 text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              {/* PK / FK indicators */}
                              {field.isPk && (
                                <span
                                  className="flex items-center gap-0.5 px-1 py-0.2 text-[9px] font-bold rounded bg-emerald-950 text-emerald-400 border border-emerald-700/60"
                                  title="Primary Key"
                                >
                                  <Key className="h-2.5 w-2.5" /> PK
                                </span>
                              )}
                              {field.isFk && (
                                <span
                                  className="flex items-center gap-0.5 px-1 py-0.2 text-[9px] font-bold rounded bg-sky-950 text-sky-400 border border-sky-700/60"
                                  title={`Foreign Key -> ${field.fkTarget}`}
                                >
                                  <LinkIcon className="h-2.5 w-2.5" /> FK
                                </span>
                              )}
                              {!field.isPk && !field.isFk && (
                                <span className="w-3 text-slate-600 text-center">•</span>
                              )}

                              <span
                                className={`truncate ${
                                  field.isPk ? "font-bold text-emerald-400" : ""
                                } ${field.isFk ? "text-sky-300" : ""}`}
                              >
                                {field.name}
                              </span>

                              {field.required && (
                                <span className="text-rose-400 text-[10px]" title="Required field">
                                  *
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] text-slate-400 italic flex-shrink-0">
                              {field.type}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer note */}
                  <div className="px-3 py-1.5 border-t border-slate-800/80 bg-slate-900/50 rounded-b-xl flex items-center justify-between text-[10px] text-slate-500">
                    <span>{entity.fields.length} attributes</span>
                    <span className="text-slate-400 truncate max-w-[170px]">
                      {entity.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Dictionary View */}
      {activeTab === "dictionary" && (
        <div className="space-y-8">
          <div className="rounded-xl bg-amber-50 p-4 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Database Dictionary Documentation</p>
              <p className="text-amber-800 mt-0.5">
                Below is the authoritative database table/collection specification for your system. Use this table view for thesis documentation, system specification reports, or auditing.
              </p>
            </div>
          </div>

          {ENTITIES.map((entity) => (
            <div
              key={entity.id}
              className="rounded-2xl bg-white border border-cream-2 shadow-sm overflow-hidden"
            >
              {/* Table header */}
              <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: entity.color }}
                  />
                  <div>
                    <h2 className="font-mono text-base font-bold">{entity.name}</h2>
                    <p className="text-xs text-slate-400 font-mono">
                      Collection Name: <span className="text-emerald-400">{entity.collection}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-mono text-slate-300 border border-slate-700">
                    {entity.fields.length} Fields
                  </span>
                </div>
              </div>

              <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-medium">
                Description: {entity.description}
              </div>

              {/* Table fields */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3 font-bold">Field Name</th>
                      <th className="px-6 py-3 font-bold">Data Type</th>
                      <th className="px-6 py-3 font-bold">Key / Index</th>
                      <th className="px-6 py-3 font-bold">Constraint / Enums</th>
                      <th className="px-6 py-3 font-bold">Description / Foreign Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {entity.fields.map((field) => (
                      <tr key={field.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-2.5 font-bold text-slate-900">
                          {field.name}
                          {field.required && (
                            <span className="text-rose-500 font-bold ml-1" title="Required field">
                              *
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-2.5 text-indigo-700 font-semibold">{field.type}</td>
                        <td className="px-6 py-2.5">
                          {field.isPk && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                              <Key className="h-3 w-3 text-emerald-600" /> PK
                            </span>
                          )}
                          {field.isFk && (
                            <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-300">
                              <LinkIcon className="h-3 w-3 text-sky-600" /> FK
                            </span>
                          )}
                          {!field.isPk && !field.isFk && (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-2.5 text-slate-600">
                          {field.required && (
                            <span className="mr-2 text-rose-600 font-sans font-medium text-[11px]">
                              Required
                            </span>
                          )}
                          {field.enumVals && (
                            <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] text-slate-800">
                              [{field.enumVals.join(" | ")}]
                            </span>
                          )}
                          {field.defaultVal && (
                            <span className="ml-2 text-slate-500 text-[10px]">
                              default: {field.defaultVal}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-2.5 text-slate-600 font-sans text-xs">
                          {field.fkTarget ? (
                            <span className="font-mono text-sky-700 font-semibold">
                              References {field.fkTarget}
                            </span>
                          ) : (
                            field.description || "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mermaid & Schema View */}
      {activeTab === "schema" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-mono text-lg font-bold text-emerald-400">
                  Mermaid ERD Code (GitHub & Markdown Standard)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Copy and paste this snippet directly into any markdown file, documentation tool, or GitHub issue.
                </p>
              </div>
              <button
                onClick={() => {
                  const mermaidText = `erDiagram
  User ||--o{ Listing : owns
  User ||--o{ Listing : uploads
  User ||--o{ DuesRecord : owes
  User ||--o{ Reservation : reserves
  User ||--o{ Transaction : pays
  User ||--o{ PropertyViewing : requests
  Listing ||--o{ PropertyViewing : scheduled_for
  Amenity ||--o{ Reservation : booked_in
  Reservation ||--o{ Transaction : referenced_by
  DuesRecord ||--o{ Transaction : referenced_by

  User {
    Number id PK
    String fullName
    String email
    String role
    Boolean isActive
    String address
    String blockNo
    String lotNo
    String phone
  }

  Listing {
    Number id PK
    String houseName
    String address
    Number price
    String listingType
    Number ownerId FK
    Number uploadedBy FK
  }

  PropertyViewing {
    Number id PK
    Number listingId FK
    String residentEmail FK
    String preferredDate
    String preferredTime
    String status
  }

  Amenity {
    Number id PK
    String name
    Number maxCapacity
    Number rateWalkin
    Number ratePrivate
  }

  Reservation {
    Number id PK
    Number amenityId FK
    String userEmail FK
    String bookingType
    String status
  }

  DuesRecord {
    Number id PK
    Number residentId FK
    String dueMonth
    Number amountDue
    String status
  }

  Transaction {
    Number id PK
    Number refId FK
    String userEmail FK
    Number amount
    String paymentMethod
    String status
  }

  Announcement {
    Number id PK
    String title
    String content
    String status
  }`;
                  navigator.clipboard.writeText(mermaidText);
                  alert("Mermaid ERD diagram code copied to clipboard!");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Copy Mermaid Code
              </button>
            </div>

            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
{`erDiagram
  User ||--o{ Listing : "owns / uploads"
  User ||--o{ DuesRecord : "has monthly dues"
  User ||--o{ Reservation : "makes reservations"
  User ||--o{ Transaction : "makes payments"
  User ||--o{ PropertyViewing : "requests viewings"
  Listing ||--o{ PropertyViewing : "has viewing requests"
  Amenity ||--o{ Reservation : "has bookings"
  Reservation ||--o{ Transaction : "has payment reference"
  DuesRecord ||--o{ Transaction : "has payment reference"

  User {
    Number id PK
    String fullName
    String email
    String role
    Boolean isActive
  }

  Listing {
    Number id PK
    String houseName
    Number price
    String listingType
    Number ownerId FK
  }

  Amenity {
    Number id PK
    String name
    Number maxCapacity
  }

  Reservation {
    Number id PK
    Number amenityId FK
    String userEmail FK
    String status
  }

  DuesRecord {
    Number id PK
    Number residentId FK
    String dueMonth
    String status
  }

  Transaction {
    Number id PK
    Number refId FK
    String userEmail FK
    Number amount
  }`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
