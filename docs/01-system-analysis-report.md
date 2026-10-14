# Kumi System — Complete System Analysis Report

**Project:** Mabuhay Homes Community Portal (kumi-system-main)  
**Audit Date:** 2026-10-13  
**Auditor:** Comprehensive automated code analysis  
**System Type:** Subdivision / HOA Management Web Application  
**Technology Stack:** Next.js 16.3, React 19, MongoDB (Mongoose 9.9), TypeScript, TailwindCSS 4

---

## 1. Executive Summary

The Mabuhay Homes Community Portal is a full-stack web application for managing a homeowners' association (HOA) subdivision. After a **complete audit of every source file**, the system contains exactly **9 verified Mongoose collections (entities)** in MongoDB, **46 API route handlers**, **35 frontend pages**, and **10 reusable UI components**.

The previous ERD detection of 9 entities is **correct**. This is NOT an incomplete scan — the system genuinely has 9 database collections. The application is a mid-size project with moderate complexity, not a large enterprise system with 50+ tables. See the Entity Audit & Discrepancy Analysis (document #05: `05-entity-audit-and-comparison.md`) for the full explanation.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    NEXT.JS APPLICATION                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Frontend    │  │  API Routes  │  │   Server Auth    │   │
│  │  (React 19)  │──│  (46 routes) │──│ (Cookie Sessions)│   │
│  │  35 pages    │  │  app/api/**  │  │ lib/server-auth  │   │
│  └──────────────┘  └──────┬───────┘  └──────────────────┘   │
│                           │                                  │
│  ┌────────────────────────┴─────────────────────────────┐   │
│  │              Business Logic Layer (lib/)               │   │
│  │  db.ts | dues.ts | payment.ts | role.ts | mailer.ts   │   │
│  └────────────────────────┬─────────────────────────────┘   │
│                           │                                  │
│  ┌────────────────────────┴─────────────────────────────┐   │
│  │           Mongoose Models (models/index.ts)            │   │
│  │  9 Schemas: Listing, Amenity, Announcement, User,     │   │
│  │  Reservation, DuesRecord, Transaction, PaymentConfig,  │   │
│  │  PropertyViewing                                       │   │
│  └────────────────────────┬─────────────────────────────┘   │
└───────────────────────────┼──────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │   MongoDB     │
                    │  (Mongoose)   │
                    └───────────────┘
```

### External Services
| Service | Purpose | Integration Point |
|---------|---------|-------------------|
| **Google OAuth 2.0** | Google Sign-In for residents | `app/api/auth/google/route.ts`, `GOOGLE_CLIENT_ID` |
| **Gmail API (OAuth2)** | Production email delivery | `lib/mailer.ts` via `googleapis` package |
| **Nodemailer SMTP** | Local dev email fallback | `lib/mailer.ts` via Gmail SMTP |
| **Leaflet / OpenStreetMap** | Community & property maps | `components/CommunityMap.tsx`, `react-leaflet` |

---

## 3. Verified Database Entities (Collections)

| # | Collection Name | Mongoose Model | Description |
|---|----------------|----------------|-------------|
| 1 | `listings` | `Listing` | House/property listings for sale or rent |
| 2 | `amenities` | `Amenity` | Community amenities (pool, court, etc.) |
| 3 | `announcements` | `Announcement` | Community announcements & notices |
| 4 | `users` | `User` | Residents, admins, counselors, non-residents |
| 5 | `reservations` | `Reservation` | Amenity booking/reservation records |
| 6 | `duesrecords` | `DuesRecord` | Monthly dues billing & payment tracking |
| 7 | `transactions` | `Transaction` | Financial transaction records (all payment types) |
| 8 | `paymentconfigs` | `PaymentConfig` | GCash payment configuration per category |
| 9 | `propertyviewings` | `PropertyViewing` | Property viewing/inspection requests |

---

## 4. Module Inventory

### 4.1 Resident/User-Facing Modules

| Module | Pages | API Routes | Status |
|--------|-------|------------|--------|
| **Landing Page** | `/` (page.tsx) | — | ✅ Implemented |
| **Registration** | `/register` | `/api/auth/register` | ✅ Implemented |
| **Login** | `/login` | `/api/auth/login` | ✅ Implemented |
| **Google Sign-In** | (modal on login) | `/api/auth/google` | ✅ Implemented |
| **Email Verification** | `/verify-email` | `/api/auth/verify-email`, `/api/auth/resend-verification` | ✅ Implemented |
| **Forgot Password** | `/forgot-password` | `/api/auth/forgot-password` | ✅ Implemented |
| **Reset Password** | `/reset-password` | `/api/auth/reset-password` | ✅ Implemented |
| **Complete Profile** | `/complete-profile` | `/api/users/me` | ✅ Implemented |
| **Dashboard** | `/dashboard` | `/api/auth/me` | ✅ Implemented |
| **House Listings** | `/house-listing`, `/house/[id]` | `/api/listings` | ✅ Implemented |
| **Add Listing** | `/add-listing` | `/api/listings` (POST), `/api/listings/upload` | ✅ Implemented |
| **My Listings** | `/my-listings` | `/api/listings` (filtered) | ✅ Implemented |
| **Community Map** | `/map` | `/api/listings`, `/api/amenities` | ✅ Implemented |
| **Announcements** | `/announcements` | `/api/announcements` | ✅ Implemented |
| **Amenity Reservations** | `/reservation`, `/reservation/[id]`, `/reservation/[id]/confirm` | `/api/reservations`, `/api/reservations/availability` | ✅ Implemented |
| **My Dues** | `/my-dues` | `/api/dues`, `/api/dues/[id]/pay` | ✅ Implemented |
| **Payment History** | `/history` | `/api/transactions` | ✅ Implemented |
| **Contact HOA** | `/contact` | `/api/contact` | ✅ Implemented |
| **Rules & Regulations** | `/rules-and-regulations` | — (static) | ✅ Implemented |
| **Privacy Policy** | `/privacy-policy` | — (static) | ✅ Implemented |
| **Terms & Conditions** | `/terms-and-conditions` | — (static) | ✅ Implemented |
| **Newsletter** | (footer subscription) | `/api/newsletter` | ✅ Implemented |

### 4.2 Admin-Facing Modules

| Module | Page | API Routes | Status |
|--------|------|------------|--------|
| **Admin Dashboard** | `/admin` | aggregated data | ✅ Implemented |
| **Resident Management** | `/admin/residents` | `/api/users`, `/api/users/[id]`, `/api/users/[id]/archive` | ✅ Implemented |
| **Announcement Management** | `/admin/announcements` | `/api/announcements` | ✅ Implemented |
| **Listing Management** | `/admin/listings` | `/api/listings`, `/api/listings/[id]`, verification actions | ✅ Implemented |
| **Amenity Management** | `/admin/amenities` | `/api/amenities`, `/api/amenities/[id]`, archive | ✅ Implemented |
| **Amenity Archive** | `/admin/amenities/archive` | `/api/amenities/archived` | ✅ Implemented |
| **Reservation Management** | `/admin/reservations` | `/api/reservations`, `/api/reservations/[id]` | ✅ Implemented |
| **Monthly Dues Management** | `/admin/dues` | `/api/dues`, `/api/dues/import` | ✅ Implemented |
| **Payment Management** | `/admin/payments` | `/api/transactions`, `/api/payments/config` | ✅ Implemented |
| **Viewing Management** | `/admin/viewings` | `/api/viewings`, `/api/viewings/[id]` | ✅ Implemented |
| **Reports** | `/admin/reports` | aggregated queries | ✅ Implemented |
| **Archive (Multi-entity)** | `/admin/archive` | various archive endpoints | ✅ Implemented |

### 4.3 Authentication & Authorization

| Feature | Implementation | Notes |
|---------|---------------|-------|
| **Session Management** | Base64-encoded cookie (`kumi_session`) | `lib/server-auth.ts` |
| **Password Hashing** | bcrypt-style via `lib/password.ts` | `lib/password-validation.ts` for rules |
| **Role-Based Access** | 4 roles: `admin`, `counselor`, `resident`, `non_resident` | `lib/role.ts` |
| **HOWA Guard** | Server-side role verification | `howaGuardAsync()` in `lib/role.ts` |
| **Google OAuth** | Google Identity Services (One Tap / button) | `components/GoogleSignInButton.tsx` |
| **Email Verification** | Token-based with 24h expiry | Stored in `User.verificationToken` |
| **Password Reset** | Token-based with 1h expiry | Stored in `User.resetToken` |

### 4.4 Super Admin

The system does **not** have a separate super admin role or module. The `admin` role serves as the highest privilege level. The `counselor` role has limited admin capabilities (can manage listings and residents, but routing suggests reduced scope). There is no dedicated super admin authentication, role management, or system configuration panel.

---

## 5. Complete API Route Inventory

### Authentication (9 routes)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register new account |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/google` | Google OAuth login |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/verify-email` | Verify email token |
| POST | `/api/auth/resend-verification` | Resend verification email |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Execute password reset |

### Listings (8 routes)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/listings` | List all/filtered listings |
| POST | `/api/listings` | Create new listing |
| GET | `/api/listings/[id]` | Get single listing |
| PATCH | `/api/listings/[id]` | Update/review listing |
| DELETE | `/api/listings/[id]` | Delete listing |
| POST | `/api/listings/upload` | Upload proof documents |
| GET | `/api/listings/archived` | Get archived listings |
| GET | `/api/listings/master-index` | Get block/lot index |
| POST/DEL | `/api/listings/[id]/archive` | Archive/unarchive listing |

### Amenities (7 routes)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/amenities` | List active amenities |
| POST | `/api/amenities` | Create amenity |
| GET | `/api/amenities/archived` | List archived amenities |
| GET/PATCH/DEL | `/api/amenities/[id]` | CRUD single amenity |
| POST | `/api/amenities/upload` | Upload amenity image |
| POST/DEL | `/api/amenities/[id]/archive` | Archive/unarchive |

### Users (6 routes)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/users` | List active users |
| POST | `/api/users` | Create user (admin) |
| GET | `/api/users/archived` | List archived users |
| PATCH | `/api/users/me` | Update own profile |
| GET/PATCH/DEL | `/api/users/[id]` | CRUD single user |
| POST/DEL | `/api/users/[id]/archive` | Archive/unarchive |

### Reservations (4 routes)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/reservations` | List all reservations |
| POST | `/api/reservations` | Create reservation + transaction |
| GET | `/api/reservations/availability` | Check date availability |
| PATCH | `/api/reservations/[id]` | Approve/reject reservation |

### Dues (4 routes)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/dues` | List dues (auto-generates current month) |
| POST | `/api/dues` | Generate dues / create manual record |
| POST | `/api/dues/import` | Import Excel/CSV dues data |
| POST | `/api/dues/[id]/pay` | Pay a specific dues record |

### Transactions (5 routes)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/transactions` | List transactions (filtered) |
| GET/PATCH/DEL | `/api/transactions/[id]` | CRUD single transaction |
| POST/DEL | `/api/transactions/[id]/archive` | Archive/unarchive |

### Payments (5 routes)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/PUT | `/api/payments/config` | GCash configuration |
| POST | `/api/payments/upload` | Upload payment receipt |
| POST | `/api/payments/webhook` | Payment webhook handler |
| GET | `/api/payments/[intentId]` | Get payment by intent |
| POST | `/api/payments/[intentId]/confirm` | Confirm GCash payment |

### Viewings (3 routes)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/viewings` | List all / create viewing |
| GET | `/api/viewings/my` | Get own viewings (resident) |
| PATCH | `/api/viewings/[id]` | Update viewing status |

### Other (2 routes)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/contact` | Send contact HOA email |
| POST | `/api/newsletter` | Subscribe to newsletter |

---

## 6. Email System Workflows

The system sends the following types of emails via `lib/mailer.ts`:

1. **Verification Email** — sent on registration, contains token-based verify link
2. **Password Reset Email** — sent on forgot-password, contains token-based reset link
3. **Google-Only Account Notice** — sent when password reset is requested for a Google-only account
4. **Contact HOA Email** — forwards resident inquiry to admin
5. **Admin Listing Notification** — alerts admin of new/updated listing requiring verification
6. **Newsletter Welcome** — sent when someone subscribes to the newsletter

---

## 7. Data Storage

- **Database:** MongoDB via Mongoose ODM
- **File Uploads:** Stored in `public/uploads/` directory (Base64 data URIs for images, file-system paths for documents)
- **Session Storage:** HTTP-only cookie (`kumi_session`) with Base64-encoded JSON payload
- **Client State:** `localStorage` key `mh_user` for client-side auth state caching

---

## 8. Key Business Workflows

1. **Listing Submission → Verification → Publication**: Resident submits listing with proof documents → Admin reviews → Approves/Rejects → Published on public feed
2. **Amenity Reservation → Payment → Approval**: Resident selects amenity/date → GCash payment intent created → Transaction recorded → Receipt uploaded → Admin approves
3. **Monthly Dues Generation → Payment → Status**: System auto-generates dues for all active residents → Resident pays via GCash → Transaction created → Admin verifies → Status updated (on_time/delayed/advance)
4. **Property Viewing Request → Scheduling → Completion**: Resident requests viewing → Admin schedules → Viewing completed/declined
5. **Registration → Email Verification → Profile Completion → Role Assignment**: User registers → Verification email sent → User verifies → Completes profile → Admin may upgrade role from non_resident to resident
