# LunchLink Technical Specification

Version: 1.0 MVP

Status: Approved for Development

---

# 1. Product Overview

## Purpose

LunchLink is a university meal plan platform that enables students to purchase meal plans, redeem meals at partner restaurants, and manage meal-related spending through a digital wallet system.

The platform consists of:

* Student Portal
* Restaurant Portal
* Admin Portal
* Payment System
* QR Redemption System
* Wallet System
* Notification System

---

# 2. Business Model

## Core Principle

Students do not purchase meals individually.

Students purchase meal plans containing meal credits called Swipes.

### Swipe Definition

```text
1 Swipe = 1 Standard Meal
```

A swipe represents a complete meal entitlement.

Students do not see meal pricing.

Restaurants agree to provide approved meal bundles in exchange for swipe redemption.

---

## Restaurant Compensation

Restaurants are compensated based on redeemed swipes.

Formula:

```text
Payout =
Redeemed Swipes × Configured Payout Rate
```

Example:

```text
100 Swipes × 4,500 UGX
=
450,000 UGX
```

The payout rate is configurable by:

* University
* Semester
* Restaurant Tier

Students never see payout rates.

---

# 3. User Roles

## Student

Permissions:

* Register account
* Upload verification photo
* Purchase meal plans
* View balances
* Generate QR code
* Redeem meals
* Purchase extras
* View transactions
* Manage profile

---

## Restaurant Staff

Permissions:

* Scan QR codes
* Verify student identity
* Redeem swipes
* Charge extras
* View redemption history

---

## Restaurant Manager

Permissions:

* All Staff Permissions
* Manage sauces
* Manage extras
* Manage staff
* View payout reports
* View restaurant analytics

---

## Administrator

Permissions:

* Approve students
* Approve restaurants
* Manage universities
* Configure payout rates
* Process refunds
* Monitor fraud
* Access financial reporting

---

# 4. Student Verification Workflow

## Registration

Required Information:

* Full Name
* Email Address
* Phone Number
* Student Number
* University

Account Status:

```text
Registered
```

---

## Verification

Student uploads:

* Current facial photo

Admin reviews submission.

Statuses:

```text
Pending
Approved
Rejected
```

Only approved students may redeem meals.

---

# 5. Wallet Architecture

Every student account contains three wallets.

---

## Swipe Wallet

Purpose:

Meal redemption.

Rules:

```text
1 Swipe = 1 Meal
```

Characteristics:

* Non-transferable
* Cannot be withdrawn
* Expires at end of semester

---

## Dining Plus Wallet

Purpose:

Plan-included spending balance.

Used for:

* Soda
* Water
* Snacks
* Dessert
* Extra portions

Characteristics:

* Included with meal plan
* Expires at end of semester

---

## Dining Cash Wallet

Purpose:

Student-funded spending balance.

Used for:

* Extras
* Top-ups
* Future services

Characteristics:

* Purchased separately
* Never expires
* Non-refundable except platform error

---

# 6. Meal Redemption System

## Requirements

A student may redeem a meal only if:

* Account is verified
* QR token is valid
* Swipe balance > 0
* Cooldown period satisfied
* Daily redemption limit not exceeded

---

## Redemption Rules

Cooldown:

```text
Minimum 3 Hours
```

Daily Limit:

```text
Maximum 2 Swipes Per Day
```

---

## Redemption Flow

```text
Generate QR
      ↓
Restaurant Scans QR
      ↓
Display Student Photo
      ↓
Verify Student Identity
      ↓
Select Sauce Served
      ↓
Redeem Swipe
      ↓
Record Transaction
      ↓
Update Wallet
```

---

# 7. QR Code Architecture

## Dynamic QR

QR codes are temporary.

Expiration:

```text
2 Minutes
```

---

## Security Rules

QR tokens:

* Single use
* Time-limited
* Linked to student account
* Invalid after redemption

---

## Anti-Fraud Controls

* Dynamic QR generation
* Photo verification
* Redemption cooldown
* Daily redemption limit
* Audit logs
* Device tracking

---

# 8. Restaurant Operations

## Meal Management

Restaurants manage:

* Daily sauces
* Availability
* Meal categories

Examples:

```text
Chicken Curry
Beef Stew
Fish
Beans
Groundnut Sauce
```

---

## Internal Pricing

Restaurants may define internal costs.

Example:

```text
Chicken Curry = 9,000 UGX
Fish = 10,000 UGX
Beans = 6,000 UGX
```

Visible to:

* Restaurant Manager
* Admin

Hidden from students.

---

# 9. Extras Management

Restaurants define optional extras.

Examples:

```text
Soda
Water
Extra Meat
Chapati
Fruit
```

Restaurants set:

* Name
* Price
* Availability

Students can purchase extras using:

1. Dining Plus
2. Dining Cash

Priority:

```text
Dining Plus First
Dining Cash Second
```

---

# 10. Meal Plans

## Components

Each meal plan contains:

* Swipe Allocation
* Dining Plus Allocation
* Validity Period

Example:

```text
Starter Plan

30 Swipes
20,000 Dining Plus
Semester Validity
```

---

## Purchase Methods

Supported Payments:

* MTN Mobile Money
* Airtel Money

---

# 11. University Isolation Rules

Each university operates independently.

Configurable per university:

* Meal plans
* Payout rates
* Restaurants
* Students
* Reporting

Benefits:

* Separate economics
* Easier scaling
* Cleaner reporting

---

# 12. Payment Architecture

## Supported Providers

Phase 1:

* Flutterwave
* MTN MoMo
* Airtel Money

---

## Payment Flow

```text
Select Plan
      ↓
Enter Phone Number
      ↓
Payment Request
      ↓
Provider Confirmation
      ↓
Wallet Credit
      ↓
Receipt Generation
```

---

# 13. Refund Policy

## Non-Refundable

* Redeemed swipes
* Unused swipes after semester expiry
* Expired Dining Plus

---

## Refundable

* Duplicate charges
* Payment failures
* Technical errors
* Restaurant non-delivery

---

## Refund Method

Refunds are issued as:

```text
LunchLink Credit
```

Not cash.

---

# 14. Notification System

Channels:

* Push Notifications
* Email
* SMS

---

## Trigger Events

* Registration Approved
* Meal Redeemed
* Payment Successful
* Plan Expiring
* Low Balance
* Refund Processed

---

# 15. Audit Logging

The system must log:

* Logins
* QR generation
* Redemptions
* Payment events
* Refund events
* Wallet changes
* Admin actions

Logs must be immutable.

---

# 16. Phase 2 Features

Not included in MVP.

## Order Ahead

Students may:

* Select restaurant
* Select sauce
* Schedule pickup

Restaurant receives preparation request.

---

## Special Accommodation Meals

Students with approved accommodations may request:

* Take-away meals
* Alternate pickup arrangements

---

## Guest Meals

Students receive:

```text
4 Guest Meals Per Semester
```

Feature disabled in MVP.

---

# 17. Technical Stack

Frontend:

* Next.js 15
* React
* TypeScript
* Tailwind CSS
* shadcn/ui

Backend:

* Supabase

Database:

* PostgreSQL

Authentication:

* Supabase Auth

Maps:

* Leaflet.js
* OpenStreetMap

Payments:

* Flutterwave

Hosting:

* Vercel
* Supabase

---

# 18. MVP Success Criteria

The MVP is considered complete when:

* Students can register and verify identity
* Students can purchase meal plans
* Wallets function correctly
* Restaurants can redeem swipes
* Extras can be purchased
* Admins can approve users
* Payments are successful
* Payout calculations work
* Fraud prevention rules are enforced
* Full audit trail exists

```
```
