# LunchLink MVP Implementation Roadmap

**Version:** 1.0  
**Status:** Execution plan — documentation only (no application code)  
**Audience:** Engineering team (3 engineers), Engineering Manager, QA, Finance/Ops  
**Sources:** [Technical Foundation v2](./technical-foundation-v2.md) · [Business Rules](./business-rules.md) · [Architecture Review](./architecture-review.md)

---

## Purpose

This document defines the **safest build order** for LunchLink MVP. It maps dependencies across migrations, database functions, Edge Functions, frontend surfaces, and infrastructure so a team of **three engineers** can execute in parallel without blocking money movement on incomplete foundations.

### Team Model (Recommended)

| Engineer | Primary ownership | Secondary |
| -------- | ----------------- | --------- |
| **E1 — Platform** | Migrations, RLS, auth, shared libs, CI, infra | Admin portal shell |
| **E2 — Money & Movement** | Wallets, payments, reconciliation, payouts, cron jobs | Restaurant scanner backend |
| **E3 — Product UI** | Next.js portals, design system, student/restaurant UX | Public site, E2E tests |

**Rule:** No real-money Flutterwave production keys until **Gate G4** (Payment Reconciliation) passes in staging.

---

## Implementation Dependency Map

Legend: **Risk** — 🔴 Critical (money/security) · 🟠 High · 🟡 Medium · 🟢 Low

---

### Database Migrations

| Migration | Dependencies | Build order | Testing requirements | Rollback strategy | Risk |
| --------- | ------------ | ----------- | -------------------- | ----------------- | ---- |
| `001_enums.sql` | None | **1** | Migration applies cleanly; enum values match Business Rules glossary | Drop types only if no dependent objects (fresh reset) | 🟢 |
| `002_core_tenancy.sql` | 001 | **2** | universities + semesters CRUD via service role; unique constraints | Drop tables in reverse FK order | 🟢 |
| `003_settings.sql` | 002 | **3** | Seed platform_settings singleton; university_settings FK | Drop settings tables | 🟡 |
| `004_users_profiles.sql` | 001, 002 | **4** | profiles ↔ auth.users; students unique (university, student_number) | Drop students, profiles | 🟠 |
| `005_wallets.sql` | 004, 002 | **5** | Balance CHECK ≥ 0; ledger append-only trigger fires | Drop ledger triggers first; preserve audit if prod | 🔴 |
| `006_meal_plans.sql` | 002, 004, 005 | **6** | FK latest_plan_purchase deferred until purchases exist | Drop purchases before wallets FK | 🟡 |
| `007_restaurants.sql` | 002, 003 | **7** | Tier + restaurant + catalog FK chain; sauce pricing RLS deny student | Drop catalog → restaurants | 🟡 |
| `008_qr_transactions.sql` | 004, 005, 007 | **8** | qr_tokens expiry; validation_sessions TTL; transaction receipt_number unique | Drop in FK order (sessions → tokens → transactions) | 🔴 |
| `009_payments.sql` | 004, 006 | **9** | flutterwave_tx_ref unique; expires_at populated on insert | Never DELETE payments in prod; status revert only | 🔴 |
| `010_payouts.sql` | 007, 008 | **10** | payout_line_items 1:1 transaction; status enum transitions | Cancel draft payouts only | 🔴 |
| `011_reconciliation.sql` | 009, 010 | **11** | webhook_events append-only; reconciliation_runs lifecycle | Archive runs; do not delete webhook log | 🔴 |
| `012_ops.sql` | 004–011 | **12** | fraud_alerts insert; daily_stats unique (entity, date) | Drop ops tables | 🟡 |
| `013_functions.sql` | 005–012 tables | **13** | Unit tests: resolve_swipe_rate precedence; apply_wallet_delta idempotency | CREATE OR REPLACE revert to prior version | 🔴 |
| `014_triggers.sql` | 005, 011, 012 | **14** | updated_at fires; receipt_number_seq monotonic | Drop triggers | 🟡 |
| `015_storage.sql` | 004 (student_id helper) | **15** | Bucket upload/download RLS; signed URL TTL | Disable bucket policies | 🟠 |
| `016_rls.sql` | 013 (helpers), all tables | **16** | **RLS matrix test suite** — every role × table × operation | Disable RLS only in staging emergency | 🔴 |
| `017_grants.sql` | 013 | **17** | authenticated cannot EXECUTE apply_wallet_delta | Re-GRANT service_role | 🔴 |

**Migration gate M-DB:** `supabase db reset` + seed + RLS test suite green before any Edge Function deploys to staging.

---

### Database Functions

| Function | Dependencies | Build order | Testing requirements | Rollback strategy | Risk |
| -------- | ------------ | ----------- | -------------------- | ----------------- | ---- |
| `current_user_role()` | profiles, 016 RLS | **F1** | Returns correct role per test JWT | Replace function body | 🟠 |
| `current_student_id()` | students | **F1** | Student JWT returns id; staff returns null | Replace function body | 🟡 |
| `current_university_id()` | students, profiles, staff_accounts | **F1** | Campus lock helper for all roles | Replace function body | 🟠 |
| `current_restaurant_id()` | staff_accounts | **F1** | Staff JWT returns restaurant | Replace function body | 🟡 |
| `is_admin_or_university_admin()` | profiles | **F1** | Both admin types true; student false | Replace function body | 🟡 |
| `apply_wallet_delta()` | student_wallets, wallet_ledger | **F2** | Concurrent calls; idempotency key; frozen wallet rejects; balance_after correct | Prior function version + manual ledger fix if prod | 🔴 |
| `check_redemption_eligibility()` | students, wallets, transactions, university_settings | **F3** | Cooldown 3h; daily limit 2; timezone Kampala midnight boundary | Replace function body | 🔴 |
| `resolve_swipe_rate()` | payout_rate_configs, tiers, university_settings | **F4** | Precedence: restaurant → tier → university | Replace function body | 🔴 |
| `generate_receipt_number()` | receipt_number_seq | **F3** | Uniqueness under concurrent redeem | Replace function body | 🟡 |
| `expire_semester_balances()` | apply_wallet_delta, semesters | **F5** | Swipe/plus zeroed; dining_cash untouched | Manual credit adjustment | 🔴 |

**Function build order:** F1 (helpers) → F2 (wallet) → F3 (redemption) → F4 (payout) → F5 (semester)

---

### Subsystems

| Subsystem | Dependencies | Build order | Testing requirements | Rollback strategy | Risk |
| --------- | ------------ | ----------- | -------------------- | ----------------- | ---- |
| **Auth & JWT claims** | 004, 016, F1 | **S1** | Custom access token hook; role immutability; MFA admin | Disable hook; revert to base JWT | 🔴 |
| **Student registration** | S1, 005 wallets provisioned | **S2** | register-student creates profile + student + wallet | Soft-delete test users | 🟠 |
| **Photo verification** | S2, 015 storage | **S3** | approve-photo state machine; unverified blocked from pay/QR | Revert photo_status | 🟠 |
| **Wallet & ledger** | F2, S2 | **S4** | Stacking adds balances; ledger = cache; reconciliation pass | Freeze wallets; admin adjust | 🔴 |
| **Meal plan catalog** | 006, 003 | **S5** | Admin CRUD; student campus-scoped read | Deactivate plans | 🟡 |
| **Flutterwave payments** | 009, 011, S4 | **S6** | Sandbox STK; webhook idempotency; expiry cron; verify backup | Disable webhook; manual reconcile only | 🔴 |
| **QR generation** | 008, S3 | **S7** | 120s TTL; rate limit; device_sessions | Rotate QR secret | 🔴 |
| **Validation sessions** | S7, 008 | **S8** | 5 min TTL; single consume; TOCTOU race test | Disable validation_id path (fallback token) | 🔴 |
| **Redemption** | S8, F3, S4, 007 menus | **S9** | Atomic redeem; extras priority; hours/stock checks | Feature flag disable redeem | 🔴 |
| **Reconciliation** | 011, S6, S4 | **S10** | Nightly wallet drift = 0; hourly payment match | Pause crons | 🔴 |
| **Payout engine** | 010, F4, S9 | **S11** | Line items = redemptions; rate snapshot; approval lock | Cancel draft payouts | 🔴 |
| **Semester lifecycle** | F5, S4 | **S12** | Expiry job; rollover admin flow | Delay expiry date | 🟠 |
| **Fraud & alerts** | 012, S7, S9 | **S13** | Alert rules fire; admin queue | Disable alert creation | 🟡 |
| **Notifications** | 012, S6, S9 | **S14** | Email on pay/redeem/approve; SMS optional | Disable send-notification | 🟡 |
| **Reporting & stats** | 012, S11 | **S15** | aggregate-daily-stats; financial-summary accuracy | Re-run aggregation | 🟡 |
| **Admin portal** | S3, S10, S11 | **S16** | All admin Edge Functions wired | Hide admin routes | 🟠 |
| **Restaurant portal** | S9, 007 | **S17** | Scanner E2E; menu CRUD; dashboard stats | Disable scanner route | 🟠 |
| **Student portal** | S6, S7, S9 | **S18** | Digital card; pay; wallet; transactions | Maintenance mode | 🟠 |

**Critical path:** S1 → S2 → S3 → S4 → S6 → S7 → S8 → S9 → S10 → S11 (money path before full UI polish)

---

## A. Milestone Breakdown

| Milestone | Duration | Exit gate | Owner bias |
| --------- | -------- | --------- | ---------- |
| **M0 — Foundation** | 1 week | M-DB gate; CI green; staging Supabase + Vercel | E1 |
| **M1 — Auth & Identity** | 1 week | Student registers; JWT claims; middleware routes | E1 + E3 |
| **M2 — Verification** | 1 week | Photo upload + admin approve; verified gate enforced | E1 + E3 |
| **M3 — Wallets & Plans** | 1 week | Wallets provisioned; plan catalog; apply_wallet_delta tested | E2 |
| **M4 — Payments** | 2 weeks | **Gate G4:** sandbox pay → stack credits → reconciliation | E2 |
| **M5 — QR Backend** | 1 week | generate-qr-token; cleanup cron; audit | E2 |
| **M6 — Restaurant Catalog** | 1 week | Menus, extras, RLS price opacity verified | E1 + E3 |
| **M7 — Redemption** | 2 weeks | **Gate G7:** full validate → redeem E2E; fraud rules | E2 + E3 |
| **M8 — Payouts & Finance** | 2 weeks | **Gate G8:** payout line items; financial-summary | E2 |
| **M9 — Ops & Semester** | 1 week | Rollover; expiry crons; notifications | E1 + E2 |
| **M10 — Production hardening** | 2 weeks | **Gate G10:** load test; zero drift; pilot 100 students | All |

**Total:** ~15 weeks (75 working days) with 3 engineers

---

## B. Sprint Breakdown

2-week sprints; parallel tracks shown per engineer.

### Sprint 0 (Week 1) — Foundation

| Engineer | Deliverables |
| -------- | ------------ |
| E1 | Supabase staging/prod projects; migrations 001–017; seed; CI migration check |
| E2 | Edge Function scaffold; shared Deno libs (errors, request_id, supabase client) |
| E3 | Next.js 15 scaffold; Tailwind + shadcn tokens; middleware skeleton; `/health` |

**Gate:** M-DB passes locally and on staging.

---

### Sprint 1 (Weeks 2–3) — Auth & Registration

| Engineer | Deliverables |
| -------- | ------------ |
| E1 | Auth hook (JWT claims); `register-student`; profiles RLS; admin seed user |
| E2 | `send-notification` stub; audit_events writer utility |
| E3 | Public site shell; login/register UI; role-based route groups |

**Gate G1:** Student registers → profile + student + wallet rows exist.

---

### Sprint 2 (Weeks 4–5) — Verification & Admin MVP

| Engineer | Deliverables |
| -------- | ------------ |
| E1 | Storage buckets + RLS; `admin/approve-photo`; photo_approvals |
| E2 | Wallet read APIs; `wallet-summary` |
| E3 | Admin: student queue UI; student profile/photo upload UI |

**Gate G2:** Unverified student blocked from payment/QR routes (middleware + API).

---

### Sprint 3 (Weeks 6–7) — Wallets & Meal Plans

| Engineer | Deliverables |
| -------- | ------------ |
| E1 | Admin: universities, semesters, meal_plans CRUD |
| E2 | `apply_wallet_delta` integration tests; plan stacking logic spec tests |
| E3 | Student: meal plan browse; wallet display (swipes, plus, cash) |

**Gate G3:** Manual wallet credit via service role matches ledger.

---

### Sprint 4 (Weeks 8–9) — Payments (Sandbox)

| Engineer | Deliverables |
| -------- | ------------ |
| E1 | BFF webhook proxy `/api/webhooks/flutterwave` |
| E2 | `initiate-payment`; `flutterwave-webhook`; `verify-payment-status`; `expire-pending-payments` cron; `flutterwave_webhook_events` |
| E3 | Checkout UI (plan + top-up); payment polling UX |

**Gate G4 (BLOCKER for real money):** Sandbox E2E — pay → webhook → stacked balances → duplicate webhook ignored → pending expires at 15 min → manual reconcile path works.

---

### Sprint 5 (Weeks 10–11) — QR & Digital Card

| Engineer | Deliverables |
| -------- | ------------ |
| E1 | `cleanup-qr-tokens` cron; device_sessions |
| E2 | `generate-qr-token`; QR signing secret in Supabase vault |
| E3 | Digital student card UI; countdown refresh; photo display |

**Gate G5:** Verified student gets 120s token; expired rejected; rate limit enforced.

---

### Sprint 6 (Weeks 12–13) — Restaurant Catalog

| Engineer | Deliverables |
| -------- | ------------ |
| E1 | `admin/approve-restaurant`; `register-restaurant-application` |
| E2 | — |
| E3 | Restaurant manager: sauces, extras, daily menu, included foods; RLS verification test |

**Gate G6:** Student API returns extras prices; never internal sauce costs.

---

### Sprint 7 (Weeks 14–15) — Redemption

| Engineer | Deliverables |
| -------- | ------------ |
| E1 | Upstash Redis rate limiting middleware |
| E2 | `validate-qr-token`; `validation_sessions`; `redeem-meal`; fraud alert hooks |
| E3 | Restaurant scanner UI (camera); redemption wizard; receipt display |

**Gate G7:** E2E — scan → validate → redeem → balances + ledger + single-use token; cooldown/daily limit; concurrent scan safety.

---

### Sprint 8 (Weeks 16–17) — Reconciliation

| Engineer | Deliverables |
| -------- | ------------ |
| E1 | `reconcile-wallets` cron; `reconcile-payments` cron |
| E2 | `admin/reconciliation`; `admin/reconcile-payment`; `admin/financial-summary` |
| E3 | Admin: reconciliation dashboard; stuck payment resolver UI |

**Gate G8:** Nightly wallet drift = 0 on staging seed; open issues block payout approval flag tested.

---

### Sprint 9 (Weeks 18–19) — Payouts

| Engineer | Deliverables |
| -------- | ------------ |
| E1 | `resolve_swipe_rate` verified with fixture data |
| E2 | `calculate-payouts` cron; `admin/approve-payout`; `payout_line_items`; `admin/export-payouts` |
| E3 | Admin: payout approval UI; restaurant: payout report read-only |

**Gate G9:** Manual spreadsheet match for sample week; locked period immutable.

---

### Sprint 10 (Weeks 20–21) — Semester, Fraud, Notifications

| Engineer | Deliverables |
| -------- | ------------ |
| E1 | `admin/rollover-semester`; `expire-semester-balances`; `aggregate-daily-stats` |
| E2 | `admin/issue-refund`; `admin/void-redemption`; `admin/fraud-alerts`; `send-low-balance-alerts` |
| E3 | Notification center UI; transaction history; receipt download |

---

### Sprint 11 (Weeks 22–23) — Hardening & Pilot Prep

| Engineer | Deliverables |
| -------- | ------------ |
| E1 | RLS full matrix automated tests; security checklist; MFA admin |
| E2 | Load test scripts (500 QR / 200 redeem); `prewarm-functions` cron |
| E3 | E2E Playwright suite; mobile device QA matrix; bug burn-down |

**Gate G10:** Load test pass; Business Rules compliance sign-off; pilot runbook ready.

---

### Sprint 12 (Weeks 24–25) — Pilot & Production Release

| Engineer | Deliverables |
| -------- | ------------ |
| All | 100-student pilot; on-call rotation; production deploy; Flutterwave prod keys |

**Gate G11:** Production release checklist (Section H) complete.

---

## C. Database Build Order

Strict sequential apply in staging/production:

```
Phase A — Schema core (Day 1–2, E1)
  001 → 002 → 003 → 004

Phase B — Financial core (Day 2–3, E1)
  005 → 006 → 009

Phase C — Restaurant & redemption (Day 3–4, E1)
  007 → 008

Phase D — Settlement (Day 4–5, E1)
  010 → 011 → 012

Phase E — Logic & security (Day 5–7, E1)
  013 → 014 → 015 → 016 → 017

Phase F — Seed (Day 7, E1)
  seed.sql: platform_settings, 1 university, 1 semester, tiers, 2 restaurants,
            3 meal plans, admin user, test students, payout rates
```

**Parallel safety:** E2/E3 must not deploy Edge Functions touching tables until Phase E complete.

**Rollback tiers:**

| Tier | When | Action |
| ---- | ---- | ------ |
| R0 — Local | Dev only | `supabase db reset` |
| R1 — Staging | Bad migration | Reset staging; fix forward migration |
| R2 — Production forward fix | Non-destructive bug | New migration 018+ only; never edit applied migrations |
| R3 — Production emergency | Data corruption | Freeze wallets; disable webhooks; restore PITR backup (Supabase Pro) |

---

## D. Edge Function Build Order

Build in dependency layers; deploy to staging incrementally.

### Layer 0 — Infrastructure (Sprint 0)

| Order | Function | Depends on |
| ----- | -------- | ---------- |
| 0.1 | Shared middleware (request_id, auth, errors, rate limit) | Supabase client |
| 0.2 | `/v1/health` | None |

### Layer 1 — Identity (Sprint 1–2)

| Order | Function | Depends on |
| ----- | -------- | ---------- |
| 1.1 | `/v1/register-student` | Migrations 004–005, auth |
| 1.2 | `/v1/send-notification` | 012 notifications |
| 1.3 | `/v1/admin/approve-photo` | 015 storage, S3 gate |

### Layer 2 — Wallet reads (Sprint 3)

| Order | Function | Depends on |
| ----- | -------- | ---------- |
| 2.1 | `/v1/wallet-summary` | F2, 005 |

### Layer 3 — Payments (Sprint 4) 🔴

| Order | Function | Depends on |
| ----- | -------- | ---------- |
| 3.1 | `/v1/initiate-payment` | 009, 006, F2, verified gate |
| 3.2 | `/v1/flutterwave-webhook` | 011 webhook_events, F2 stacking |
| 3.3 | `/v1/verify-payment-status` | 009, Flutterwave API |
| 3.4 | `expire-pending-payments` (cron) | 009 expires_at |

**Do not enable production Flutterwave until 3.1–3.4 pass Gate G4.**

### Layer 4 — QR (Sprint 5)

| Order | Function | Depends on |
| ----- | -------- | ---------- |
| 4.1 | `/v1/generate-qr-token` | 008 qr_tokens, S3 verified |
| 4.2 | `cleanup-qr-tokens` (cron) | 008 |

### Layer 5 — Redemption (Sprint 7) 🔴

| Order | Function | Depends on |
| ----- | -------- | ---------- |
| 5.1 | `/v1/validate-qr-token` | 4.1, 008 validation_sessions, signed photo URL |
| 5.2 | `/v1/redeem-meal` | 5.1, F3, F2, 007 daily_menus |
| 5.3 | `/v1/student/receipt/{id}` | 008 transactions |

### Layer 6 — Reconciliation (Sprint 8) 🔴

| Order | Function | Depends on |
| ----- | -------- | ---------- |
| 6.1 | `reconcile-wallets` (cron) | 011, F2 |
| 6.2 | `reconcile-payments` (cron) | 011, 009 |
| 6.3 | `/v1/admin/reconciliation` | 6.1, 6.2 |
| 6.4 | `/v1/admin/reconcile-payment` | 3.3, 011 |
| 6.5 | `/v1/admin/financial-summary` | 009, 010, 011 |

### Layer 7 — Payouts (Sprint 9) 🔴

| Order | Function | Depends on |
| ----- | -------- | ---------- |
| 7.1 | `calculate-payouts` (cron) | F4, 010, 008 transactions |
| 7.2 | `/v1/admin/calculate-payouts` | 7.1 |
| 7.3 | `/v1/admin/approve-payout` | 7.1, G8 no open drift |
| 7.4 | `/v1/admin/export-payouts` | 7.1 |

### Layer 8 — Admin & ops (Sprint 10)

| Order | Function | Depends on |
| ----- | -------- | ---------- |
| 8.1 | `/v1/admin/issue-refund` | F2 dining_cash credit |
| 8.2 | `/v1/admin/void-redemption` | 5.2 reversal |
| 8.3 | `/v1/admin/adjust-wallet` | wallet_adjustments |
| 8.4 | `/v1/admin/rollover-semester` | F5 |
| 8.5 | `expire-semester-balances` (cron) | F5 |
| 8.6 | `aggregate-daily-stats` (cron) | 012 stats tables |
| 8.7 | `send-low-balance-alerts` (cron) | 003 thresholds |
| 8.8 | `/v1/admin/fraud-alerts` | 012 |
| 8.9 | `/v1/admin/audit-events` | 012 |
| 8.10 | `/v1/admin/suspend-user` | auth admin API |

### Layer 9 — Restaurant (Sprint 6–7)

| Order | Function | Depends on |
| ----- | -------- | ---------- |
| 9.1 | `/v1/register-restaurant-application` | 007 applications |
| 9.2 | `/v1/admin/approve-restaurant` | 007 |
| 9.3 | `/v1/invite-staff` | auth invite |
| 9.4 | `/v1/restaurant/dashboard-stats` | 008, 012 daily_restaurant_stats |
| 9.5 | `/v1/restaurant/copy-daily-menu` | 007 daily_menus |

### Layer 10 — Optional / post-MVP pilot

| Order | Function | Depends on |
| ----- | -------- | ---------- |
| 10.1 | `process-flutterwave-settlement` | 011 settlement_lines |
| 10.2 | `prewarm-functions` | layers 3–5 deployed |
| 10.3 | `reconcile-payouts` | 7.1 |

**Edge Function rollback:** Deploy previous version via Supabase CLI; feature-flag disable route in Next.js middleware if critical bug.

---

## E. Frontend Build Order

Frontend follows **backend gates** — UI must not ship flows before corresponding Gate passes.

### Phase 1 — Shell (Sprint 0–1)

| Order | Surface | Depends on | Engineer |
| ----- | ------- | ---------- | -------- |
| E-F1 | Design tokens + layout components | Design system doc | E3 |
| E-F2 | Public pages (home, login, register) | S1 auth | E3 |
| E-F3 | Middleware: role routes `(public)`, `(student)`, `(restaurant)`, `(admin)` | G1 | E3 |

### Phase 2 — Student onboarding (Sprint 2–3)

| Order | Surface | Depends on | Engineer |
| ----- | ------- | ---------- | -------- |
| E-F4 | Student profile + photo upload | G2 | E3 |
| E-F5 | Student dashboard (balances read-only) | G3 | E3 |
| E-F6 | Meal plan catalog page | S5 | E3 |

### Phase 3 — Money UI (Sprint 4)

| Order | Surface | Depends on | Engineer |
| ----- | ------- | ---------- | -------- |
| E-F7 | Plan purchase + MoMo phone entry | **G4** | E3 |
| E-F8 | Dining Cash top-up | **G4** | E3 |
| E-F9 | Payment status / retry UX | 3.3 verify | E3 |

### Phase 4 — Digital card (Sprint 5)

| Order | Surface | Depends on | Engineer |
| ----- | ------- | ---------- | -------- |
| E-F10 | Digital student card + QR countdown | **G5** | E3 |

### Phase 5 — Restaurant (Sprint 6–7)

| Order | Surface | Depends on | Engineer |
| ----- | ------- | ---------- | -------- |
| E-F11 | Restaurant manager: menu/extras CRUD | G6 | E3 |
| E-F12 | Restaurant scanner + redemption wizard | **G7** | E3 |
| E-F13 | Restaurant transactions list | 5.2 | E3 |

### Phase 6 — Admin (Sprint 2–9, incremental)

| Order | Surface | Depends on | Engineer |
| ----- | ------- | ---------- | -------- |
| E-F14 | Admin: photo approval queue | G2 | E1/E3 |
| E-F15 | Admin: universities, semesters, plans | Sprint 3 | E1 |
| E-F16 | Admin: restaurant approval | Sprint 6 | E1 |
| E-F17 | Admin: reconciliation dashboard | **G8** | E2/E3 |
| E-F18 | Admin: payouts approval | **G9** | E2/E3 |
| E-F19 | Admin: fraud alerts + audit log | Sprint 10 | E1 |

### Phase 7 — Polish (Sprint 10–11)

| Order | Surface | Depends on | Engineer |
| ----- | ------- | ---------- | -------- |
| E-F20 | Notifications center | S14 | E3 |
| E-F21 | Transaction history + receipts | 5.3 | E3 |
| E-F22 | Error states (network, QR expired) | — | E3 |

**Deferred post-MVP (Phase 2):** Map (Leaflet), push notifications, restaurant analytics charts.

---

## F. Infrastructure Build Order

| Order | Component | Depends on | Owner | When |
| ----- | --------- | ---------- | ----- | ---- |
| I-1 | GitHub repo + branch protection | — | E1 | Sprint 0 |
| I-2 | Supabase staging project (Pro) | — | E1 | Sprint 0 |
| I-3 | Supabase production project (Pro) | I-2 validated | E1 | Sprint 10 |
| I-4 | Vercel staging (preview deploys) | I-1 | E1 | Sprint 0 |
| I-5 | Vercel production domain | I-3 | E1 | Sprint 11 |
| I-6 | CI: lint, tsc, migration validate | I-1 | E1 | Sprint 0 |
| I-7 | CI: RLS policy test job | 016 | E1 | Sprint 2 |
| I-8 | Supavisor connection pooling | I-2 | E1 | Sprint 4 |
| I-9 | Upstash Redis (rate limits) | Edge Layer 0 | E1 | Sprint 7 |
| I-10 | Sentry (Next.js + Edge Functions) | I-4 | E1 | Sprint 1 |
| I-11 | Supabase secrets (QR, Flutterwave) | I-2 | E2 | Sprint 4–5 |
| I-12 | Flutterwave sandbox webhook URL | I-4 BFF | E2 | Sprint 4 |
| I-13 | Flutterwave production webhook URL | I-5, G10 | E2 | Sprint 12 |
| I-14 | pg_cron extension + job registration | 013, Pro plan | E2 | Sprint 8 |
| I-15 | Uptime monitor on `/v1/health` | 0.2 | E1 | Sprint 1 |
| I-16 | Email provider (Resend) production | send-notification | E2 | Sprint 10 |
| I-17 | SMS provider (optional MVP) | — | E2 | Sprint 11 |
| I-18 | Backup restore drill | I-3 | E1 | Sprint 11 |

**Infrastructure rollback:** Vercel instant rollback to prior deployment; Supabase PITR for database; disable webhooks at Flutterwave dashboard as circuit breaker.

---

## G. QA Plan

### G.1 Test Layers

| Layer | Owner | When | Tools |
| ----- | ----- | ---- | ----- |
| Migration smoke | E1 | Every PR touching SQL | `supabase db reset`, seed |
| RLS matrix | E1 | Sprint 2+ every PR | Automated SQL/pgTAP or custom script |
| DB function unit | E2 | Sprint 3+ | pgTAP or Edge Function test harness |
| Edge Function integration | E2 | Per function layer | Deno test + staging Supabase |
| API contract | E2 | Sprint 4+ | OpenAPI or snapshot tests |
| E2E critical paths | E3 | Sprint 7+ | Playwright |
| Load / soak | E2 | Sprint 11 | k6 or Artillery |
| Security | E1 | Sprint 11 | RLS audit, secret scan, MFA verify |
| UAT | Product/Ops | Sprint 12 | Pilot checklist |

### G.2 Critical Test Cases (must pass before production)

| ID | Scenario | Gate |
| -- | -------- | ---- |
| TC-01 | Student registers → wallet zero balances | G1 |
| TC-02 | Unverified student blocked from pay and QR | G2 |
| TC-03 | Admin approves photo → student verified | G2 |
| TC-04 | Plan purchase stacks swipes + dining plus | G4 |
| TC-05 | Second plan purchase adds (does not replace) | G4 |
| TC-06 | Duplicate webhook does not double-credit | G4 |
| TC-07 | Pending payment expires at 15 min | G4 |
| TC-08 | verify-payment-status recovers missed webhook | G4 |
| TC-09 | QR expires at 120s | G5 |
| TC-10 | QR single-use after redeem | G7 |
| TC-11 | Validation session expires at 5 min | G7 |
| TC-12 | Redeem deducts 1 swipe + extras (plus then cash) | G7 |
| TC-13 | Daily limit 2 swipes enforced | G7 |
| TC-14 | Cooldown 3 hours enforced | G7 |
| TC-15 | Concurrent redeem — only one succeeds | G7 |
| TC-16 | Student cannot read sauce internal pricing | G6 |
| TC-17 | Wallet ledger sum = cached balance (all students) | G8 |
| TC-18 | Payout line items = redemption count × rate | G9 |
| TC-19 | Rate precedence restaurant → tier → university | G9 |
| TC-20 | Semester expiry zeros swipe/plus; not cash | Sprint 10 |
| TC-21 | Refund credits dining_cash only | Sprint 10 |
| TC-22 | 500 concurrent QR / 200 concurrent redeem | G10 |

### G.3 Regression cadence

- **Daily (staging):** TC-04, TC-11, TC-12 during active sprint
- **Weekly:** Full critical path TC-01 → TC-15
- **Pre-release:** All TC-01 → TC-22

### G.4 Defect severity

| Severity | Definition | Release blocker |
| -------- | ---------- | --------------- |
| S0 | Money wrong (double credit, lost payment) | Yes |
| S1 | Cannot redeem or pay | Yes |
| S1 | RLS leak (student sees internal cost) | Yes |
| S2 | Wrong balance display (ledger correct) | No — fix fast |
| S3 | UI/copy issues | No |

---

## H. Production Release Plan

### H.1 Pre-release checklist (Gate G11)

**Documentation & policy**
- [ ] [Business Rules v1.0](./business-rules.md) signed off
- [ ] Semester rollover runbook written
- [ ] Stuck payment support runbook written
- [ ] Incident response on-call roster assigned

**Infrastructure**
- [ ] Supabase Pro production + PITR enabled
- [ ] Supavisor enabled
- [ ] Vercel production domain + SSL
- [ ] Upstash Redis production
- [ ] Sentry production projects
- [ ] Backup restore drill completed (I-18)

**Security**
- [ ] RLS matrix 100% pass
- [ ] Admin MFA enforced
- [ ] Service role key not in client bundle (CI scan)
- [ ] Flutterwave webhook signature verified in prod config
- [ ] QR signing secret rotated from staging default

**Financial**
- [ ] Flutterwave merchant KYC complete (production keys)
- [ ] Gate G4 passed on staging with production-like volumes
- [ ] Gate G8 — zero wallet drift for 7 consecutive nights on staging
- [ ] Gate G9 — payout spreadsheet reconciled for sample week
- [ ] Finance sign-off on financial-summary metrics

**Operational**
- [ ] Gate G10 load test passed
- [ ] Restaurant staff training completed (scanner + identity check)
- [ ] Admin trained on photo approval + payment reconciliation
- [ ] Pilot university configured (1 semester, 2+ restaurants, 3 plans)

### H.2 Release phases

| Phase | Audience | Duration | Rollback trigger |
| ----- | -------- | -------- | ---------------- |
| **P0 — Internal dogfood** | Team + 5 test students | 3 days | Any S0/S1 |
| **P1 — Closed pilot** | 100 students, 2 restaurants | 2 weeks | S0; >1% payment failure |
| **P2 — University launch** | Full cohort ~10k | Gradual | S0; reconciliation drift |
| **P3 — Multi-university** | +universities | Post-MVP | Per-university flags |

### H.3 Release day sequence

1. **T-24h:** Freeze migrations; tag release `v1.0.0-rc`
2. **T-4h:** Deploy DB migrations to production (maintenance window)
3. **T-2h:** Deploy Edge Functions production
4. **T-1h:** Deploy Vercel production; smoke TC-01, TC-12 on prod with test accounts
5. **T-0:** Enable Flutterwave production webhook
6. **T+1h:** Monitor Sentry, reconciliation dashboard, payment success rate
7. **T+24h:** Go/no-go review; expand pilot if metrics green

### H.4 Rollback playbook

| Symptom | Immediate action | Recovery |
| ------- | ---------------- | -------- |
| Double wallet credit | Disable webhook URL; freeze affected wallets | Admin adjust; root cause; replay from webhook log |
| Redemption loop bug | Feature flag `redemption_enabled=false` | Deploy fix; void bad transactions |
| RLS data leak | Take affected portal offline | Patch RLS migration 018; audit access logs |
| Mass payment failure | Check Flutterwave status; keep webhook on | verify-payment-status backlog |
| Wallet drift detected | Block payout approval; pause cron credit jobs | reconcile-wallets; manual ledger fix |

### H.5 Success metrics (first 30 days)

| Metric | Target |
| ------ | ------ |
| Payment success rate | > 95% |
| Webhook processing success | > 99% |
| Wallet reconciliation drift | 0 open issues |
| Redemption failure rate (valid users) | < 2% |
| Photo approval SLA | < 48h |
| S0/S1 incidents | 0 |

---

## Dependency Graph (Visual Summary)

```
INFRA (I-1..I-6)
    │
    ▼
MIGRATIONS 001–017 (M-DB gate)
    │
    ├──► AUTH (S1) ──► VERIFICATION (S3) ──► QR (S7) ──► REDEMPTION (S9)
    │                                                      │
    ├──► WALLETS (S4) ──► PAYMENTS (S6) ──► RECONCILIATION (S10)
    │         │                │                    │
    │         └────────────────┴────────────────────┼──► PAYOUTS (S11)
    │                                               │
    └──► RESTAURANT CATALOG (S5) ────────────────────┘
                                                      │
FRONTEND (E-F*) ◄── gates G1–G10 ────────────────────┘
                                                      │
                                              PRODUCTION (G11)
```

---

## Parallel Work Safe Zones

Work that can proceed **without blocking** the critical money path:

| Can start early | Must wait for |
| --------------- | ------------- |
| Public marketing pages (E-F2) | Nothing |
| Design system components (E-F1) | Nothing |
| Restaurant menu UI mock (no save) | G6 for real data |
| Admin layout shell | G1 for auth |
| Notification templates | send-notification stub |
| Playwright test scaffolding | G1 for login flow |
| Load test script authoring | G7 for meaningful redeem load |

**Never parallelize:** Production Flutterwave keys before G4; payout approval before G8; pilot before G10.

---

## Document Index

| Need | Read |
| ---- | ---- |
| Business policy | [business-rules.md](./business-rules.md) |
| Schema & API detail | [technical-foundation-v2.md](./technical-foundation-v2.md) |
| Risk history | [architecture-review.md](./architecture-review.md) |
| This execution plan | **MVP Implementation Roadmap.md** (this file) |

---

*Last updated: aligned with Technical Foundation v2. Adjust sprint dates to team velocity; do not reorder Layer 3–7 Edge Functions or Phase B–D migrations without Staff Engineer review.*
