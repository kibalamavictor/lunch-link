# LunchLink Platform Architecture

## Overview

**LunchLink** is a university meal-plan platform that connects students and partner restaurants through prepaid meal subscriptions.

Students purchase meal plans containing:

* Meal Swipes
* LunchCredits

Students redeem meals using Meal Swipes and purchase extras using LunchCredits.

---

## Core Business Rule

### Student View

Students do **not** see meal prices.

Students only see:

* Participating restaurants
* Available sauces
* Meal availability
* Extras and their prices

A meal swipe grants access to a complete meal regardless of the sauce selected.

Examples:

* Rice + Beans + Chicken Curry
* Rice + Posho + Beef Stew
* Matooke + Fish Sauce

All consume:

**1 Meal Swipe**

---

### Restaurant View

Restaurants internally assign costs to sauces.

Example:

| Sauce         | Internal Cost |
| ------------- | ------------- |
| Beans         | 6,000 UGX     |
| Beef Stew     | 8,000 UGX     |
| Chicken Curry | 9,000 UGX     |
| Fish Sauce    | 10,000 UGX    |

These costs are:

* Visible to Restaurant Managers
* Visible to Admins
* Hidden from Students

---

# Platform Modules

## 1. Public Website

### Purpose

Marketing, onboarding and registrations.

### Pages

```text
Home
About
How It Works
Partner Restaurants
Universities
Meal Plans
FAQ
Contact
Student Registration
Restaurant Registration
Login
```

---

## 2. Student Portal

### Dashboard

Displays:

* Student information
* Active meal plan
* Remaining meal swipes
* LunchCredits balance
* Quick actions

### Structure

```text
Dashboard
│
├── Overview
├── Digital Student Card
├── Restaurant Map
├── Meal Plans
├── LunchCredits
├── Transactions
├── Notifications
├── Profile
└── Support
```

---

## 3. Digital Student Card

### Components

```text
Student Photo
Student Number
LunchLink ID
University
QR Code
```

### QR Security

* Dynamic QR
* Regenerates every 2 minutes
* Invalid after successful redemption
* Anti-fraud protection

---

## 4. Restaurant Discovery

### Map System

Technology:

* Leaflet.js
* OpenStreetMap

### Features

```text
Current Student Location
Restaurant Pins
Directions
Tier Compatibility Filter
Distance Filter
Open/Closed Filter
```

---

## 5. Restaurant Detail Page

Students can view:

### Restaurant Information

```text
Restaurant Name
Location
Operating Hours
Status
```

### Today's Sauces

Examples:

```text
Beans
Groundnut
Chicken Curry
Beef Stew
Fish Sauce
```

### Included Foods

```text
Rice
Posho
Matooke
Sweet Potatoes
Cassava
```

### Extras

Examples:

```text
Soda
Water
Extra Chicken
Extra Beef
Chapati
Avocado
```

### Important Rule

Students never see meal prices.

Students only see:

* Sauce availability
* Extras pricing

---

## 6. Meal Plan Management

### Features

```text
View Current Plan
Purchase Plan
Upgrade Plan
Renew Plan
View Swipe Balance
```

---

## 7. LunchCredits Wallet

### Features

```text
Current Balance
Top Up Credits
Transaction History
Purchase Extras
```

### Supported Purchases

```text
Soda
Water
Extra Meat
Chapati
Fruit
Other Restaurant Extras
```

---

# Restaurant Portal

## Overview

Allows restaurant staff to verify students and manage operations.

### Structure

```text
Dashboard
QR Scanner
Meal Management
Extras Management
Transactions
Staff Accounts
Payout Reports
Settings
```

---

## 8. QR Redemption Module

### Flow

```text
Scan Student QR
        ↓
Display Student Photo
        ↓
Verify Identity
        ↓
Select Sauce Served
        ↓
Redeem Meal Swipe
        ↓
Add Extras (Optional)
        ↓
Deduct LunchCredits
        ↓
Save Transaction
```

---

## 9. Meal Management

### Purpose

Manage sauces and internal meal costs.

### Components

```text
Sauce Catalog
Daily Menu
Availability
Internal Pricing
Stock Tracking
```

### Internal Cost Example

```text
Chicken Curry → 9,000 UGX
Beef Stew → 8,000 UGX
Fish Sauce → 10,000 UGX
Beans → 6,000 UGX
```

Visible only to:

* Restaurant Managers
* LunchLink Admins

---

## 10. Extras Management

Restaurants can:

```text
Create Extra
Set Price
Edit Price
Activate Extra
Deactivate Extra
```

### Example

| Extra      | Price     |
| ---------- | --------- |
| Soda       | 2,000 UGX |
| Water      | 1,000 UGX |
| Extra Beef | 3,000 UGX |
| Chapati    | 1,500 UGX |

These prices are visible to students.

---

# Payment Module

## Supported Methods

```text
MTN Mobile Money
Airtel Money
```

### Payment Flow

```text
Select Meal Plan
Enter Phone Number
Trigger STK Push
Enter Mobile Money PIN
Payment Confirmation
Receipt Generation
Wallet Update
```

---

# Admin Portal

## Purpose

System administration and financial management.

### Structure

```text
Dashboard
Students
Restaurants
Universities
Meal Plans
Transactions
Financials
Payouts
Fraud Monitoring
Settings
```

---

## Student Management

### Functions

```text
Approve Photos
Reject Photos
Suspend Accounts
Verify Student Identity
Manage University Access
```

---

## Restaurant Management

### Functions

```text
Approve Restaurants
Deactivate Restaurants
Monitor Performance
Manage Agreements
```

---

## Financial Management

### Components

```text
Collections
Revenue
Commissions
Restaurant Liability
Profit Tracking
Payout Tracking
```

---

## Restaurant Payout Engine

Weekly payout calculation.

Example:

```text
Restaurant A

240 Meals Redeemed

Payout Rate = 5,000 UGX

Amount Due = 1,200,000 UGX
```

Generated automatically.

---

# Notification System

### Channels

```text
SMS
Email
Push Notifications
```

### Events

```text
Payment Successful
Meal Redeemed
Credit Top-Up
Low Balance Alert
Plan Expiry Reminder
Restaurant Updates
```

---

# Security Architecture

## Campus Lock

Students can only access services associated with their university.

---

## Photo Verification

Every student must have an approved image.

Restaurant staff verify:

```text
QR Code
Photo
Student Details
```

before redemption.

---

## Anti-Fraud Controls

```text
Dynamic QR
QR Expiration
Single Use Redemption
Photo Verification
Transaction Logging
```

---

# Database Architecture

## Core Tables

```text
Users
Students
Restaurants
Universities
RestaurantLocations
MealPlans
StudentWallets
Swipes
LunchCredits
Sauces
RestaurantSaucePricing
Extras
ExtraPricing
Transactions
Payments
Payouts
QRTokens
Notifications
PhotoApprovals
StaffAccounts
```

---

# Navigation Architecture

## Public

```text
Home
About
Restaurants
Universities
Meal Plans
FAQ
Contact
Register
Login
```

## Student

```text
Dashboard
Digital Card
Map
Meal Plans
Wallet
Transactions
Notifications
Profile
Support
```

## Restaurant

```text
Dashboard
Scan QR
Meal Management
Extras
Transactions
Payouts
Staff
Settings
```

## Admin

```text
Dashboard
Students
Restaurants
Universities
Meal Plans
Transactions
Financials
Payouts
Fraud Monitoring
Settings
```

---

# Recommended MVP Release

### Phase 1

* Student registration
* Photo approval
* Meal plans
* Mobile Money payments
* Dynamic QR codes
* Restaurant scanner
* Swipe redemption
* Extras purchases
* Admin dashboard

### Phase 2

* Interactive map
* Push notifications
* Restaurant analytics
* Automated payouts

### Phase 3

* Multi-university expansion
* Loyalty programs
* Referral system
* Advanced financial reporting
* Mobile applications

```
```
