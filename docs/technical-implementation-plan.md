# LunchLink Technical Implementation Plan

**Version:** 1.0  
**Status:** Architecture & planning (no implementation)  
**Stack:** Next.js 15 · React · TypeScript · Tailwind CSS · shadcn/ui · Supabase · Flutterwave · Leaflet.js · OpenStreetMap

---

## Document Purpose

This plan translates the [Platform Architecture](./platform-architecture.md) and [Design System](./design-system.md) into a concrete technical blueprint. It defines how LunchLink will be built, deployed, and secured before any application code is written.

---

## 1. System Architecture

### 1.1 High-Level Overview

LunchLink is a multi-portal, university-scoped meal subscription platform. Four distinct application surfaces share one backend:

| Surface | Audience | Primary Purpose |
| ------- | -------- | --------------- |
| Public Website | Prospective students & restaurants | Marketing, registration, onboarding |
| Student Portal | Enrolled students | Meal plans, digital card, discovery, wallet |
| Restaurant Portal | Partner restaurant staff | QR redemption, menu/extras, payouts |
| Admin Portal | LunchLink operators | Approvals, financials, fraud, configuration |

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Client Layer (Next.js 15)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ Public Site  │ │   Student    │ │  Restaurant  │ │    Admin     │     │
│  │   (SSG/ISR)  │ │    Portal    │ │    Portal    │ │    Portal    │     │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘     │
└─────────┼────────────────┼────────────────┼────────────────┼───────────┘
          │                │                │                │
          └────────────────┴────────┬───────┴────────────────┘
                                    │
                    ┌───────────────▼────────────────┐
                    │     Supabase Platform          │
                    │  ┌──────────────────────────┐  │
                    │  │ PostgreSQL + RLS         │  │
                    │  │ Auth (JWT + roles)       │  │
                    │  │ Edge Functions (API)     │  │
                    │  │ Realtime (notifications) │  │
                    │  │ Storage (photos)         │  │
                    │  │ pg_cron (payouts, QR)    │  │
                    │  └──────────────────────────┘  │
                    └───────────────┬────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
   ┌──────▼──────┐          ┌───────▼───────┐         ┌───────▼───────┐
   │ Flutterwave │          │  SMS / Email  │         │ OpenStreetMap │
   │ Mobile Money│          │   Providers   │         │  (via Leaflet)│
   └─────────────┘          └───────────────┘         └───────────────┘
```

### 1.2 Core Domain Concepts

| Concept | Definition | Visibility |
| ------- | ---------- | ---------- |
| Meal Swipe | Unit redeemable for one complete meal (any sauce) | Student balance only; no per-meal price |
| LunchCredit | Wallet currency for extras (soda, chapati, etc.) | Balance + extras prices visible |
| Sauce | Daily menu item with **internal cost** (restaurant/admin only) | Availability visible to students |
| Extra | Add-on with **public price** | Price visible to students |
| Campus Lock | Data and services scoped to student's university | Enforced at API and RLS layers |

### 1.3 Critical Business Rules (System-Level)

1. **Price opacity for students** — No API response, UI component, or log exposed to student role may include sauce internal costs or meal plan unit economics beyond swipe/credit counts.
2. **Photo gate** — Students without an approved photo cannot redeem or purchase; portal shows limited "pending approval" state.
3. **Single-use dynamic QR** — Each QR token expires at 2 minutes OR upon successful redemption, whichever comes first.
4. **Redemption atomicity** — Swipe deduction, optional credit deduction, and transaction record must succeed or roll back together.
5. **University isolation** — Students see only restaurants, plans, and transactions for their assigned university.

### 1.4 Module Map (MVP Phase 1)

| Module | Phase | Dependencies |
| ------ | ----- | ------------ |
| Public website & registration | 1 | Auth, Universities |
| Student dashboard & digital card | 1 | Auth, Wallets, QR service |
| Meal plan purchase (Flutterwave) | 1 | Payments, Wallets |
| QR redemption (restaurant scanner) | 1 | QR service, Transactions |
| Extras + LunchCredits | 1 | Wallets, Restaurant extras |
| Admin: photo approval, student/restaurant mgmt | 1 | Auth, Storage |
| Restaurant meal/extras management | 1 | Sauces, Extras tables |
| Interactive map & filters | 2 | Geolocation, Restaurant locations |
| Push notifications | 2 | Realtime / FCM |
| Automated weekly payouts | 2 | pg_cron, Payout engine |
| Multi-university expansion features | 3 | — |

### 1.5 Cross-Cutting Concerns

| Concern | Approach |
| ------- | -------- |
| Audit logging | Immutable `audit_events` table; all redemption and payment mutations logged |
| Idempotency | Payment webhooks and redemption requests carry idempotency keys |
| Rate limiting | Edge Functions + Supabase API limits; QR generation throttled per student |
| Observability | Structured logs from Edge Functions; error tracking (e.g. Sentry) on Next.js |
| File storage | Supabase Storage bucket `student-photos` with signed URLs for restaurant verification |

---

## 2. Frontend Architecture

### 2.1 Application Structure (Next.js 15 App Router)

Monorepo-style single Next.js application with route groups and role-based layouts:

```
app/
├── (public)/                    # Marketing site — SSG where possible
│   ├── page.tsx                 # Home
│   ├── about/
│   ├── how-it-works/
│   ├── restaurants/
│   ├── universities/
│   ├── meal-plans/
│   ├── faq/
│   ├── contact/
│   ├── register/
│   │   ├── student/
│   │   └── restaurant/
│   └── login/
│
├── (student)/                   # Student portal — authenticated
│   ├── layout.tsx               # Student shell + nav
│   ├── dashboard/
│   ├── card/                    # Digital student card + QR
│   ├── map/                     # Restaurant discovery (Phase 2)
│   ├── meal-plans/
│   ├── wallet/                  # LunchCredits
│   ├── transactions/
│   ├── notifications/
│   ├── profile/
│   └── support/
│
├── (restaurant)/                # Restaurant portal
│   ├── layout.tsx
│   ├── dashboard/
│   ├── scan/                    # QR scanner (camera API)
│   ├── meals/                   # Sauces, daily menu, internal pricing
│   ├── extras/
│   ├── transactions/
│   ├── staff/
│   ├── payouts/
│   └── settings/
│
├── (admin)/                     # Admin portal
│   ├── layout.tsx
│   ├── dashboard/
│   ├── students/
│   ├── restaurants/
│   ├── universities/
│   ├── meal-plans/
│   ├── transactions/
│   ├── financials/
│   ├── payouts/
│   ├── fraud/
│   └── settings/
│
├── api/                         # Next.js Route Handlers (BFF layer)
│   ├── webhooks/
│   │   └── flutterwave/
│   └── auth/
│       └── callback/
│
└── middleware.ts                # Auth + role + campus lock routing
```

### 2.2 Rendering Strategy

| Surface | Strategy | Rationale |
| ------- | -------- | --------- |
| Public marketing pages | SSG / ISR (revalidate 1h) | Performance, SEO |
| Student dashboard, card, wallet | SSR + client hydration | Fresh balances, secure QR |
| Restaurant scanner | Client-only (dynamic import) | Camera API, no SSR |
| Admin tables | SSR initial + client pagination | Large datasets |
| Map view | Client-only (Leaflet) | Browser geolocation |

### 2.3 Component Architecture

```
components/
├── ui/                          # shadcn/ui primitives (customized tokens)
├── layout/                      # Shell, nav, sidebar per portal
├── cards/                       # Restaurant, MealPlan, Wallet, Stats, Notification
├── forms/                       # Registration, payment, menu management
├── student/                     # Digital card, QR display, balance widgets
├── restaurant/                  # Scanner, redemption wizard, sauce picker
├── admin/                       # Approval queues, financial tables
└── map/                         # Leaflet map, pins, filters
```

**Composition rules:**

- Portal-specific components never import from other portal folders (shared UI only via `components/ui` and `lib/`).
- Price-sensitive fields wrapped in `<RoleGuard allowed={['restaurant_manager', 'admin']}>` — component returns `null` for unauthorized roles; server must also enforce.
- All monetary and swipe displays use the design system's **numerical emphasis** styling (bold, large, Deep Charcoal).

### 2.4 State Management

| State Type | Solution |
| ---------- | -------- |
| Server data (plans, restaurants, balances) | TanStack Query (React Query) + Supabase client |
| Auth session | Supabase Auth listener + React context |
| QR countdown timer | Local component state + `setInterval`; refetch token at expiry |
| Scanner / redemption wizard | Zustand store (ephemeral multi-step flow) |
| Form state | React Hook Form + Zod validation |
| Map filters | URL search params (shareable, back-button friendly) |

### 2.5 Design System → Tailwind Mapping

Extend `tailwind.config.ts` with LunchLink tokens from the design system:

| Token | CSS Variable | Value |
| ----- | ------------ | ----- |
| `--color-primary` | Sage Green | `#C8E6A0` |
| `--color-background` | Warm Cream | `#F5F0E8` |
| `--color-card` | Pure White | `#FFFFFF` |
| `--color-foreground` | Deep Charcoal | `#1A1A1A` |
| `--color-muted` | Muted Gray | `#888888` |
| `--color-success` | — | `#4CAF50` |
| `--color-warning` | — | `#F4B400` |
| `--color-destructive` | — | `#E53935` |
| `--radius-sm` | 12px | Buttons/inputs use `--radius-md` (20px) |
| `--radius-md` | 20px | |
| `--radius-lg` | 28px | Cards |
| `--radius-xl` | 36px | Modals |

**shadcn/ui customization:**

- Primary button: Deep Charcoal bg, white text (not default shadcn primary).
- Secondary button: Sage Green bg, Deep Charcoal text.
- Card component: 28px radius, subtle shadow `0 4px 12px rgba(0,0,0,0.06)`.
- Font: Inter (headings 700–800, body 400).
- Icons: Lucide (rounded style, consistent 20–24px).

### 2.6 Mobile-First & Accessibility

- Minimum touch target: 44×44px on all interactive elements.
- Bottom navigation for student portal on mobile; sidebar on desktop.
- QR card optimized for portrait mobile viewport (primary redemption surface).
- WCAG AA contrast verified for Sage Green on Warm Cream (use Deep Charcoal text on accent backgrounds).
- Focus rings on all shadcn interactive components; scanner flow fully keyboard-accessible where camera unavailable (manual ID fallback for admin only).

---

## 3. Backend Architecture

### 3.1 Supabase as Backend Platform

Supabase provides the full backend; custom logic lives in Edge Functions (Deno) and PostgreSQL (functions, triggers, RLS).

| Supabase Service | LunchLink Usage |
| ---------------- | --------------- |
| PostgreSQL | Primary data store, business logic via SQL functions |
| Auth | User identity, JWT, magic link / email+password |
| Row Level Security | Campus lock, role-based data access |
| Edge Functions | Payments, QR generation, redemption, payouts, webhooks |
| Realtime | Live balance updates, notification feed (Phase 2) |
| Storage | Student photos, restaurant logos |
| pg_cron | QR token cleanup, weekly payout job, plan expiry reminders |

### 3.2 Logic Placement Matrix

| Operation | Where | Why |
| --------- | ----- | --- |
| CRUD on menus, extras, profile | Direct Supabase client + RLS | Simple, low latency |
| QR token generation | Edge Function `generate-qr-token` | Cryptographic signing, server clock |
| QR validation & redemption | Edge Function `redeem-meal` | Atomic multi-table transaction |
| Flutterwave charge initiation | Edge Function `initiate-payment` | Secret keys never on client |
| Flutterwave webhook processing | Edge Function `flutterwave-webhook` | Signature verification, idempotency |
| Weekly payout calculation | Edge Function `calculate-payouts` + pg_cron | Batch job, admin-triggered override |
| Photo approval side effects | DB trigger + Edge Function | Notify student on approval/rejection |
| Student- cost queries | RLS policy + role check | Never leak to student JWT |

### 3.3 Edge Function Catalog (MVP)

| Function | Method | Auth | Description |
| -------- | ------ | ---- | ----------- |
| `generate-qr-token` | POST | Student JWT | Mint signed QR payload, store in `qr_tokens` |
| `validate-qr-token` | POST | Restaurant staff JWT | Parse + verify token, return student preview |
| `redeem-meal` | POST | Restaurant staff JWT | Full redemption flow (swipe + optional extras) |
| `initiate-payment` | POST | Student JWT | Create Flutterwave charge, return payment link/STK ref |
| `flutterwave-webhook` | POST | Webhook signature | Confirm payment, credit wallet/plan |
| `top-up-credits` | POST | Student JWT | Initiate LunchCredits top-up via Flutterwave |
| `calculate-payouts` | POST | Admin JWT / cron | Generate weekly payout records |
| `send-notification` | POST | Internal | Dispatch SMS/email/push for events |

### 3.4 Transaction Integrity Pattern

Redemption and payment flows use PostgreSQL transactions inside Edge Functions:

```
BEGIN
  → Lock student wallet row (FOR UPDATE)
  → Validate QR token (unused, unexpired, matching student)
  → Deduct 1 swipe (or reject if insufficient)
  → Deduct LunchCredits for extras (if any)
  → Insert transaction record(s)
  → Mark QR token as consumed
  → Insert audit event
COMMIT
```

On any failure: `ROLLBACK` and return structured error to restaurant scanner UI.

### 3.5 External Integrations

| Integration | Direction | Protocol |
| ----------- | --------- | -------- |
| Flutterwave | Outbound + inbound webhook | REST + HMAC signature |
| SMS provider (e.g. Africa's Talking) | Outbound | REST from Edge Function |
| Email (Resend / Supabase Auth email) | Outbound | SMTP / API |
| OpenStreetMap tiles | Outbound from browser | HTTPS tile requests (no API key) |

---

## 4. Database Architecture

### 4.1 Entity Relationship Overview

```
universities ──┬── students ──┬── student_wallets ──┬── swipes (ledger)
               │              │                     └── lunch_credits (ledger)
               │              ├── qr_tokens
               │              └── photo_approvals
               │
               ├── meal_plans (catalog per university)
               │
               └── restaurants ──┬── restaurant_locations
                                 ├── staff_accounts
                                 ├── sauces (catalog)
                                 ├── restaurant_sauce_pricing (internal cost)
                                 ├── daily_menu (availability)
                                 ├── extras
                                 └── extra_pricing

transactions ── payments
payouts ── restaurants
notifications
users (extends auth.users)
```

### 4.2 Core Tables (Detailed)

#### `users`
Extends `auth.users`. Columns: `id` (FK auth.users), `role`, `email`, `phone`, `created_at`, `updated_at`, `status` (active | suspended).

#### `universities`
`id`, `name`, `slug`, `campus_bounds` (geography polygon, Phase 2), `is_active`, `settings` (jsonb).

#### `students`
`id`, `user_id`, `university_id`, `student_number`, `lunchlink_id` (public identifier), `full_name`, `photo_url`, `photo_status` (pending | approved | rejected), `photo_rejection_reason`, `enrollment_status`.

#### `restaurants`
`id`, `university_id`, `name`, `slug`, `description`, `logo_url`, `status` (pending | active | inactive), `payout_rate_ugx` (per meal), `operating_hours` (jsonb), `tier` (for map filter compatibility).

#### `restaurant_locations`
`id`, `restaurant_id`, `latitude`, `longitude`, `address`, `is_primary`.

#### `staff_accounts`
`id`, `user_id`, `restaurant_id`, `role` (staff | manager), `is_active`.

#### `meal_plans`
`id`, `university_id`, `name`, `description`, `swipe_count`, `price_ugx`, `duration_days`, `is_active`, `sort_order`.

#### `student_wallets`
`id`, `student_id`, `active_meal_plan_id` (nullable), `plan_expires_at`, `swipe_balance`, `credit_balance_ugx`, `updated_at`.

#### `swipes` (ledger)
`id`, `wallet_id`, `delta` (+/-), `reason` (plan_purchase | redemption | admin_adjustment), `reference_id`, `created_at`.

#### `lunch_credits` (ledger)
`id`, `wallet_id`, `delta_ugx`, `reason` (top_up | extra_purchase | admin_adjustment), `reference_id`, `created_at`.

#### `sauces`
`id`, `restaurant_id`, `name`, `is_active`.

#### `restaurant_sauce_pricing`
`id`, `sauce_id`, `internal_cost_ugx`, `effective_from`, `effective_to`. **RLS: no student access.**

#### `daily_menu`
`id`, `restaurant_id`, `sauce_id`, `date`, `is_available`, `stock_remaining` (nullable).

#### `extras` / `extra_pricing`
Standard catalog + `price_ugx`, `is_active`. Prices visible to all authenticated users.

#### `qr_tokens`
`id`, `student_id`, `token_hash`, `issued_at`, `expires_at`, `consumed_at`, `consumed_by_staff_id`, `consumed_at_restaurant_id`.

#### `transactions`
`id`, `type` (meal_redemption | extra_purchase | plan_purchase | credit_top_up), `student_id`, `restaurant_id`, `staff_id`, `swipe_delta`, `credit_delta_ugx`, `metadata` (jsonb: sauce_id, extras[]), `created_at`.

#### `payments`
`id`, `student_id`, `flutterwave_tx_ref`, `flutterwave_id`, `amount_ugx`, `type` (plan | top_up), `status` (pending | success | failed), `metadata`, `created_at`.

#### `payouts`
`id`, `restaurant_id`, `period_start`, `period_end`, `meals_redeemed`, `payout_rate_ugx`, `amount_due_ugx`, `status` (pending | paid), `paid_at`.

#### `notifications`
`id`, `user_id`, `channel`, `event_type`, `payload`, `read_at`, `created_at`.

#### `photo_approvals`
`id`, `student_id`, `reviewed_by`, `status`, `notes`, `created_at`.

#### `audit_events`
`id`, `actor_id`, `action`, `entity_type`, `entity_id`, `payload`, `ip_address`, `created_at`.

### 4.3 Indexing Strategy

| Table | Index | Purpose |
| ----- | ----- | ------- |
| `students` | `(university_id)`, `(lunchlink_id)` unique | Campus lock, card display |
| `qr_tokens` | `(student_id, consumed_at)`, `(expires_at)` | Active token lookup, cleanup |
| `transactions` | `(student_id, created_at)`, `(restaurant_id, created_at)` | History, payouts |
| `daily_menu` | `(restaurant_id, date)` | Today's sauces query |
| `payments` | `(flutterwave_tx_ref)` unique | Webhook idempotency |

### 4.4 Row Level Security (RLS) Summary

| Table | Student | Restaurant Staff | Restaurant Manager | Admin |
| ----- | ------- | ---------------- | ------------------ | ----- |
| `students` (own row) | SELECT, UPDATE (limited) | — | — | ALL |
| `students` (others) | — | — | — | ALL |
| `restaurant_sauce_pricing` | **DENY** | SELECT (own restaurant) | SELECT | ALL |
| `daily_menu`, `extras` | SELECT (campus restaurants) | ALL (own restaurant) | ALL | ALL |
| `student_wallets` | SELECT (own) | — | — | ALL |
| `transactions` | SELECT (own) | SELECT (own restaurant) | SELECT | ALL |
| `qr_tokens` | SELECT (own active) | — | — | ALL |

**Campus lock enforcement:** All student-facing SELECT policies include `university_id = auth.student_university_id()`.

### 4.5 Database Functions

| Function | Purpose |
| -------- | ------- |
| `auth.student_university_id()` | Returns university_id from JWT claims |
| `auth.user_role()` | Returns role from JWT app_metadata |
| `deduct_swipe(wallet_id)` | Atomic swipe decrement with balance check |
| `deduct_credits(wallet_id, amount)` | Atomic credit decrement |
| `expire_stale_qr_tokens()` | Cron: mark expired tokens |
| `get_restaurant_payout_summary(restaurant_id, period)` | Payout calculation |

---

## 5. Authentication Architecture

### 5.1 Auth Provider: Supabase Auth

| Method | Used For |
| ------ | -------- |
| Email + password | All portals (primary) |
| Magic link | Optional passwordless for students |
| Phone OTP | Phase 2 consideration for Uganda mobile-first |

### 5.2 Role Model (JWT `app_metadata`)

```json
{
  "role": "student | restaurant_staff | restaurant_manager | admin",
  "university_id": "uuid | null",
  "restaurant_id": "uuid | null",
  "student_id": "uuid | null"
}
```

Roles are set at registration completion (after admin approval for restaurants) via Edge Function or admin action — never client-writable.

### 5.3 Registration Flows

**Student:**
1. Public registration form → Supabase Auth sign-up.
2. Edge Function creates `users`, `students`, `student_wallets` rows.
3. Student uploads photo → `photo_status = pending`.
4. Admin approves photo → student gains full portal access.
5. Middleware redirects unapproved students to `/profile/photo-pending`.

**Restaurant:**
1. Public restaurant registration form.
2. Admin reviews and approves → creates `restaurants`, manager `staff_accounts`.
3. Manager invites staff via email invite (Supabase Auth admin API).

### 5.4 Session & Route Protection

**Next.js Middleware (`middleware.ts`):**

```
Request → Supabase session refresh
        → Read role from JWT
        → Route group check:
            (student)/*  → role === student && photo approved
            (restaurant)/* → role in [restaurant_staff, restaurant_manager]
            (admin)/*    → role === admin
        → Redirect unauthorized to /login
```

### 5.5 Campus Lock

Enforced at three layers:

1. **JWT claim** — `university_id` embedded at login.
2. **RLS policies** — All queries filtered by university.
3. **Edge Functions** — Explicit university match on cross-entity operations (e.g., student wallet vs restaurant).

A student at University A cannot view, redeem at, or purchase plans for University B even with a valid JWT.

### 5.6 Photo Verification Gate

| Photo Status | Student Capabilities |
| ------------ | ------------------ |
| `pending` | View dashboard, upload/replace photo, view plans (no purchase) |
| `approved` | Full access including QR, redemption, payments |
| `rejected` | Re-upload photo, view rejection reason |

Restaurant scanner displays student photo alongside QR validation result; staff must visually confirm before completing redemption.

---

## 6. Mobile Money Integration Architecture

### 6.1 Provider: Flutterwave

Flutterwave supports MTN Mobile Money and Airtel Money in Uganda via mobile money charge / STK push.

### 6.2 Payment Types

| Type | Trigger | Outcome |
| ---- | ------- | ------- |
| Meal plan purchase | Student selects plan → enters phone | Credit swipes, activate plan on wallet |
| LunchCredits top-up | Student enters amount + phone | Increment `credit_balance_ugx` |

### 6.3 Payment Flow (Sequence)

```
Student UI                Next.js BFF           Edge Function              Flutterwave
    │                          │                      │                         │
    │── Select plan ──────────►│                      │                         │
    │── POST /initiate ───────►│── invoke ───────────►│                         │
    │                          │                      │── Create charge ───────►│
    │                          │                      │◄── tx_ref, status ──────│
    │◄── "Check your phone" ───│◄─────────────────────│                         │
    │                          │                      │                         │
    │  (Student enters MM PIN on phone)                │                         │
    │                          │                      │◄── Webhook ─────────────│
    │                          │                      │── Verify signature      │
    │                          │                      │── Idempotent wallet update│
    │                          │                      │── Insert payment record │
    │                          │                      │── Send notification     │
    │◄── Balance updated ──────│◄── Realtime/poll ────│                         │
```

### 6.4 Implementation Details

| Concern | Implementation |
| ------- | -------------- |
| Secret management | `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET` in Supabase secrets only |
| Transaction reference | `LL-{type}-{student_id_short}-{uuid}` — stored before charge creation |
| Idempotency | Unique index on `payments.flutterwave_tx_ref`; webhook handler checks existing status |
| Amount validation | Server-side plan price lookup — never trust client-submitted amount for plans |
| Phone normalization | Edge Function normalizes to `256XXXXXXXXX` format |
| Failure handling | Failed payments remain `pending`/`failed`; student sees retry UI with warm copy |
| Receipt | Generate in-app receipt from `payments` + `transactions`; optional email via notification service |

### 6.5 Supported Methods Configuration

Flutterwave payment options restricted to:

- `mobilemoneyuganda` (MTN)
- `mobilemoneyuganda` (Airtel)

Payment method selection presented as two large touch-target buttons matching design system.

### 6.6 Reconciliation

Admin financial dashboard aggregates:

- `payments` where `status = success` → Collections
- `transactions` type `meal_redemption` × restaurant `payout_rate_ugx` → Restaurant liability
- Difference → Platform revenue/commission (configurable in admin settings)

---

## 7. QR Redemption Architecture

### 7.1 QR Token Design

**Payload (signed JWT or HMAC-signed compact string):**

```json
{
  "sub": "student_id",
  "lid": "lunchlink_id",
  "iat": 1710000000,
  "exp": 1710000120,
  "jti": "unique_token_id"
}
```

| Property | Value |
| -------- | ----- |
| Expiry (`exp - iat`) | 120 seconds (2 minutes) |
| Signing key | Server-only `QR_SIGNING_SECRET` (rotatable) |
| Storage | `qr_tokens.token_hash = SHA-256(jti)` — raw token never stored |
| Regeneration | Client calls `generate-qr-token` when countdown hits 0 or on manual refresh |
| Single use | `consumed_at` set on successful redemption; validation rejects consumed tokens |

### 7.2 Student Digital Card UI

- Displays: photo, student number, LunchLink ID, university, QR code.
- Countdown ring/timer showing seconds until refresh (visual urgency without anxiety — warm copy: "Refreshes in 0:45").
- Auto-refresh via TanStack Query `refetchInterval: 110_000` (slightly before expiry).
- QR rendered with `qrcode.react` at high error correction level.

### 7.3 Restaurant Scanner Flow

**Technology:** Browser `BarcodeDetector` API with fallback to `@zxing/browser` for broader device support.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│ Scan QR     │────►│ Validate     │────►│ Show student│────►│ Staff confirms│
│ (camera)    │     │ token (API)  │     │ photo+info  │     │ identity     │
└─────────────┘     └──────────────┘     └─────────────┘     └──────┬───────┘
                                                                      │
                    ┌──────────────┐     ┌─────────────┐              │
                    │ Receipt /    │◄────│ Redeem API  │◄─────────────┤
                    │ confirmation │     │ (atomic)    │     ┌────────▼───────┐
                    └──────────────┘     └─────────────┘     │ Select sauce   │
                                                             │ + extras       │
                                                             └────────────────┘
```

### 7.4 Validation Rules (Server)

1. Signature valid and not expired.
2. `jti` exists in `qr_tokens`, `consumed_at IS NULL`.
3. Student `photo_status = approved`, `status = active`.
4. Restaurant belongs to same `university_id` as student.
5. Student `swipe_balance >= 1` (checked again at redemption, not just validation).
6. Rate limit: max 5 validation attempts per token (anti-brute-force).

### 7.5 Redemption Request Body

```json
{
  "qr_token": "eyJ...",
  "sauce_id": "uuid",
  "extras": [{ "extra_id": "uuid", "quantity": 1 }],
  "staff_confirmed_identity": true
}
```

Server computes extras total from `extra_pricing`, validates credit balance, executes atomic transaction.

### 7.6 Anti-Fraud Controls

| Control | Mechanism |
| ------- | --------- |
| Dynamic QR | 2-minute TTL |
| Single use | `consumed_at` immutability |
| Photo verification | Scanner UI requires staff confirmation checkbox |
| Transaction logging | Full audit trail with staff_id, restaurant_id, IP |
| Duplicate scan detection | Return explicit "Already redeemed" if token consumed |
| Suspicious pattern flagging | Admin fraud dashboard: same student, multiple restaurants, rapid scans |

---

## 8. User Roles and Permissions

### 8.1 Role Definitions

| Role | Description |
| ---- | ----------- |
| `student` | University meal plan subscriber |
| `restaurant_staff` | Front-line staff: scan QR, redeem meals, view transactions |
| `restaurant_manager` | Staff permissions + meal/extras management, staff accounts, payout reports |
| `admin` | Full platform administration |

### 8.2 Permission Matrix

| Permission | Student | Staff | Manager | Admin |
| ---------- | :-----: | :---: | :-----: | :---: |
| View public website | ✓ | ✓ | ✓ | ✓ |
| View own wallet / swipes / credits | ✓ | — | — | ✓ |
| Generate QR code | ✓* | — | — | — |
| Purchase meal plan | ✓* | — | — | ✓ |
| Top up LunchCredits | ✓* | — | — | ✓ |
| View restaurant list (campus) | ✓ | ✓ | ✓ | ✓ |
| View sauce availability | ✓ | ✓ | ✓ | ✓ |
| View sauce internal cost | — | — | ✓ | ✓ |
| View extras prices | ✓ | ✓ | ✓ | ✓ |
| Scan & redeem QR | — | ✓ | ✓ | — |
| Manage daily menu / sauces | — | — | ✓ | ✓ |
| Manage extras | — | — | ✓ | ✓ |
| View restaurant transactions | — | ✓** | ✓ | ✓ |
| Manage staff accounts | — | — | ✓ | ✓ |
| View payout reports | — | — | ✓ | ✓ |
| Approve student photos | — | — | — | ✓ |
| Suspend students / restaurants | — | — | — | ✓ |
| Manage universities & meal plans | — | — | — | ✓ |
| Financial dashboard & payouts | — | — | — | ✓ |
| Fraud monitoring | — | — | — | ✓ |

\* Requires `photo_status = approved`  
\** Staff: own shift transactions only (optional restriction via policy)

### 8.3 Data Visibility Rules

| Data | Student | Restaurant | Admin |
| ---- | ------- | ---------- | ----- |
| Meal swipe balance | Own | — | All |
| LunchCredits balance | Own | At redemption only | All |
| Sauce internal cost | **Hidden** | Own restaurant | All |
| Extra prices | Public | Own restaurant | All |
| Meal plan pricing | Public (plan catalog) | — | All |
| Payout rates | **Hidden** | Own restaurant | All |
| Student PII | Own | Name, photo, ID at scan only | All |

---

## 9. API Structure

### 9.1 API Layers

| Layer | Base | Purpose |
| ----- | ---- | ------- |
| Supabase PostgREST | `{SUPABASE_URL}/rest/v1/` | RLS-protected CRUD |
| Supabase Edge Functions | `{SUPABASE_URL}/functions/v1/` | Business logic, payments, QR |
| Next.js Route Handlers | `/api/` | Webhook proxy, auth callbacks, BFF aggregation |

### 9.2 REST Conventions (PostgREST)

Direct table access for simple reads/writes permitted by RLS:

| Endpoint | Method | Role | Description |
| -------- | ------ | ---- | ----------- |
| `/rest/v1/restaurants?university_id=eq.{id}` | GET | Student+ | Campus restaurants |
| `/rest/v1/daily_menu?restaurant_id=eq.{id}&date=eq.{today}` | GET | Student+ | Today's sauces |
| `/rest/v1/extras?restaurant_id=eq.{id}&is_active=eq.true` | GET | Student+ | Active extras with prices |
| `/rest/v1/restaurant_sauce_pricing` | GET | Manager, Admin | Internal costs (RLS enforced) |
| `/rest/v1/transactions?student_id=eq.{id}&order=created_at.desc` | GET | Student (own) | Transaction history |
| `/rest/v1/student_wallets?student_id=eq.{id}` | GET | Student (own) | Wallet balances |

### 9.3 Edge Function API

**Base URL:** `https://{project}.supabase.co/functions/v1`

#### QR & Redemption

| Endpoint | Method | Auth | Request | Response |
| -------- | ------ | ---- | ------- | -------- |
| `/generate-qr-token` | POST | Bearer (student) | — | `{ token, expires_at }` |
| `/validate-qr-token` | POST | Bearer (restaurant) | `{ qr_token }` | `{ student, valid, reason? }` |
| `/redeem-meal` | POST | Bearer (restaurant) | `{ qr_token, sauce_id, extras[], staff_confirmed_identity }` | `{ transaction_id, swipe_remaining, credits_remaining }` |

#### Payments

| Endpoint | Method | Auth | Request | Response |
| -------- | ------ | ---- | ------- | -------- |
| `/initiate-payment` | POST | Bearer (student) | `{ type, plan_id?, amount_ugx?, phone, provider }` | `{ tx_ref, message }` |
| `/flutterwave-webhook` | POST | Flutterwave signature | (webhook payload) | `{ received: true }` |
| `/payment-status/{tx_ref}` | GET | Bearer (student) | — | `{ status, payment }` |

#### Admin

| Endpoint | Method | Auth | Request | Response |
| -------- | ------ | ---- | ------- | -------- |
| `/admin/approve-photo` | POST | Bearer (admin) | `{ student_id, status, notes? }` | `{ success }` |
| `/admin/calculate-payouts` | POST | Bearer (admin/cron) | `{ period_start, period_end }` | `{ payouts[] }` |
| `/admin/suspend-user` | POST | Bearer (admin) | `{ user_id, reason }` | `{ success }` |

#### Notifications

| Endpoint | Method | Auth | Request | Response |
| -------- | ------ | ---- | ------- | -------- |
| `/send-notification` | POST | Service role | `{ user_id, event_type, payload }` | `{ sent }` |

### 9.4 Error Response Format

All Edge Functions return consistent errors:

```json
{
  "error": {
    "code": "INSUFFICIENT_SWIPES",
    "message": "You don't have enough swipes for this meal.",
    "details": {}
  }
}
```

Error codes map to warm, human UI copy on the frontend (never expose raw PostgreSQL errors).

### 9.5 Webhook Security

Flutterwave webhook handler:

1. Verify `verif-hash` header against secret.
2. Lookup `payments` by `tx_ref`.
3. If `status` already `success`, return 200 (idempotent).
4. Update payment + wallet in transaction.
5. Emit notification event.

Webhook URL: `https://{production-domain}/api/webhooks/flutterwave` → proxies to Edge Function with service role.

### 9.6 API Versioning

MVP uses unversioned endpoints. Post-MVP: prefix `/v1/` on Edge Functions if breaking changes required.

---

## 10. Deployment Architecture

### 10.1 Environment Topology

```
┌─────────────────────────────────────────────────────────────┐
│                        Production                           │
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   Vercel    │    │   Supabase   │    │  Flutterwave  │  │
│  │  (Next.js)  │◄──►│   (Cloud)    │◄──►│  (Payments)   │  │
│  │             │    │              │    │               │  │
│  │ • Preview   │    │ • Postgres   │    └───────────────┘  │
│  │ • Production│    │ • Auth       │                       │
│  └─────────────┘    │ • Edge Fn    │    ┌───────────────┐  │
│                     │ • Storage    │    │ SMS / Email   │  │
│                     │ • Realtime   │◄──►│ Provider      │  │
│                     └──────────────┘    └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Environment Tiers

| Tier | Next.js | Supabase | Flutterwave | Purpose |
| ---- | ------- | -------- | ----------- | ------- |
| Local | `next dev` | Supabase CLI (Docker) | Sandbox keys | Development |
| Preview | Vercel preview deploy | Supabase staging project | Sandbox keys | PR review |
| Production | Vercel production | Supabase production | Live keys | Live users |

### 10.3 Vercel Configuration

| Setting | Value |
| ------- | ----- |
| Framework | Next.js 15 |
| Node version | 20 LTS |
| Regions | `cdg1` or nearest to Uganda (consider `iad1` if no African edge — evaluate latency) |
| Environment variables | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only) |
| Headers | CSP allowing Supabase, Flutterwave, OSM tile servers |
| Image domains | Supabase Storage CDN domain |

### 10.4 Supabase Project Configuration

| Setting | Value |
| ------- | ----- |
| Database | PostgreSQL 15+, enable `pg_cron`, `pgcrypto` |
| Auth | Email confirmations on; JWT expiry 1 hour; refresh token rotation |
| Storage buckets | `student-photos` (private), `restaurant-assets` (public read) |
| Edge Functions | Deployed via Supabase CLI in CI |
| Secrets | `QR_SIGNING_SECRET`, `FLUTTERWAVE_*`, `SMS_API_KEY` |
| Backups | Daily automated backups (Supabase Pro) |

### 10.5 CI/CD Pipeline

```
Push to branch
    │
    ├─► GitHub Actions
    │       ├─ Lint (ESLint) + Type check (tsc)
    │       ├─ Unit tests (Vitest)
    │       └─ Build (next build)
    │
    ├─► PR → Vercel Preview Deploy (automatic)
    │
    └─► Merge to main
            ├─ Vercel Production Deploy
            ├─ Supabase DB migrations (supabase db push)
            └─ Supabase Edge Functions deploy
```

### 10.6 Database Migrations

- All schema changes via Supabase migration files in `supabase/migrations/`.
- Migrations are sequential, reviewed in PR, applied to staging before production.
- RLS policies co-located with table creation migrations.
- Seed data for development: sample university, restaurants, meal plans, test users.

### 10.7 Domain & Routing

| Domain | Routes |
| ------ | ------ |
| `lunchlink.ug` (example) | Public site + `/login` |
| `app.lunchlink.ug` | Student, restaurant, admin portals (role-based redirect after login) |

Alternative: single domain with path-based portals (`/student`, `/restaurant`, `/admin`) — simpler for MVP.

### 10.8 Monitoring & Alerting

| Tool | Scope |
| ---- | ----- |
| Vercel Analytics | Web vitals, traffic |
| Sentry | Frontend + Edge Function errors |
| Supabase Dashboard | DB metrics, Auth logs, API usage |
| Uptime monitor | `/api/health` endpoint |
| Pager alerts | Failed webhook processing, payout job failures |

### 10.9 Security Checklist (Pre-Launch)

- [ ] RLS enabled on every public table — no table without policy
- [ ] Service role key used only in Edge Functions / server — never `NEXT_PUBLIC_`
- [ ] Flutterwave webhook signature verification active
- [ ] QR signing secret rotated from default
- [ ] Student photos accessible only via signed URLs
- [ ] CORS restricted to production domains
- [ ] Rate limiting on auth and QR generation endpoints
- [ ] CSP headers configured
- [ ] Dependency audit in CI (`npm audit`)

---

## Appendix A: MVP Implementation Order

Recommended build sequence aligned with Phase 1 from the platform architecture:

1. **Foundation** — Supabase project, schema migrations, auth, roles, middleware
2. **Public site** — Marketing pages, student/restaurant registration
3. **Admin: photo approval** — Unblocks student activation
4. **Meal plans & Flutterwave** — Plan catalog, payment flow, wallet crediting
5. **Digital card & QR service** — Token generation, student card UI
6. **Restaurant portal: scanner & redemption** — Core value loop
7. **Extras & LunchCredits** — Top-up + redemption extras flow
8. **Restaurant meal/extras management** — Manager self-service
9. **Admin dashboard** — Students, restaurants, transactions, basic financials
10. **Phase 2 prep** — Map, notifications, automated payouts

---

## Appendix B: Key Technical Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Monolith frontend | Single Next.js app with route groups | Shared design system, one deploy, role-based layouts |
| Supabase over custom API | Managed Postgres + Auth + RLS | Faster MVP, built-in security model |
| Edge Functions for money/QR | Server-side secrets, atomic transactions | Security and integrity requirements |
| Flutterwave | Specified; supports UG mobile money | STK push UX matches platform architecture |
| Leaflet + OSM | Specified; free tiles | No Google Maps API cost; sufficient for campus scale |
| JWT-signed QR | Stateless verification with DB consumption tracking | Fast scan validation, single-use enforcement in DB |
| TanStack Query | Client data fetching | Cache invalidation for balances post-redemption |

---

## Appendix C: Open Questions (Resolve Before Implementation)

1. **Commission model** — Fixed per-meal payout rate vs percentage; affects financial schema.
2. **SMS provider** — Africa's Talking, Twilio, or Supabase-only email for MVP?
3. **Single domain vs subdomain** — Affects auth cookie scope and middleware.
4. **Offline scanner fallback** — Required for restaurants with poor connectivity?
5. **Plan expiry behavior** — Do unused swipes roll over, expire, or refund?
6. **Multi-restaurant redemption cooldown** — Fraud prevention: minimum time between redemptions?

---

*This document is the authoritative technical blueprint for LunchLink implementation. All application code should conform to the architectures defined herein.*
