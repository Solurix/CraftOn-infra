# 04 — Phase 1 Specification (Working PWA / MVP)

> This is the most important doc. It defines the **first working app**. Goal: a real,
> usable web/PWA where a contractor posts a job, a worker applies, gets confirmed,
> checks in/out, and both leave reviews — in Greater Tokyo, **with no in-app payment**.
>
> Keep it lean. When in doubt, defer to a later phase (see `03-roadmap.md`).

## 1. Goal & definition of done

A contractor and a worker can complete a full cycle in production:

```
post job → worker applies → contractor confirms → (day of) check-in →
check-out → contractor approves completion → both leave reviews
```

Money is handled **off-app**: cash on site; CRAFT-ON's ¥3,000/match fee is recorded in
the system and collected manually/out-of-band. We record the *intent* and *status*, not
the payment itself.

**Done when:** the cycle works end-to-end in prod, core business logic is covered by
tests, and the compliance-sensitive fields (visa, contact masking, check-in/out, worker
class) exist in the schema.

## 2. Users & roles

| Role | Primary device | Can do |
|---|---|---|
| **Worker** (職人 / 一人親方) | phone (PWA) | build profile, upload docs, browse & apply to jobs, check in/out, review contractors |
| **Contractor** (工務店 / 現場監督) | phone or desktop | post jobs, review applicants, confirm a worker, approve completion, review workers |
| **Admin** (CRAFT-ON ops) | desktop | vet users (approve/reject document uploads), suspend accounts, edit config/flags, see all matches |

Auth is the same for all (phone OTP); role is set at signup and stored on the user.

## 3. Core flows (Phase 1)

### 3.1 Signup & onboarding
1. Enter phone number → receive SMS OTP (Firebase Auth) → verify.
2. Choose role: worker or contractor.
3. **Worker onboarding:**
   - Basic info (display name/nickname, trades, prefecture).
   - **Worker class:** `employee` (employed elsewhere, side job) or `freelance`
     (sole proprietor / 一人親方).
   - Nationality. If non-Japanese: upload residence card (front+back), enter visa
     expiry + work-restriction info (stored; auto-checks come in Phase 2).
   - If Japanese: upload one photo ID.
   - Optional: qualifications, tools, past-job photos.
   - Status starts `pending` → admin reviews docs → `approved`.
4. **Contractor onboarding:**
   - Company/site info, contact person, prefecture.
   - Status `pending` → admin approves → `approved`.

> **Hard gate (the one MVP compliance rule):** a non-Japanese worker cannot reach
> `approved` without residence-card upload + visa expiry on file, and cannot be
> confirmed for a job if the visa expiry is in the past. Admin does the check manually
> in Phase 1; the data model supports automating it in Phase 2. See `08-compliance-legal.md`.

### 3.2 Posting a job (contractor)
- Fields: trade(s) needed, date, start/end time, site address (prefecture + area),
  daily wage (¥), number of workers, notes/requirements.
- Area must be within the configured service area (Greater Tokyo). Outside → blocked
  with a waitlist message (config-driven; can be disabled).
- Job goes live; visible to matching, approved workers.

### 3.3 Applying & matching
- Worker browses open jobs (filter by trade, date, area) and applies.
- Contractor sees applicants (profile + reviews + trust info) and **confirms** one (or
  N) → creates a `matching` with status `confirmed`.
- On confirm: the relevant contract type is recorded (employee → day-labor employment;
  freelance → subcontract). In Phase 1 this is a recorded label + a generated
  human-readable terms document (PDF/HTML); no automated tax/insurance yet.

### 3.4 Chat with contact masking
- After confirm (and before, during application Q&A), parties chat **in-app only**.
- Phone numbers, "LINE", emails, and 11-digit number sequences are **filtered**:
  block send + warn. This is enforced **both** client-side (UX) and server-side
  (authoritative). See `08-compliance-legal.md`.

### 3.5 Day-of: check-in / check-out
- **Check-in:** worker taps "現場に到着 (arrived)". Phase 1 = simple status + timestamp
  (manual). GPS/QR auto-verification is Phase 2 (fields present, logic deferred).
- **Check-out:** worker taps "作業完了 (done)" → contractor gets a request → contractor
  **approves** → matching becomes `completed`.
- A `completed` matching records the ¥3,000 platform fee as **owed** (status: unpaid),
  for manual reconciliation.

### 3.6 Reviews (two-way, LinkedIn-style)
- After `completed`, both sides can review:
  - Contractor → worker: rating (1–5) + comment + tags (punctual, skilled, etc.).
  - Worker → contractor: rating (1–5) + comment + tags (safe, clear instructions,
    law-abiding, etc.).
- Reviews are visible on profiles and feed a simple **trust score** (Phase 1: derived
  display value; automated penalties are Phase 2).

### 3.7 Admin
- Queue of `pending` users with their uploaded docs → approve / reject (with reason).
- Suspend / reactivate accounts.
- View/edit config & feature flags (or via env for now — see `07-config-and-flags.md`).
- Browse jobs/matchings; mark fees paid.

## 4. Screens (PWA)

Mobile-first; contractor screens also work on desktop.

**Worker:** Login · Onboarding wizard · Job list/search · Job detail · My applications ·
Active match (check-in/out) · Chat · Profile (edit) · Reviews · Notifications.

**Contractor:** Login · Onboarding · Post job · My jobs · Applicants · Match detail
(approve completion) · Chat · Reviews · Notifications.

**Admin:** Login · Vetting queue · Users · Jobs/Matchings · Config/Flags.

## 5. Non-functional (Phase 1)

- **i18n:** Japanese first, English second; copy externalized so more languages drop in
  later. (Vietnamese/Indonesian later.)
- **PWA:** installable, responsive, works on iOS/Android/desktop browsers. Web push for
  notifications where supported; SMS as the reliable fallback for critical alerts.
- **Security/privacy:** images in Cloud Storage with signed URLs + encryption; least-
  privilege IAM; no My Number; residence-card images retained only as needed
  (see `08-compliance-legal.md`).
- **Observability:** structured logs to Cloud Logging; basic error alerting.
- **Performance:** target P95 API < 500ms for core reads at MVP volume.

## 6. Explicitly NOT in Phase 1

In-app payment, wallets, payouts; auto withholding tax; factoring; insurance auto-attach;
AI instruction sheets; machine translation; automated eKYC / visa auto-lock; QR/GPS auto
check-in; automated no-show penalties & recovery call-outs; subscriptions; spot-supervisor
matching; native mobile app. (All in `03-roadmap.md` Phases 2–3.)

## 7. Build order within Phase 1 (suggested)

1. **Infra up:** Terraform applies dev env (Cloud SQL, Cloud Run, Storage, Firebase
   project, Secret Manager). See `infra/terraform/`.
2. **API skeleton:** FastAPI app, DB models + first Alembic migration, health check,
   auth middleware verifying Firebase tokens.
3. **Auth + users + onboarding** (incl. document upload to Storage).
4. **Admin vetting** (approve/reject).
5. **Jobs:** post, list, detail, search/filter.
6. **Matching:** apply, confirm, statuses.
7. **Chat + contact masking** (server-side filter authoritative).
8. **Check-in/out + completion approval + fee record.**
9. **Reviews + trust score display.**
10. **PWA polish:** installability, notifications, i18n pass.
11. **Hardening:** tests, error states, empty states, waitlist for out-of-area.

Each step ships with tests (`09-testing-strategy.md`) and updates `docs/STATUS.md`.

## 8. Open questions for Phase 1 (track in STATUS.md)

- Exact "Greater Tokyo" definition — which prefectures count (Tokyo + Kanagawa, Saitama,
  Chiba; include Ibaraki/Tochigi/Gunma/Yamanashi?). Default: the 4 core; config var.
- Initial trade list (default: open/free-text + a small suggested set; can restrict later).
- Do we need the contractor desktop console in Phase 1 or is mobile-web enough? (Default:
  responsive web covers both; no separate console.)
- Human-readable contract terms wording — needs legal review (placeholder text until then).
