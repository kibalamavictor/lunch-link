# LunchLink Business Rules

**Version:** 1.0  
**Status:** Authoritative — supersedes conflicting business rules in all other LunchLink documents  
**Effective date:** June 2025  
**Sources consolidated:** Platform Architecture · Technical Specification · Architecture Review  
**Audience:** Product, Operations, Finance, Support, Legal, and Engineering (for policy alignment only)

---

## Document Authority

When any LunchLink document conflicts with this policy on **business or operational rules**, this document governs. Technical documents (Technical Foundation, API specifications, database schemas) implement these rules but do not redefine them.

Approved canonical policies embedded in this document:

1. Swipe economics (1 Swipe = 1 Standard Meal; price opacity for students)
2. Restaurant compensation formula and rate precedence
3. Platform revenue model (plan sales; no extras commission in MVP)
4. Extras revenue allocation (100% to restaurant)
5. Three-wallet model (Swipe, Dining Plus, Dining Cash)
6. Wallet spending priority (Dining Plus → Dining Cash)
7. Plan stacking (additive purchases)
8. Semester rollover and expiry
9. Redemption limits (2/day, 3-hour cooldown)
10. Verification lifecycle (Registered → Verified; Sponsored future)
11. Refund policy (Dining Cash credit; no cash-out)
12. University isolation (independent economic pools)
13. Restaurant information visibility rules
14. Future features deferred to Phase 2

---

## 1. Executive Summary

LunchLink is a university meal-plan platform operating in Uganda. Students purchase **meal plans** containing **Swipes** (meal entitlements) and **Dining Plus** (plan-included spending for extras). Students may also fund a **Dining Cash** wallet through separate top-ups. Students redeem one Swipe per standard meal at partner restaurants on their campus. Restaurants are compensated per redeemed Swipe at a configured rate. LunchLink earns revenue from meal plan sales; restaurant liability is calculated separately. Extras payments flow entirely to restaurants in MVP.

Every **university** operates as an independent economic pool with its own students, restaurants, meal plans, and payout configuration. Students never see meal prices, internal restaurant costs, or payout rates. They may see extras prices and sauce availability.

This document defines the business policies that govern student life cycle, wallets, redemptions, restaurant operations, financial settlement, refunds, fraud prevention, and semester management for the LunchLink MVP and beyond.

---

## 2. Definitions & Glossary

| Term | Definition |
| ---- | ---------- |
| **Swipe** | A non-transferable meal entitlement. One Swipe redeems one Standard Meal at a partner restaurant. |
| **Standard Meal** | A complete meal bundle defined by the restaurant (base foods + one sauce selection). Sauce choice does not change Swipe cost to the student. |
| **Dining Plus** | Plan-included spending balance used for extras. Expires at semester end. |
| **Dining Cash** | Student-funded spending balance used for extras and issued refunds. Never expires. |
| **LunchCredits** (student-facing) | Combined display label for Dining Plus + Dining Cash spending power. Not a separate wallet. |
| **Extra** | An optional add-on item (e.g. soda, chapati) priced by the restaurant and visible to students. |
| **Sauce** | A daily menu item included in a Standard Meal when a Swipe is redeemed. |
| **Internal Meal Cost** | A restaurant's internal cost assignment for a sauce. Hidden from students. |
| **Swipe Rate** | The amount paid to a restaurant per redeemed Swipe during a payout period. |
| **Meal Plan** | A purchasable package of Swipes, Dining Plus, and semester validity sold by LunchLink. |
| **Semester** | An academic period defined per university. Governs Swipe and Dining Plus expiry. |
| **Redemption** | The act of consuming one Swipe at a restaurant in exchange for a Standard Meal. |
| **University Economic Pool** | All financial activity scoped to a single university: collections, liabilities, payouts, and reporting. |
| **Registered** | A student who has created an account but may not yet be fully verified. |
| **Verified** | A student whose identity photo has been approved and account is active for platform use. |
| **Sponsored** | *(Future)* A student whose plan or credits are funded by a third party (e.g. scholarship, employer). |
| **Platform Credit** | Value issued to a student's Dining Cash wallet by LunchLink (e.g. refunds). Not withdrawable as cash. |

---

## 3. Student Rules

### 3.1 Eligibility and Registration

**Policy:** A person may register as a LunchLink student by providing full name, email address, phone number, student number, and university affiliation. Registration creates a **Registered** account.

**Business Rationale:** Accurate identity and university affiliation are required for campus lock, fraud prevention, and university reporting.

**Operational Impact:** Support must verify student number format per university. Incomplete registrations cannot purchase plans or redeem meals.

---

### 3.2 University Affiliation

**Policy:** Each student belongs to exactly one university for the duration of an enrollment period. A student may only access restaurants, meal plans, and services associated with their assigned university.

**Business Rationale:** Campus lock protects university economic pools and prevents cross-campus misuse.

**Operational Impact:** Students who transfer universities require a manual account migration handled by LunchLink Admin. Self-service university switching is not permitted in MVP.

---

### 3.3 Identity Verification (Photo Approval)

**Policy:** Every student must upload a current facial photograph for admin review. Photo status is **Pending**, **Approved**, or **Rejected**. Only students with **Approved** photos become **Verified** and may purchase meal plans, generate redemption codes, or redeem meals.

**Business Rationale:** Photo verification enables restaurant staff to confirm identity at redemption and reduces impersonation fraud.

**Operational Impact:** Admin must maintain a photo review queue. Rejected students receive a reason and may re-submit. Target review SLA: 48 business hours during term.

---

### 3.4 Verified Student Capabilities

**Policy:** Verified students may: purchase meal plans; top up Dining Cash; view balances and transaction history; generate dynamic redemption credentials; redeem Swipes; purchase extras; and manage their profile.

**Business Rationale:** Gating financial and redemption actions behind verification protects restaurants and the platform from unidentified users.

**Operational Impact:** Registered-but-unverified students see limited portal access focused on profile completion and photo upload.

---

### 3.5 Information Visible to Students

**Policy:** Students may see: participating restaurants; operating status; today's sauce availability; included base foods; extras names and prices; their Swipe balance; Dining Plus balance; Dining Cash balance (or combined LunchCredits display); and their transaction history.

Students may **not** see: internal meal costs; restaurant payout rates; platform margin on plans; or other students' data.

**Business Rationale:** Price opacity for standard meals simplifies the student experience and preserves the meal-plan subscription model. Extras prices are visible because students choose optional add-ons with known cost.

**Operational Impact:** Marketing, support scripts, and student communications must never reference per-meal pricing for standard meals.

---

### 3.6 Account Suspension

**Policy:** LunchLink Admin may suspend a student account for fraud, policy violation, or university request. Suspended students cannot purchase, redeem, or top up. Existing balances remain on record but are inaccessible until reinstatement or policy-driven forfeiture.

**Business Rationale:** Suspension is the primary enforcement lever before permanent removal.

**Operational Impact:** Support must document suspension reason. Reinstatement requires admin approval. Suspension during fraud investigation may freeze wallet access.

---

### 3.7 Student Verification Lifecycle (Including Future Sponsored Status)

**Policy:** Student account progression follows:

```text
Registered → Verified → (Future) Sponsored
```

- **Registered:** Account created; photo not yet approved.
- **Verified:** Photo approved; full student capabilities enabled.
- **Sponsored:** *(Phase 2+)* Account receives plan or credits from an approved sponsor. Sponsored students follow all standard redemption and wallet rules unless a separate sponsor agreement explicitly overrides them.

**Business Rationale:** A clear lifecycle supports onboarding UX, admin workflows, and future B2B sponsorship models.

**Operational Impact:** MVP implements Registered and Verified only. Product and finance must publish a sponsor addendum before Sponsored status launches.

---

### 3.8 Digital Student Card

**Policy:** Verified students receive a digital student card displaying: student photo, student number, LunchLink ID, university name, and a dynamic redemption credential that refreshes on a short timer.

**Business Rationale:** The card is the primary in-person identity and redemption surface at restaurants.

**Operational Impact:** Students must have network access to refresh credentials before redemption. Support should advise students to open the card before reaching the counter.

---

### 3.9 Payments by Students

**Policy:** Verified students may pay for meal plans and Dining Cash top-ups using MTN Mobile Money or Airtel Money through LunchLink's payment partner.

**Business Rationale:** Mobile money is the dominant payment method for Ugandan students.

**Operational Impact:** Failed or abandoned payments do not credit wallets. Students may retry. Support escalates duplicate charges to the refund process.

---

## 4. Wallet Rules

### 4.1 Three-Wallet Model

**Policy:** Every verified student maintains three distinct balances:

| Wallet | Purpose | Expires |
| ------ | ------- | ------- |
| **Swipe Wallet** | Standard Meal redemption | End of semester |
| **Dining Plus Wallet** | Plan-included extras spending | End of semester |
| **Dining Cash Wallet** | Student-funded extras and platform credits | Never |

**Business Rationale:** Separating entitlements (Swipes), plan-included spending (Dining Plus), and student-funded value (Dining Cash) enables correct expiry, refund, and reporting treatment.

**Operational Impact:** Student communications must clarify that Dining Cash persists across semesters while Swipes and Dining Plus do not.

---

### 4.2 Swipe Wallet Rules

**Policy:**

- One Swipe deducts for one Standard Meal redemption.
- Swipes are non-transferable between students.
- Swipes cannot be withdrawn or converted to cash.
- Swipes expire at semester end regardless of balance remaining.

**Business Rationale:** Swipes are prepaid meal entitlements tied to the academic calendar, not a stored-value cash instrument.

**Operational Impact:** Support cannot manually convert Swipes to Dining Cash except through documented admin adjustment policy for platform error.

---

### 4.3 Dining Plus Wallet Rules

**Policy:**

- Dining Plus is included with meal plan purchases.
- Dining Plus may be used only for extras as defined by partner restaurants.
- Dining Plus is non-transferable and non-withdrawable.
- Dining Plus expires at semester end regardless of balance remaining.

**Business Rationale:** Dining Plus encourages plan value consumption within the semester without treating plan benefits as permanent stored value.

**Operational Impact:** Students should receive low-balance and expiry reminders before semester end.

---

### 4.4 Dining Cash Wallet Rules

**Policy:**

- Dining Cash is funded by student top-ups and platform-issued refunds.
- Dining Cash may be used for extras when Dining Plus is insufficient or exhausted.
- Dining Cash never expires.
- Dining Cash is non-withdrawable as cash except where required by law or explicit platform error correction.
- Dining Cash is non-refundable to mobile money in MVP.

**Business Rationale:** Dining Cash functions as persistent platform credit, simplifying refunds and repeat extras purchases across semesters.

**Operational Impact:** Support must not promise cash-out. Refund requests for unused Dining Cash are declined unless a qualifying refund event applies.

---

### 4.5 LunchCredits (Student-Facing Label)

**Policy:** The student-facing term **LunchCredits** may be used to describe combined spending power from Dining Plus and Dining Cash. LunchCredits is a display concept, not a fourth wallet.

**Business Rationale:** Aligns student UX with Platform Architecture language while preserving backend wallet separation for expiry and priority rules.

**Operational Impact:** Marketing and UI may say "LunchCredits" for extras spending; internal ops and finance must use Dining Plus and Dining Cash explicitly.

---

### 4.6 Wallet Spending Priority for Extras

**Policy:** When a student purchases extras during or after a meal redemption, spending is applied in this order:

1. **Dining Plus** — consumed first, up to the total extras cost.
2. **Dining Cash** — consumed second, for any remaining extras cost.

If combined balances are insufficient, the extras purchase is declined.

**Business Rationale:** Plan-included value should be used before student-funded value, maximizing plan utility and reducing unexpected Dining Cash depletion.

**Operational Impact:** Restaurant staff and students should understand that plan-included credits may cover extras before personal top-up balance is touched.

---

### 4.7 Wallet Integrity and Adjustments

**Policy:** All wallet balance changes must be traceable to a business event (plan purchase, redemption, top-up, refund, semester expiry, or documented admin adjustment). Manual admin adjustments require a documented reason and approver identity. Large adjustments above an admin-defined threshold require dual approval.

**Business Rationale:** Financial platforms require auditability for disputes, reconciliation, and fraud investigation.

**Operational Impact:** Support cannot informally "add swipes" without an admin adjustment record. Finance reviews adjustment reports monthly.

---

### 4.8 Wallet Freeze During Investigation

**Policy:** LunchLink Admin may freeze wallet activity during fraud investigation. Frozen wallets cannot spend or receive new credits until cleared or suspended.

**Business Rationale:** Prevents further loss during active investigation.

**Operational Impact:** Admin must notify the student when practicable. Investigation resolution SLA target: 5 business days.

---

## 5. Meal Plan Rules

### 5.1 Meal Plan Components

**Policy:** Each meal plan sold by LunchLink includes:

- A Swipe allocation (integer count)
- A Dining Plus allocation (monetary amount in UGX)
- Validity tied to the active university semester

**Business Rationale:** Plans bundle meal entitlements with discretionary extras spending, the core LunchLink value proposition.

**Operational Impact:** Admin configures plans per university and semester. Plans cannot be sold across university boundaries.

---

### 5.2 Plan Stacking (Additive Purchases)

**Policy:** Meal plan purchases **stack**. Each successful purchase **adds** its Swipe and Dining Plus allocations to the student's existing balances. New purchases never overwrite or replace existing balances.

**Business Rationale:** Students may buy additional plans mid-semester ("upgrade" or "renew" in student language) without losing unused entitlements. Additive stacking is simple, fair, and avoids proration disputes in MVP.

**Operational Impact:** "Upgrade" and "renew" in the student portal mean **purchase another plan** that adds to current balances. Support must not describe purchases as "replacing" a plan.

---

### 5.3 Plan Purchase Eligibility

**Policy:** Only **Verified** students may purchase meal plans. Registered students with pending or rejected photos may browse plans but cannot complete purchase.

**Business Rationale:** Ensures paying customers are identity-verified before receiving entitlements.

**Operational Impact:** Checkout flow must block unverified students with clear messaging to complete photo verification.

---

### 5.4 Plan Pricing Visibility

**Policy:** Meal plan prices (total package price in UGX) are visible to students. Individual per-meal or per-swipe unit economics are not displayed.

**Business Rationale:** Students purchase packages, not à la carte meals. Plan price transparency supports informed purchase decisions.

**Operational Impact:** Marketing may show plan totals and included Swipes/Dining Plus; never implied cost per plate at restaurant.

---

### 5.5 Plan Validity and Semester Binding

**Policy:** Meal plans sold for a semester grant Swipes and Dining Plus that expire when that semester ends, regardless of purchase date within the semester.

**Business Rationale:** Aligns entitlements with the academic calendar and university partnerships.

**Operational Impact:** Late-semester purchasers receive the same expiry date as early purchasers. Communications must state expiry clearly at purchase.

---

### 5.6 Dining Cash Top-Up

**Policy:** Verified students may top up Dining Cash independently of meal plan purchases. Top-ups are subject to minimum and maximum amounts set by LunchLink Admin per university.

**Business Rationale:** Top-ups extend extras purchasing power beyond plan-included Dining Plus.

**Operational Impact:** Admin publishes top-up limits. Support handles failed top-ups through standard payment support and refund rules.

---

## 6. Restaurant Rules

### 6.1 Partner Restaurant Eligibility

**Policy:** A restaurant must be approved by LunchLink Admin and assigned to a university before accepting redemptions. Only **active** partner restaurants may redeem Swipes.

**Business Rationale:** Quality control and contractual accountability require admin onboarding.

**Operational Impact:** Admin maintains restaurant approval queue. Deactivated restaurants immediately stop accepting redemptions.

---

### 6.2 Standard Meal and Sauce Selection

**Policy:** One Swipe redeems one Standard Meal. The student (via restaurant staff selection at counter) chooses from sauces available on the restaurant's daily menu. All eligible sauce selections consume exactly one Swipe regardless of the restaurant's internal cost for that sauce.

**Business Rationale:** Swipe economics depend on price opacity and uniform student cost per meal.

**Operational Impact:** Restaurant staff must select the served sauce at redemption. Disputes about "premium sauce" upselling are resolved by LunchLink Admin against partnership terms.

---

### 6.3 Internal Meal Costs

**Policy:** Restaurants may record internal cost assignments per sauce for manager and admin reporting. Internal costs are **never** shown to students.

**Business Rationale:** Restaurants need internal economics visibility; students must not see meal pricing.

**Operational Impact:** Restaurant managers maintain internal pricing. Admin may use internal costs for partnership analytics but not for student charges in MVP.

---

### 6.4 Extras Management

**Policy:** Restaurant managers define extras (name, price, availability). Extras prices are **visible to students**. Restaurants may activate or deactivate extras.

**Business Rationale:** Extras are optional, priced add-ons distinct from the Swipe-covered Standard Meal.

**Operational Impact:** Price changes apply to future purchases only. Support resolves price disputes using transaction timestamps.

---

### 6.5 Daily Menu and Availability

**Policy:** Restaurants publish daily sauce availability. Redemptions should only be completed for sauces marked available on the daily menu for that date.

**Business Rationale:** Prevents redemption for items the restaurant is not serving.

**Operational Impact:** Restaurant managers update daily menus before service. Staff cannot redeem against unavailable sauces.

---

### 6.6 Included Base Foods

**Policy:** Restaurants communicate included base foods (e.g. rice, posho, matooke) as part of the Standard Meal. Base foods do not incur additional Swipe cost.

**Business Rationale:** Sets student expectation of what one Swipe covers.

**Operational Impact:** Restaurant onboarding includes agreement on standard base food offerings.

---

### 6.7 Restaurant Staff Redemption Duties

**Policy:** Restaurant staff must, at each redemption:

1. Scan or validate the student's dynamic redemption credential.
2. Visually compare the student to their approved photo.
3. Confirm student identity before completing redemption.
4. Select the sauce served.
5. Add optional extras and confirm student acceptance of extras charges.

**Business Rationale:** In-person identity verification is the last line of fraud defense.

**Operational Impact:** Staff training is mandatory at partner onboarding. Failure to verify identity is grounds for partnership review.

---

### 6.8 Restaurant Compensation Visibility

**Policy:** Swipe payout rates are visible to restaurant managers and LunchLink Admin only. Students never see payout rates.

**Business Rationale:** Payout rates are commercial terms between LunchLink and restaurants.

**Operational Impact:** Restaurant-facing communications and payout reports show rates; student-facing materials must not reference them.

---

### 6.9 Restaurant Tier Assignment

**Policy:** Each restaurant is assigned to a **tier** within its university. Tier determines default Swipe Rate unless a restaurant-specific rate overrides it. In MVP, all verified students at a university may redeem at all active partner restaurants regardless of tier.

**Business Rationale:** Tiers organize payout economics. Tier-based student access restrictions are deferred to a future phase (e.g. map filtering).

**Operational Impact:** Tier affects payout calculation only in MVP, not student eligibility.

---

### 6.10 Weekly Payout Cycle

**Policy:** Restaurant Swipe compensation is calculated on a **weekly** cycle per university. Payout equals redeemed Swipes in the period multiplied by the applicable Swipe Rate. Extras revenue is excluded from Swipe payout calculations.

**Business Rationale:** Predictable settlement cadence supports restaurant cash flow and LunchLink operations.

**Operational Impact:** Finance generates weekly payout reports. Actual disbursement process and timing are defined in restaurant agreements.

---

### 6.11 Extras Revenue to Restaurant

**Policy:** 100% of extras revenue (Dining Plus and Dining Cash spent on extras) belongs to the restaurant. LunchLink takes **no commission on extras in MVP**. LunchLink facilitates payment collection only.

**Business Rationale:** Simplest MVP model encourages restaurant participation and avoids split-payment accounting complexity.

**Operational Impact:** Restaurant settlement for extras, if handled outside Swipe payouts, follows separate agreement terms. Swipe payout reports do not include extras.

---

### 6.12 Operating Hours

**Policy:** Restaurants define operating hours. Redemptions should occur only when the restaurant is open for service. LunchLink may display open/closed status to students.

**Business Rationale:** Prevents redemption outside service hours.

**Operational Impact:** Managers keep hours accurate. Disputes for after-hours redemption attempts are denied.

---

## 7. University Rules

### 7.1 Independent Economic Pool

**Policy:** Each university operates as an **independent economic pool**. Students, restaurants, meal plans, collections, liabilities, payouts, and reporting are scoped to a single university. Cross-university redemption, purchase, or data access is prohibited.

**Business Rationale:** Universities have distinct partnerships, pricing, and reporting requirements. Isolation simplifies scaling and accountability.

**Operational Impact:** Admin configures each university separately. Consolidated platform reporting aggregates university pools but does not commingle funds.

---

### 7.2 University Configuration

**Policy:** Per university, LunchLink Admin configures: active semesters; meal plan catalog; default Swipe Rate; restaurant tiers; partner restaurants; and operational limits (e.g. daily redemption cap, cooldown) unless globally standardized.

**Business Rationale:** Local configuration reflects campus-specific partnerships and policies.

**Operational Impact:** Launching a new university requires full configuration before student registration opens.

---

### 7.3 Semester Definition

**Policy:** Each university has one or more defined semesters with start date, end date, and active flag. Exactly one semester should be **active** for student enrollment and wallet expiry at a time per university.

**Business Rationale:** Semesters anchor plan validity and Swipe/Dining Plus expiry.

**Operational Impact:** Admin publishes semester calendar before each term. Misconfigured semesters block plan sales and expiry processing.

---

### 7.4 University Admin Delegation (Future)

**Policy:** *(MVP note)* Platform-wide LunchLink Admin manages all universities. **University-scoped administrators** may be introduced in a future phase to manage photo approval and local reporting within a single university.

**Business Rationale:** Delegation supports scale across many universities without centralizing all operational tasks.

**Operational Impact:** MVP centralizes admin functions. Expansion requires a university admin role addendum to this document.

---

### 7.5 Reporting Isolation

**Policy:** Financial and operational reports are available per university. Cross-university student or revenue data is available only to platform-level LunchLink Admin.

**Business Rationale:** Universities expect confidential reporting for their economic pool.

**Operational Impact:** Report exports must include university identifier. Shared dashboards filter by university.

---

## 8. Financial Rules

### 8.1 Platform Revenue Model

**Policy:** LunchLink earns revenue from **meal plan sales**. Revenue is recognized when a student successfully purchases a plan. Restaurant Swipe liability is calculated **separately** based on redemptions × applicable Swipe Rate. LunchLink does **not** earn commission on restaurant extras in MVP.

**Business Rationale:** Clear separation between platform revenue (plan margin) and restaurant liability (per-redemption cost) enables sustainable unit economics and transparent restaurant partnerships.

**Operational Impact:** Finance tracks plan collections vs. accumulated Swipe liability per university. Profit analysis compares plan revenue to redemption liability and operating costs.

---

### 8.2 Restaurant Compensation Formula

**Policy:**

```text
Restaurant Swipe Payout = Redeemed Swipes in Period × Applicable Swipe Rate
```

Extras spending is excluded from this formula.

**Business Rationale:** Restaurants are compensated for meals served, not for plan sales or extras facilitated payments.

**Operational Impact:** Weekly payout reports show Swipe count and rate applied. Disputes reference redemption transaction records.

---

### 8.3 Swipe Rate Precedence

**Policy:** The **Applicable Swipe Rate** for a restaurant in a given semester is determined by the first available value in this order:

1. **Restaurant-Specific Rate** — individually configured for that restaurant and semester.
2. **Restaurant Tier Rate** — default rate for the restaurant's assigned tier within the university.
3. **University Default Rate** — fallback rate configured for the university.

**Business Rationale:** Allows negotiation with individual partners while maintaining tier defaults and a university-wide fallback.

**Operational Impact:** Admin must document which rate applied on each payout report. Rate changes apply **forward-only** from their effective date and do not retroactively alter closed payout periods.

---

### 8.4 Collections and Payment Methods

**Policy:** Student payments for plans and Dining Cash top-ups are collected via MTN Mobile Money and Airtel Money. LunchLink uses a licensed payment aggregator (Flutterwave) as payment facilitator.

**Business Rationale:** Regulatory and operational payment handling requires a certified aggregator in Uganda.

**Operational Impact:** Finance reconciles aggregator settlements against successful payment records. Unmatched payments follow the reconciliation escalation process.

---

### 8.5 Pending and Failed Payments

**Policy:** A payment is not complete until the payment provider confirms success. Abandoned or failed payments do not credit wallets. Students may initiate a new payment attempt. Duplicate successful charges for the same intent qualify for refund review.

**Business Rationale:** Prevents crediting wallets without confirmed funds.

**Operational Impact:** Support uses payment reference and timestamp to resolve "I paid but have no swipes" cases. Admin may manually reconcile after verifying provider confirmation.

---

### 8.6 Financial Reconciliation

**Policy:** LunchLink Finance performs regular reconciliation of: payment provider settlements vs. recorded successful payments; wallet balances vs. transaction history; and payout calculations vs. redemption records.

**Business Rationale:** Real-money platforms require zero-tolerance drift detection.

**Operational Impact:** Discrepancies are escalated before payout approval. Payout periods may be held if reconciliation is incomplete.

---

### 8.7 Payout Approval

**Policy:** Weekly payout reports progress through: **draft** (system-generated) → **approved** (finance review) → **paid** (disbursement recorded). A payout period is locked after approval; redemptions cannot be added or removed retroactively.

**Business Rationale:** Prevents dispute and double-payment after restaurants have been paid.

**Operational Impact:** Finance must approve payouts before disbursement. Corrections require adjustment in a subsequent period with documentation.

---

## 9. Refund Rules

### 9.1 Refund Form: Platform Credit Only

**Policy:** All approved refunds are issued as **Dining Cash credit** to the student's wallet. Refunds are **not** issued as mobile money cash-out in MVP.

**Business Rationale:** Platform credit simplifies reversal, avoids payment rail reversal fees, and keeps value in the LunchLink ecosystem.

**Operational Impact:** Support must set expectation that refunds appear as Dining Cash, usable for extras.

---

### 9.2 Non-Refundable Items

**Policy:** The following are **not refundable**:

- Redeemed Swipes (meals already consumed)
- Unused Swipes after semester expiry
- Expired Dining Plus after semester expiry
- Voluntary Dining Cash top-ups (except platform error or qualifying dispute)

**Business Rationale:** Entitlements are semester-bound or already consumed. Dining Cash top-ups are treated as spent platform credit.

**Operational Impact:** Support declines refund requests for expired or used benefits with reference to this policy.

---

### 9.3 Refundable Events

**Policy:** Refunds may be approved for:

- Duplicate successful charges for the same purchase
- Confirmed payment provider success where wallet was not credited (technical failure)
- Documented platform or restaurant error (e.g. charged but meal not provided, verified by admin investigation)
- Payment failures incorrectly recorded as success

**Business Rationale:** Protects students from genuine errors while limiting abuse.

**Operational Impact:** Each refund requires admin approval, documented reason, and link to original payment or transaction. Target resolution SLA: 7 business days.

---

### 9.4 Refund Approval Authority

**Policy:** Only LunchLink Admin may approve refunds. Refunds above an admin-defined UGX threshold require secondary approver (Finance lead or designated officer).

**Business Rationale:** Segregation of duties for money movement.

**Operational Impact:** Support escalates refund requests to Admin; cannot issue refunds directly.

---

### 9.5 Restaurant Non-Delivery

**Policy:** If a student was charged Swipes or extras but verifiably did not receive the meal or extra due to restaurant fault, Admin may: restore the Swipe (if incorrectly deducted) or issue Dining Cash credit for extras charges. Pattern violations trigger restaurant partnership review.

**Business Rationale:** Fairness to students while maintaining restaurant accountability.

**Operational Impact:** Requires student report, staff investigation, and transaction evidence. Restored Swipes are admin adjustments, not payment refunds.

---

## 10. Fraud Prevention Rules

### 10.1 Dynamic Redemption Credentials

**Policy:** Student redemption credentials are **time-limited** (approximately two minutes), **single-use**, and invalidated immediately after successful redemption.

**Business Rationale:** Static codes enable screenshot sharing and replay fraud.

**Operational Impact:** Students must refresh credentials at the counter. Staff must complete redemption promptly after scan.

---

### 10.2 Photo Verification at Redemption

**Policy:** Restaurant staff must visually confirm that the person presenting the credential matches the approved photo before completing redemption.

**Business Rationale:** Credential alone does not prove physical presence of the account holder.

**Operational Impact:** Training emphasizes identity check. Fraud reports citing photo mismatch are prioritized.

---

### 10.3 Redemption Frequency Limits

**Policy:**

- Maximum **2 Swipe redemptions per student per calendar day** (university timezone: Africa/Kampala).
- Minimum **3 hours between** Swipe redemptions for the same student.

**Business Rationale:** Limits proxy meal collection and reselling patterns.

**Operational Impact:** System rejects excess redemptions with clear student/staff messaging. Admin may grant exceptions only for documented accommodations (future phase).

---

### 10.4 Redemption Eligibility Requirements

**Policy:** A Swipe redemption is permitted only when **all** of the following are true:

- Student is **Verified** (photo approved, account active)
- Student has Swipe balance ≥ 1
- Redemption credential is valid and unused
- Cooldown and daily limits satisfied
- Restaurant is active and at the student's university
- Student wallet is not frozen

**Business Rationale:** Consolidated gate prevents partial enforcement gaps.

**Operational Impact:** Staff see specific denial reasons. Support uses same criteria when investigating failed redemptions.

---

### 10.5 Account and Device Monitoring

**Policy:** LunchLink monitors anomalous patterns including: excessive credential generation; multiple devices generating credentials for one account; rapid redemptions across distant restaurants; and repeated failed scan attempts. Admin may suspend accounts pending investigation.

**Business Rationale:** Proactive fraud detection limits financial loss.

**Operational Impact:** Admin reviews fraud alerts regularly. Investigated accounts may be frozen per Wallet Rule 4.8.

---

### 10.6 Audit and Record Keeping

**Policy:** LunchLink maintains immutable records of: account logins; credential generation; redemptions; payments; refunds; wallet changes; and admin actions.

**Business Rationale:** Audit trail supports dispute resolution, regulatory inquiry, and fraud prosecution.

**Operational Impact:** Records are retained per data retention policy. Admin actions require identity and reason.

---

### 10.7 Online Redemption Requirement (MVP)

**Policy:** In MVP, redemptions require **live connectivity** at the restaurant. Offline redemption, manual override codes, and paper fallback are **not** supported except by explicit LunchLink Admin emergency procedure documented case-by-case.

**Business Rationale:** Real-time validation prevents double-spend and expired credential acceptance.

**Operational Impact:** Restaurants must maintain internet connectivity during service. Connectivity outages are operational risks for the restaurant, not automatic student compensation events.

---

### 10.8 Staff Misconduct

**Policy:** Restaurant staff must not redeem credentials for unidentified persons, split extras charges improperly, or collude with students to bypass identity checks. Violations may result in staff removal, restaurant penalty, or partnership termination.

**Business Rationale:** Staff are agents of fraud prevention at point of service.

**Operational Impact:** LunchLink Admin investigates reports from students, managers, or audit patterns.

---

## 11. Semester Management Rules

### 11.1 Active Semester

**Policy:** Each student is associated with the university's **active semester** for Swipe and Dining Plus expiry purposes. Meal plans purchased during that semester grant entitlements expiring at that semester's end date.

**Business Rationale:** Ties entitlements to academic calendar.

**Operational Impact:** Admin activates the correct semester before term start. Students cannot purchase current-semester plans if no semester is active.

---

### 11.2 Semester End Expiry

**Policy:** At semester end:

- **All remaining Swipes expire** and are forfeited.
- **All remaining Dining Plus expires** and is forfeited.
- **Dining Cash is unaffected** and carries forward.

**Business Rationale:** Swipes and Dining Plus are semester-scoped benefits included in term plans.

**Operational Impact:** Students receive advance expiry notifications (recommended: 14 days and 3 days before end). Support does not restore expired Swipes or Dining Plus except for documented platform error.

---

### 11.3 Semester Rollover

**Policy:** When a new semester begins:

- Students transition to the new active semester for new plan purchases.
- Expired Swipes and Dining Plus from the prior semester are zeroed and not carried forward.
- Dining Cash balances persist unchanged.
- Students must remain **Verified** to participate in the new semester without re-registration; photo re-verification may be required if photo is older than one year or admin requests update.

**Business Rationale:** Clean semester boundary simplifies accounting and student expectations.

**Operational Impact:** Admin executes semester rollover checklist: activate new semester, expire prior balances, publish new meal plans, notify students.

---

### 11.4 Grace Period

**Policy:** LunchLink does **not** offer a post-semester grace period for Swipe or Dining Plus usage in MVP unless explicitly approved by Admin for a specific university (e.g. exam week extension) and communicated in writing to affected students.

**Business Rationale:** Grace periods complicate expiry accounting and restaurant planning.

**Operational Impact:** Any approved extension must have documented end date and be applied uniformly to affected students at that university.

---

### 11.5 Mid-Semester Enrollment

**Policy:** Students who register mid-semester may purchase any available plan for the active semester. Entitlements expire at the same semester end date as early enrollees. No prorated plan pricing in MVP unless Admin publishes specific mid-semester plans.

**Business Rationale:** Additive stacking already handles mid-term purchases; separate proration rules add complexity.

**Operational Impact:** Admin may offer smaller mid-semester plan SKUs at different price points instead of proration.

---

## 12. Edge Cases

### 12.1 Expired Credential at Counter

**Policy:** If a student's redemption credential expires before staff completes redemption, staff must ask the student to refresh and scan again. The prior credential cannot be honored.

**Business Rationale:** Expiry is a security control.

**Operational Impact:** Staff training covers refresh flow. No Swipe is deducted for failed/expired scans.

---

### 12.2 Concurrent Scan of Same Credential

**Policy:** The first successful redemption consumes the credential. Subsequent scan attempts receive a "already used" outcome. Only one Swipe is deducted.

**Business Rationale:** Single-use credentials prevent double redemption.

**Operational Impact:** If two staff scan simultaneously, one succeeds and one fails. Investigate only if both show success (platform error).

---

### 12.3 Insufficient Balance for Extras

**Policy:** If a student lacks sufficient combined Dining Plus and Dining Cash for selected extras, staff may: remove extras and complete Swipe-only redemption, or cancel and ask the student to top up Dining Cash before adding extras.

**Business Rationale:** Swipe redemption and extras purchase may be decoupled when extras funding is insufficient.

**Operational Impact:** Staff should confirm extras total before deducting. Partial extras deduction is not permitted.

---

### 12.4 Sauce Unavailable After Scan

**Policy:** If the selected sauce is unavailable, staff selects an available sauce from the daily menu or declines redemption until the student accepts an alternative. A Swipe is not deducted until a valid redemption is completed.

**Business Rationale:** Student receives a Standard Meal, not a specific sauce entitlement.

**Operational Impact:** Menu accuracy is a restaurant operational responsibility.

---

### 12.5 Student Transfer Between Universities

**Policy:** Students do not self-transfer. Admin handles university changes by deactivating the old affiliation and creating a new enrollment. Swipes and Dining Plus do not transfer between universities. Dining Cash may transfer only by explicit Admin policy decision documented per case.

**Business Rationale:** Economic pools are university-scoped.

**Operational Impact:** Manual process; student may need to forfeit semester entitlements and repurchase at new university.

---

### 12.6 Duplicate Plan Purchase

**Policy:** Duplicate plan purchases are allowed and stack per Meal Plan Rule 5.2. Duplicate **accidental** payments for the same checkout intent are handled under Refund Rules.

**Business Rationale:** Stacking is intentional; duplicate payment is error.

**Operational Impact:** Support distinguishes "I bought two plans on purpose" from "I was charged twice for one checkout."

---

### 12.7 Deceased or Withdrawn Student

**Policy:** Admin closes accounts for deceased or permanently withdrawn students per university notification. Unused Swipes and Dining Plus are forfeited. Dining Cash may be handled per refund policy and legal guidance; cash-out remains unavailable in MVP.

**Business Rationale:** Sensitive case requiring legal and admin judgment.

**Operational Impact:** Escalate to Admin and Legal. No standard self-service path.

---

### 12.8 Restaurant Deactivation Mid-Semester

**Policy:** If a restaurant is deactivated, pending redemptions at that location cease. Students are not entitled to cash compensation for lost convenience. Admin may communicate alternative restaurants. Swipe liability for past redemptions remains payable per payout rules.

**Business Rationale:** Partnership termination is a business decision, not a student refund event.

**Operational Impact:** Proactive student communication when popular restaurants deactivate.

---

### 12.9 Platform Outage During Redemption

**Policy:** If LunchLink is unavailable, redemptions cannot be completed. Students and restaurants must retry when service restores. Admin may investigate widespread outage compensation case-by-case; no automatic Swipe credit.

**Business Rationale:** Outage compensation creates moral hazard without verified per-student harm.

**Operational Impact:** Status page and support macros for outage events. Post-incident review determines if goodwill credits warranted.

---

### 12.10 Credential Shared via Screenshot

**Policy:** Students must not share redemption credentials. If a credential is redeemed by an unauthorized person due to student sharing, the Swipe is consumed and is not restored. Repeat offenses may trigger suspension.

**Business Rationale:** Credential sharing is student negligence analogous to sharing a bank OTP.

**Operational Impact:** Support educates students. Fraud investigation for patterns of shared credentials.

---

## 13. Policy Change Governance

### 13.1 Authority to Change Policy

**Policy:** Changes to this document require approval by **Product Lead** and **Finance Lead** jointly for any rule affecting money, expiry, or refunds. **Operations Lead** co-approves rules affecting restaurant or student workflows. **Legal** reviews changes affecting payments, data, or consumer terms.

**Business Rationale:** Cross-functional approval prevents unilateral changes with financial or legal risk.

**Operational Impact:** Emergency changes (e.g. fraud spike) may use interim Admin bulletin valid up to 14 days pending formal document update.

---

### 13.2 Versioning and Communication

**Policy:** Each policy change increments the document version, records effective date, and summarizes changes in a changelog. Material changes affecting students or restaurants require notification at least **14 days** before effective date except for fraud or security emergencies.

**Business Rationale:** Predictability builds trust with students and restaurant partners.

**Operational Impact:** Support and restaurant managers receive change summaries. In-app notices for student-facing changes.

---

### 13.3 Implementation Lag

**Policy:** Engineering implementation may lag policy effective date only with written exception. No implementation may contradict the current published policy without an approved policy amendment.

**Business Rationale:** Prevents engineering interpretation from becoming de facto policy.

**Operational Impact:** Product files policy tickets linked to this document version.

---

### 13.4 University-Specific Overrides

**Policy:** University-specific exceptions (e.g. exam week extension, custom plan catalog) must be documented as written addenda referencing this document, approved by Product and Finance, and scoped to one university and time period.

**Business Rationale:** Allows partnership flexibility without undermining global rules.

**Operational Impact:** Admin portal should record active overrides. Support checks override registry before denying student requests.

---

### 13.5 Deferred Features (Phase 2+)

**Policy:** The following are **not** governed by MVP rules and require separate policy documents before launch:

| Feature | Phase |
| ------- | ----- |
| Order Ahead | Phase 2 |
| Guest Meals | Phase 2 |
| Special Accommodation Meals | Phase 2 |
| Sponsored student accounts | Phase 2+ |
| Restaurant tier-based student access restrictions | Phase 2+ |
| Push notification preferences (beyond email/SMS MVP) | Phase 2 |
| Interactive restaurant map filters (tier compatibility) | Phase 2 |

**Business Rationale:** Prevents scope creep and half-defined rules in MVP.

**Operational Impact:** Support must not promise Phase 2 features until their policy addenda are published.

---

### 13.6 Dispute Escalation Path

**Policy:** Disputes escalate: **Frontline Support** (policy clarification) → **Admin** (investigation, adjustment, refund) → **Finance** (payout or reconciliation dispute) → **Product/Legal** (policy exception or partner termination).

**Business Rationale:** Clear escalation reduces inconsistent outcomes.

**Operational Impact:** Support ticket categories map to escalation tiers. SLA targets defined in operations handbook.

---

## Appendix A: Policy Changelog

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.0 | June 2025 | Initial authoritative release. Consolidates Platform Architecture, Technical Specification, and Architecture Review approved policies. |

---

## Appendix B: Conflicts Resolved by This Document

| Topic | Superseded Position | Canonical Rule (This Document) |
| ----- | ------------------- | ------------------------------ |
| LunchCredits vs wallets | Platform Architecture implies single LunchCredits wallet | Three wallets; LunchCredits is display label for Plus + Cash |
| Plan upgrade/renew | Implied replacement | Additive stacking; upgrade/renew = purchase additional plan |
| Extras revenue | Undefined split | 100% to restaurant; no platform commission in MVP |
| Platform revenue | Undefined | Revenue from plan sales; liability separate per redemption |
| Swipe rate selection | Multiple config levels without order | Restaurant-specific → tier → university default |
| Refund form | "LunchLink Credit" (generic) | Dining Cash wallet specifically |
| Tier and student access | Map tier compatibility filter | MVP: all verified students access all active restaurants; tier affects payout rate only |

---

*This document is the single source of truth for LunchLink business policy. For technical implementation, refer to Technical Foundation and related engineering documents, which must conform to these rules.*
