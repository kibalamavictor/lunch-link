# LunchLink API Specification

**Version:** 0.1 (draft for build)
**Status:** Engineering contract — derived from source docs; **field names/types and the envelope have been reconciled against migrations `001–017` and `packages/types/src/database.types.ts` (see "How to use this document" and the inline `> Schema:` notes)**
**Sources:** [Technical Foundation v2](./technical-foundation-v2.md) §13–14 · [Business Rules](./business-rules.md) · [MVP Implementation Roadmap](./MVP%20Implementation%20Roadmap.md) §D
**Audience:** Engineering (Edge Function + frontend), QA

---

## How to use this document

This spec is assembled from the **authoritative narrative docs**. The endpoint inventory, roles, envelope, error codes, rate limits, and business rules below are faithful to those sources. **Paths, methods, roles, status codes, and business-rule references are the HTTP contract and are authoritative here.** Request/response **field names and types** have now been reconciled against the live schema; each shape carries a `> Schema:` note giving the owning table/column and type, or marking a field as **derived** (computed in the Edge Function, no column).

Reconciliation sources used:

1. The migration that owns the relevant table (e.g. `005_wallets.sql`, `008_qr_transactions.sql`, `009_payments.sql`).
2. The generated `packages/types/src/database.types.ts` (`Tables<>` / `Enums<>`).
3. The shared envelope/error types in `packages/types/src/index.ts` — the success/error envelope below matches these verbatim (the code wins; this doc was corrected to match).

Treat this as the **single source for the HTTP contract** (paths, methods, roles, status codes, error semantics, business-rule references) and the live schema as the source for **exact field names and types**.

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

> **Schema:** These are **API-contract role labels and are intentionally unchanged.** They do not map 1:1 to the DB `user_role` enum (`001_enums.sql`), whose values are `student`, `restaurant_staff`, `restaurant_manager`, `admin`, `university_admin`. In particular the doc's `restaurant`/`manager` correspond to `restaurant_staff`/`restaurant_manager`, and the enum's `university_admin` is folded into `admin` here (and is what `is_admin_or_university_admin()` also returns true for). `public`/`anon`/`service`/`signature` are HTTP-layer concepts with no `user_role` value.

**Money/redemption boundary (enforce in code review):** Edge Functions authorize the *caller*, then call the Postgres functions (`apply_wallet_delta`, `check_redemption_eligibility`, `resolve_swipe_rate`, `generate_receipt_number`, `expire_semester_balances`) under `service_role`. Edge Functions never reimplement that logic — they wire to it. `apply_wallet_delta` is not `EXECUTE`-grantable to `authenticated` (`017_grants.sql`).

### 1.3 Standard success envelope (Technical Foundation §13.3)

```json
{
  "data": { "...": "endpoint-specific payload" },
  "meta": { "request_id": "uuid", "timestamp": "2025-06-19T10:00:00Z" }
}
```

> **Schema:** Matches `ApiSuccessEnvelope<T> = { data: T; meta: ApiMeta }` and `ApiMeta = { request_id: string; timestamp: string }` in `packages/types/src/index.ts`. ✓

### 1.4 Standard error envelope

```json
{
  "error": {
    "code": "WALLET_FROZEN",
    "message": "Human-readable summary, safe to surface to UI.",
    "details": { "...": "optional structured context" }
  }
}
```

> **Schema (corrected):** Reconciled against `ApiErrorEnvelope` in `packages/types/src/index.ts`, which is `{ error: { code: string; message: string; details?: Record<string, unknown> } }`. There is **no `meta` object on the error envelope** (unlike the success envelope) — the draft's `meta` block was removed. `code` is a free-form `string`; there is **no error-code enum** in `packages/types` (see §1.7). If a `request_id` must travel with errors, it is carried in the `X-Request-ID` response header (§1.5), not in the body.

### 1.5 Headers

| Header | Direction | Notes |
| ------ | --------- | ----- |
| `Authorization: Bearer <jwt>` | request | Required for all non-public roles |
| `X-Request-ID` | request + response | Client may supply; server generates if absent. Propagated into audit/ledger metadata (Technical Foundation §11.3 step 11) |
| `Content-Type: application/json` | request | All POST/PATCH bodies |
| `verif-hash` | request (webhook only) | Flutterwave signature; verified before processing |

> **Schema:** `X-Request-ID` propagation has backing — `wallet_ledger_entries.request_id`, `transactions.request_id`, `validation_sessions.request_id`, and `flutterwave_webhook_events.request_id` are all `UUID` columns; `audit_events` carries it inside the `payload` JSONB. The shared helper `getRequestId()` lives in `supabase/functions/_shared/http.ts`.

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

Domain codes (Technical Foundation §14.3) plus the validation/auth codes this contract assumes. **HTTP status codes and the contract code strings below are unchanged.**

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

> **Schema (flag — no enum backing):** There is **no error-code enum** anywhere in the schema or `packages/types`; `ApiErrorEnvelope.code` is a free `string`, so this registry lives only at the HTTP/application layer. It must be **mapped** to the raw codes the Postgres functions actually raise/return, which differ in spelling:
> - `check_redemption_eligibility()` (`013_functions.sql`) returns `reason_code` values: `STUDENT_NOT_FOUND`, `PHOTO_NOT_APPROVED`, `ACCOUNT_NOT_ACTIVE`, `WALLET_FROZEN`, `INSUFFICIENT_SWIPES`, `DAILY_LIMIT_EXCEEDED`, `COOLDOWN_ACTIVE`.
> - `apply_wallet_delta()` raises: `WALLET_NOT_FOUND`, `WALLET_FROZEN`, `INSUFFICIENT_SWIPES`, `INSUFFICIENT_DINING_PLUS`, `INSUFFICIENT_DINING_CASH`.
>
> So the Edge Function layer must translate, e.g. `DAILY_LIMIT_EXCEEDED → DAILY_LIMIT_REACHED`, `INSUFFICIENT_SWIPES/_DINING_PLUS/_DINING_CASH → INSUFFICIENT_BALANCE`, `PHOTO_NOT_APPROVED → NOT_VERIFIED`, `STUDENT_NOT_FOUND → NOT_FOUND`. `WALLET_FROZEN` and `COOLDOWN_ACTIVE` already match.

### 1.8 Rate limits (Technical Foundation §14.4 — Upstash Redis)

| Endpoint | Limit |
| -------- | ----- |
| `generate-qr-token` | 30 / hour / student |
| `validate-qr-token` | 60 / min / restaurant |
| `redeem-meal` | 20 / min / restaurant |
| `initiate-payment` | 10 / hour / student |
| Auth login | 10 / min / IP |

> **Schema:** Rate-limit counters are external (Upstash Redis), not in Postgres. Related fraud signals do have backing: `device_sessions.qr_generation_count` (`008`) and `fraud_alerts` (`012`, `alert_type` TEXT) support the `excessive_qr_generation` path in §6.

### 1.9 Idempotency

- **Wallet mutations** dedupe inside `apply_wallet_delta` on `(reference_type, reference_id, wallet_type)` — Edge Functions must pass a stable reference (payment id, transaction id) so retries don't double-credit.
- **Payments:** webhook and `verify-payment-status` are both idempotent against `payments.status`; a second success is `DUPLICATE_WEBHOOK`.
- **Redemption:** the QR token's single-use `UPDATE ... WHERE consumed_at IS NULL` is the idempotency guard; concurrent scans yield one `200` and one `QR_ALREADY_USED`.

> **Schema:** Verified. `wallet_ledger_entries` has `UNIQUE (reference_type, reference_id, wallet_type)` and `apply_wallet_delta` does `ON CONFLICT ... DO NOTHING` (`005`, `013`). `payments.status` is `payment_status` and `payments.idempotency_key` is `UNIQUE` (`009`). `qr_tokens.consumed_at` is the single-use guard (`008`); `transactions.idempotency_key` is also `UNIQUE`.

### 1.10 Money & amounts

All monetary fields are **UGX integers** (no decimal subunit). `swipe` balances are integer counts. Timezone for all calendar-day logic is `Africa/Kampala`.

> **Schema (canonical balance/amount columns — applies to every balance shape below):**
> - `student_wallets.swipe_balance` → **`INT`** (count). API responses below alias this as `swipe`.
> - `student_wallets.dining_plus_balance_ugx` → **`BIGINT`** (UGX). Aliased as `dining_plus`.
> - `student_wallets.dining_cash_balance_ugx` → **`BIGINT`** (UGX). Aliased as `dining_cash`.
> - Ledger movement: `wallet_ledger_entries.delta` / `balance_after` are **`BIGINT`**; `wallet_type` is the `wallet_type` enum.
> - Transaction movement: `transactions.swipe_delta` (`INT`), `transactions.dining_plus_delta_ugx` / `dining_cash_delta_ugx` (`BIGINT`).
> - `Africa/Kampala` is the schema default (`platform_settings.default_timezone`, `university_settings.timezone`).

---

## 2. Layer 0 — Infrastructure

### `GET /v1/health` — role: `public`
Uptime check. Returns `{ status: "ok", request_id }`. No auth, no rate limit.

> **Schema:** No tables involved. Matches the implemented Edge Function `supabase/functions/health/index.ts` (returns `status`, `service`, `timestamp`, `request_id`) and the Next.js route `apps/web/src/app/api/health/route.ts`.

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

> **Schema:** Request fields map to `students` (`004`): `full_name` (`TEXT`), `phone` (`TEXT`), `student_number` (`TEXT`), `university_id` (`UUID`). **Additional NOT-NULL columns the function must set server-side, not from the request:** `students.user_id` (from `auth.uid()`), `students.email` (from the auth user), `students.semester_id` (active semester), and `students.lunchlink_id` (`UNIQUE`, generated). The `409` is backed by `UNIQUE (university_id, student_number)`. Response: `profile_id` → `profiles.id`, `student_id` → `students.id`; `wallet.{swipe,dining_plus,dining_cash}` are aliases for the `student_wallets` balance columns (see §1.10) — note `student_wallets.semester_expires_at` is also NOT NULL and must be set at provisioning.

### `POST /v1/admin/approve-photo` — role: `admin`
Photo review state machine. Sets `photo_approvals` / student `photo_status` to `approved` or `rejected`; approval flips the student to **Verified**. (Business Rules §3.3; Roadmap S3.)

**Request** — `{ student_id, decision: "approved" | "rejected", reason?: "string" }`
**Success `200`** — `data`: `{ student_id, photo_status, verified: boolean }`.
**Errors** — `FORBIDDEN`; `NOT_FOUND`; `VALIDATION_FAILED` (rejection requires `reason`).
**Side effects** — audit event; triggers `send-notification`.

> **Schema:** `decision` maps to `photo_approvals.status` / `students.photo_status` (enum `photo_status` = `pending|approved|rejected`, so the values `approved`/`rejected` are valid ✓). `reason` maps to `photo_approvals.notes` (`TEXT`) and, on rejection, `students.photo_rejection_reason`. `reviewer_id` (`photo_approvals.reviewer_id`) is set server-side from `auth.uid()`. Response `photo_status` ✓ column; **`verified` is derived** (no `verified` column) — compute from `students.verification_tier = 'verified'` (CHECK `registered|verified|sponsored`) and/or `account_status`. The side-effect audit row uses `audit_events.action` enum values `photo_approved` / `photo_rejected`.

### `POST /v1/send-notification` — role: `service`
Internal dispatch (email via Resend; SMS optional). Not called directly by clients. (Roadmap 1.2.)
**Request** — `{ recipient_id, channel: "email" | "sms", template, payload }`.

> **Schema (corrected names):** Maps to `notifications` (`012`): `recipient_id` → **`user_id`** (`UUID` → `auth.users`); `channel` → `notification_channel` enum (`email|sms|push`, so `email`/`sms` valid ✓); `template` → **`event_type`** (`TEXT`) — there is **no `template` column**; `payload` → `payload` (`JSONB`) ✓. The rendered `notifications.title` and `notifications.body` (both NOT-NULL `TEXT`) are produced by the dispatcher, and `sent_at` is stamped on send.

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
`lunch_credits` is the display-only sum of `dining_plus + dining_cash` (Business Rules §4.5).

> **Schema:** `balances.*` alias the `student_wallets` balance columns (types per §1.10). **`lunch_credits` is derived** (no column) = `dining_plus_balance_ugx + dining_cash_balance_ugx`. `active_semester.id` → `semesters.id`; **`ends_at` maps to `semesters.end_date` (`DATE`)** — note `student_wallets.semester_expires_at` (`TIMESTAMPTZ`) is the per-wallet expiry if a timestamp is preferred. `recent_ledger[]` fields all match `wallet_ledger_entries` (`005`) exactly: `id`, `wallet_type` (enum), `delta`/`balance_after` (`BIGINT`), `reference_type` (`TEXT`), `reference_id` (`UUID`), `created_at`. The example `reference_type: "redemption"` is illustrative — the column is unconstrained `TEXT`; the ledger row also has a required `reason` (`ledger_reason` enum, e.g. `meal_redemption`) not shown here.

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

> **Schema:** Maps to `payments` (`009`): `type` → `payment_type` enum (`meal_plan|dining_cash_top_up` ✓); `meal_plan_id` → `payments.meal_plan_id` (`UUID`); `amount_ugx` → `payments.amount_ugx` (`BIGINT`, CHECK `> 0`); **`rail` persists to `payments.provider`** (`payment_provider` enum `mtn_momo|airtel_money` ✓ — the request name differs from the column); **`phone` → `payments.phone_number`** (`TEXT`). Response: `payment_id` → `payments.id`; **`tx_ref` → `payments.flutterwave_tx_ref`** (`TEXT`, `UNIQUE`); `status` → `payment_status` (`pending` ✓; full enum: `pending|processing|success|failed|expired|refunded`); `expires_at` → `payments.expires_at` (`TIMESTAMPTZ`); **`provider_redirect` is derived** from the Flutterwave response (no column). Top-up min/max are `university_settings.dining_cash_topup_min_ugx` / `dining_cash_topup_max_ugx` (`003`).

### `POST /v1/flutterwave-webhook` — role: `signature`
Process payment webhook. Always logs raw payload to `flutterwave_webhook_events` first, then verifies signature + amount + status, and on success marks `payments.success` and credits the wallet via `apply_wallet_delta` (idempotent stacking). (Technical Foundation §10.2–10.3.)

**Request** — Flutterwave payload (verified via `verif-hash`).
**Success `202`** — `data`: `{ processed: true, payment_id, outcome: "credited" | "ignored_duplicate" }`.
**Rules** — log-always; signature must be valid; webhook `amount` must equal `payments.amount_ugx`; if payment already `success` → `ignored_duplicate` (TC-06, no double credit). Crediting: meal_plan → `+swipe, +dining_plus`; top-up → `+dining_cash` (§12.1).

> **Schema:** Raw logging maps to `flutterwave_webhook_events` (`011`): `raw_payload` (`JSONB`, NOT NULL), `signature_valid` (`BOOLEAN`), `tx_ref` (`TEXT`), `flutterwave_id` (`TEXT`), `event_type` (`TEXT`), `payment_id` (`UUID`), `processing_status` (`webhook_processing_status` enum). Response `outcome`: **`ignored_duplicate` matches the enum value**; **`credited` is an API-level outcome** (the corresponding column value is `processing_status = 'processed'`). The amount check compares against `payments.amount_ugx` (`BIGINT`). Crediting calls `apply_wallet_delta` with `reason` = `plan_purchase` / `credit_top_up` (`ledger_reason` enum).

### `GET /v1/verify-payment-status` — role: `student`
Poll + server-side Flutterwave verify; recovers a missed webhook (TC-08). Runs the same idempotent credit path as the webhook.
**Query** — `?payment_id=uuid` (or `tx_ref`).
**Success `200`** — `data`: `{ payment_id, status: "pending" | "success" | "expired" | "failed", balances_after?: {...} }`.
**Errors** — `PAYMENT_EXPIRED` (409) if past TTL and not successful.

> **Schema:** `payment_id` → `payments.id`; the query alias **`tx_ref` → `payments.flutterwave_tx_ref`**. `status` values are all members of the `payment_status` enum ✓ (`processing`/`refunded` also exist but aren't surfaced here). **`balances_after` is derived** from `student_wallets` after crediting (keys per §1.10).

### `expire-pending-payments` — cron `*/5 * * * *`
Marks `payments` past `expires_at` as `expired` (TC-07). Never deletes payment rows in prod.

> **Schema:** `payments.status` → `expired` (enum ✓); driven by `payments.expires_at`. Backed by partial index `idx_payments_status_expires` (`009`). TTL minutes come from `platform_settings.pending_payment_ttl_min` (default 15).

---

## 6. Layer 4 — QR

### `POST /v1/generate-qr-token` — role: `student` (verified)
Mints a single-use, 120s-TTL signed token (HMAC/JWT; `jti` hashed in DB). (Technical Foundation §11.1; Roadmap 4.1.)
**Request** — `{}` (subject is the caller). Optionally `{ device_fingerprint }`.
**Success `201`** — `data`: `{ token, jti, expires_at, refresh_after_seconds: 120 }`.
**Errors** — `NOT_VERIFIED`; `WALLET_FROZEN`; `RATE_LIMITED` (30/hr). >30/hr also raises `excessive_qr_generation` fraud alert (§11.6).

> **Schema:** Maps to `qr_tokens` (`008`): **the raw `token` is returned to the client but never stored — the column is `token_hash`** (`TEXT`, `UNIQUE`); `jti` → `qr_tokens.jti` (`UUID`, `UNIQUE`); `expires_at` → `qr_tokens.expires_at` (`TIMESTAMPTZ`); request `device_fingerprint` → `qr_tokens.device_fingerprint` (`TEXT`) and `device_sessions.device_fingerprint`. **`refresh_after_seconds` is derived** from `platform_settings.qr_token_ttl_seconds` (default 120). The fraud path uses `device_sessions.qr_generation_count` and inserts `fraud_alerts` with `alert_type = 'excessive_qr_generation'`.

### `cleanup-qr-tokens` — cron `0 3 * * *`
Deletes consumed/expired tokens older than 7 days.

> **Schema:** Operates on `qr_tokens.consumed_at` / `expires_at` (`008`).

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

> **Schema:** `validation_id` → `validation_sessions.id` (`008`); `expires_at` → `validation_sessions.expires_at` (`TIMESTAMPTZ`; the +300s default is `platform_settings.validation_session_ttl_seconds`). `student.full_name`/`student_number`/`photo_url` → `students` columns (`photo_url` is signed at read time). `swipe_balance` → `student_wallets.swipe_balance` (`INT`) ✓ exact. **`eligibility` is derived from `check_redemption_eligibility()`**, which returns `eligible` (`BOOLEAN`) + `reason_code` (`TEXT`) — i.e. `ok` ⇐ `eligible`, and `reasons[]` is built from `reason_code` (see §1.7 for the code list).

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

> **Schema:** Request: `validation_id` → `validation_sessions.id`; `sauce_id` → `transactions.sauce_id` → `sauces.id`; `extras[]` → `transaction_extras` rows (`extra_id` → `extras.id`, `quantity` `INT` CHECK `>0`; the function fills `unit_price_ugx`/`total_price_ugx`/`dining_plus_used_ugx`/`dining_cash_used_ugx`). Response: `transaction_id` → `transactions.id`; `receipt_number` → `transactions.receipt_number` (`TEXT`, `UNIQUE`) via `generate_receipt_number()`. **`swipe_deducted` and `extras_charged_ugx` are derived presentation fields — neither is a column.** The stored facts are `transactions.swipe_delta` (`INT`, e.g. `-1`) and the per-line `transaction_extras.total_price_ugx` (sum = the charged amount, split across `dining_plus_used_ugx` + `dining_cash_used_ugx`). `wallet_after.*` alias `student_wallets` balances (§1.10). The audit row uses `audit_events.action = 'meal_redeemed'`; `students.last_redemption_at` (`TIMESTAMPTZ`) is updated.

### `GET /v1/student/receipt/{id}` — role: `student`
Returns a redemption or payment receipt owned by the caller. `404` if not owned.

> **Schema:** `{id}` resolves to `transactions.id` (redemption) or `payments.id` (payment); ownership is enforced by RLS via `transactions.student_id` / `payments.student_id` (`016_rls.sql`).

---

## 8. Layer 6 — Reconciliation 🔴

### `reconcile-wallets` — cron `0 2 * * *`
Nightly: per `student_wallets` row, compares cached balances to `SUM(wallet_ledger_entries.delta)` by wallet_type; mismatches → `wallet_reconciliation_issues`; run fails if any open. **Open issues block payout approval for that university** (TC-17, §8.6).

> **Schema:** Writes `reconciliation_runs` (`run_type = 'wallet_ledger'`, `status` `reconciliation_status` enum) and `wallet_reconciliation_issues` (`expected_value`/`actual_value` `BIGINT`, `resolved` `BOOLEAN`) (`011`). Toggle: `platform_settings.wallet_reconciliation_enabled`.

### `reconcile-payments` — cron `0 * * * *`
Hourly webhook-vs-payment match; unmatched successful payments queue for `admin/reconcile-payment`.

> **Schema:** Uses `flutterwave_webhook_events` ↔ `payments`; settlement matching via `flutterwave_settlement_lines` (`match_status` `TEXT`, default `unmatched`) (`011`).

### `GET /v1/admin/reconciliation` — role: `admin`
Reconciliation dashboard: latest `reconciliation_runs`, open `wallet_reconciliation_issues`, unmatched settlement lines.

> **Schema:** All three tables exist (`011`); "open" = `wallet_reconciliation_issues.resolved = false`.

### `POST /v1/admin/reconcile-payment` — role: `admin`
Resolve a stuck payment after the Flutterwave verify API confirms truth. Runs the idempotent credit path or marks failed; writes audit + reason.

> **Schema:** Updates `payments.status`; audit via `audit_events.action = 'admin_action'`.

### `GET /v1/admin/financial-summary` — role: `admin`
Per university + Kampala date range (Technical Foundation §10.6): plan collections, top-up collections, swipe liability, platform gross margin (collections − liability; no extras commission), extras volume (informational), open reconciliation issues, pending payments.
**Query** — `?university_id=&from=&to=`.

> **Schema:** Aggregates back to `daily_university_stats` (`012`): `plan_collections_ugx`, `topup_collections_ugx`, `swipe_liability_ugx`, `extras_volume_ugx`, `swipes_redeemed`. "Gross margin" is **derived** (no column). `university_id` → `universities.id`.

---

## 9. Layer 7 — Payouts 🔴

### `calculate-payouts` / `POST /v1/admin/calculate-payouts` — cron `0 6 * * 1` + admin trigger
Weekly draft (Mon 06:00 EAT). Builds `payouts` + `payout_line_items` (1 line per redemption) using `resolve_swipe_rate()` precedence restaurant→tier→university, snapshotting the rate. Extras excluded (§8.2). (TC-18, TC-19.)

> **Schema:** `payouts` (`010`): `meals_redeemed` (`INT`), `payout_rate_ugx`/`amount_due_ugx` (`BIGINT`), `rate_snapshot` (`JSONB`), `status` `payout_status` enum. `payout_line_items`: `transaction_id` (`UNIQUE`, 1:1 redemption), `swipe_rate_ugx`/`line_amount_ugx` (`BIGINT`), `rate_source` (`CHECK` `restaurant_specific|tier_default|university_default`) — these match `resolve_swipe_rate()`'s returned `rate_source` exactly ✓.

### `POST /v1/admin/approve-payout` — role: `admin`
Finance approval: `draft` → `approved` (then `paid` on disbursement record). Blocked by `RECONCILIATION_BLOCKED` if the university has open wallet drift (Gate G8). After approval the period is locked — later edits → `PAYOUT_PERIOD_LOCKED` (§8.7).
**Request** — `{ payout_id, secondary_approver_id?: "uuid" }` (dual approval above threshold).

> **Schema:** `payout_id` → `payouts.id`; status transitions over the `payout_status` enum (`draft|pending_approval|approved|paid|cancelled`). Lock backed by `payouts.locked_at`/`approved_at`/`approved_by`/`paid_at` (`010`). **`secondary_approver_id` has no dedicated column** — `payouts.approved_by` holds the primary approver; persist the secondary approver in audit/metadata or add a column before building.

### `POST /v1/admin/export-payouts` — role: `admin`
CSV export of a payout period. Each line shows swipe count and applied rate.

> **Schema:** Reads `payout_line_items.swipe_rate_ugx` + `rate_source`; counts from `payouts.meals_redeemed`.

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

> **Schema:** `refunds` (`012`): `amount_ugx` (`BIGINT`), `reason` (`TEXT`), `issued_by`, `ledger_entry_id`, optional `payment_id`/`transaction_id` (no `provider`/reversal columns — confirms "no Flutterwave reversal"); the dining-cash credit goes through `apply_wallet_delta` with `ledger_reason = 'refund'`. `void-redemption` sets `transactions.excluded_from_payout = true` and `voided_at`; reversal ledger uses `ledger_reason = 'fraud_reversal'`. `adjust-wallet` → `wallet_adjustments` (`005`): `delta` (`BIGINT`), `reason` (`TEXT`), `requested_by`, `approved_by`, `status` CHECK `pending|approved|rejected` (`ledger_reason = 'admin_adjustment'`). `fraud-alerts` → `fraud_alerts.status` (`fraud_alert_status` enum `open|investigating|resolved|dismissed`). `audit-events` → `audit_events` (append-only; `action` is the `audit_action` enum).

**Crons in this layer:** `expire-semester-balances` (`0 0 * * *`, zeros swipe/plus, never dining_cash — TC-20); `aggregate-daily-stats` (`0 1 * * *`); `send-low-balance-alerts` (`0 8 * * *`).

> **Schema:** `expire-semester-balances` wires to the Postgres function `expire_semester_balances(semester_id)` (`013`), which only zeros `swipe` + `dining_plus` (dining_cash untouched) ✓. Low-balance thresholds: `university_settings.low_swipe_threshold` / `low_dining_plus_threshold_ugx` (`003`). Daily stats → `daily_university_stats` / `daily_restaurant_stats` (`012`).

---

## 11. Layer 9 — Restaurant

| Endpoint | Method | Role | Purpose |
| -------- | ------ | ---- | ------- |
| `/v1/register-restaurant-application` | POST | anon/public | Public restaurant signup → `restaurant_applications` |
| `/v1/admin/approve-restaurant` | POST | admin | Activate restaurant + tier assignment (§6.1, §6.9) |
| `/v1/invite-staff` | POST | manager | Invite staff via auth invite |
| `/v1/restaurant/dashboard-stats` | GET | restaurant | Today's redemptions / `daily_restaurant_stats` |
| `/v1/restaurant/copy-daily-menu` | POST | manager | Copy previous day's menu |

> **Schema:** `restaurant_applications` (`007`) has `restaurant_application_status` enum (`submitted|under_review|approved|rejected`). `approve-restaurant` sets `restaurants.status` (`restaurant_status` enum) and `restaurants.tier_id` → `restaurant_tiers.id`. Staff live in `staff_accounts` (`007`). Dashboard reads `daily_restaurant_stats` (`012`). Menus → `daily_menus` (`007`).

**Visibility guardrail (RLS, TC-16):** student-facing reads must expose extras names/prices and sauce availability but **never** internal sauce cost or payout rate (§5.5, §6.3, §6.8).

> **Schema:** Backed by `016_rls.sql` — e.g. `restaurant_sauce_pricing` (cost) is manager/admin-only, `payout_rate_configs` is manager-read/admin-write, and `extra_price_history` denies student select; `extras`/`sauces`/`daily_menus` have campus-scoped student `SELECT` policies. ✓

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

> **Schema:** `process-flutterwave-settlement` would populate `flutterwave_settlement_lines` (`011`). All other crons are reconciled in their layer sections above.

---

## 13. Open items to confirm against schema

The field-level reconciliation has now been performed (see the `> Schema:` notes above); the originally-listed unknowns resolve as follows:

- **Exact column names/types for every request/response field** — reconciled inline against `001–017` and `database.types.ts`. Notable corrections: `transactions.swipe_delta`/`*_delta_ugx` (not `swipe_deducted`/`extras_charged_ugx`); `notifications.user_id`/`event_type` (not `recipient_id`/`template`); `payments.provider`/`phone_number`/`flutterwave_tx_ref` (vs `rail`/`phone`/`tx_ref`); balance columns `swipe_balance` (INT) / `dining_plus_balance_ugx` / `dining_cash_balance_ugx` (BIGINT).
- **The canonical success/error envelope** — adopted from `packages/types/src/index.ts`; §1.3 matches, and §1.4 was corrected (the error envelope has **no `meta`**).
- **`validate-qr-token` raw-token redemption** — still a product/security decision (Technical Foundation §11.2 marks raw-token redemption "discouraged"); recommend forbidding it in MVP and requiring `validation_id`. **No schema dependency.**
- **Pagination for list endpoints** (`audit-events`, `fraud-alerts`, ledger) — **not in the schema**; propose cursor or `limit`/`offset` and record the choice in an ADR.

### Flagged — present in the contract but with no (or partial) schema backing

- **Error-code registry (§1.7):** no enum exists; `code` is a free `string`. Must be mapped from the DB-raised codes (see §1.7 note).
- **Role labels (§1.2):** `restaurant`/`manager` are API abstractions over `user_role` enum values `restaurant_staff`/`restaurant_manager`; `university_admin` is folded into `admin`. Unchanged per scope.
- **Derived response fields (no column):** `lunch_credits`, `active_semester.ends_at` (use `semesters.end_date`), `provider_redirect`, `refresh_after_seconds`, `eligibility` (from `check_redemption_eligibility`), `swipe_deducted`, `extras_charged_ugx`, `wallet_after`/`balances_after`, webhook `outcome: "credited"`, financial-summary "gross margin".
- **`approve-payout.secondary_approver_id`:** no column; only `payouts.approved_by` exists today.

*Derived from Business Rules v1.0 and Technical Foundation v2. Field names/types reconciled against migrations `001–017` and the generated types; do not let an endpoint's request/response shape ship without re-checking the owning migration if the schema changes.*
