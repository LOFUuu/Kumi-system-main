# Entity Audit & Discrepancy Analysis — Why Exactly 9 Entities?

**Project:** Mabuhay Homes Community Portal (`kumi-system-main`)  
**Audit Date:** 2026-10-13  
**Auditor:** Comprehensive System & Database Audit  

---

## 1. Executive Answer to the User's Concern

> **User's Concern:**  
> *"Currently, my generated ERD detects only 9 entities. I am concerned that this may not represent the entire system... I have seen other projects with more than 50 entities. Could my system have additional hidden entities, tables, or data structures?"*

### The Verdict:
**Your system genuinely has exactly 9 database entities (MongoDB collections).**  
This is **NOT a scanner error**, nor is it an incomplete audit. 

The reason other systems have 50+ entities while yours has 9 is due to **architectural paradigm differences**:
1. **Document Database (MongoDB) vs. 3NF Relational Database (SQL/PostgreSQL/MySQL)**
2. **Embedded Subdocuments vs. Separate Join Tables**
3. **Denormalization vs. Foreign Key Normalization**
4. **Stateless / File-system Storage vs. Database-backed Storage** (e.g. sessions in cookies, uploads on disk)

---

## 2. Complete Inventory of System Data Stores

Across the entire codebase, all persistent and transient data storage mechanisms were audited:

| Storage Type | Mechanism | Location in Code | Count |
|--------------|-----------|------------------|-------|
| **MongoDB Collections** | Mongoose Models | `models/index.ts` | **9** |
| **Embedded Subdocuments** | Nested Objects/Arrays inside Documents | `Listing.images`, `Transaction.payment` | **2 patterns** |
| **Transient Session Store** | Base64 HTTP-Only Cookies | `lib/server-auth.ts` (`kumi_session`) | 1 (Not DB) |
| **Client Cache** | Browser `localStorage` | `mh_user` key | 1 (Not DB) |
| **File System Storage** | Disk Directory | `public/uploads/` | Files on disk |
| **In-Memory Master Index** | Static JSON / Arrays | `app/api/listings/master-index/` | Hardcoded subdivision map |

---

## 3. The 9 Verified MongoDB Collections

Every model registered in `models/index.ts` and connected via `lib/mongoose.ts`:

1. **`User`** (`users` collection) — Stores admins, counselors, residents, and non-residents, along with auth hashes, reset tokens, and household details.
2. **`Listing`** (`listings` collection) — Property sale/rent listings, proof-of-ownership documents, verification status, and geolocation coordinates.
3. **`Amenity`** (`amenities` collection) — Clubhouse, basketball court, swimming pool, gazebos, rules, pricing, and operating hours.
4. **`Reservation`** (`reservations` collection) — Bookings of subdivision amenities, time slots, guest counts, and approval workflows.
5. **`DuesRecord`** (`duesrecords` collection) — Monthly HOA dues tracking per resident, due dates, payment status, penalty calculations, and import logs.
6. **`Transaction`** (`transactions` collection) — Financial ledgers for amenity payments, monthly dues payments, GCash reference numbers, and admin approvals.
7. **`PropertyViewing`** (`propertyviewings` collection) — Resident and client requests to view properties on-site.
8. **`Announcement`** (`announcements` collection) — Community bulletins, news, event notices, and priority alerts.
9. **`PaymentConfig`** (`paymentconfigs` collection) — Singleton configuration holding the HOA GCash account name, mobile number, and active QR code.

---

## 4. Why an Enterprise RDBMS Equivalent Has 35–50+ Tables

If this exact same Kumi System were built using a traditional Relational Database (PostgreSQL / MySQL) adhering to Third Normal Form (3NF), the 9 MongoDB collections would decompose into **38 distinct relational tables**:

```
MongoDB (Kumi System)                  Equivalent Relational 3NF (PostgreSQL / MySQL)
─────────────────────────────          ──────────────────────────────────────────────────
1. User ─────────────────────────────►  1. users (core account)
                                        2. user_roles (role junction / enum table)
                                        3. user_profiles (personal & household details)
                                        4. user_addresses (block, lot, street)
                                        5. user_auth_tokens (email verification & reset tokens)
                                        6. user_archives (archive audit log)
                                        7. user_identification (cedula, IDs)

2. Listing ──────────────────────────►  8. property_listings
                                        9. listing_types (lookup table: sale vs rent)
                                       10. listing_statuses (lookup table)
                                       11. listing_images (one-to-many child table)
                                       12. listing_verification_documents (proof files)
                                       13. listing_verification_history (admin review audits)
                                       14. listing_locations (geo coordinates & addresses)

3. Amenity ──────────────────────────► 15. amenities (core details)
                                       16. amenity_schedules (operating hours per day)
                                       17. amenity_pricing_tiers (rates, deposits)
                                       18. amenity_rules (rules & terms)
                                       19. amenity_images (photo gallery)

4. Reservation ──────────────────────► 20. amenity_reservations
                                       21. reservation_time_slots (start/end intervals)
                                       22. reservation_status_history (pending/confirmed/cancelled)
                                       23. reservation_attendees (guest counts & logs)

5. DuesRecord ───────────────────────► 24. monthly_dues_schedules (master billing cycles)
                                       25. resident_dues_ledger (individual due items)
                                       26. dues_penalties (calculated late fee records)
                                       27. dues_import_batches (CSV/Excel import audits)
                                       28. dues_advance_credits (balance rollover ledger)

6. Transaction ──────────────────────► 29. financial_transactions (general ledger)
                                       30. payment_intents (intent lifecycle)
                                       31. gcash_payment_details (ref #, screenshot URL)
                                       32. payment_allocations (link transaction to dues or reservation)
                                       33. transaction_receipts (receipt metadata)
                                       34. transaction_archives (archived transactions)

7. PropertyViewing ──────────────────► 35. property_viewing_requests
                                       36. viewing_schedules (date/time assignments)

8. Announcement ─────────────────────► 37. community_announcements

9. PaymentConfig ────────────────────► 38. hoa_payment_configurations
```

### Why MongoDB Compressed 38 Tables into 9 Collections:
1. **Arrays in Documents:** Instead of a `listing_images` table with foreign key `listing_id`, MongoDB stores `images: [String]` directly inside the `Listing` document.
2. **Embedded Objects:** Instead of a separate `gcash_payments` table, MongoDB embeds `{ method, referenceNumber, receiptUrl, status }` directly inside `Transaction.payment`.
3. **Denormalization:** Instead of joining `users` to get `fullName` on every query, `residentName`, `ownerName`, and `contactEmail` are stored alongside the transaction and listing records.
4. **Token Storage inside User:** Instead of a `user_tokens` table, `verificationToken`, `verificationTokenExpiry`, `resetToken`, and `resetTokenExpiry` are simple fields in the `User` document.

---

## 5. Potential "Ghost" Entities Checked & Disproven

During the audit, we searched for whether any of the following features had dedicated database entities:

| Feature / Domain | Code Check Result | Where is it actually stored? |
|------------------|-------------------|-----------------------------|
| **Sessions** | ❌ No `Session` table | Stored in HTTP-only cookie (`kumi_session`), stateless JWT/Base64. |
| **Audit Logs** | ❌ No `AuditLog` table | Embedded directly as `adminNotes`, `rejectionReason`, or `archiveReason` within each entity. |
| **Notification Queue** | ❌ No `Notifications` table | Sent instantly in real-time via `lib/mailer.ts` (Nodemailer / Gmail API). No database queue. |
| **Contact Inquiries** | ❌ No `Inquiries` table | Form at `/api/contact` sends an immediate email to HOA admin; does not save to MongoDB. |
| **Newsletter List** | ❌ No `Subscribers` table | Form at `/api/newsletter` triggers a welcome email; does not persist subscribers to DB. |
| **Chat / Messages** | ❌ No `Messages` table | Uses direct Messenger link (`ownerMessengerLink`) or phone number (`ownerContactNumber`). |
| **Subdivision Map Lots** | ❌ No `Lots` or `Blocks` table | Geocoded and rendered via static GeoJSON / coordinates in `components/CommunityMap.tsx`. |

---

## 6. Audit Conclusion & Recommendations

1. **The 9 entities detected in your system are 100% accurate and complete.**
2. There are **zero missing collections** in your MongoDB database.
3. If your capstone panel, professor, or client asks why your system has 9 entities while other enterprise systems have 50+:
   - You can explain with high technical authority that **MongoDB is a document-oriented database** utilizing embedding and denormalization.
   - You can present the **38-table Relational Decomposition** (Section 4 above) to demonstrate how the Kumi System maps to a classical enterprise schema.
