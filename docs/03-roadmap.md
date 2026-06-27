# 03 — Roadmap & Phases

Principle: **ship a working app first, then add logic gradually.** Each phase is
independently shippable. Don't pull later-phase features forward.

## Phase 0 — Foundation (this repo) ✅ in progress

- Documentation set (this `docs/` tree).
- Terraform skeleton for GCP.
- Repo strategy and conventions.

**Exit criteria:** docs agreed; infra skeleton present; ready to create app repos.

## Phase 1 — Working PWA (the MVP)

Goal: a real, usable web/PWA app that lets a contractor post a job, a worker apply, get
confirmed, check in/out, and leave reviews — within Greater Tokyo. **No in-app payment**
(cash on site; flat ¥3,000 fee handled manually). Full detail in
[`04-phase-1-spec.md`](04-phase-1-spec.md).

In scope:
- Phone OTP auth (Firebase).
- Worker & contractor profiles; document upload + **manual** vetting.
- Job posting, application, confirmation (bulletin-board style matching).
- Check-in / check-out status flow.
- Two-way reviews (LinkedIn-style).
- In-app chat with **contact masking**.
- Residence-card upload + visa fields (gate stubbed but present).
- Area = Greater Tokyo (config var); fees/limits as config.

Explicitly **out** of Phase 1 (built later): in-app payment, auto withholding, factoring,
insurance auto-attach, AI sheets, translation, automated eKYC, QR/GPS auto check-in,
automated penalties, native mobile app.

**Exit criteria:** a contractor and worker can complete a full match→work→review cycle in
production; core flows covered by tests.

## Phase 2 — Real platform (payments, automation, compliance)

- In-app payment; worker wallet + instant payout.
- BtoB factoring (NP掛け払い / Money Forward Kessai) — 100% receivable guarantee.
- Auto withholding tax (employee route) + proxy invoice (sole-proprietor route).
- 1-day add-on insurance auto-attach.
- Automated eKYC (TRUSTDOCK or similar): residence-card validity + work-restriction.
- QR / GPS auto check-in; automated no-show penalties + recovery call-outs.
- 15% commission + ¥220/worker/month billing.

## Phase 3 — DX & scale

- Multilingual translated instructions (Cloud Translation).
- AI instruction / KY safety sheets (Vertex AI Gemini).
- Green Site / CCUS CSV export (+ CCUS API if available).
- Subscription plans (¥29,800/mo management plan; spot plan 25%).
- Spot **supervisor** matching.
- Native mobile app (Flutter) if PWA limits push/device needs.
- Area & trade expansion beyond Greater Tokyo.

## Sequencing notes

- Things that are **hard to retrofit** are built into the Phase 1 DB schema even though
  their logic is minimal: residence-card/visa fields, contact masking, check-in/out
  status, worker class (employee vs sole proprietor). See `docs/05-data-model.md`.
- Legal/tax/insurance/eKYC partner work (Phase 2) should start **in parallel** during
  Phase 1 since it has external lead time — see open questions in `docs/08-compliance-legal.md`.
