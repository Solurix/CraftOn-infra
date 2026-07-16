# CRAFT-ON — Feature Recommendations & UI Roadmap

> **Update:** Many of these are now built. See
> [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md) for the per-item
> status matrix (✅ done / 🟡 partial / ⛔ blocked) and
> [`BLOCKERS.md`](./BLOCKERS.md) for implementable backend/infra specs of the
> items that need API work. As of this round: **20 done, 13 partial, 17 blocked**.

> Status: proposal. This document inventories ideas to make the CRAFT-ON web app
> more attractive and sticky for workers, contractors, and operators. It builds
> on the **current** feature set (jobs browse/apply, matching lifecycle, chat,
> reviews, devices, admin vetting & config).
>
> Reminder of project rules these proposals must respect:
> - **i18n:** every user-facing string is a key, added to **both** `ja` and `en`
>   (CI enforces parity). Default rendered locale `ja`.
> - **Money:** integer JPY. **Time:** store UTC, display Asia/Tokyo.
> - **Config-first:** business limits are flags/config with safe defaults
>   (`docs/07`), not hardcoded.
> - **Compliance:** the visa/work-permission gate and contact-masking stay ON
>   (`docs/08`). Anti-disintermediation (中抜き) and anti-no-show (ドタキャン) are
>   core value — don't weaken them.
> - **Phase discipline:** ship a working app first. Items are tagged with a phase
>   hint so we don't pull Phase 2/3 work into Phase 1.

Each item is tagged: **Impact** (★1–3), **Effort** (S/M/L), **Phase** (1/2/3),
and the repos it touches (web / api / infra / mobile).

---

## 1. Worker acquisition & engagement

| # | Feature | Impact | Effort | Phase | Repos |
|---|---------|:--:|:--:|:--:|---|
| 1.1 | **Availability calendar** — workers mark which days they're free; contractors filter/invite by availability. Reduces dead applications. | ★★★ | L | 2 | web, api |
| 1.2 | **Job invitations (contractor → worker)** — contractors invite a specific worker to a posting; worker accepts/declines. Pairs with profile discovery (§2.1). | ★★★ | M | 2 | web, api |
| 1.3 | **Saved searches + alerts** — persist a filter set ("electrician, Tokyo, ≥¥20k") and notify on new matches. Builds on existing filters + notifications. | ★★★ | M | 2 | web, api |
| 1.4 | **Recommended jobs feed** — "for you" ranking by trade, location, wage history, and past matchings. Start rules-based; Gemini ranking later (ADR 0005). | ★★★ | M | 2 | web, api |
| 1.5 | **Earnings dashboard** — extend `/history` with monthly totals, charts, average daily wage, and a year-to-date summary for tax season. | ★★ | M | 2 | web, api |
| 1.6 | **One-tap re-apply / "work again"** — re-apply to a contractor you've worked with, or to a similar job, from history. | ★★ | S | 1 | web |
| 1.7 | **Profile completeness meter** — progress ring nudging workers to add trades, photos, qualifications. Higher completeness → better ranking. | ★★ | S | 1 | web |
| 1.8 | **Worker portfolio (photos of past work)** — image gallery on the public profile. Storage already needed for residence cards. | ★★ | M | 2 | web, api |
| 1.9 | **Skill verification badges** — admin- or document-verified qualifications shown as trust badges. | ★★ | M | 2 | web, api |
| 1.10 | **Streaks & reliability score** — surface on-time check-in rate / no-cancel streak to reward dependable workers. | ★★ | M | 2 | web, api |

## 2. Contractor value & retention

| # | Feature | Impact | Effort | Phase | Repos |
|---|---------|:--:|:--:|:--:|---|
| 2.1 | **Worker search & discovery** — browse/filter worker profiles directly (trade, area, rating, availability), not only via applicants. | ★★★ | L | 2 | web, api |
| 2.2 | **Job templates & duplication** — save a posting as a template; "repost" a past job in one tap. Removes re-entry friction in `/post-job`. | ★★★ | S | 1 | web |
| 2.3 | **Recurring / multi-day jobs** — post a job spanning several dates or repeating weekly. | ★★ | M | 2 | web, api |
| 2.4 | **Draft jobs + edit before publish** — save incomplete postings; edit an open job. Currently a form loss = restart. | ★★ | S | 1 | web, api |
| 2.5 | **Applicant ranking & quick-compare** — sort applicants by rating/experience/distance; side-by-side compare. | ★★ | M | 2 | web |
| 2.6 | **Favourite workers / talent pool** — bookmark trusted workers and invite them first next time. | ★★ | S | 2 | web, api |
| 2.7 | **Team / multi-seat contractor accounts** — multiple staff under one company, with roles. | ★★ | L | 3 | web, api |
| 2.8 | **Hiring insights** — fill rate, avg time-to-fill, applications-per-post, repeat-worker rate. | ★★ | M | 2 | web, api |

## 3. Trust, safety & compliance (core differentiators)

| # | Feature | Impact | Effort | Phase | Repos |
|---|---------|:--:|:--:|:--:|---|
| 3.1 | **Visa-expiry early warning** — proactively warn workers/admin before residence status lapses; block applications when expired (gate already exists). | ★★★ | M | 1 | web, api |
| 3.2 | **In-app dispute / report flow** — report a no-show, unsafe site, or payment issue; routes to admin queue. Strengthens anti-no-show value. | ★★★ | M | 2 | web, api |
| 3.3 | **Two-sided cancellation policy UI** — show penalties/notice windows (Asia/Tokyo "20:00 night-before" rule) clearly before confirm/cancel. | ★★ | S | 1 | web |
| 3.4 | **Document viewer for admins** — preview/zoom residence cards in the vetting tab instead of bare document IDs (retention rules from `docs/08`). | ★★ | M | 1 | web, api |
| 3.5 | **Audit log of admin actions** — who approved/rejected/suspended and why; reason field on each action. | ★★ | M | 2 | web, api |
| 3.6 | **Contact-masking transparency** — explain *why* a message was filtered and what to do (masking stays server-authoritative). | ★ | S | 1 | web |
| 3.7 | **Emergency / site-safety info** — emergency contact and site address surfaced on the day-of matching screen. | ★ | S | 2 | web |

## 4. Communication & notifications

| # | Feature | Impact | Effort | Phase | Repos |
|---|---------|:--:|:--:|:--:|---|
| 4.1 | **Web push notifications** — SW is already registered; wire up Web Push (and FCM on mobile) for new jobs, application status, chat, reminders. | ★★★ | M | 2 | web, api, infra |
| 4.2 | **Day-before & day-of reminders** — automated "confirm tonight" + "check-in" nudges in Asia/Tokyo time. | ★★★ | M | 2 | web, api |
| 4.3 | **Notification preferences** — per-channel, per-type toggles (push/email/in-app). | ★★ | M | 2 | web, api |
| 4.4 | **Read receipts & typing state in chat** | ★ | M | 3 | web, api |
| 4.5 | **Quick-reply templates in chat** (masking-safe canned messages) | ★ | S | 2 | web |

## 5. Onboarding & conversion

| # | Feature | Impact | Effort | Phase | Repos |
|---|---------|:--:|:--:|:--:|---|
| 5.1 | **Guided first-run tour & checklist** — role-specific empty states that tell new users the next best action. | ★★★ | S | 1 | web |
| 5.2 | **Public landing / marketing page** — value prop, trade categories, sample jobs before login (SEO + install prompt). | ★★★ | M | 1 | web |
| 5.3 | **PWA install prompt** — contextual "Add to Home Screen" banner. | ★★ | S | 1 | web |
| 5.4 | **Inline form validation with friendly hints** — validate before submit instead of relying on server 400s. | ★★ | S | 1 | web |
| 5.5 | **Resume onboarding where you left off** — save partial onboarding so a dropped session isn't lost. | ★★ | M | 2 | web, api |

## 6. UI / UX polish (cross-cutting)

| # | Feature | Impact | Effort | Phase | Repos |
|---|---------|:--:|:--:|:--:|---|
| 6.1 | **Design-system refresh** — refined tokens, softer cards, focus rings, consistent buttons/chips. *(Partly delivered in this branch.)* | ★★★ | S | 1 | web |
| 6.2 | **Loading skeletons everywhere** — replace plain "Loading…" with shimmer placeholders. *(Started: `SkeletonList`.)* | ★★ | S | 1 | web |
| 6.3 | **Rich empty states with CTAs** — friendly icon + hint + action on every empty list. *(Started: `EmptyState`.)* | ★★ | S | 1 | web |
| 6.4 | **Bottom tab bar on mobile** — thumb-reachable nav for the primary worker/contractor sections. | ★★ | M | 2 | web |
| 6.5 | **Dark mode** — `color-scheme` already declared; add a theme toggle and dark tokens. | ★★ | M | 2 | web |
| 6.6 | **Pagination / infinite scroll** — lists are currently unbounded. | ★★ | M | 2 | web, api |
| 6.7 | **Toasts for success/errors** — non-blocking feedback instead of inline-only messages. | ★★ | S | 1 | web |
| 6.8 | **Avatars / company logos** — visual identity in cards, chat, and profiles. | ★★ | M | 2 | web, api |
| 6.9 | **Map view for jobs** — show postings on a map by area. | ★ | L | 3 | web |
| 6.10 | **Accessibility pass** — full keyboard nav, focus management, ARIA, contrast audit. | ★★ | M | 2 | web |
| 6.11 | **Offline-first basics** — cache last-viewed jobs/matchings via the service worker. | ★ | M | 3 | web |

## 7. Monetization & growth (later phases)

| # | Feature | Impact | Effort | Phase | Repos |
|---|---------|:--:|:--:|:--:|---|
| 7.1 | **Featured / boosted job postings** — paid placement at top of relevant searches. | ★★ | M | 3 | web, api |
| 7.2 | **Referral program** — invite codes for workers & contractors with rewards. | ★★ | M | 3 | web, api |
| 7.3 | **Subscription tiers for contractors** — volume hiring, advanced insights, priority support. | ★★ | L | 3 | web, api |
| 7.4 | **Invoicing & payout statements** — downloadable statements; platform-fee transparency. | ★★ | L | 3 | web, api |
| 7.5 | **Ratings-driven ranking marketplace** — top-rated workers surfaced first. | ★ | M | 3 | web, api |

---

## Suggested near-term sequence (Phase 1, low-risk, high-perceived-value)

These are mostly **web-only**, respect all locked decisions, and compound into a
noticeably more polished product:

1. **6.1 / 6.2 / 6.3** — design-system refresh + skeletons + empty states
   *(in progress on this branch)*.
2. **5.1** — guided empty states / first-run checklist.
3. **2.2** — job templates / one-tap repost.
4. **1.6 / 1.7** — "work again" + profile completeness meter.
5. **6.7** — toast notifications.
6. **5.2 / 5.3** — public landing page + PWA install prompt.

Each lands behind the existing i18n/config/test gates and avoids touching the
compliance-critical paths.

---

## Notes on dependencies

- Items needing **media** (1.8, 6.8) share the storage + upload work already
  required for residence cards — build the upload primitive once.
- **Push** (4.1, 4.2) needs infra (Web Push keys / FCM) and an API scheduler;
  it unlocks several engagement items, so it's a good Phase-2 anchor.
- **Recommendations/ranking** (1.4, 2.1) start as deterministic rules; only move
  to Vertex AI / Gemini once data volume justifies it (ADR 0005).
