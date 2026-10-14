# Complete Entity Relationship Diagram (ERD) — Mabuhay Homes Community Portal

**Project:** Mabuhay Homes Community Portal  
**Database:** MongoDB (Mongoose ODM)  
**Audit Date:** 2026-10-13  
**Total Entities:** 9

---

## ERD Notes

- MongoDB is a **document database** — it does NOT enforce foreign keys at the database level
- Relationships shown below are **application-level logical relationships** enforced in code (`lib/db.ts`)
- Dashed lines (`..|..`) indicate logical/soft references (not database-enforced foreign keys)
- The `payment` field in Transaction is an **embedded subdocument**, NOT a separate collection
- Many fields are **denormalized** (e.g., `residentName` stored directly instead of joined) — this is a deliberate MongoDB design pattern

---

## Full ERD (Mermaid)

```mermaid
erDiagram
    USER {
        Mixed _id PK "Auto-incremented integer"
        String fullName "Required"
        String email "Required, unique (app-enforced)"
        String role "Required: admin | counselor | resident | non_resident"
        Boolean isActive "Default: true"
        String address
        String blockNo
        String lotNo
        String phone
        String gender
        Number householdMembers
        String householdHead
        String passwordHash "Bcrypt hash"
        String resetToken "Password reset token hash"
        Date resetTokenExpiry
        Boolean emailVerified
        String verificationToken "Email verification token hash"
        Date verificationTokenExpiry
        String cedula "Community tax certificate"
        Boolean isArchived "Default: false"
        String archiveReason
        String archivedAt
        Date createdAt "Auto"
        Date updatedAt "Auto"
    }

    LISTING {
        Number _id PK "Auto-incremented"
        String houseName "Required"
        String address "Required"
        String blockNo "From master index"
        String lotNo "From master index"
        Number price "Required"
        String listingType "Required: sale | rent"
        Number bedrooms
        Number bathrooms
        Number sqm
        String status "Required: available | reserved | sold | off_market"
        String transactionStatus "available | reserved | sold_rented | sold"
        String ownerContactNumber
        String ownerMessengerLink
        String description
        Number ownerId "Logical FK to User._id"
        String ownerName "Denormalized"
        Array images "Base64 or URLs"
        Number lat
        Number lng
        String verificationStatus "pending | verified | rejected"
        Array proofDocuments "File paths"
        String rejectionReason
        Number uploadedBy "Logical FK to User._id"
        Boolean showOnMap "Default: true"
        Boolean siteVisitRecommended "Default: false"
        Boolean isArchived "Default: false"
        String archiveReason
        String archivedBy "owner | admin"
        String archivedAt
        Date createdAt "Auto"
        Date updatedAt "Auto"
    }

    AMENITY {
        Number _id PK "Auto-incremented"
        String name "Required"
        String description
        Number maxCapacity "Default: 50"
        Number rateWalkin "Public day rate per head"
        Number rateWhole "Public night rate per head"
        Number ratePrivate "Private flat rate"
        Number downpayment "Default: 200"
        Number downpaymentPrivate "Default: 500"
        Boolean isActive "Default: true"
        Boolean isArchived "Default: false"
        String image
        Number lat
        Number lng
        Date createdAt "Auto"
        Date updatedAt "Auto"
    }

    ANNOUNCEMENT {
        Number _id PK "Auto-incremented"
        String title "Required"
        String content
        String postDate
        String status "Required: active | archived"
        String poster
        Date createdAt "Auto"
        Date updatedAt "Auto"
    }

    RESERVATION {
        Number _id PK "Auto-incremented"
        Number amenityId "Logical FK to Amenity._id"
        String amenityName "Denormalized"
        String residentName "Denormalized from User"
        String phone
        String bookingType "Required: day | night"
        String reservationType "Required: public | private"
        String date "ISO date"
        Number paxCount "Default: 1"
        Number downpayment "Default: 0"
        Number totalAmount "Default: 0"
        String status "Required: pending | approved | declined"
        String notes
        String userEmail "Logical FK to User.email"
        String approvedAt
        String gcashRef
        String receiptPath
        Date createdAt "Auto"
        Date updatedAt "Auto"
    }

    DUESRECORD {
        Number _id PK "Auto-incremented"
        Number residentId "Indexed, logical FK to User._id"
        String residentName "Required, indexed, denormalized"
        String blockNo
        String lotNo
        String dueMonth "Required, indexed, YYYY-MM"
        String dueDate "ISO date"
        Number amountDue "Default: 100"
        Number amountPaid "Default: 0"
        String paidAt "ISO date"
        Number creditBalance "Default: 0"
        String status "Required: paid | unpaid | delayed | advance | on_time"
        String source "imported | system | manual"
        String billingMonth "e.g. September"
        Number billingYear "e.g. 2026"
        Date createdAt "Auto"
        Date updatedAt "Auto"
    }

    TRANSACTION {
        Number _id PK "Auto-incremented"
        String residentName "Denormalized"
        String refType "amenity | dues | listing"
        Number refId "Logical FK to Reservation._id or DuesRecord._id"
        String userEmail
        Number amount
        String paymentMethod "cash | gcash"
        String gcashRef
        String receiptPath
        String status "Required: approved | pending | voided"
        String createdAt_manual "ISO date"
        String payment_provider "Embedded: gcash"
        String payment_intentId "Embedded: unique"
        String payment_qrPayload "Embedded: QR data"
        String payment_status "Embedded: awaiting_payment | paid | expired | failed"
        String payment_paidAt "Embedded"
        String payment_gcashRef "Embedded"
        Boolean isArchived "Default: false"
        String archiveReason
        String archivedBy
        String archivedAt
        Date createdAt "Auto"
        Date updatedAt "Auto"
    }

    PAYMENTCONFIG {
        ObjectId _id PK "Auto-generated"
        String category "Required, unique: amenity | dues"
        String accountName "Default: MABUHAY HOMES HOA"
        String accountNumber "Default: 0917 123 4567"
        String qrCodeUrl
        String instructions
        Boolean isActive "Default: true"
        String updatedBy "Default: Admin"
        Date createdAt "Auto"
        Date updatedAt "Auto"
    }

    PROPERTYVIEWING {
        Number _id PK "Auto-incremented"
        Number listingId "Required, indexed, logical FK to Listing._id"
        String listingName "Required, denormalized"
        String residentName "Required, denormalized"
        String residentEmail "Required, indexed, logical FK to User.email"
        String preferredDate "Required, ISO date"
        String preferredTime "Required"
        String message
        String status "Required: viewing_requested | viewing_scheduled | viewing_completed | viewing_declined"
        String adminNotes
        String scheduledAt
        Date createdAt "Auto"
        Date updatedAt "Auto"
    }

    %% ─── Relationships ───────────────────────────────────────────────
    %% Logical (app-enforced), NOT database-enforced foreign keys

    USER ||--o{ LISTING : "owns (ownerId / uploadedBy)"
    USER ||--o{ RESERVATION : "books (userEmail)"
    USER ||--o{ DUESRECORD : "billed (residentId)"
    USER ||--o{ PROPERTYVIEWING : "requests (residentEmail)"

    AMENITY ||--o{ RESERVATION : "reserved for (amenityId)"

    LISTING ||--o{ PROPERTYVIEWING : "viewed (listingId)"

    RESERVATION ||--o| TRANSACTION : "paid via (refType=amenity, refId)"
    DUESRECORD ||--o| TRANSACTION : "paid via (refType=dues, refId)"

    PAYMENTCONFIG ||--o{ TRANSACTION : "configures payment for (category)"
```

---

## Relationship Summary

| Relationship | Type | Enforced By | Notes |
|--------------|------|-------------|-------|
| User → Listing | One-to-Many | App code (`ownerId`, `uploadedBy`) | A user can own/upload multiple listings |
| User → Reservation | One-to-Many | App code (`userEmail`) | A user can make multiple reservations |
| User → DuesRecord | One-to-Many | App code (`residentId`) | One dues record per resident per month |
| User → PropertyViewing | One-to-Many | App code (`residentEmail`) | A user can request multiple viewings |
| Amenity → Reservation | One-to-Many | App code (`amenityId`) | An amenity can have multiple reservations |
| Listing → PropertyViewing | One-to-Many | App code (`listingId`) | A listing can have multiple viewing requests |
| Reservation → Transaction | One-to-One | App code (`refType="amenity"`, `refId`) | Each reservation links to one payment transaction |
| DuesRecord → Transaction | One-to-One | App code (`refType="dues"`, `refId`) | Each dues payment links to one transaction |
| PaymentConfig → Transaction | One-to-Many (indirect) | App logic | Config determines GCash details for transactions |

### Denormalized Fields (Intentional Redundancy)

These fields store data that *could* be derived from a join, but are stored directly for performance and simplicity in MongoDB:

| Entity | Field | Source |
|--------|-------|--------|
| Listing | `ownerName` | from User.fullName |
| Reservation | `amenityName` | from Amenity.name |
| Reservation | `residentName` | from User.fullName |
| DuesRecord | `residentName` | from User.fullName |
| DuesRecord | `blockNo`, `lotNo` | from User.blockNo, User.lotNo |
| Transaction | `residentName` | from User.fullName |
| PropertyViewing | `listingName` | from Listing.houseName |
| PropertyViewing | `residentName` | from User.fullName |

### Embedded Subdocument (NOT a Separate Collection)

The `Transaction.payment` field is an **embedded subdocument** within the Transaction document. It contains GCash payment details (`provider`, `intentId`, `qrPayload`, `status`, `paidAt`, `gcashRef`). This is NOT a separate collection — it is nested inside each transaction document. This is a standard MongoDB pattern for tightly-coupled 1:1 data.
