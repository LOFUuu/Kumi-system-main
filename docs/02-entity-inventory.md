# Entity Inventory — Verified Database Collections

**Project:** Mabuhay Homes Community Portal  
**Source:** `models/index.ts` (single file, all 9 schemas)  
**Database:** MongoDB via Mongoose 9.9  
**Audit Date:** 2026-10-13

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Verified Collections** | **9** |
| **Total Fields (across all entities)** | **~120** |
| **Entities with Timestamps** | 9 (all use `{ timestamps: true }`) |
| **Entities with Archive Support** | 4 (User, Listing, Amenity, Transaction) |
| **Junction Tables** | 0 (no explicit M:N junction tables) |

---

## Entity Details

### 1. User (`users` collection)

**Purpose:** Stores all user accounts — residents, admins, counselors, and non-residents.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | Mixed | ✅ | Auto-incremented integer |
| `fullName` | String | ✅ | |
| `email` | String | ✅ | Unique (enforced by app logic) |
| `role` | String (enum) | ✅ | `admin`, `counselor`, `resident`, `non_resident` |
| `isActive` | Boolean | | Default: `true` |
| `address` | String | | |
| `blockNo` | String | | Subdivision block number |
| `lotNo` | String | | Subdivision lot number |
| `phone` | String | | |
| `gender` | String | | |
| `householdMembers` | Number | | |
| `householdHead` | String | | |
| `password` | String | | Legacy field (unused, kept for migration) |
| `passwordHash` | String | | Bcrypt hash |
| `resetToken` | String | | Password reset token hash |
| `resetTokenExpiry` | Date | | Token expiry timestamp |
| `emailVerified` | Boolean | | |
| `verificationToken` | String | | Email verification token hash |
| `verificationTokenExpiry` | Date | | Token expiry timestamp |
| `cedula` | String | | Community tax certificate ID |
| `isArchived` | Boolean | | Default: `false` |
| `archiveReason` | String | | |
| `archivedAt` | String | | ISO date |
| `createdAt` | Date | | Auto (timestamps) |
| `updatedAt` | Date | | Auto (timestamps) |

---

### 2. Listing (`listings` collection)

**Purpose:** House/property listings for sale or rent within the subdivision.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | Number | ✅ | Auto-incremented |
| `houseName` | String | ✅ | |
| `address` | String | ✅ | |
| `blockNo` | String | | From master index |
| `lotNo` | String | | From master index |
| `price` | Number | ✅ | |
| `listingType` | String (enum) | ✅ | `sale`, `rent` |
| `bedrooms` | Number | | |
| `bathrooms` | Number | | |
| `sqm` | Number | | |
| `status` | String (enum) | ✅ | `available`, `reserved`, `sold`, `off_market` |
| `transactionStatus` | String (enum) | | `available`, `reserved`, `sold_rented`, `sold` |
| `ownerContactNumber` | String | | |
| `ownerMessengerLink` | String | | |
| `description` | String | | |
| `ownerId` | Number | | References User._id |
| `ownerName` | String | | Denormalized |
| `images` | [String] | | Base64 data URIs or URLs |
| `lat` | Number | | Map latitude |
| `lng` | Number | | Map longitude |
| `verificationStatus` | String (enum) | | `pending`, `verified`, `rejected` |
| `proofDocuments` | [String] | | File paths |
| `rejectionReason` | String | | |
| `uploadedBy` | Number | | References User._id |
| `showOnMap` | Boolean | | Default: `true` |
| `siteVisitRecommended` | Boolean | | Default: `false` |
| `isArchived` | Boolean | | Default: `false` |
| `archiveReason` | String | | |
| `archivedBy` | String | | `owner` or `admin` |
| `archivedAt` | String | | ISO date |
| `createdAt` | Date | | Auto (timestamps) |
| `updatedAt` | Date | | Auto (timestamps) |

---

### 3. Amenity (`amenities` collection)

**Purpose:** Community amenities (swimming pool, covered court, etc.) available for reservation.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | Number | ✅ | Auto-incremented |
| `name` | String | ✅ | |
| `description` | String | | |
| `maxCapacity` | Number | | Default: 50 |
| `rateWalkin` | Number | | Public day rate per head |
| `rateWhole` | Number | | Public night rate per head |
| `ratePrivate` | Number | | Private flat rate |
| `downpayment` | Number | | Public downpayment. Default: 200 |
| `downpaymentPrivate` | Number | | Private downpayment. Default: 500 |
| `isActive` | Boolean | | Default: `true` |
| `isArchived` | Boolean | | Default: `false` |
| `image` | String | | URL or data URI |
| `lat` | Number | | Map latitude |
| `lng` | Number | | Map longitude |
| `createdAt` | Date | | Auto (timestamps) |
| `updatedAt` | Date | | Auto (timestamps) |

---

### 4. Announcement (`announcements` collection)

**Purpose:** Community announcements and notices posted by admins/counselors.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | Number | ✅ | Auto-incremented |
| `title` | String | ✅ | |
| `content` | String | | |
| `postDate` | String | | ISO date |
| `status` | String (enum) | ✅ | `active`, `archived` |
| `poster` | String | | Name of who posted |
| `createdAt` | Date | | Auto (timestamps) |
| `updatedAt` | Date | | Auto (timestamps) |

---

### 5. Reservation (`reservations` collection)

**Purpose:** Amenity booking/reservation records created by residents.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | Number | ✅ | Auto-incremented |
| `amenityId` | Number | | References Amenity._id |
| `amenityName` | String | | Denormalized |
| `residentName` | String | | Denormalized from User |
| `phone` | String | | |
| `bookingType` | String (enum) | ✅ | `day`, `night` |
| `reservationType` | String (enum) | ✅ | `public`, `private` |
| `date` | String | | ISO date |
| `paxCount` | Number | | Default: 1 |
| `downpayment` | Number | | Default: 0 |
| `totalAmount` | Number | | Default: 0 |
| `status` | String (enum) | ✅ | `pending`, `approved`, `declined` |
| `notes` | String | | |
| `userEmail` | String | | References User.email |
| `approvedAt` | String | | ISO date |
| `gcashRef` | String | | GCash reference number |
| `receiptPath` | String | | File path to uploaded receipt |
| `createdAt` | Date | | Auto (timestamps) |
| `updatedAt` | Date | | Auto (timestamps) |

---

### 6. DuesRecord (`duesrecords` collection)

**Purpose:** Monthly dues billing and payment tracking per resident per billing cycle.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | Number | ✅ | Auto-incremented |
| `residentId` | Number | | Index. References User._id |
| `residentName` | String | ✅ | Index. Denormalized |
| `blockNo` | String | | |
| `lotNo` | String | | |
| `dueMonth` | String | ✅ | Index. Format: `YYYY-MM` |
| `dueDate` | String | | ISO date |
| `amountDue` | Number | | Default: 100 |
| `amountPaid` | Number | | Default: 0 |
| `paidAt` | String | | ISO date |
| `creditBalance` | Number | | Default: 0. Overpayment carried forward |
| `status` | String (enum) | ✅ | `paid`, `unpaid`, `delayed`, `advance`, `on_time` |
| `source` | String (enum) | | `imported`, `system`, `manual` |
| `billingMonth` | String | | e.g. "September" |
| `billingYear` | Number | | e.g. 2026 |
| `createdAt` | Date | | Auto (timestamps) |
| `updatedAt` | Date | | Auto (timestamps) |

**Indexes:** `{ residentName: 1, dueMonth: 1 }` (compound, non-unique)

---

### 7. Transaction (`transactions` collection)

**Purpose:** Financial transaction records for all payment types (amenity, dues, listing).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | Number | ✅ | Auto-incremented |
| `residentName` | String | | Denormalized |
| `refType` | String (enum) | | `amenity`, `dues`, `listing` |
| `refId` | Number | | References Reservation._id or DuesRecord._id |
| `userEmail` | String | | |
| `amount` | Number | | |
| `paymentMethod` | String (enum) | | `cash`, `gcash`. Default: `gcash` |
| `gcashRef` | String | | GCash reference number |
| `receiptPath` | String | | File path to receipt |
| `status` | String (enum) | ✅ | `approved`, `pending`, `voided` |
| `createdAt` | String | | ISO date (manual + auto) |
| `payment` | Object | | Nested GCash payment details |
| `payment.provider` | String | | Default: `gcash` |
| `payment.intentId` | String | | Unique payment intent ID |
| `payment.qrPayload` | String | | QR code data |
| `payment.status` | String (enum) | | `awaiting_payment`, `paid`, `expired`, `failed` |
| `payment.paidAt` | String | | |
| `payment.gcashRef` | String | | |
| `isArchived` | Boolean | | Default: `false` |
| `archiveReason` | String | | |
| `archivedBy` | String | | |
| `archivedAt` | String | | |
| `updatedAt` | Date | | Auto (timestamps) |

---

### 8. PaymentConfig (`paymentconfigs` collection)

**Purpose:** GCash payment configuration per category (amenity vs. dues). Stores account details, QR code, and instructions.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | ✅ | Auto-generated |
| `category` | String (enum) | ✅ | `amenity`, `dues`. Unique. |
| `accountName` | String | | Default: "MABUHAY HOMES HOA" |
| `accountNumber` | String | | Default: "0917 123 4567" |
| `qrCodeUrl` | String | | URL or data URI for QR code image |
| `instructions` | String | | Payment instructions text |
| `isActive` | Boolean | | Default: `true` |
| `updatedBy` | String | | Default: "Admin" |
| `createdAt` | Date | | Auto (timestamps) |
| `updatedAt` | Date | | Auto (timestamps) |

---

### 9. PropertyViewing (`propertyviewings` collection)

**Purpose:** Property viewing/inspection requests submitted by residents for listed properties.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | Number | ✅ | Auto-incremented |
| `listingId` | Number | ✅ | Index. References Listing._id |
| `listingName` | String | ✅ | Denormalized |
| `residentName` | String | ✅ | Denormalized |
| `residentEmail` | String | ✅ | Index. References User.email |
| `preferredDate` | String | ✅ | ISO date |
| `preferredTime` | String | ✅ | e.g. "10:00" |
| `message` | String | | |
| `status` | String (enum) | ✅ | `viewing_requested`, `viewing_scheduled`, `viewing_completed`, `viewing_declined` |
| `adminNotes` | String | | |
| `scheduledAt` | String | | ISO date |
| `createdAt` | Date | | Auto (timestamps) |
| `updatedAt` | Date | | Auto (timestamps) |
