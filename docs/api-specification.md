# LunchLink API Specification

**Version:** 0.1 (draft for build)
**Status:** Engineering contract — derived from source docs; field-level shapes must be reconciled against live schema before coding (see "How to use this document")
**Sources:** [Technical Foundation v2](./technical-foundation-v2.md) §13–14 · [Business Rules](./business-rules.md) · [MVP Implementation Roadmap](./MVP%20Implementation%20Roadmap.md) §D
**Audience:** Engineering (Edge Function + frontend), QA

---

## How to use this document

This spec is assembled from the **authoritative narrative docs**, not from the migrations directly. The endpoint inventory, roles, envelope, error codes, rate limits, and business rules below are faithful to those sources. **Request/response field names are a proposed contract** — they express intent but were not copied from the actual table columns, because the migrations were not read when this was drafted.

**Before any endpoint is implemented, reconcile its request/response shape against:**

1. The migration that owns the relevant table (e.g. `005_wallets.sql`, `008_qr_transactions.sql`, `009_payments.sql`).
2. The generated `packages/types/src/database.types.ts` (`Tables<>` / `Enums<>`).
3. The shared envelope/error types in `packages/types/src/index.ts` (the success/error envelope here must match what's already defined there — if they differ, the code wins and this doc gets corrected).

Treat this as the **single source for the HTTP contract** (paths, methods, roles, status codes, error semantics, business-rule references) and treat the live schema as the source for **exact field names and types**.

---

## 1. Conventions

### 1.1 Base paths & layers (Technical Foundation §14.1)

| Layer | Base path | Use |
| ----- | --------- | --- |
| Edge Functions | `/functions/v1/` (referred to as `/v1/` below) | All money, QR, redemption, admin, reconciliation |
| PostgREST | `/rest/v1/` | RLS-protected campus reads + safe simple writes (restaurants, daily_menus, extras, meal_plans, own transactions/wallets) |
| Next.js BFF | `/api/` | Flutterwave webhook proxy, auth callback only |

**Removed from direct client (PostgREST) access:** any wallet mutation, payment initiation, QR operation. Those are Edge-Function-only and run under `service_role`.

### 1.2 Authentication & roles

Every non-public request carries a Supabase JWT: `Authorization: Bearer <access_token>`. Role is read from the JWT claim set by the custom access-token hook (Roadmap S1). Roles referenced in this spec:

| Role | Who | Resolved by |
| ---- | --- | ----------- |
| `public` | unauthenticated, allowed | — |
| `anon` | authenticated via GoTrue but not yet provisioned (e.g. just after signup) | — |
| `student` | provisioned, campus-scoped | `current_student_id()` / `current_university_id()` |
| `restaurant` | staff account at a restaurant | `current_restaurant_id()` |
| `manager` | restaurant role with menu/staff rights | staff_accounts role |
| `admin` | platform LunchLink Admin | `is_admin_or_university_admin()` |
| `service` | server-to-server (`service_role` key); never client-exposed | — |
| `signature` | unauthenticated but verified by Flutterwave `verif-hash` | webhook signature check |

**Money/redemption boundary (enforce in code review):** Edge Functions authorize the *caller*, then call the Postgres functions (`apply_wallet_delta`, `check_redemption_eligibility`, `resolve_swipe_rate`, `generate_receipt_number`, `expire_semester_balances`) under `service_role`. Edge Functions never reimplement that logic — they wire to it. `apply_wallet_delta` is not `EXECUTE`-grantable to `authenticated` (`017_grants.sql`).

### 1.3 Standard success envelope (Technical Foundation §13.3)

```json
{
  "data": { "...": "endpoint-specific payload" },
  "meta": { "request_id": "uuid", "timestamp": "2025-06-19T10:00:00Z" }
}
```

### 1.4 Standard error envelope

> Proposed — confirm against `packages/types/src/index.ts`. If the existing envelope differs, adopt the existing one and update this section.

```json
{
  "error": {
    "code": "WALLET_FROZEN",
    "message": "Human-readable summary, safe to surface to UI.",
    "details": { "...": "optional structured context" }
  },
  "meta": { "request_id": "uuid", "timestamp": "2025-06-19T10:00:00Z" }
}
```

### 1.5 Headers

| Header | Direction | Notes |
| ------ | --------- | ----- |
| `Authorization: Bearer <jwt>` | request | Required for all non-public roles |
| `X-Request-ID` | request + response | Client may supply; server generates if absent. Propagated into audit/ledger metadata (Technical Foundation §11.3 step 11) |
| `Content-Type: application/json` | request | All POST/PATCH bodies |
| `verif-hash` | request (webhook only) | Flutterwave signature; verified before processing |

### 1.6 HTTP status conventions

| Status | When |
| ------ | ---- |
| `200` | Successful GET / idempotent POST |
| `201` | Resource created (e.g. registration, payment initiation) |
| `202` | Accepted for async processing (webhook acknowledged) |
| `400` | Malformed request / Zod validation failure (`details` carries field errors) |
| `401` | Missing/invalid JWT |
| `403` | Authenticated but role/ownership/verification gate fails |
| `404` | Resource not found or not visible under RLS |
| `409` | Conflict — already consumed, duplicate intent, locked period |
| `422` | Business-rule rejection (e.g. cooldown, daily limit, insufficient balance) |
| `429` | Rate limited |
| `5xx` | Unhandled server/provider error |

### 1.7 Error code registry

Domain codes (Technical Foundation §14.3) plus the validation/auth codes this contract assumes. Confirm the full enum against `packages/types`.

| Code | HTTP | Meaning |
| ---- | ---- | ------- |
| `VALIDATION_FAILED` | 400 | Zod/schema validation failed; `details` lists fields |
| `UNAUTHENTICATED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Role/ownership/campus check failed |
| `NOT_VERIFIED` | 403 | Student photo not approved (Business Rules §3.3–3.4) |
| `NOT_FOUND` | 404 | Resource absent or RLS-hidden |
| `WALLET_FROZEN` | 422 | Wallet under investigation (Business Rules §4.8) |
| `INSUFFICIENT_BALANCE` | 422 | Swipe or combined Plus+Cash insufficient |
| `DAILY_LIMIT_REACHED` | 422 | >2 redemptions in Kampala calendar day (§10.3) |
| `COOLDOWN_ACTIVE` | 422 | <3h since last redemption (§10.3) |
| `QR_EXPIRED` | 409 | Token past 120s TTL |
| `QR_ALREADY_USED` | 409 | Single-use token already consumed (§12.2) |
| `VALIDATION_SESSION_EXPIRED` | 409 | Staff exceeded 5-min session window |
| `RESTAURANT_CLOSED` | 422 | Outside operating hours (§6.12) |
| `SAUCE_UNAVAILABLE` | 422 | Not on daily menu or stock zero (§6.5, §12.4) |
| `PAYMENT_EXPIRED` | 409 | Pending payment past 15-min TTL |
| `DUPLICATE_WEBHOOK` | 200/202 | Already-success payment; webhook ignored (not an error to the caller) |
| `RECONCILIATION_BLOCKED` | 422 | Action blocked by open wallet drift issues (§8.6) |
| `PAYOUT_PERIOD_LOCKED` | 409 | Approved period is immutable (§8.7) |
| `RATE_LIMITED` | 429 | Too many requests |

### 1.8 Rate limits (Technical Foundation §14.4 — Upstash Redis)

| Endpoint | Limit |
| -------- | ----- |
| `generate-qr-token` | 30 / hour / student |
| `validate-qr-token` | 60 / min / restaurant |
| `redeem-meal` | 20 / min / restaurant |
| `initiate-payment` | 10 / hour / student |
| Auth login | 10 / min / IP |

### 1.9 Idempotency

- **Wallet mutations** dedupe inside `apply_wallet_delta` on `(reference_type, reference_id, wallet_type)` — Edge Functions must pass a stable reference (payment id, transaction id) so retries don't double-credit.
- **Payments:** webhook and `verify-payment-status` are both idempotent against `payments.status`; a second success is `DUPLICATE_WEBHOOK`.
- **Redemption:** the QR token's single-use `UPDATE ... WHERE consumed_at IS NULL` is the idempotency guard; concurrent scans yield one `200` and one `QR_ALREADY_USED`.

### 1.10 Money & amounts

All monetary fields are **UGX integers** (no decimal subunit). `swipe` balances are integer counts. Timezone for all calendar-day logic is `Africa/Kampala`.

---

## 2. Layer 0 — Infrastructure

### `GET /v1/health` — role: `public`
Uptime check. Returns `{ status: "ok", request_id }`. No auth, no rate limit.

Shared middleware (Roadmap 0.1) wraps every function below with: request_id assignment, JWT/role resolution, error→envelope mapping, and Redis rate limiting.

---

## 3. Layer 1 — Identity

### `POST /v1/register-student` — role: `anon`
Post-signup provisioning. Runs after GoTrue creates the auth user. In one transaction, inserts `profiles` → `students` → `student_wallets` (three balances at zero). (Roadmap S2; Business Rules §3.1.)

**Request**
```json
{
  "full_name": "string",
  "phone": "+2567XXXXXXXX",
  "student_number": "string",
  "university_id": "uuid"
}
```
**Success `201`** — `data`: provisioned `{ profile_id, student_id, wallet: { swipe: 0, dining_plus: 0, dining_cash: 0 } }`.
**Errors** — `VALIDATION_FAILED`; `409` if `(university_id, student_number)` already exists; `NOT_FOUND` if university invalid.
**Notes** — email/password are GoTrue's concern; this function provisions app rows only. Idempotent on the auth user id (re-call must not create duplicate rows).

### `POST /v1/admin/approve-photo` — role: `admin`
Photo review state machine. Sets `photo_approvals` / student `photo_status` to `approved` or `rejected`; approval flips the student to **Verified**. (Business Rules §3.3; Roadmap S3.)

**Request** — `{ student_id, decision: "approved" | "rejected", reason?: "string" }`
**Success `200`** — `data`: `{ student_id, photo_status, verified: boolean }`.
**Errors** — `FORBIDDEN`; `NOT_FOUND`; `VALIDATION_FAILED` (rejection requires `reason`).
**Side effects** — audit event; triggers `send-notification`.

### `POST /v1/send-notification` — role: `service`
Internal dispatch (email via Resend; SMS optional). Not called directly by clients. (Roadmap 1.2.)
**Request** — `{ recipient_id, channel: "email" | "sms", template, payload }`.

---

## 4. Layer 2 — Wallet reads

### `GET /v1/wallet-summary` — role: `student`
Balances + recent ledger for the calling student. Reads only; no mutation. (Roadmap 2.1.)

**Success `200`**
```json
{
  "data": {
    "balances": { "swipe": 12, "dining_plus": 30000, "dining_cash": 15000 },
    "lunch_credits": 45000,
    "active_semester": { "id": "uuid", "ends_at": "date" },
    "recent_ledger": [
      { "id": "uuid", "wallet_type": "swipe", "delta": -1, "balance_after": 12,
        "reference_type": "redemption", "reference_id": "uuid", "created_at": "ts" }
    ]
  },
  "meta": { "...": "..." }
}
```
`lunch_credits` is the display-only sum of `dining_plus + dining_cash` (Business Rules §4.5). Confirm ledger column names against `005_wallets.sql`.

---

## 5. Layer 3 — Payments 🔴

> Production Flutterwave keys forbidden until **Gate G4** passes (Roadmap). Built behind a provider interface; Flutterwave is the only concrete implementation in MVP, with direct MTN/Airtel as a future implementation. `payment_provider` enum records the *rail* (`mtn_momo` / `airtel_money`); Flutterwave is the *aggregator* — keep these distinct, do not collapse.

### `POST /v1/initiate-payment` — role: `student` (verified)
Starts a plan purchase or Dining Cash top-up. Inserts `payments` (`status=pending`, `expires_at=now()+15min`) then initiates the Flutterwave charge. (Technical Foundation §10.2.)

**Request**
```json
{
  "type": "meal_plan" | "dining_cash_top_up",
  "meal_plan_id": "uuid (required when type=meal_plan)",
  "amount_ugx": 50000,            // required when type=dining_cash_top_up; within admin min/max
  "rail": "mtn_momo" | "airtel_money",
  "phone": "+2567XXXXXXXX"
}
```
**Success `201`** — `data`: `{ payment_id, tx_ref, status: "pending", expires_at, provider_redirect?: "url|null" }`.
**Errors** — `NOT_VERIFIED`; `VALIDATION_FAILED`; `INSUFFICIENT_BALANCE` n/a here; `RATE_LIMITED`; top-up outside limits → `VALIDATION_FAILED`.
**Business rules** — verified-only (§5.3); top-up limits (§5.6); wallets credited only on confirmed success (§8.5).

### `POST /v1/flutterwave-webhook` — role: `signature`
Process payment webhook. Always logs raw payload to `flutterwave_webhook_events` first, then verifies signature + amount + status, and on success marks `payments.success` and credits the wallet via `apply_wallet_delta` (idempotent stacking). (Technical Foundation §10.2–10.3.)

**Request** — Flutterwave payload (verified via `verif-hash`).
**Success `202`** — `data`: `{ processed: true, payment_id, outcome: "credited" | "ignored_duplicate" }`.
**Rules** — log-always; signature must be valid; webhook `amount` must equal `payments.amount_ugx`; if payment already `success` → `ignored_duplicate` (TC-06, no double credit). Crediting: meal_plan → `+swipe, +dining_plus`; top-up → `+dining_cash` (§12.1).

### `GET /v1/verify-payment-status` — role: `student`
Poll + server-side Flutterwave verify; recovers a missed webhook (TC-08). Runs the same idempotent credit path as the webhook.
**Query** — `?payment_id=uuid` (or `tx_ref`).
**Success `200`** — `data`: `{ payment_id, status: "pending" | "success" | "expired" | "failed", balances_after?: {...} }`.
**Errors** — `PAYMENT_EXPIRED` (409) if past TTL and not successful.

### `expire-pending-payments` — cron `*/5 * * * *`
Marks `payments` past `expires_at` as `expired` (TC-07). Never deletes payment rows in prod.

---

## 6. Layer 4 — QR

### `POST /v1/generate-qr-token` — role: `student` (verified)
Mints a single-use, 120s-TTL signed token (HMAC/JWT; `jti` hashed in DB). (Technical Foundation §11.1; Roadmap 4.1.)
**Request** — `{}` (subject is the caller). Optionally `{ device_fingerprint }`.
**Success `201`** — `data`: `{ token, jti, expires_at, refresh_after_seconds: 120 }`.
**Errors** — `NOT_VERIFIED`; `WALLET_FROZEN`; `RATE_LIMITED` (30/hr). >30/hr also raises `excessive_qr_generation` fraud alert (§11.6).

### `cleanup-qr-tokens` — cron `0 3 * * *`
Deletes consumed/expired tokens older than 7 days.

---

## 7. Layer 5 — Redemption 🔴

### `POST /v1/validate-qr-token` — role: `restaurant`
Staff scans the student credential. Previews the student (incl. signed photo URL for the visual identity check, §10.2) and creates a `validation_sessions` row (5-min TTL) binding token+student+restaurant+staff. Does **not** deduct anything. (Technical Foundation §11.2.)

**Request** — `{ token }`.
**Success `200`**
```json
{
  "data": {
    "validation_id": "uuid",
    "expires_at": "ts (+300s)",
    "student": { "full_name": "string", "student_number": "string", "photo_url": "signed-url" },
    "swipe_balance": 12,
    "eligibility": { "ok": true, "reasons": [] }
  }, "meta": {"...": "..."}
}
```
**Errors** — `QR_EXPIRED`, `QR_ALREADY_USED`, `NOT_VERIFIED`, `WALLET_FROZEN`, `FORBIDDEN` (token's university ≠ staff's), `RATE_LIMITED` (60/min). Eligibility failures (cooldown/daily limit) may be previewed here as `eligibility.ok=false` so staff don't proceed.

### `POST /v1/redeem-meal` — role: `restaurant`
Atomic redemption. Takes `validation_id` (preferred) and the sauce + optional extras. Runs the full atomic checklist in one transaction (Technical Foundation §11.3): lock wallet → `check_redemption_eligibility()` → consume validation_session + qr_token → sauce/hours/stock checks → deduct 1 swipe + extras (Plus then Cash) via `apply_wallet_delta` → insert `transactions` + `transaction_extras` + `generate_receipt_number()` → ledger → `last_redemption_at` → audit.

**Request**
```json
{
  "validation_id": "uuid",
  "sauce_id": "uuid",
  "extras": [ { "extra_id": "uuid", "quantity": 1 } ]
}
```
**Success `201`**
```json
{
  "data": {
    "transaction_id": "uuid",
    "receipt_number": "string",
    "swipe_deducted": 1,
    "extras_charged_ugx": 3000,
    "wallet_after": { "swipe": 11, "dining_plus": 27000, "dining_cash": 15000 }
  }, "meta": {"...": "..."}
}
```
**Errors** — `VALIDATION_SESSION_EXPIRED`, `QR_ALREADY_USED` (concurrent scan, TC-15), `COOLDOWN_ACTIVE`, `DAILY_LIMIT_REACHED`, `INSUFFICIENT_BALANCE` (swipe<1, or Plus+Cash < extras → see §12.3), `RESTAURANT_CLOSED`, `SAUCE_UNAVAILABLE`, `WALLET_FROZEN`.
**Rules** — extras spending priority Plus→Cash (§4.6); partial extras deduction not permitted (§12.3); one swipe regardless of sauce (§6.2).

### `GET /v1/student/receipt/{id}` — role: `student`
Returns a redemption or payment receipt owned by the caller. `404` if not owned.

---

## 8. Layer 6 — Reconciliation 🔴

### `reconcile-wallets` — cron `0 2 * * *`
Nightly: per `student_wallets` row, compares cached balances to `SUM(wallet_ledger_entries.delta)` by wallet_type; mismatches → `wallet_reconciliation_issues`; run fails if any open. **Open issues block payout approval for that university** (TC-17, §8.6).

### `reconcile-payments` — cron `0 * * * *`
Hourly webhook-vs-payment match; unmatched successful payments queue for `admin/reconcile-payment`.

### `GET /v1/admin/reconciliation` — role: `admin`
Reconciliation dashboard: latest `reconciliation_runs`, open `wallet_reconciliation_issues`, unmatched settlement lines.

### `POST /v1/admin/reconcile-payment` — role: `admin`
Resolve a stuck payment after the Flutterwave verify API confirms truth. Runs the idempotent credit path or marks failed; writes audit + reason.

### `GET /v1/admin/financial-summary` — role: `admin`
Per university + Kampala date range (Technical Foundation §10.6): plan collections, top-up collections, swipe liability, platform gross margin (collections − liability; no extras commission), extras volume (informational), open reconciliation issues, pending payments.
**Query** — `?university_id=&from=&to=`.

---

## 9. Layer 7 — Payouts 🔴

### `calculate-payouts` / `POST /v1/admin/calculate-payouts` — cron `0 6 * * 1` + admin trigger
Weekly draft (Mon 06:00 EAT). Builds `payouts` + `payout_line_items` (1 line per redemption) using `resolve_swipe_rate()` precedence restaurant→tier→university, snapshotting the rate. Extras excluded (§8.2). (TC-18, TC-19.)

### `POST /v1/admin/approve-payout` — role: `admin`
Finance approval: `draft` → `approved` (then `paid` on disbursement record). Blocked by `RECONCILIATION_BLOCKED` if the university has open wallet drift (Gate G8). After approval the period is locked — later edits → `PAYOUT_PERIOD_LOCKED` (§8.7).
**Request** — `{ payout_id, secondary_approver_id?: "uuid" }` (dual approval above threshold).

### `POST /v1/admin/export-payouts` — role: `admin`
CSV export of a payout period. Each line shows swipe count and applied rate.

---

## 10. Layer 8 — Admin & ops

| Endpoint | Method | Role | Purpose / rule |
| -------- | ------ | ---- | -------------- |
| `/v1/admin/issue-refund` | POST | admin | Credits **dining_cash only** (§9.1); creates `refunds` + ledger; dual approval above threshold; no Flutterwave reversal |
| `/v1/admin/void-redemption` | POST | admin | Fraud reversal of a redemption with ledger reversal; sets `excluded_from_payout` |
| `/v1/admin/adjust-wallet` | POST | admin | Manual `wallet_adjustments` with documented reason + approver; dual approval above threshold (§4.7) |
| `/v1/admin/rollover-semester` | POST | admin | Semester transition; activates new semester, expires prior swipe/plus (§11.3) |
| `/v1/admin/suspend-user` | POST | admin | Suspend account (§3.6); uses auth admin API |
| `/v1/admin/fraud-alerts` | GET/PATCH | admin | Fraud queue: list / update status |
| `/v1/admin/audit-events` | GET | admin | Immutable audit search (§10.6) |

**Crons in this layer:** `expire-semester-balances` (`0 0 * * *`, zeros swipe/plus, never dining_cash — TC-20); `aggregate-daily-stats` (`0 1 * * *`); `send-low-balance-alerts` (`0 8 * * *`).

---

## 11. Layer 9 — Restaurant

| Endpoint | Method | Role | Purpose |
| -------- | ------ | ---- | ------- |
| `/v1/register-restaurant-application` | POST | anon/public | Public restaurant signup → `restaurant_applications` |
| `/v1/admin/approve-restaurant` | POST | admin | Activate restaurant + tier assignment (§6.1, §6.9) |
| `/v1/invite-staff` | POST | manager | Invite staff via auth invite |
| `/v1/restaurant/dashboard-stats` | GET | restaurant | Today's redemptions / `daily_restaurant_stats` |
| `/v1/restaurant/copy-daily-menu` | POST | manager | Copy previous day's menu |

**Visibility guardrail (RLS, TC-16):** student-facing reads must expose extras names/prices and sauce availability but **never** internal sauce cost or payout rate (§5.5, §6.3, §6.8). Confirm against `016_rls.sql`.

---

## 12. Cron catalog (summary)

| Function | Schedule (EAT) | Layer |
| -------- | -------------- | ----- |
| `expire-pending-payments` | `*/5 * * * *` | 3 |
| `cleanup-qr-tokens` | `0 3 * * *` | 4 |
| `reconcile-payments` | `0 * * * *` | 6 |
| `reconcile-wallets` | `0 2 * * *` | 6 |
| `calculate-payouts` | `0 6 * * 1` | 7 |
| `expire-semester-balances` | `0 0 * * *` | 8 |
| `aggregate-daily-stats` | `0 1 * * *` | 8 |
| `send-low-balance-alerts` | `0 8 * * *` | 8 |
| `process-flutterwave-settlement` | `0 10 * * *` | 10 (post-MVP) |
| `prewarm-functions` | `30 11 * * 1-5` | 10 (post-MVP) |

---

## 13. Open items to confirm against schema

- Exact column names/types for every request/response field (esp. wallets, payments, transactions, qr/validation).
- The canonical success/error envelope in `packages/types/src/index.ts` — adopt it verbatim; correct §1.3–1.4 if they diverge.
- Whether `validate-qr-token` should ever return raw-token redemption (Technical Foundation §11.2 marks it "discouraged" — recommend forbidding it in MVP and requiring `validation_id`).
- Pagination shape for list endpoints (`audit-events`, `fraud-alerts`, ledger) — not specified in source; propose cursor or `limit`/`offset` and record the choice in an ADR.

*Derived from Business Rules v1.0 and Technical Foundation v2. Do not let an endpoint's request/response shape ship until reconciled with the owning migration and the generated types.*
