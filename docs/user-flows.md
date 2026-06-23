# LunchLink User Flows

**Version:** 0.1 (draft for build)
**Status:** Engineering reference — derived from Business Rules v1.0 and Technical Foundation v2; **endpoint/field/function references reconciled against migrations `001–017`, the generated types, and [api-specification.md](./api-specification.md)** (see "How to use this document")
**Sources:** [Business Rules](./business-rules.md) · [Technical Foundation v2](./technical-foundation-v2.md) §11 · [MVP Implementation Roadmap](./MVP%20Implementation%20Roadmap.md)
**Audience:** Engineering (frontend + Edge Functions), QA, Product

---

## How to use this document

Each flow lists **preconditions**, the **happy-path steps** (actor → system, naming the endpoint and any Postgres function it wires to), **postconditions**, and **failure branches**. Flows reference the HTTP contract in `api-specification.md`; where the two disagree, the API spec governs the contract and the live schema governs field names. The QR/redemption sequence mirrors Technical Foundation §11.3 step-for-step — keep them in sync.

> **Schema reconciliation:** This doc operates at the flow/endpoint level, so it required **no request/response field renames** — every table, column, Postgres function, cron, and enum value it names exists as written (`profiles`/`students`/`student_wallets`, `validation_sessions`, `wallet_reconciliation_issues`, `payout_line_items`, `apply_wallet_delta`, `check_redemption_eligibility`, `resolve_swipe_rate`, `generate_receipt_number`, `expire_semester_balances`, `students.photo_status`, `students.last_redemption_at`). For exact column names/types and the derived-vs-stored field distinctions, defer to the `> Schema:` notes in `api-specification.md` (e.g. balances are stored as `swipe_balance`/`dining_plus_balance_ugx`/`dining_cash_balance_ugx`; redemption stores `transactions.swipe_delta` rather than a `swipe_deducted` field).

**Notation:** `→` actor action; `⇒` system response; `[GATE]` a hard precondition that blocks the flow; `✗` failure branch.

---

## Actors

| Actor | Description |
| ----- | ----------- |
| **Visitor** | Unauthenticated person on the public site |
| **Student (Registered)** | Account created, photo not yet approved — limited access |
| **Student (Verified)** | Photo approved — full capabilities |
| **Restaurant Staff** | Operates the scanner at point of service |
| **Restaurant Manager** | Staff with menu/extras/staff-invite rights |
| **Admin** | Platform LunchLink Admin (photo approval, refunds, payouts, reconciliation) |
| **System** | Edge Functions, crons, Postgres functions |

> **Schema:** "Registered" and "Verified" are product states surfaced via `students.account_status` (`student_account_status` enum: `registered|pending_verification|active|suspended`) and `students.verification_tier` (CHECK `registered|verified|sponsored`); `photo_status` (`pending|approved|rejected`) gates the transition. Staff/Manager distinction lives in `staff_accounts`; the DB `user_role` enum spells these `restaurant_staff`/`restaurant_manager` (see api-specification.md §1.2).

---

## 1. Student registration & provisioning

**Preconditions:** Visitor has a valid university affiliation and student number.

1. → Visitor submits signup (email, password) → GoTrue creates auth user.
2. → Client calls `POST /v1/register-student` with name, phone, student number, university.
3. ⇒ System inserts `profiles` → `students` → `student_wallets` (swipe/plus/cash all 0) in one transaction.
4. ⇒ Account is **Registered**; client routed to "complete verification".

**Postconditions:** Three zero-balance wallets exist (TC-01). Student cannot purchase or redeem yet.

> **Schema:** The single-transaction insert order matches the FK chain (`profiles`/`students` → `auth.users`; `student_wallets.student_id` → `students`). Beyond the four request fields, the function must also set `students.user_id`, `students.email`, `students.semester_id`, `students.lunchlink_id`, and `student_wallets.semester_expires_at` (all NOT NULL) — see api-specification.md §3.

**Failure branches:**
- ✗ Duplicate `(university, student_number)` → `409`, prompt to recover existing account.
- ✗ Partial transaction must roll back fully — never leave a profile without wallets.

---

## 2. Identity verification (photo)

**Preconditions:** Registered student.

1. → Student uploads a current facial photo (to storage bucket, RLS-scoped).
2. ⇒ `photo_status = pending`; student enters admin review queue.
3. → Admin reviews queue; calls `POST /v1/admin/approve-photo` with `approved` or `rejected (+reason)`.
4. ⇒ On `approved`: student becomes **Verified**, full capabilities unlock; notification sent.
5. ⇒ On `rejected`: reason returned; student may re-submit.

**Postconditions:** Verified students gain purchase/QR/redeem (TC-03). Target review SLA 48h (§3.3).

> **Schema:** `photo_status` ✓ (`students.photo_status` / `photo_approvals.status`, enum `photo_status`). Storage RLS is in `015_storage.sql` / `016_rls.sql` (`student_photos_*` policies). "Verified" is `verification_tier = 'verified'` (no boolean column). The rejection `reason` persists to `photo_approvals.notes` / `students.photo_rejection_reason`.

**Failure branches:**
- ✗ `[GATE]` Unverified student attempting purchase/QR/redeem is blocked at both middleware and API with `NOT_VERIFIED` (TC-02).

---

## 3. Browse & purchase a meal plan

**Preconditions:** Verified student; an **active semester** exists for the university.

1. → Student browses campus meal plans (PostgREST read; plan totals + included swipes/Dining Plus visible — never per-meal price, §5.4).
2. → Student selects a plan, chooses rail (MTN/Airtel), enters phone → `POST /v1/initiate-payment` `{ type: "meal_plan", meal_plan_id, rail, phone }`.
3. ⇒ System inserts `payments` (pending, 15-min TTL), starts Flutterwave charge, returns `payment_id` + `tx_ref`.
4. → Student approves the mobile-money prompt on their phone.
5. ⇒ Flutterwave webhook (`POST /v1/flutterwave-webhook`) — or the client's `GET /v1/verify-payment-status` poll — confirms success.
6. ⇒ System marks payment `success` and **stacks** `+swipes, +dining_plus` via `apply_wallet_delta` (additive, never replace — §5.2, TC-04/TC-05).
7. ⇒ Wallet reflects new balances; receipt available.

**Postconditions:** Entitlements added; expire at semester end (§5.5). Revenue recognized on success (§8.1).

> **Schema:** `meal_plans` carries `swipe_allocation` (`INT`) + `dining_plus_allocation_ugx` (`BIGINT`) + `price_ugx` (`006`); these feed the stacked credit. Request `rail`/`phone`/response `tx_ref` map to `payments.provider`/`phone_number`/`flutterwave_tx_ref` (api-specification.md §5). 15-min TTL = `platform_settings.pending_payment_ttl_min`. "active semester" = `semesters.is_active`.

**Failure branches:**
- ✗ `[GATE]` Unverified → checkout blocked (§5.3).
- ✗ No active semester → purchase blocked (§11.1).
- ✗ Payment abandoned/failed → wallet uncredited; student retries (§8.5).
- ✗ Pending past 15 min → `expire-pending-payments` sets `expired` (TC-07).
- ✗ Duplicate webhook → `ignored_duplicate`, no double credit (TC-06).
- ✗ Missed webhook → recovered by `verify-payment-status` (TC-08).
- ✗ Charged twice for one checkout → refund review (§9.3, §12.6), distinct from intentional stacking.

---

## 4. Dining Cash top-up

**Preconditions:** Verified student; amount within admin min/max for the university (§5.6).

1. → Student enters top-up amount → `POST /v1/initiate-payment` `{ type: "dining_cash_top_up", amount_ugx, rail, phone }`.
2. ⇒ Same pending→confirm→credit path as §3, crediting **dining_cash only** (§12.1).

**Postconditions:** Dining Cash increased; **never expires** (§4.4).

> **Schema:** Min/max = `university_settings.dining_cash_topup_min_ugx` / `dining_cash_topup_max_ugx` (`003`). Credit uses `apply_wallet_delta(..., 'dining_cash', ..., 'credit_top_up', ...)`.

**Failure branches:** Amount outside limits → `VALIDATION_FAILED`. Same payment failure branches as §3.

---

## 5. View wallet & digital card

1. → Student opens dashboard → `GET /v1/wallet-summary`.
2. ⇒ Returns swipe / Dining Plus / Dining Cash, the combined **LunchCredits** display value (§4.5), active-semester expiry, and recent ledger.
3. → Student opens digital card → shows photo, student number, LunchLink ID, university, and a live QR credential.

**Postconditions:** Student sees balances and identity surface; ready to redeem.

> **Schema:** "LunchCredits" is the **derived** sum `dining_plus_balance_ugx + dining_cash_balance_ugx` (no column). Card fields map to `students.photo_url`, `students.student_number`, `students.lunchlink_id`, and the student's `universities.name`.

---

## 6. Generate redemption credential (QR)

**Preconditions:** Verified, wallet not frozen.

1. → Card screen calls `POST /v1/generate-qr-token`.
2. ⇒ System mints a single-use, **120s** signed token; UI shows a countdown and auto-refreshes.

> **Schema:** 120s = `platform_settings.qr_token_ttl_seconds`. Only the `token_hash` + `jti` persist to `qr_tokens` (`008`); the raw token is returned to the client, not stored. "wallet not frozen" = `student_wallets.wallet_status = 'active'`.

**Failure branches:**
- ✗ Not verified / wallet frozen → blocked.
- ✗ >30 tokens/hour → `RATE_LIMITED` + `excessive_qr_generation` fraud alert (§11.6).
- ✗ Token expires before scan → student refreshes; old token cannot be honored (§12.1).

---

## 7. Redemption at the restaurant (core money path) 🔴

**Preconditions:** Verified student with swipe ≥ 1; active partner restaurant at the student's university; restaurant open; live connectivity (§10.7).

**7a. Validate**
1. → Student opens card; staff scans the QR → `POST /v1/validate-qr-token`.
2. ⇒ System previews student (name, number, **signed photo URL**), swipe balance, and eligibility; creates a `validation_sessions` row (5-min TTL).
3. → Staff **visually compares** the person to the approved photo (§6.7, §10.2) and confirms identity.

**7b. Select & redeem**
4. → Staff selects the served sauce from today's menu, optionally adds extras, confirms student accepts extras charge.
5. → Staff submits → `POST /v1/redeem-meal` `{ validation_id, sauce_id, extras[] }`.
6. ⇒ System runs the **atomic transaction** (Technical Foundation §11.3): lock wallet → `check_redemption_eligibility()` → consume validation_session + qr_token → verify sauce on daily menu + operating hours + stock → deduct **1 swipe** + extras (**Dining Plus first, then Dining Cash** — §4.6) via `apply_wallet_delta` → insert `transactions` + `transaction_extras` + `generate_receipt_number()` → ledger → update `last_redemption_at` → audit.
7. ⇒ Receipt returned; wallet updated.

**Postconditions:** Exactly 1 swipe consumed; QR single-use and now invalid; extras charged in full or not at all (TC-10, TC-12).

> **Schema:** Step 6 matches `check_redemption_eligibility()` and `apply_wallet_delta()` in `013_functions.sql` exactly (eligibility order: photo → account → wallet → balance → daily limit → cooldown; Plus-then-Cash spend priority). 5-min TTL = `platform_settings.validation_session_ttl_seconds` (300). The swipe deduction is stored as `transactions.swipe_delta = -1` (there is no `swipe_deducted` column); extras are itemized in `transaction_extras` with `dining_plus_used_ugx` + `dining_cash_used_ugx`. See api-specification.md §7 for response field mapping.

**Failure branches:**
- ✗ Credential expired before submit → `VALIDATION_SESSION_EXPIRED` / refresh-and-rescan; **no swipe deducted** (§12.1).
- ✗ Concurrent scan of same credential → first succeeds, second `QR_ALREADY_USED`; only one swipe deducted (§12.2, TC-15).
- ✗ Daily limit (2/day, Kampala) → `DAILY_LIMIT_REACHED` (§10.3, TC-13).
- ✗ Cooldown (<3h since last) → `COOLDOWN_ACTIVE` (§10.3, TC-14); 2nd attempt within cooldown raises `cooldown_violation_attempt` alert.
- ✗ Insufficient swipe → `INSUFFICIENT_BALANCE`.
- ✗ Insufficient Plus+Cash for extras → staff removes extras and completes swipe-only, **or** cancels and asks student to top up; partial extras deduction not allowed (§12.3).
- ✗ Selected sauce unavailable → staff picks an available sauce or declines; no swipe until valid redemption (§12.4, `SAUCE_UNAVAILABLE`).
- ✗ Outside operating hours → `RESTAURANT_CLOSED` (§6.12).
- ✗ Wallet frozen → `WALLET_FROZEN` (§4.8).
- ✗ Platform/connectivity outage → cannot redeem; retry when restored; no automatic credit (§10.7, §12.9).
- ✗ Shared-screenshot credential redeemed by another person → swipe consumed, not restored (§12.10).

> **Schema:** Daily limit (2) and cooldown (3h) come from `platform_settings.global_daily_swipe_limit` / `global_redemption_cooldown_hours`, overridable per `university_settings.daily_swipe_limit` / `redemption_cooldown_hours` — exactly the precedence `check_redemption_eligibility()` applies. Note the function returns `DAILY_LIMIT_EXCEEDED` / `INSUFFICIENT_SWIPES`, mapped to the HTTP codes `DAILY_LIMIT_REACHED` / `INSUFFICIENT_BALANCE` (api-specification.md §1.7).

---

## 8. Restaurant onboarding

1. → Prospective partner submits `POST /v1/register-restaurant-application` (public).
2. → Admin reviews, calls `POST /v1/admin/approve-restaurant`, assigns university + **tier** (§6.1, §6.9).
3. → Manager submits payout account; Admin verifies before first payout (§9.7).
4. → Manager invites staff (`POST /v1/invite-staff`) and sets up sauces, included foods, extras, daily menu.

**Postconditions:** Active restaurant can accept redemptions. Tier affects payout rate only, not student access in MVP (§6.9).

> **Schema:** `restaurant_applications` (`restaurant_application_status` enum) → on approval `restaurants.status` (`restaurant_status` enum) + `restaurants.tier_id`. Payout account → `restaurant_payout_accounts`; staff → `staff_accounts`; catalog → `sauces` / `included_foods` / `extras` / `daily_menus` (`007`).

---

## 9. Restaurant daily operations

- → Manager publishes the day's sauce availability + stock (or `POST /v1/restaurant/copy-daily-menu` from yesterday).
- → Manager maintains extras (name, price, availability) — price changes apply forward-only (§6.4).
- → Staff/manager view `GET /v1/restaurant/dashboard-stats` for today's redemptions.

**Guardrail:** student-facing reads expose extras prices + sauce availability, **never** internal sauce cost or payout rate (§5.5, §6.3, §6.8, TC-16).

> **Schema:** Forward-only pricing is backed by `extra_price_history` (`007`, student `SELECT` denied in `016_rls.sql`). Internal cost = `restaurant_sauce_pricing` (manager/admin only); payout rate = `payout_rate_configs` (not student-readable). Dashboard → `daily_restaurant_stats` (`012`).

---

## 10. Admin: reconciliation review

1. ⇒ Nightly `reconcile-wallets` compares cached balances to ledger sums; mismatches → `wallet_reconciliation_issues`.
2. ⇒ Hourly `reconcile-payments` matches webhooks to payments; unmatched success → resolve queue.
3. → Admin opens `GET /v1/admin/reconciliation`; resolves stuck payments via `POST /v1/admin/reconcile-payment` after Flutterwave verify confirms truth.

**Postconditions:** Zero open issues required before payout approval for that university (§8.6, TC-17).

> **Schema:** `reconciliation_runs`, `wallet_reconciliation_issues` (`resolved` boolean), `flutterwave_webhook_events`, `flutterwave_settlement_lines` all per `011`. The ledger-sum check matches `wallet_ledger_entries.delta` against `student_wallets` balances.

---

## 11. Admin: payouts

**Preconditions:** No open wallet drift for the university (Gate G8).

1. ⇒ Weekly `calculate-payouts` (Mon 06:00 EAT) drafts `payouts` + `payout_line_items` = redemptions × `resolve_swipe_rate()` (restaurant→tier→university precedence; extras excluded — §8.2–8.3, TC-18/TC-19).
2. → Admin reviews draft; `POST /v1/admin/approve-payout` (dual approval above threshold).
3. ⇒ Period **locked** after approval — no retroactive add/remove (§8.7); corrections go in a later period.
4. → Admin exports CSV (`POST /v1/admin/export-payouts`); disbursement recorded as `paid`.

> **Schema:** `resolve_swipe_rate()` returns `rate_source` ∈ {`restaurant_specific`,`tier_default`,`university_default`}, matching `payout_line_items.rate_source` (CHECK) ✓. Lock = `payouts.locked_at`/`approved_at`; status over `payout_status` enum. Dual approval has no second-approver column today (only `payouts.approved_by`) — see api-specification.md §9.

**Failure branches:**
- ✗ Open reconciliation issues → `RECONCILIATION_BLOCKED`.
- ✗ Edit attempt on approved period → `PAYOUT_PERIOD_LOCKED`.

---

## 12. Admin: refunds & adjustments

**Refund (§9):**
1. → Student reports a qualifying event (duplicate charge, confirmed pay but uncredited, restaurant non-delivery — §9.3, §9.5).
2. → Admin verifies, calls `POST /v1/admin/issue-refund` → credits **dining_cash only** (§9.1); creates `refunds` + ledger; dual approval above threshold; **no** mobile-money reversal in MVP.

**Manual adjustment (§4.7):** `POST /v1/admin/adjust-wallet` with documented reason + approver; large adjustments require dual approval.

**Restaurant non-delivery (§9.5):** restore swipe (admin adjustment, not a payment refund) or credit Dining Cash for extras.

> **Schema:** `refunds` (`012`) has no provider/reversal columns (confirms "no mobile-money reversal"); credit via `apply_wallet_delta(..., 'dining_cash', ..., 'refund', ...)`. Manual adjustment → `wallet_adjustments` (`005`, status `pending|approved|rejected`) with `ledger_reason = 'admin_adjustment'`; swipe restore is a `swipe` delta, not a payment refund.

---

## 13. Account suspension & wallet freeze

- → Admin suspends an account (`POST /v1/admin/suspend-user`) for fraud/policy/university request → student cannot purchase, redeem, or top up; balances preserved but inaccessible (§3.6).
- → Admin freezes a wallet during investigation → cannot spend or receive credits until cleared (§4.8); resolution SLA target 5 business days.

> **Schema:** Account suspension = `students.account_status = 'suspended'` (and/or `profiles.status = 'suspended'`). Wallet freeze = `student_wallets.wallet_status = 'frozen'`, which `apply_wallet_delta` rejects with `WALLET_FROZEN` ✓.

---

## 14. Semester lifecycle

**Expiry (§11.2):**
1. ⇒ Advance notices recommended at 14 and 3 days before semester end.
2. ⇒ `expire-semester-balances` (`0 0 * * *`) zeros **swipe + Dining Plus**; **Dining Cash untouched** (TC-20).

**Rollover (§11.3):**
1. → Admin runs `POST /v1/admin/rollover-semester`: activate new semester, expire prior swipe/plus, publish new plans, notify students.
2. ⇒ Dining Cash persists; students stay Verified (photo re-verify only if >1 year old or admin requests).

**No grace period** in MVP unless an Admin-approved, written, university-scoped exception applies (§11.4).

> **Schema:** Wires to `expire_semester_balances(p_semester_id)` (`013`), which loops `student_wallets` for the semester and applies negative `swipe` + `dining_plus` deltas only (dining_cash never touched) ✓. Audit uses `audit_action = 'semester_rolled'`.

---

## 15. Edge cases reference (Business Rules §12)

| Case | Resolution |
| ---- | ---------- |
| Expired credential at counter (§12.1) | Refresh + rescan; no swipe deducted |
| Concurrent scan (§12.2) | First consumes; others `QR_ALREADY_USED`; one swipe |
| Insufficient extras balance (§12.3) | Swipe-only completion or top-up; no partial extras |
| Sauce unavailable after scan (§12.4) | Pick available sauce or decline; no swipe until valid |
| University transfer (§12.5) | Admin-only; swipe/plus do not transfer; cash by documented decision |
| Duplicate plan purchase (§12.6) | Intentional stacking allowed; accidental double-charge → refund |
| Deceased/withdrawn (§12.7) | Admin closes; swipe/plus forfeited; cash per legal guidance |
| Restaurant deactivated mid-semester (§12.8) | Redemptions cease; no cash compensation; past liability still payable |
| Outage during redemption (§12.9) | Retry on restore; no automatic credit |
| Shared screenshot credential (§12.10) | Swipe consumed, not restored; repeat → suspension |

---

*Keep §7 aligned with Technical Foundation §11.3 and api-specification.md `redeem-meal`. Any change to redemption order, limits, or wallet priority must trace back to Business Rules and update all three.*
