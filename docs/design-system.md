# LunchLink Brand Guidelines & Design System

## Overview

LunchLink is a meal plan subscription platform built for university students in Uganda.

The visual identity should feel:

* Warm
* Trustworthy
* Friendly
* Modern
* Student-centered
* Effortless

The experience should feel closer to a lifestyle and campus companion than a financial or administrative platform.

---

# Brand Personality

## Core Attributes

### Friendly

LunchLink should feel welcoming and approachable.

Examples:

* Hello, Kaluna
* Welcome back
* Let's Start
* Ready for lunch?
* Your next meal is waiting

---

### Reliable

Students should feel confident that:

* Their meal plan works
* Their credits are secure
* Their transactions are transparent

---

### Effortless

The interface should remove friction.

Students should never feel like they are navigating a complicated system.

Every action should feel:

* Fast
* Clear
* Predictable

---

### Human

Avoid corporate or institutional language.

Use warm conversational copy.

Prefer:

> "Complete your daily nutrition"

Instead of:

> "Nutritional requirements pending"

---

# Design Principles

## 1. Simplicity First

Reduce cognitive load.

Only show information necessary for the current task.

---

## 2. Large Touch Targets

The platform is mobile-first.

Buttons, inputs and cards should be easy to interact with using a thumb.

---

## 3. Whitespace Is Part Of The Design

Generous spacing should be used throughout the application.

Whitespace is not empty space.

Whitespace improves:

* Readability
* Focus
* Calmness

---

## 4. Soft Shapes Everywhere

Avoid sharp edges.

Rounded elements create friendliness and approachability.

Apply rounded corners consistently to:

* Cards
* Buttons
* Tags
* Inputs
* Modals
* Navigation components

---

# Color System

## Primary Accent

Used for:

* Active states
* Selected items
* Highlights
* Progress indicators
* Positive actions

```css
Primary Accent
#C8E6A0
```

Name:

**Sage Green**

---

## Background

Used for:

* Application backgrounds
* Dashboard screens
* Portal pages

```css
Background
#F5F0E8
```

Name:

**Warm Cream**

---

## Surface / Card Background

Used for:

* Cards
* Modals
* Content containers

```css
Card Background
#FFFFFF
```

Name:

**Pure White**

---

## Primary Text

Used for:

* Headings
* CTA labels
* Important information

```css
Primary Text
#1A1A1A
```

Name:

**Deep Charcoal**

---

## Secondary Text

Used for:

* Metadata
* Descriptions
* Supporting information

```css
Secondary Text
#888888
```

Name:

**Muted Gray**

---

# Semantic Colors

## Success

```css
#4CAF50
```

Used for:

* Successful payments
* Successful redemption
* Positive confirmations

---

## Warning

```css
#F4B400
```

Used for:

* Low balance
* Plan expiration reminders

---

## Error

```css
#E53935
```

Used for:

* Failed payments
* Validation errors
* Account issues

---

# Typography

## Heading Font

Recommended:

* Inter Bold
* Inter ExtraBold
* DM Sans Black

Characteristics:

* Heavy
* Confident
* Easy to scan

---

## Heading Scale

### H1

```css
48px
800 Weight
```

Hero headings

---

### H2

```css
36px
700 Weight
```

Section headings

---

### H3

```css
24px
700 Weight
```

Card and dashboard headings

---

## Body Font

Recommended:

* Inter
* DM Sans

Characteristics:

* Light
* Clean
* Highly readable

---

### Body Large

```css
16px
400 Weight
```

---

### Body Small

```css
14px
400 Weight
```

---

### Caption

```css
12px
400 Weight
```

---

# Numerical Display Rules

Numbers should be visually emphasized.

Examples:

* Remaining Swipes
* LunchCredits
* Calories
* Protein
* Prices
* Balances

Style:

```css
Font Weight: 700
Large Size
Primary Text Color
```

Example:

```text
48 Swipes Remaining
UGX 12,500
```

---

# Border Radius System

LunchLink should feel soft and welcoming.

## Radius Tokens

```css
Small
12px

Medium
20px

Large
28px

Extra Large
36px
```

Usage:

| Element | Radius |
| ------- | ------ |
| Buttons | 20px   |
| Inputs  | 20px   |
| Tags    | 999px  |
| Cards   | 28px   |
| Modals  | 36px   |

---

# Elevation System

Keep shadows subtle.

Avoid heavy material-design style shadows.

## Card Shadow

```css
0px 4px 12px rgba(0,0,0,0.06)
```

## Modal Shadow

```css
0px 12px 32px rgba(0,0,0,0.12)
```

---

# Button System

## Primary Button

Background:

```css
#1A1A1A
```

Text:

```css
#FFFFFF
```

Usage:

* Continue
* Purchase Plan
* Pay Now
* Redeem

---

## Secondary Button

Background:

```css
#C8E6A0
```

Text:

```css
#1A1A1A
```

Usage:

* Select
* Add Credits
* View Details

---

## Tertiary Button

Background:

Transparent

Text:

```css
#1A1A1A
```

Usage:

* Cancel
* Learn More
* Back

---

# Card System

Cards are the primary building block of the interface.

Every card should include:

```text
Padding
Rounded Corners
Soft Shadow
Clear Hierarchy
```

Card Types:

* Restaurant Card
* Meal Plan Card
* Wallet Card
* Statistics Card
* Notification Card

---

# Iconography

Style:

* Rounded
* Minimal
* Friendly

Recommended Libraries:

* Lucide Icons
* Phosphor Icons

Avoid:

* Aggressive
* Sharp
* Highly detailed icons

---

# Copywriting Guidelines

## Tone

Warm and conversational.

Examples:

### Good

* Hello, Victor
* Ready for lunch?
* You've got 12 swipes left.
* Top up your credits.
* Let's get you eating.

### Avoid

* User authentication successful.
* Transaction process completed.
* Credit allocation confirmed.

---

# Motion & Interactions

Animations should feel calm and responsive.

## Recommended Durations

```css
Fast
150ms

Standard
250ms

Slow
350ms
```

Use for:

* Card hover
* Button press
* Modal transitions
* Screen transitions

Avoid:

* Bouncy animations
* Excessive movement
* Attention-seeking effects

---

# Accessibility

Minimum standards:

* AA contrast compliance
* Large tap targets
* Clear focus states
* Screen reader support
* Keyboard navigation support

---

# Design North Star

Every LunchLink screen should feel:

> Warm enough to feel human.
>
> Simple enough to feel effortless.
>
> Reliable enough to handle money.
>
> Friendly enough to belong on a student's phone.

When in doubt:

Reduce complexity, increase clarity, and preserve warmth.
