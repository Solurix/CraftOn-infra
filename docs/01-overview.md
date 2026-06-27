# 01 — Product Overview

> Plain-English summary of the CRAFT-ON business plan. The original plan is a detailed
> Japanese document; this is the shared reference we agreed on.

## In one line

An **on-demand "spot matching" app for construction tradespeople in Japan** — like
Timee, but built specifically for building sites. It solves *"we're short a worker
tomorrow!"* in minutes, then helps run the job (paperwork, translation, safety) in
one place. **Workers use it free; contractors pay.**

## Who uses it

- **Contractors (paying side):** site supervisors (現場監督), small construction firms
  (工務店), lead tradesmen (親方) — anyone who suddenly needs a worker now.
- **Workers (free side):** tradespeople and sole proprietors (一人親方) who want fair
  pay or to fill spare days; increasingly **foreign workers**.

## The problem (why this exists)

- Construction has a severe labor shortage (effective jobs-to-applicants ratio ~5.8×)
  and still relies on word-of-mouth hiring (~61% of mid-career hires).
- Workers no-show ("飛び" / ドタキャン), stopping the whole job.
- Foreign workers are growing fast, but their real skill is hard to verify and there's
  a language barrier.
- Post-2024 overtime regulation means supervisors are buried in paperwork and can't
  just "work harder" to cover gaps.

## What the app does (core features)

### 1. Spot matching (the heart)
Contractors post a same-day/next-day job; matching workers apply and get confirmed in
minutes — no interviews. Works for individuals and sole proprietors.

### 2. Anti-no-show system (4 layers)
- Night-before "I'm coming" confirm tap (≈20:00) → auto-alert if missed.
- Morning "I've departed" button (≈2h before start), optional GPS.
- Graduated penalties: 1st (with proof) excused → 2nd trust-score drop + locked out of
  premium jobs → 3rd ban. Plus *positive* incentives (loyalty rank → lower fees).
- Auto recovery: if someone flakes, instant emergency call-out to nearby workers.

### 3. LinkedIn-style profiles + two-way reviews
Workers list qualifications, tools, past-job photos. Supervisors rate workers (builds a
"trust asset"); workers rate sites (exposes bad employers). Key for verifying foreign
workers' real skill.

### 4. Foreign-worker support
Multilingual / visual (icon-based) UI; supervisor instructions auto-translated into the
worker's language with construction-specific terms; built-in immigration compliance.

### 5. Supervisor / site-management DX
AI-generated daily safety instruction sheets & hazard-prediction (KY) sheets; auto CSV
export of safety documents (Green Site / CCUS data); "spot supervisor" matching.

### 6. Legal / tax / insurance automation (the moat)
Two contract paths auto-selected by worker type:
- **Side-job employee** → day-labor employment contract (Timee-style), auto withholding
  tax, site's labor insurance applies.
- **Sole proprietor (一人親方)** → subcontract, no withholding, auto proxy invoice,
  requires proof of personal labor insurance.

Plus a platform "1-day add-on insurance" auto-attached to every match.

### 7. Anti-disintermediation (中抜き) guards
Mask contact info until a match is confirmed; chat filters phone numbers / "LINE"; make
app-only benefits (auto paperwork, insurance) worth staying for.

## Business model (money)

- **Workers:** 100% free (no fees, no payout charges).
- **Contractors pay**, escalating by phase:
  - Phase 1: flat **¥3,000 per match** (cash on site, no in-app payment).
  - Phase 2: **15% commission** + **¥220/worker/month**, in-app payment, BtoB factoring.
  - Phase 3: **¥29,800/month subscription + 15%** (or 0 + 25% spot plan); unlocks
    translation, AI sheets, Green Site CSV.

> Money amounts and percentages are **config vars** — see `docs/07-config-and-flags.md`.

## Launch scope (agreed)

- **Area:** Greater Tokyo (首都圏) at launch. Kept as a config var so it can widen/narrow.
- **Restrictions:** start as permissive as possible; targets, caps, and limits are
  configurable and decided later. The **only** hard gate at MVP is foreign-worker visa
  validity / work-permission (legal, non-negotiable).
- **Build order:** **web/PWA first**, working app first, then add logic gradually.

## Competitors (positioning)

Existing players (助太刀, ツクリンク, GATCH, キーサポ広場) stop at *connecting people*
for mid/long-term hiring or generic single-day labor. None combine **same-day spot
matching + skill verification + foreign-worker management + supervisor DX** as one
connected workflow. CRAFT-ON's edge is the *line*, not any single feature: from
"match" → safety docs → translated AI instructions → no-show prevention, all automatic.
