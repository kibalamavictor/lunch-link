# LunchLink Architecture Review

**Reviewer role:** Principal Software Architect / CTO  
**Review date:** June 2025  
**Scope:** Pre-implementation gate review for production MVP at 10,000+ students, multiple universities, real mobile-money transactions  
**Documents reviewed:** Platform Architecture · Technical Specification · Design System · Technical Foundation

---

## Executive Summary

The technical foundation is **directionally sound** for an MVP: Supabase + Edge Functions for money/QR, three-wallet model aligned to the approved Technical Specification, RLS-first security, and immutable ledgers. However, several **document conflicts**, **financial gaps**, and **operational undefined behaviors** must be resolved before implementation. The design optimistically assumes happy-path flows and under-specifies semester transitions, plan stacking, extras revenue allocation, reconciliation, and peak-load behavior during lunch rush.

**Verdict:** Proceed to implementation only after resolving **critical blockers** listed at the end of this document. The schema and API catalog are ~75% complete; business rules documentation is ~60% complete.

---

## 1. Business Model Alignment

### Assessment

The Technical Specification (approved) defines the authoritative model: swipes for meals, three wallets, payout = redeemed swipes × rate. The Platform Architecture uses "LunchCredits" as a combined student-facing term. The foundation reconciles this via terminology mapping — acceptable if product/design adopt it consistently.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| Revenue model undefined | **High** | Payout liability is modeled; **platform commission/margin** is not. Admin "Financials" (collections, revenue, profit) cannot be computed without a fee structure. |
| Plan upgrade/renew undefined | **High** | Platform Architecture lists upgrade/renew; no rules for stacking plans, proration, or replacing active plans. |
| Extras revenue ownership unclear | **High** | Students pay restaurants for extras via Dining Plus/Cash — unclear whether 100% is restaurant revenue or platform takes a cut. Affects payout engine and P&L. |
| Terminology drift | Medium | "LunchCredits" vs Dining Plus/Cash will confuse engineers and support unless a canonical glossary is published. |
| Tier compatibility filter | Medium | Map feature references tier compatibility; no business rule defines which students can redeem at which tier restaurants. |
| Guest meals / order-ahead | Low | Correctly deferred to Phase 2, but no schema extension points documented. |

### Missing Requirements

- Platform fee / commission policy (fixed per swipe, % of plan price, or hybrid)
- Meal plan purchase rules: one active plan vs stackable purchases
- Upgrade/renew/proration policy
- Extras revenue allocation (restaurant vs platform)
- Refund approval workflow (who approves, SLA, max amount)
- Restaurant agreement lifecycle (contract dates, renewal)

### Implementation Concerns

- Financial reporting built in Milestone 8 will stall without commission rules
- `student_plan_purchases` allows multiple rows but wallet has single `active_meal_plan_id` — ambiguous semantics

### Recommendations

1. Publish **`LunchLink Business Rules.md`** as the single canonical source; resolve Platform Architecture vs Technical Specification conflicts formally.
2. Define commission model before building admin financials.
3. Specify plan stacking: recommend **additive credits** (each purchase adds swipes/plus) with `active_meal_plan_id` tracking most recent purchase for display only.
4. Document extras revenue: recommend **100% to restaurant** for MVP (simplest payout); platform revenue from plan margin only.

---

## 2. Database Design

### Assessment

Schema is well-normalized for MVP with appropriate FK relationships, enums, and append-only ledgers. Index strategy covers primary query paths. Gaps appear in tenancy admin modeling, semester lifecycle, restaurant onboarding, and scale-oriented partitioning.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| Semester rollover undefined | **High** | `students.semester_id` and `student_wallets.semester_id` can drift; no `wallet_semester_history` or rollover procedure. |
| `auth.*` helper functions | **High** | Supabase may restrict custom functions in `auth` schema; may fail on deploy. Should live in `public` with `SECURITY DEFINER`. |
| `check_redemption_eligibility` volatility | Medium | Marked `STABLE` but reads `transactions` — should be `VOLATILE` or moved into redemption transaction. |
| QR token table growth | Medium | 10k students × ~30 tokens/hour × 12 lunch hours = millions of rows/semester without partition/archive. |
| Ledger/wallet drift | Medium | Cached balances with no periodic reconciliation job against ledger sums. |
| Missing restaurant applications | Medium | Public restaurant registration has no persistence model. |
| Admin university scope | Medium | No `university_admins` or scoped admin; global admin only — risky at multi-university scale. |
| Extra price history | Low | Platform Architecture lists `ExtraPricing`; schema embeds price on `extras` — price changes lose audit trail. |
| Sauce pricing overlap | Low | Multiple `restaurant_sauce_pricing` rows can overlap without "current price" constraint. |

### Missing Requirements

- Semester transition state machine and data migration spec
- Wallet balance reconciliation query/job
- Table retention/archival policy (`qr_tokens`, `audit_events`, `wallet_ledger_entries`)
- Restaurant registration/application entity
- `platform_settings` / `university_settings` for configurable limits (cooldown, daily cap)
- Materialized views or summary tables for reporting
- `receipt_number` sequence strategy (referenced in API response, not in schema)

### Implementation Concerns

- Migration order: `student_wallets.active_meal_plan_id` FK added before `meal_plans` exists — fix ordering
- RLS policies missing on: `student_plan_purchases`, `refunds`, `restaurant_locations`, `restaurant_tiers`, `payout_rate_configs`, `included_foods`, `wallet_ledger` INSERT blocking
- `profiles_update_own` may allow role escalation if `role` column is updatable

### Recommendations

1. Add `university_settings` JSONB or key-value table: `redemption_cooldown_hours`, `daily_swipe_limit`, `timezone`.
2. Add `restaurant_applications` table for onboarding pipeline.
3. Move JWT helpers to `public.auth_user_role()` naming convention.
4. Plan `qr_tokens` partition by month or aggressive cleanup cron (delete consumed/expired > 7 days).
5. Add `wallet_reconciliation_runs` table for nightly integrity checks.
6. Add `extra_price_history` if managers can change prices retroactively matters for disputes.

---

## 3. Wallet Architecture

### Assessment

Three-wallet model correctly implements Technical Specification §5. Ledger + cached balance pattern is industry-standard. Deduction priority (Dining Plus → Dining Cash) is documented. Dining Cash persistence across semesters is correct.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| Semester expiry job | **High** | Documented but not specified: partial day expiry, timezone (Africa/Kampala), notification timing, grace period. |
| Concurrent plan purchases | **High** | Two simultaneous webhook successes could double-credit without row-level idempotency on `payment_id` in wallet mutation. |
| Plan purchase before photo approval | Medium | Foundation blocks payments; confirm explicitly in business rules. |
| Top-up limits | Medium | No min/max for Dining Cash top-up — fraud/abuse vector. |
| Negative delta on expiry | Medium | `apply_wallet_delta(swipe, -balance)` when balance is 0 — function handles; verify ledger reason clarity. |
| Multi-semester dining cash | Low | Correctly persistent; UI must not imply cash expires with semester. |

### Missing Requirements

- Semester rollover: create new wallet row vs reset existing row
- Plan stacking behavior on repeat purchase
- Low balance thresholds for notifications (swipes < N, plus < X UGX)
- Wallet freeze/suspend during fraud investigation
- Manual admin adjustment workflow with dual approval for large amounts

### Implementation Concerns

- `apply_wallet_delta` uses `BIGINT` for swipe deltas cast to INT — type consistency risk
- No database constraint linking `student_plan_purchases.swipes_granted` to actual ledger credits
- Webhook must use `SELECT ... FOR UPDATE` on wallet AND check `payments.status` in same transaction

### Recommendations

1. Add idempotency: `wallet_ledger_entries` unique on `(reference_type, reference_id, wallet_type)` for payment credits.
2. Define semester rollover Edge Function: `rollover-semester-wallets` run by admin/cron.
3. Add `wallet_status` enum: `active`, `frozen`, `closed`.
4. Specify top-up bounds: e.g. min 5,000 UGX, max 500,000 UGX per transaction.

---

## 4. QR Redemption System

### Assessment

Dynamic 2-minute, single-use QR with server-side signing is appropriate. Two-step validate → redeem flow supports staff UX. Anti-fraud rules (cooldown, daily limit) align with Technical Specification §6–7.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| TOCTOU race validate → redeem | **High** | Student passes validation; token expires or is consumed before redeem; staff UX failure. Also: two staff scan same QR concurrently — need DB-level consumption lock. |
| Screenshot relay attack | **High** | Student shares QR screenshot; two restaurants scan within 120s — first redeem wins, second gets error, but first restaurant may serve wrong person if identity check is weak. |
| Offline restaurant scanning | **High** | Uganda campus connectivity; no offline fallback, queue, or manual override policy. |
| Validation/redemption split | Medium | Extra network round-trip at point of sale; latency-sensitive during rush. |
| Balance leak to restaurant | Medium | `validate-qr-token` returns swipe balance — enables collusion/social engineering; consider hiding or showing only "eligible/not". |
| Clock skew | Low | JWT exp vs DB `expires_at` mismatch if servers drift — use DB time as authority. |

### Missing Requirements

- Concurrent redemption locking spec (optimistic on `qr_tokens` row)
- Validation session binding (optional `validation_id` expiring in 5 min linking validate → redeem)
- Offline/degraded mode policy (explicit: none for MVP, or admin override code)
- Manual redemption fallback for support (admin-only, audited)
- Restaurant operating hours check at redemption time

### Implementation Concerns

- `redeem-meal` must re-run ALL validation checks, not trust prior validate call
- `check_redemption_eligibility` outside transaction allows cooldown bypass if two redeems race
- QR refresh every 110s on poor mobile network — student arrives with expired code

### Recommendations

1. Collapse validate + redeem into optional single call with `preview=true` flag, or issue short-lived `validation_nonce` (DB-backed, 5 min, single redeem).
2. Use `UPDATE qr_tokens SET consumed_at = now() WHERE jti = ? AND consumed_at IS NULL RETURNING *` — atomic consumption.
3. Run eligibility check inside `redeem-meal` transaction after wallet lock.
4. Add `restaurant_operating_hours` validation in redeem flow.
5. Document MVP stance: **online-only redemption**; restaurants must have connectivity.

---

## 5. Flutterwave Integration

### Assessment

Correct pattern: server-side initiation, webhook confirmation, idempotent `tx_ref`, secrets in Edge Functions. STK push aligns with Uganda mobile money UX.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| Webhook reliability | **High** | No retry queue, dead-letter, or manual reconciliation UI for missed webhooks. Student charged, wallet not credited. |
| Pending payment limbo | **High** | STK push timeout, user abandons PIN — `payments.status = pending` forever without expiry job. |
| Amount tampering | Medium | Mitigated by server-side lookup — good. Verify webhook amount matches `payments.amount_ugx`. |
| Duplicate webhook races | Medium | Idempotency on status check — must use row lock not read-then-write. |
| Sandbox vs production | Medium | MTN/Airtel sandbox behavior differs; production testing plan needed. |
| Flutterwave downtime | Medium | No circuit breaker or user messaging strategy. |

### Missing Requirements

- Pending payment TTL (e.g. 15 min → auto-fail)
- Webhook retry handling + admin "resolve payment" tool
- `flutterwave_webhook_events` raw payload log (immutable)
- `flutterwave_settlements` import for bank reconciliation
- Payment dispute/chargeback process
- Customer receipt format and delivery (email/SMS)
- Production go-live checklist with Flutterwave KYC/merchant activation

### Implementation Concerns

- Next.js BFF webhook proxy adds failure point — document fallback direct-to-Edge-Function URL
- `initiate-top-up` listed separately from `initiate-payment` — consolidate to reduce duplication
- Phone number ownership verification not required (student pays from any MoMo number)

### Recommendations

1. Add `payment_webhook_events` table storing raw payload + processing status.
2. Cron: `expire-pending-payments` every 5 minutes.
3. Admin endpoint: `admin/reconcile-payment` to manually complete/fail stuck payments against Flutterwave verify API.
4. Webhook handler: verify `amount` and `currency` match before crediting wallet.
5. Add Flutterwave transaction verify call as backup to webhook.

---

## 6. University Isolation Model

### Assessment

Campus lock via `university_id` on core entities + RLS is the correct multi-tenant pattern for this scale. JWT claims carry `university_id` for routing.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| Global admin RLS gaps | **High** | `auth.university_id()` returns NULL for admin — many policies use `OR auth.user_role() = 'admin'` but some may miss this pattern. |
| No university-scoped admin | **High** | At 5+ universities, single global admin does not scale; university ops need delegated admins. |
| Student transfer between universities | Medium | Not supported; edge case for transfers needs manual process. |
| Cross-university staff | Low | Staff tied to one restaurant/university — correct. |

### Missing Requirements

- University admin role (`university_admin`) with scoped RLS
- Admin impersonation/support mode (audited)
- University-specific branding/settings in `universities.settings`
- Data export per university (GDPR/privacy)
- Cross-university reporting for platform owner only

### Implementation Concerns

- Public marketing pages listing all universities — OK
- Seed data must not leak cross-university in staging demos
- `meal_plans` filtered by university — student cannot purchase another university's plan (enforce in Edge Function, not RLS alone)

### Recommendations

1. Add `university_admin` role with `profiles.university_id` for scoped access.
2. Audit all RLS policies with automated test matrix (role × table × operation).
3. Edge Functions always verify `student.university_id === resource.university_id` regardless of RLS.

---

## 7. Restaurant Operations

### Assessment

Catalog model (sauces, daily menus, extras, included foods, internal pricing) covers Platform Architecture modules 8–10. Manager vs staff permissions differentiated in API catalog.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| Stock tracking incomplete | Medium | `stock_remaining` on `daily_menus` — no decrement on redemption specified. |
| Operating hours not enforced | Medium | JSONB `operating_hours` — no schema, no redemption-time check. |
| Meal categories missing | Medium | Technical Specification §8 mentions categories; not in schema. |
| Price change audit | Medium | Extras price editable without history — dispute risk. |
| Restaurant staff menu edit | Low | RLS allows staff to manage `daily_menus` — may be too permissive; spec says manager manages sauces. |

### Missing Requirements

- Operating hours JSON schema and open/closed computation (timezone-aware)
- Stock decrement on redemption (optional MVP: advisory only)
- Restaurant dashboard metrics (today's redemptions count) — in manager permissions
- Bulk daily menu setup (copy yesterday's menu)
- Restaurant deactivation: in-flight QR tokens handling

### Implementation Concerns

- `included_foods` has no RLS policies in foundation migration 012
- Sauce unavailable on daily menu but redemption allows if staff picks it — validate against `daily_menus.is_available`

### Recommendations

1. Restrict `daily_menus` write to manager; staff read-only.
2. Decrement `stock_remaining` in `redeem-meal` when not null.
3. Define `operating_hours` schema: `{ "mon": { "open": "08:00", "close": "20:00" }, ... }`.
4. Add `meal_categories` table if UI needs grouping.

---

## 8. Fraud Prevention

### Assessment

Foundation covers dynamic QR, cooldown, daily limits, photo verification, audit logs, device fingerprint. Technical Specification §7 adds device tracking. Solid MVP baseline.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| No fraud case management | **High** | Admin "Fraud Monitoring" portal listed; no `fraud_alerts`, rules engine, or investigation workflow. |
| Device fingerprint unused | Medium | Collected on QR gen but no correlation logic. |
| Staff collusion | Medium | Staff confirms identity checkbox — honor system; no random audit sampling. |
| Shared student accounts | Medium | No detection of concurrent QR generation from different devices. |
| Refund abuse | Medium | Admin refund to dining cash — no limit or second approver. |

### Missing Requirements

- Fraud alert rules: N redemptions/day across restaurants, same device multiple students, rapid QR generation
- Account freeze workflow linked to wallet freeze
- Admin fraud queue UI requirements
- Void/redact redemption (admin reversal) — complex ledger implications
- Rate limit storage (Redis/Upstash) — Edge Function in-memory limits won't work across instances

### Implementation Concerns

- Documented rate limits need shared store at scale (Upstash Redis recommended)
- `validate-qr-token` brute force on jti — mitigated by crypto but log failures

### Recommendations

1. Add `fraud_alerts` and `device_sessions` tables.
2. Alert: >2 QR generations/minute from same student on different fingerprints.
3. Integrate Upstash Redis for rate limiting before launch.
4. Define MVP fraud response: manual admin suspend (no automated block except daily/cooldown rules).

---

## 9. Scalability

### Assessment

Architecture fits 10,000 students on Supabase Pro with attention to peak patterns. Lunch rush (11:30–14:00 EAT) creates burst load on QR generation and redemption.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| Lunch rush QR burst | **High** | 10k students, ~30% active at lunch = 3k concurrent QR refreshes every 2 min ≈ 25 req/sec sustained on `generate-qr-token`. |
| Edge Function cold starts | Medium | Deno isolate cold start adds 200–500ms at worst time. |
| Connection pool exhaustion | Medium | PostgREST + Edge Functions + cron on shared pool. |
| Unbounded ledger growth | Medium | ~2 redemptions/day × 10k × 180 days = 3.6M ledger rows/year — manageable but needs indexing discipline. |
| Audit log volume | Medium | Every QR gen logged = 10k × 30/hr × 8hr = 2.4M/day if over-logged. |
| Single region latency | Low | Supabase + Vercel region choice affects Uganda UX. |

### Load Estimates (10k students, 3 universities)

| Metric | Peak estimate |
| ------ | ------------- |
| QR generations | 25–40/sec |
| Redemptions | 10–15/sec |
| PostgREST reads (menus) | 50–100/sec |
| Webhook payments | 1–2/sec |

### Missing Requirements

- Load test targets and acceptance criteria (foundation says 100 concurrent — insufficient for 10k scale validation)
- Connection pooling strategy (Supavisor transaction mode)
- CDN strategy for static assets and restaurant logos
- Read replica consideration for reporting queries
- Horizontal Edge Function scaling assumptions

### Recommendations

1. Load test at **500 concurrent QR + 200 concurrent redeems** before launch.
2. Enable Supabase Supavisor; use transaction pooler from Edge Functions.
3. Sample QR generation audit logs (1 in 10) or aggregate metrics only.
4. Deploy Vercel + Supabase in nearest region; measure RTT from Kampala.
5. Consider pre-warming Edge Functions before lunch hours (cron ping).

---

## 10. Security

### Assessment

RLS-first, server-side payment/QR logic, signed URLs for photos, append-only audit — strong foundation. Gaps in role immutability, admin hardening, and secret rotation procedures.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| Role escalation via profiles UPDATE | **High** | RLS allows student to update own profile — must block `role` column changes. |
| Service role exposure | **High** | Any leak of `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS. |
| QR signing secret rotation | Medium | Documented but no rotation procedure without invalidating in-flight tokens. |
| Admin MFA not required | Medium | Financial platform with refund powers. |
| SECURITY DEFINER functions | Medium | `apply_wallet_delta` callable if grants misconfigured. |
| Student PII in audit payloads | Medium | JSONB payload may over-capture; need redaction policy. |
| Webhook endpoint DDoS | Low | Public webhook — rate limit at Vercel edge. |

### Missing Requirements

- Secret rotation runbook (QR secret, Flutterwave keys)
- Penetration test scope before production money
- CSP headers and security headers spec
- PII retention and deletion policy (student account deletion)
- Break-glass admin access procedure
- RLS policy automated test suite

### Recommendations

1. `profiles` UPDATE policy: `WITH CHECK (role = OLD.role)` or column-level revoke.
2. Revoke EXECUTE on `apply_wallet_delta` from authenticated; Edge Functions only via service role.
3. Require MFA for admin role before production.
4. Add security review gate to Milestone 10 checklist.
5. Never log full QR tokens or Flutterwave secrets.

---

## 11. Supabase Limitations

### Assessment

Supabase is viable for MVP at this scale with Pro plan features. Teams must plan around platform constraints early.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| pg_cron requires Pro | **High** | Payout cron, expiry jobs, cleanup depend on Pro plan + pg_cron extension enabled. |
| Edge Function limits | Medium | 150s timeout OK; 256MB memory; concurrent execution limits on Pro. |
| Auth hooks | Medium | Custom JWT claims hook may need HTTP hook (additional latency/failure point). |
| No native rate limiting | Medium | Must bring Upstash or similar. |
| Storage egress costs | Medium | Student photo reads at every validation add up. |
| Realtime limits | Low | Phase 2 push/notifications — connection limits apply. |
| Vendor lock-in | Low | PostgreSQL portable; Edge Functions less so. |

### Missing Requirements

- Supabase plan tier decision documented (Pro minimum for production)
- Backup RPO/RTO targets (Supabase Pro: daily backups — verify point-in-time recovery need)
- Exit strategy: pg_dump schedule, schema portability notes
- Edge Function monitoring (Supabase dashboard + external APM)

### Recommendations

1. Budget Supabase Pro + compute add-on for launch.
2. Implement JWT claims via **Custom Access Token Hook** (Postgres function preferred over HTTP hook for reliability).
3. Externalize rate limiting (Upstash Redis) from day one.
4. Evaluate Fly.io/Railway fallback for Edge Functions if Supabase limits hit — unlikely at 10k.

---

## 12. Reporting Requirements

### Assessment

Platform Architecture and Technical Specification require admin financials, payout tracking, restaurant performance. Foundation has tables but no reporting layer design.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| Commission/profit uncomputable | **High** | No platform fee model in schema. |
| Real-time financial dashboard on raw tables | Medium | Heavy aggregations on `transactions` will slow at scale. |
| University-scoped reports | Medium | Global admin queries need `university_id` filter on every report. |
| Restaurant analytics in manager role | Medium | Spec includes analytics; deferred Phase 2 but permission already granted. |

### Missing Requirements

- Report catalog: collections, liabilities, revenue, profit, redemptions by restaurant/day
- Export formats (CSV, PDF payout statements)
- Date range and timezone handling (Africa/Kampala)
- Pre-aggregated daily summary tables: `daily_university_stats`, `daily_restaurant_stats`
- Manager-facing: redemptions today, popular sauces, peak hours

### Recommendations

1. Add summary tables populated by nightly cron.
2. Define MVP admin reports: (1) collections, (2) restaurant liabilities, (3) redemptions by day, (4) pending photo approvals, (5) failed payments.
3. Use service role + parameterized queries for admin reports, not PostgREST.

---

## 13. Financial Reconciliation

### Assessment

Foundation mentions daily Flutterwave vs payments comparison. Insufficient for a real-money platform handling millions of UGX.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| No settlement import | **High** | Cannot match bank deposits to individual payments. |
| Wallet vs ledger drift undetected | **High** | No automated reconciliation. |
| Webhook missed = money lost | **High** | Student charged, no credit — support nightmare. |
| Payout vs redemption mismatch | Medium | Manual payout approval without tie-out to transaction IDs. |

### Missing Requirements

- `reconciliation_runs` table with status, discrepancies, resolver
- `flutterwave_settlement_lines` import
- Nightly job: sum(ledger) vs wallet balances per student (flag drift)
- Admin dashboard: unmatched payments, orphaned webhooks
- Monthly close procedure document

### Recommendations

1. Add reconciliation tables and nightly jobs to Milestone 4 (payments), not post-MVP.
2. Flutterwave verify API as webhook backup on payment status poll.
3. Zero tolerance policy: any wallet/ledger drift blocks deployment until root-caused.

---

## 14. Payout Engine

### Assessment

Weekly batch formula (meals × rate) matches Technical Specification §2. `payout_rate_configs` and tiers modeled. Disbursement correctly deferred to Phase 2.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| Rate precedence undefined | **High** | Restaurant-specific vs tier default vs university default — which wins? |
| Retroactive rate changes | Medium | Changing rate mid-period — recalculate or forward-only? |
| Voided/fraudulent redemptions | Medium | No mechanism to exclude transactions from payout. |
| Payout approval workflow | Medium | draft → pending → paid — who approves? |
| Tax/withholding | Low | Uganda tax on restaurant payments — legal review needed. |

### Missing Requirements

- Rate lookup precedence rules documented
- Payout line items linking to transaction IDs (audit trail)
- Restaurant payment details (mobile money number, bank account)
- Dispute/adjustment credits on payouts
- Payout statement PDF for restaurants

### Recommendations

1. Precedence: `payout_rate_configs.restaurant` > `restaurant_tiers.default` > `universities.settings.default_payout_rate`.
2. Add `payout_line_items` referencing `transactions.id`.
3. Add `restaurant_payout_accounts` table (encrypted MoMo/bank details).
4. Payout period locked after `status = pending` — no retroactive transaction inclusion.

---

## 15. Audit Logging

### Assessment

`audit_events` + `wallet_ledger_entries` provide strong dual-trail. Append-only triggers correct. Technical Specification §15 requirements largely met.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| Incomplete login audit | Medium | Relies on Supabase Auth logs — not in `audit_events`. |
| No correlation ID | Medium | Cannot trace request across Edge Functions. |
| Retention policy missing | Medium | Infinite growth; compliance unclear. |
| PII in payloads | Medium | Over-logging risk. |

### Missing Requirements

- Correlation/request ID propagated through all Edge Functions
- Auth login → audit_events integration (Auth hook)
- Retention: hot 90 days in Postgres, archive to cold storage
- Admin audit search/filter API spec
- Tamper evidence (hash chain optional for high assurance)

### Recommendations

1. Middleware: generate `X-Request-ID`, pass through all functions, store in `audit_events.payload`.
2. Log schema: `{ request_id, action, entity, before, after }` — minimize PII.
3. Admin audit viewer: filter by actor, action, date range, entity.

---

## 16. Mobile Experience

### Assessment

Design System mandates mobile-first, large touch targets, soft shapes — aligned with Uganda student usage patterns. Technical foundation addresses QR refresh and client-only scanner.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| QR refresh on poor network | **High** | 2-min TTL + slow Edge Function = expired QR at counter. |
| Camera API fragmentation | **High** | Low-end Android browsers may lack `BarcodeDetector`; ZXing fallback performance varies. |
| No PWA/offline | Medium | Add-to-home-screen not specified; repeat visit friction. |
| Restaurant tablet UX | Medium | Scanner UI not specified for landscape/tablet at counter. |
| Payment STK UX | Medium | Context switch to phone PIN — need clear waiting states. |

### Missing Requirements

- Minimum supported browsers/devices matrix
- QR offline indicator ("connect to refresh your code")
- PWA manifest and service worker decision
- Restaurant scanner: high contrast, outdoor visibility, large confirm buttons
- Haptic/audio feedback on successful scan
- Performance budget: digital card LCP < 2.5s on 3G

### Recommendations

1. Client-side countdown with 10s pre-fetch buffer before expiry.
2. Test scanner on Tecno/Infinix/Samsung A-series devices common in Uganda.
3. Ship MVP as responsive web; defer native app (Platform Architecture Phase 3).
4. Design System copy for network errors: warm, not technical.

---

## 17. Future Expansion

### Assessment

Multi-university model is forward-compatible. Phase 2/3 features identified. Schema lacks extension hooks for guest meals, order-ahead, loyalty.

### Risks

| Risk | Severity | Detail |
| ---- | -------- | ------ |
| No feature flags | Medium | Cannot gradual-rollout per university. |
| Wallet model rigidity | Medium | Guest meals need separate balance type or metadata. |
| API versioning | Low | Unversioned Edge Functions — breaking changes hurt mobile clients later. |
| Map/geospatial | Low | `restaurant_locations` uses lat/lng; PostGIS not enabled for radius queries. |

### Missing Requirements

- `feature_flags` table (university_id, feature, enabled)
- Extension points documented for guest meals, order-ahead
- PostGIS evaluation for map Phase 2
- API `/v1/` prefix policy
- Multi-plan subscription models

### Recommendations

1. Add lightweight `feature_flags` now.
2. Reserve `wallet_type` enum extension process (migration required).
3. Enable PostGIS extension in Milestone 0 if map is Phase 2 priority.
4. Prefix Edge Functions with version when second client exists.

---

# Gap Analysis

## A. Missing Business Rules

| # | Rule | Priority |
| - | ---- | -------- |
| 1 | Platform commission / revenue model | **Blocker** |
| 2 | Meal plan stacking vs replacement on repeat purchase | **Blocker** |
| 3 | Plan upgrade/renew/proration | **Blocker** |
| 4 | Extras revenue allocation (restaurant vs platform) | **Blocker** |
| 5 | Semester rollover procedure (wallet reset, student semester_id update) | **Blocker** |
| 6 | Payout rate precedence (restaurant vs tier vs university default) | **Blocker** |
| 7 | Pending payment timeout duration | High |
| 8 | Dining Cash top-up min/max amounts | High |
| 9 | Restaurant tier ↔ student eligibility (map filter) | High |
| 10 | Operating hours enforcement at redemption | High |
| 11 | Stock depletion behavior when `stock_remaining = 0` | Medium |
| 12 | Photo re-submission limit after rejection | Medium |
| 13 | Account deletion / data retention policy | Medium |
| 14 | Manual redemption override (support) | Medium |
| 15 | Refund approval authority and limits | Medium |
| 16 | Timezone authority (Africa/Kampala) for all date boundaries | Medium |
| 17 | Low balance notification thresholds | Low |
| 18 | Grace period after semester end | Low |

## B. Missing Database Tables

| Table | Purpose | Priority |
| ----- | ------- | -------- |
| `university_settings` | Configurable limits, defaults, timezone | **Blocker** |
| `restaurant_applications` | Public registration pipeline | High |
| `flutterwave_webhook_events` | Raw webhook audit + replay | **Blocker** |
| `reconciliation_runs` | Financial reconciliation jobs | **Blocker** |
| `payout_line_items` | Transaction-level payout audit | High |
| `restaurant_payout_accounts` | MoMo/bank details for disbursement | High |
| `fraud_alerts` | Fraud monitoring queue | High |
| `device_sessions` | Device fingerprint correlation | High |
| `validation_sessions` | Bind validate → redeem | High |
| `daily_restaurant_stats` | Pre-aggregated reporting | Medium |
| `daily_university_stats` | Pre-aggregated reporting | Medium |
| `extra_price_history` | Price change audit | Medium |
| `feature_flags` | Per-university feature rollout | Medium |
| `platform_settings` | Global config | Medium |
| `wallet_reconciliation_issues` | Drift detection results | Medium |
| `restaurant_agreements` | Contract dates, terms | Low |

## C. Missing API Endpoints

| Endpoint | Purpose | Priority |
| -------- | ------- | -------- |
| `GET /admin/reconciliation` | Reconciliation dashboard | **Blocker** |
| `POST /admin/reconcile-payment` | Manual payment resolution | **Blocker** |
| `GET /admin/financial-summary` | Collections, liabilities, profit | **Blocker** |
| `POST /admin/rollover-semester` | Semester transition | **Blocker** |
| `GET /admin/fraud-alerts` | Fraud queue | High |
| `POST /admin/adjust-wallet` | Audited manual adjustment | High |
| `GET /admin/audit-events` | Searchable audit log | High |
| `GET /restaurant/dashboard-stats` | Today's redemptions | High |
| `POST /restaurant/copy-daily-menu` | Operational efficiency | Medium |
| `GET /student/receipt/{id}` | Payment/redemption receipt | Medium |
| `GET /health` | Uptime monitoring | Medium |
| `POST /admin/export-payouts` | CSV export | Medium |
| `GET /universities/{slug}/public` | Public marketing data | Low |

## D. Missing Edge Functions

| Function | Purpose | Priority |
| -------- | ------- | -------- |
| `expire-pending-payments` | Cron: fail stale payments | **Blocker** |
| `reconcile-wallets` | Cron: ledger vs balance check | **Blocker** |
| `rollover-semester-wallets` | Semester transition | **Blocker** |
| `process-flutterwave-settlement` | Import settlement file | High |
| `void-redemption` | Admin fraud reversal (if in scope) | High |
| `register-restaurant-application` | Public restaurant signup | High |
| `verify-payment-status` | Poll Flutterwave as webhook backup | High |
| `aggregate-daily-stats` | Reporting cron | Medium |
| `cleanup-qr-tokens` | Archive/delete expired tokens | Medium |
| `send-low-balance-alerts` | Notification cron | Medium |
| `prewarm-functions` | Lunch rush warm-up ping | Low |

## E. Missing Admin Features

| Feature | Priority |
| ------- | -------- |
| Financial dashboard (collections, profit, liabilities) | **Blocker** |
| Payment reconciliation / stuck payment resolver | **Blocker** |
| Semester management and rollover UI | **Blocker** |
| Commission/fee configuration | **Blocker** |
| Fraud monitoring queue | High |
| Audit log search and export | High |
| University-scoped admin (delegated admins) | High |
| Refund workflow with approval | High |
| Payout approval workflow (draft → approve → mark paid) | High |
| Restaurant application review queue | High |
| Wallet manual adjustment (dual approval) | Medium |
| Platform settings management | Medium |
| User impersonation (support, audited) | Medium |
| Bulk student import | Low |

## F. Missing Restaurant Features

| Feature | Priority |
| ------- | -------- |
| Today's redemption count dashboard | High |
| Copy previous day menu | Medium |
| Operating hours management UI | Medium |
| Payout statement view/download | Medium |
| Stock management on daily menu | Medium |
| Shift handoff / staff activity log | Low |
| Analytics (Phase 2 but in role permissions) | Low |

## G. Missing Student Features

| Feature | Priority |
| ------- | -------- |
| Plan upgrade/renew flow | **Blocker** (if in MVP scope) |
| Receipt download/view | High |
| Payment retry for failed/pending | High |
| Combined LunchCredits display with breakdown toggle | Medium |
| Semester expiry warnings | Medium |
| Support/ticket submission | Medium |
| Offline QR refresh indicator | Medium |
| Transaction filter/search | Low |

## H. Production Readiness Checklist

### Documentation & Governance
- [ ] Canonical `LunchLink Business Rules.md` published and signed off
- [ ] Glossary: Swipe / Dining Plus / Dining Cash / LunchCredits
- [ ] Commission and extras revenue policy documented
- [ ] Semester rollover runbook
- [ ] Incident response runbook
- [ ] Secret rotation runbook

### Infrastructure
- [ ] Supabase Pro provisioned (staging + production)
- [ ] Supavisor connection pooling enabled
- [ ] Vercel production domain + SSL
- [ ] Upstash Redis for rate limiting
- [ ] Sentry/error tracking (frontend + Edge Functions)
- [ ] Uptime monitoring on `/health`
- [ ] Backup restore tested

### Security
- [ ] RLS enabled on every public table — verified by automated tests
- [ ] Role column immutable on profiles
- [ ] Service role key never in client bundle — secret scan in CI
- [ ] Flutterwave webhook signature verification tested
- [ ] Admin MFA enforced
- [ ] Penetration test or security review completed
- [ ] CSP and security headers configured

### Financial
- [ ] Flutterwave production merchant activated
- [ ] Webhook + verify API reconciliation tested
- [ ] Wallet/ledger reconciliation job running nightly
- [ ] Payout calculation verified against manual spreadsheet
- [ ] Refund policy implemented and tested
- [ ] Pending payment expiry job running

### Operational
- [ ] Load test: 500 concurrent QR, 200 concurrent redeems
- [ ] Restaurant staff trained on scanner UX
- [ ] Admin trained on photo approval and payment resolution
- [ ] SMS/email provider production credentials
- [ ] Support process for stuck payments documented

### Compliance & Legal
- [ ] Terms of service and privacy policy
- [ ] Mobile money regulatory review (Uganda)
- [ ] Student photo consent and retention policy
- [ ] Restaurant partner agreement template

### Launch
- [ ] Seed university + semester + restaurants for pilot
- [ ] Pilot with 100 students before full rollout
- [ ] Rollback plan documented
- [ ] On-call rotation for payment/redemption incidents

---

# Scores

## 1. Architecture Score: **7.2 / 10**

| Dimension | Score | Notes |
| --------- | ----- | ----- |
| Domain model | 8.0 | Three-wallet model well aligned to spec |
| Data integrity | 7.5 | Ledger pattern good; reconciliation gaps |
| Security | 7.0 | RLS strong; role escalation and admin MFA gaps |
| Financial correctness | 5.5 | Commission, reconciliation, settlement underspecified |
| Scalability | 7.0 | Viable at 10k with load testing and pooling |
| Operability | 6.5 | Missing runbooks, fraud ops, payment resolution |
| Documentation coherence | 7.5 | Foundation good; cross-doc conflicts remain |
| Mobile/fintech readiness | 7.5 | QR model sound; offline and rush-hour UX risks |

## 2. MVP Readiness Score: **62 / 100**

Ready for **foundation implementation** (schema, auth, basic flows). **Not ready** for production money movement or 10k student launch without resolving blockers.

| Area | Readiness |
| ---- | --------- |
| Schema & migrations | 75% |
| Auth & RLS | 70% |
| Wallet logic | 65% |
| QR redemption | 70% |
| Flutterwave integration | 55% |
| Admin/financial ops | 40% |
| Reporting & reconciliation | 35% |
| Fraud & security hardening | 50% |
| Mobile UX specification | 60% |
| Business rules completeness | 55% |

---

# Blockers — Must Resolve Before Coding Starts

These items require **product/legal/finance decisions** or **architecture amendments** — not merely implementation tasks.

| # | Blocker | Owner | Why it blocks |
| - | ------- | ----- | ------------- |
| 1 | **Publish canonical Business Rules document** resolving Platform Architecture vs Technical Specification conflicts (wallets, plan upgrade, LunchCredits naming) | Product | Engineers will implement inconsistent behavior |
| 2 | **Define platform commission / revenue model** | Finance/Product | Admin financials, profit reporting, and pricing cannot be built |
| 3 | **Define meal plan stacking behavior** (additive vs replace on second purchase) | Product | Wallet credit logic and `active_meal_plan_id` semantics depend on this |
| 4 | **Define extras revenue allocation** (100% restaurant vs platform split) | Finance | Payout engine and P&L incorrect without this |
| 5 | **Define semester rollover procedure** | Product/Ops | Wallet expiry and student progression undefined |
| 6 | **Define payout rate precedence** (restaurant config vs tier vs university default) | Finance | Payout calculations will be disputed by restaurants |
| 7 | **Confirm MVP scope for plan upgrade/renew** — in or out of Phase 1 | Product | Platform Architecture lists it; foundation omits it |
| 8 | **Flutterwave production merchant readiness** — KYC, webhook URL, settlement account | Finance/Ops | Cannot process real UGX without this |
| 9 | **Fix auth helper function schema** — confirm `auth.user_role()` vs `public` schema approach with Supabase | Engineering | Migration may fail on deploy |
| 10 | **Add payment reconciliation architecture** — webhook events table, pending expiry, manual resolve | Engineering/Finance | Real money requires this before first transaction |

### Recommended Pre-Coding Sprint (1 week)

1. Product publishes Business Rules v1.0 (items 1–7 above).
2. Finance signs off commission and extras revenue model.
3. Engineering amends technical foundation with: `university_settings`, `flutterwave_webhook_events`, `reconciliation_runs`, missing RLS policies, auth function schema fix.
4. Legal reviews MoMo terms and photo consent.
5. Confirm Supabase Pro budget and Flutterwave merchant status.

---

*After blockers are resolved, implementation may proceed with Milestone 0 (schema + CI) as defined in the technical foundation.*
