# LunchLink User Flows

**Version:** 0.1 (draft for build)
**Status:** Engineering reference — derived from Business Rules v1.0 and Technical Foundation v2; reconcile endpoint/field details against [api-specification.md](./api-specification.md) and the live schema
**Sources:** [Business Rules](./business-rules.md) · [Technical Foundation v2](./technical-foundation-v2.md) §11 · [MVP Implementation Roadmap](./MVP%20Implementation%20Roadmap.md)
**Audience:** Engineering (frontend + Edge Functions), QA, Product

---

## How to use this document

Each flow lists **preconditions**, the **happy-path steps** (actor → system, naming the endpoint and any Postgres function it wires to), **postconditions**, and **failure branches**. Flows reference the HTTP contract in `api-specification.md`; where the two disagree, the API spec governs the contract and the live schema governs field names. The QR/redemption sequence mirrors Technical Foundation §11.3 step-for-step — keep them in sync.

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

---

## 1. Student registration & provisioning

**Preconditions:** Visitor has a valid university affiliation and student number.

1. → Visitor submits signup (email, password) → GoTrue creates auth user.
2. → Client calls `POST /v1/register-student` with name, phone, student number, university.
3. ⇒ System inserts `profiles` → `students` → `student_wallets` (swipe/plus/cash all 0) in one transaction.
4. ⇒ Account is **Registered**; client routed to "complete verification".

**Postconditions:** Three zero-balance wallets exist (TC-01). Student cannot purchase or redeem yet.

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

**Failure branches:** Amount outside limits → `VALIDATION_FAILED`. Same payment failure branches as §3.

---

## 5. View wallet & digital card

1. → Student opens dashboard → `GET /v1/wallet-summary`.
2. ⇒ Returns swipe / Dining Plus / Dining Cash, the combined **LunchCredits** display value (§4.5), active-semester expiry, and recent ledger.
3. → Student opens digital card → shows photo, student number, LunchLink ID, university, and a live QR credential.

**Postconditions:** Student sees balances and identity surface; ready to redeem.

---

## 6. Generate redemption credential (QR)

**Preconditions:** Verified, wallet not frozen.

1. → Card screen calls `POST /v1/generate-qr-token`.
2. ⇒ System mints a single-use, **120s** signed token; UI shows a countdown and auto-refreshes.

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

---

## 8. Restaurant onboarding

1. → Prospective partner submits `POST /v1/register-restaurant-application` (public).
2. → Admin reviews, calls `POST /v1/admin/approve-restaurant`, assigns university + **tier** (§6.1, §6.9).
3. → Manager submits payout account; Admin verifies before first payout (§9.7).
4. → Manager invites staff (`POST /v1/invite-staff`) and sets up sauces, included foods, extras, daily menu.

**Postconditions:** Active restaurant can accept redemptions. Tier affects payout rate only, not student access in MVP (§6.9).

---

## 9. Restaurant daily operations

- → Manager publishes the day's sauce availability + stock (or `POST /v1/restaurant/copy-daily-menu` from yesterday).
- → Manager maintains extras (name, price, availability) — price changes apply forward-only (§6.4).
- → Staff/manager view `GET /v1/restaurant/dashboard-stats` for today's redemptions.

**Guardrail:** student-facing reads expose extras prices + sauce availability, **never** internal sauce cost or payout rate (§5.5, §6.3, §6.8, TC-16).

---

## 10. Admin: reconciliation review

1. ⇒ Nightly `reconcile-wallets` compares cached balances to ledger sums; mismatches → `wallet_reconciliation_issues`.
2. ⇒ Hourly `reconcile-payments` matches webhooks to payments; unmatched success → resolve queue.
3. → Admin opens `GET /v1/admin/reconciliation`; resolves stuck payments via `POST /v1/admin/reconcile-payment` after Flutterwave verify confirms truth.

**Postconditions:** Zero open issues required before payout approval for that university (§8.6, TC-17).

---

## 11. Admin: payouts

**Preconditions:** No open wallet drift for the university (Gate G8).

1. ⇒ Weekly `calculate-payouts` (Mon 06:00 EAT) drafts `payouts` + `payout_line_items` = redemptions × `resolve_swipe_rate()` (restaurant→tier→university precedence; extras excluded — §8.2–8.3, TC-18/TC-19).
2. → Admin reviews draft; `POST /v1/admin/approve-payout` (dual approval above threshold).
3. ⇒ Period **locked** after approval — no retroactive add/remove (§8.7); corrections go in a later period.
4. → Admin exports CSV (`POST /v1/admin/export-payouts`); disbursement recorded as `paid`.

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

---

## 13. Account suspension & wallet freeze

- → Admin suspends an account (`POST /v1/admin/suspend-user`) for fraud/policy/university request → student cannot purchase, redeem, or top up; balances preserved but inaccessible (§3.6).
- → Admin freezes a wallet during investigation → cannot spend or receive credits until cleared (§4.8); resolution SLA target 5 business days.

---

## 14. Semester lifecycle

**Expiry (§11.2):**
1. ⇒ Advance notices recommended at 14 and 3 days before semester end.
2. ⇒ `expire-semester-balances` (`0 0 * * *`) zeros **swipe + Dining Plus**; **Dining Cash untouched** (TC-20).

**Rollover (§11.3):**
1. → Admin runs `POST /v1/admin/rollover-semester`: activate new semester, expire prior swipe/plus, publish new plans, notify students.
2. ⇒ Dining Cash persists; students stay Verified (photo re-verify only if >1 year old or admin requests).

**No grace period** in MVP unless an Admin-approved, written, university-scoped exception applies (§11.4).

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
