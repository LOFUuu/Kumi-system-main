# Mabuhay Homes Community Portal — System Documentation Suite

Welcome to the comprehensive audit and architecture documentation suite for the **Mabuhay Homes Community Portal** (`kumi-system-main`).

---

## 📚 Table of Contents

1. **[01 — Complete System Analysis Report](file:///c:/Users/axcel/Downloads/LOVED%20BY%20ALL/kumi-system-main/docs/01-system-analysis-report.md)**
   - Executive Summary
   - High-level architecture & external services (Google OAuth, Gmail API, Leaflet)
   - Module breakdown (Resident & Admin portals)
   - All 46 backend API route endpoints categorized
   - Email workflows and session handling

2. **[02 — Database Entity Inventory](file:///c:/Users/axcel/Downloads/LOVED%20BY%20ALL/kumi-system-main/docs/02-entity-inventory.md)**
   - Detailed specification for each of the 9 Mongoose models
   - Field names, TypeScript types, Mongoose schema types, required constraints, defaults, and descriptions
   - Primary key strategy (`_id` auto-incrementing integer)
   - Soft-delete & archival strategies (`isArchived`, `archiveReason`)

3. **[03 — Data Flow Diagrams (DFD)](file:///c:/Users/axcel/Downloads/LOVED%20BY%20ALL/kumi-system-main/docs/03-data-flow-diagrams.md)**
   - **Level 0: Context Diagram** (External entities: Residents, Admins, Google OAuth, Email API, Map Service)
   - **Level 1: System-wide DFD** (All 10 core processes and 9 data stores)
   - **Level 2: Sub-process DFDs**:
     - Process 1.0: User Authentication & Profile
     - Process 2.0: Property Listings Management
     - Process 3.0: Amenity Reservation & Booking
     - Process 5.0: Monthly HOA Dues & Financial Payments

4. **[04 — Entity Relationship Diagram (ERD)](file:///c:/Users/axcel/Downloads/LOVED%20BY%20ALL/kumi-system-main/docs/04-entity-relationship-diagram.md)**
   - Full Mermaid Entity-Relationship Diagram
   - Cardinality & logical relationships (1:M, 1:1, soft references)
   - Embedded subdocument structures (`Transaction.payment`, `Listing.images`)
   - Detailed relationship matrix explaining why relationships are application-enforced

5. **[05 — Entity Audit & Discrepancy Analysis](file:///c:/Users/axcel/Downloads/LOVED%20BY%20ALL/kumi-system-main/docs/05-entity-audit-and-comparison.md)**
   - In-depth explanation of why the system has exactly 9 collections (and not 50+)
   - Document-oriented NoSQL principles vs. Third Normal Form (3NF) relational models
   - **38-Table Relational Decomposition** showing how the 9 MongoDB collections map to an enterprise SQL schema
   - Disproven "ghost" entities (Sessions, Logs, Notifications, Inquiries, Newsletters)
