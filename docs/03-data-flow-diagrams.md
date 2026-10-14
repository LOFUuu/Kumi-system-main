# Data Flow Diagrams (DFD) — Mabuhay Homes Community Portal

**Project:** Mabuhay Homes Community Portal  
**Audit Date:** 2026-10-13

---

## DFD Notation Guide

| Symbol | Meaning |
|--------|---------|
| Rectangle | External Entity |
| Rounded Rectangle / Circle | Process |
| Open-ended Rectangle | Data Store |
| Arrow | Data Flow (labeled) |

---

## A. Context Diagram (Level 0)

```mermaid
graph LR
    subgraph External Entities
        R["👤 Resident / Non-Resident"]
        A["🔑 Admin / Counselor"]
        G["🔐 Google OAuth Service"]
        E["📧 Email Service (Gmail API / SMTP)"]
        M["🗺️ Map Tile Service (OpenStreetMap)"]
    end

    P(("0\nMabuhay Homes\nCommunity Portal"))

    R -->|"Registration data, Login credentials, Profile info, Listing submissions, Reservation requests, Dues payments, Contact inquiries, Newsletter subscription"| P
    P -->|"Verified listings, Amenity info, Announcements, Dues records, Payment receipts, Booking confirmations, Email notifications"| R

    A -->|"Admin credentials, Listing review decisions, Reservation approvals, Dues generation, Payment verification, User management, Announcement posts, GCash config"| P
    P -->|"Dashboard stats, Resident list, Transaction records, Reports, Pending items, Archive records"| A

    G -->|"OAuth token, User profile (name, email)"| P
    P -->|"OAuth authorization request"| G

    E -->|"Delivery status"| P
    P -->|"Verification emails, Password reset emails, Contact forwards, Listing alerts, Newsletter welcome"| E

    P -->|"Map coordinate queries"| M
    M -->|"Map tiles, Geocoding data"| P
```

### Context Diagram Description

The entire Mabuhay Homes Community Portal is represented as a single process (Process 0). Four external entities interact with the system:

1. **Resident / Non-Resident** — End users who register, login, browse listings, make reservations, pay dues, and submit inquiries
2. **Admin / Counselor** — HOA administrators who manage all aspects of the subdivision portal
3. **Google OAuth Service** — Provides third-party authentication via Google Sign-In
4. **Email Service** — Gmail API (production) or SMTP (local) for transactional emails
5. **Map Tile Service** — OpenStreetMap/Leaflet for community and property maps

---

## B. Level 1 DFD

```mermaid
graph TB
    subgraph "External Entities"
        R["👤 Resident"]
        A["🔑 Admin"]
        G["🔐 Google OAuth"]
        E["📧 Email Service"]
    end

    subgraph "Processes"
        P1(("1.0\nAuthentication\n& Registration"))
        P2(("2.0\nListing\nManagement"))
        P3(("3.0\nAmenity &\nReservation"))
        P4(("4.0\nMonthly Dues\nManagement"))
        P5(("5.0\nPayment\nProcessing"))
        P6(("6.0\nAnnouncement\nManagement"))
        P7(("7.0\nProperty\nViewing"))
        P8(("8.0\nUser & Profile\nManagement"))
        P9(("9.0\nReports &\nDashboard"))
        P10(("10.0\nCommunication\n& Contact"))
    end

    subgraph "Data Stores"
        D1[("D1: Users")]
        D2[("D2: Listings")]
        D3[("D3: Amenities")]
        D4[("D4: Reservations")]
        D5[("D5: DuesRecords")]
        D6[("D6: Transactions")]
        D7[("D7: Announcements")]
        D8[("D8: PaymentConfigs")]
        D9[("D9: PropertyViewings")]
    end

    %% Authentication flows
    R -->|"Registration data, Credentials"| P1
    G -->|"OAuth token"| P1
    P1 -->|"Auth result, Session cookie"| R
    P1 -->|"Verification email request"| E
    P1 <-->|"User records"| D1

    %% Listing flows
    R -->|"Listing data, Proof documents"| P2
    A -->|"Verification decision"| P2
    P2 -->|"Listing feed, Details"| R
    P2 -->|"Listing notification"| E
    P2 <-->|"Listing records"| D2
    P2 -->|"Owner lookup"| D1

    %% Amenity & Reservation flows
    R -->|"Reservation request"| P3
    A -->|"Approve/Decline"| P3
    P3 -->|"Availability, Booking confirmation"| R
    P3 <-->|"Amenity records"| D3
    P3 <-->|"Reservation records"| D4
    P3 -->|"Transaction data"| P5

    %% Dues flows
    A -->|"Generate/Import dues"| P4
    R -->|"Payment request"| P4
    P4 -->|"Dues records, Status"| R
    P4 <-->|"Dues records"| D5
    P4 -->|"Resident lookup"| D1
    P4 -->|"Payment data"| P5

    %% Payment flows
    R -->|"GCash reference, Receipt upload"| P5
    A -->|"Payment verification, Config update"| P5
    P5 -->|"Transaction status"| R
    P5 <-->|"Transaction records"| D6
    P5 <-->|"Payment config"| D8
    P5 -->|"Status sync"| D4
    P5 -->|"Status sync"| D5

    %% Announcement flows
    A -->|"Create/Archive announcement"| P6
    P6 -->|"Active announcements"| R
    P6 <-->|"Announcement records"| D7

    %% Viewing flows
    R -->|"Viewing request"| P7
    A -->|"Schedule/Decline"| P7
    P7 -->|"Viewing status"| R
    P7 <-->|"Viewing records"| D9
    P7 -->|"Listing lookup"| D2

    %% User Management
    A -->|"CRUD operations, Role changes"| P8
    R -->|"Profile updates"| P8
    P8 <-->|"User records"| D1

    %% Reports
    A -->|"Report request"| P9
    P9 -->|"Dashboard stats, Reports"| A
    P9 -->|"Read"| D1
    P9 -->|"Read"| D2
    P9 -->|"Read"| D4
    P9 -->|"Read"| D5
    P9 -->|"Read"| D6

    %% Communication
    R -->|"Contact form, Newsletter"| P10
    P10 -->|"Forward inquiry"| E
    P10 -->|"Welcome email"| E
```

### Level 1 Process Descriptions

| Process | Input | Output | Data Stores Used |
|---------|-------|--------|-----------------|
| **1.0 Authentication & Registration** | Registration data, Login credentials, Google OAuth token | Session cookie, Auth result, Verification emails | D1 (Users) |
| **2.0 Listing Management** | Listing data, Proof documents, Verification decision | Listing feed, Listing details, Admin notifications | D2 (Listings), D1 (Users) |
| **3.0 Amenity & Reservation** | Reservation request, Approve/Decline decisions | Availability status, Booking confirmation | D3 (Amenities), D4 (Reservations) |
| **4.0 Monthly Dues Management** | Generate/Import command, Payment request | Dues records, Payment status | D5 (DuesRecords), D1 (Users) |
| **5.0 Payment Processing** | GCash ref, Receipt, Config updates, Verification | Transaction status, Receipt confirmation | D6 (Transactions), D8 (PaymentConfigs) |
| **6.0 Announcement Management** | Create/Archive announcement | Active announcements list | D7 (Announcements) |
| **7.0 Property Viewing** | Viewing request, Schedule/Decline decision | Viewing status | D9 (PropertyViewings), D2 (Listings) |
| **8.0 User & Profile Management** | CRUD operations, Profile updates | User records | D1 (Users) |
| **9.0 Reports & Dashboard** | Report request | Dashboard stats, Reports | D1-D6 (read-only) |
| **10.0 Communication & Contact** | Contact form, Newsletter signup | Forwarded inquiry, Welcome email | (none — email only) |

---

## C. Level 2 DFDs

### C.1 — Process 1.0: Authentication & Registration (Decomposed)

```mermaid
graph TB
    R["👤 Resident"]
    G["🔐 Google OAuth"]
    E["📧 Email Service"]
    D1[("D1: Users")]

    P1_1(("1.1\nRegister\nAccount"))
    P1_2(("1.2\nVerify\nEmail"))
    P1_3(("1.3\nLogin\n(Email/Password)"))
    P1_4(("1.4\nGoogle\nLogin"))
    P1_5(("1.5\nForgot\nPassword"))
    P1_6(("1.6\nReset\nPassword"))
    P1_7(("1.7\nSession\nManagement"))

    R -->|"fullName, email, password, role"| P1_1
    P1_1 -->|"Create user record (non_resident)"| D1
    P1_1 -->|"Verification email"| E
    P1_1 -->|"Registration result"| R

    R -->|"token, email"| P1_2
    P1_2 -->|"Set emailVerified=true"| D1
    P1_2 -->|"Verification result"| R

    R -->|"email, password"| P1_3
    P1_3 -->|"Lookup user + verify hash"| D1
    P1_3 -->|"Session cookie + user data"| P1_7
    P1_7 -->|"Set kumi_session cookie"| R

    R -->|"Google credential"| P1_4
    G -->|"Decoded JWT (name, email)"| P1_4
    P1_4 -->|"Find-or-create user"| D1
    P1_4 -->|"Session cookie"| P1_7

    R -->|"email"| P1_5
    P1_5 -->|"Lookup user"| D1
    P1_5 -->|"Save resetToken + expiry"| D1
    P1_5 -->|"Reset email"| E
    P1_5 -->|"Google-only notice email"| E

    R -->|"token, email, newPassword"| P1_6
    P1_6 -->|"Verify token"| D1
    P1_6 -->|"Update passwordHash, clear token"| D1
    P1_6 -->|"Reset result"| R
```

### C.2 — Process 3.0 + 5.0: Amenity Reservation & Payment (Decomposed)

```mermaid
graph TB
    R["👤 Resident"]
    A["🔑 Admin"]
    D3[("D3: Amenities")]
    D4[("D4: Reservations")]
    D6[("D6: Transactions")]
    D8[("D8: PaymentConfigs")]

    P3_1(("3.1\nBrowse\nAmenities"))
    P3_2(("3.2\nCheck\nAvailability"))
    P3_3(("3.3\nCreate\nReservation"))
    P5_1(("5.1\nCreate Payment\nIntent"))
    P5_2(("5.2\nUpload\nReceipt"))
    P5_3(("5.3\nConfirm\nPayment"))
    P3_4(("3.4\nAdmin\nApproval"))
    P5_4(("5.4\nVerify\nTransaction"))

    R -->|"Browse request"| P3_1
    P3_1 -->|"Read amenities"| D3
    P3_1 -->|"Amenity list + details"| R

    R -->|"amenityId, date, type, pax"| P3_2
    P3_2 -->|"Check capacity"| D3
    P3_2 -->|"Check existing bookings"| D4
    P3_2 -->|"Availability result"| R

    R -->|"Reservation details"| P3_3
    P3_3 -->|"Create reservation (pending)"| D4
    P3_3 -->|"Create transaction"| P5_1
    P5_1 -->|"Generate GCash payment intent"| D6
    P5_1 -->|"Load GCash config"| D8
    P5_1 -->|"Payment intent + QR"| R

    R -->|"Receipt file"| P5_2
    P5_2 -->|"Store receipt path"| D6
    P5_2 -->|"Upload confirmation"| R

    R -->|"intentId, gcashRef"| P5_3
    P5_3 -->|"Update payment status"| D6
    P5_3 -->|"Confirmation"| R

    A -->|"Approve/Decline"| P3_4
    P3_4 -->|"Update reservation status"| D4
    P3_4 -->|"Result"| A

    A -->|"Approve/Void transaction"| P5_4
    P5_4 -->|"Update transaction status"| D6
    P5_4 -->|"Sync reservation status"| D4
    P5_4 -->|"Verification result"| A
```

### C.3 — Process 4.0: Monthly Dues Management (Decomposed)

```mermaid
graph TB
    R["👤 Resident"]
    A["🔑 Admin"]
    D1[("D1: Users")]
    D5[("D5: DuesRecords")]
    D6[("D6: Transactions")]
    D8[("D8: PaymentConfigs")]

    P4_1(("4.1\nAuto-Generate\nMonthly Dues"))
    P4_2(("4.2\nImport Dues\n(Excel/CSV)"))
    P4_3(("4.3\nView Dues\nRecords"))
    P4_4(("4.4\nPay Dues\n(GCash)"))
    P4_5(("4.5\nCompute\nDues Status"))

    A -->|"Generate command + target month"| P4_1
    P4_1 -->|"Fetch active residents"| D1
    P4_1 -->|"Check previous month credit"| D5
    P4_1 -->|"Create dues records"| D5
    P4_1 -->|"Compute status"| P4_5
    P4_1 -->|"Generation result (count)"| A

    A -->|"Excel/CSV rows"| P4_2
    P4_2 -->|"Match residents"| D1
    P4_2 -->|"Upsert dues records"| D5
    P4_2 -->|"Import summary"| A

    R -->|"View request"| P4_3
    P4_3 -->|"Read dues records"| D5
    P4_3 -->|"Dues list + status"| R
    A -->|"View request"| P4_3
    P4_3 -->|"All dues + filters"| A

    R -->|"Dues ID, amount, gcashRef"| P4_4
    P4_4 -->|"Read GCash config"| D8
    P4_4 -->|"Create transaction (pending)"| D6
    P4_4 -->|"Update amountPaid"| D5
    P4_4 -->|"Compute status"| P4_5
    P4_4 -->|"Payment result"| R

    P4_5 -->|"Status computation"| D5
```

### C.4 — Process 2.0: Listing Management (Decomposed)

```mermaid
graph TB
    R["👤 Resident"]
    A["🔑 Admin"]
    E["📧 Email Service"]
    D1[("D1: Users")]
    D2[("D2: Listings")]

    P2_1(("2.1\nSubmit\nListing"))
    P2_2(("2.2\nUpload Proof\nDocuments"))
    P2_3(("2.3\nAdmin\nReview"))
    P2_4(("2.4\nBrowse\nListings"))
    P2_5(("2.5\nArchive /\nUnarchive"))
    P2_6(("2.6\nResubmit\nRejected"))

    R -->|"Listing details, blockNo, lotNo"| P2_1
    P2_1 -->|"Verify block/lot in master index"| D1
    R -->|"Proof files"| P2_2
    P2_2 -->|"File paths"| P2_1
    P2_1 -->|"Create listing (pending)"| D2
    P2_1 -->|"Admin notification"| E
    P2_1 -->|"Listing result"| R

    A -->|"Approve / Reject + reason"| P2_3
    P2_3 -->|"Update verificationStatus"| D2
    P2_3 -->|"Review result"| A

    R -->|"Browse / Search"| P2_4
    P2_4 -->|"Read verified listings"| D2
    P2_4 -->|"Listing feed"| R

    A -->|"Archive/Unarchive request"| P2_5
    R -->|"Archive own listing"| P2_5
    P2_5 -->|"Update isArchived"| D2
    P2_5 -->|"Result"| A

    R -->|"New proof documents"| P2_6
    P2_6 -->|"Update proofDocuments, reset to pending"| D2
    P2_6 -->|"Resubmission result"| R
```
