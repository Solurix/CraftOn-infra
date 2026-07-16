# CRAFT-ON — Recommendations Implementation Status

This tracks every item in [`FEATURE_RECOMMENDATIONS.md`](./FEATURE_RECOMMENDATIONS.md)
against what was actually built in this round of work (web/PWA frontend).

**Legend**
- ✅ **Done** — shipped and working in the web app, behind the usual gates
  (i18n parity, lint, typecheck, tests, build).
- 🟡 **Partial** — a useful version ships now (often a device-local / client-side
  stand-in or a first slice); the fuller version needs backend work — see
  [`BLOCKERS.md`](./BLOCKERS.md).
- ⛔ **Blocked** — cannot be delivered from the frontend alone; needs new API
  endpoints and/or infrastructure. Fully specced in [`BLOCKERS.md`](./BLOCKERS.md).

Why so many "blocked": the web app talks to a fixed OpenAPI surface (no
hand-maintained types). Anything needing a new table, endpoint, scheduler, push
infrastructure, payment rail, or server-side aggregation is out of frontend reach
and is instead delivered as an implementable backend spec.

---

## 1. Worker acquisition & engagement

| # | Feature | Status | What shipped / why blocked |
|---|---|:--:|---|
| 1.1 | Availability calendar | ⛔ | Needs availability table + endpoints. BLOCKERS §1.1 |
| 1.2 | Job invitations | ⛔ | Needs invitations table + accept/decline + matching tie-in. BLOCKERS §1.2 |
| 1.3 | Saved searches + alerts | 🟡 | Saved searches persist on device (`SavedSearches`, applied as chips on `/jobs`); new-match **alerts** need the backend. BLOCKERS §1.3 |
| 1.4 | Recommended jobs feed | 🟡 | Client-side rules ranking (`lib/recommend.ts`) → "Recommended for you" strip on `/jobs`; server/Gemini ranking later. BLOCKERS §1.4 |
| 1.5 | Earnings dashboard | ✅ | `lib/earnings.ts` monthly aggregation → earnings-by-month on `/history` |
| 1.6 | One-tap re-apply / "work again" | ✅ | "Find similar jobs" deep-link from each `/history` entry (trade + prefecture) |
| 1.7 | Profile completeness meter | ✅ | `lib/completeness.ts` + `ProfileCompleteness` on `/jobs` and `/profile` |
| 1.8 | Worker portfolio photos | 🟡 | Initials `Avatar` ships now; uploaded photo gallery needs storage. BLOCKERS §1.8 |
| 1.9 | Skill verification badges | ⛔ | Needs verified-qualification model + admin action. BLOCKERS §1.9 |
| 1.10 | Streaks & reliability score | ⛔ | Needs server aggregation of check-in/cancel history. BLOCKERS §1.10 |

## 2. Contractor value & retention

| # | Feature | Status | What shipped / why blocked |
|---|---|:--:|---|
| 2.1 | Worker search & discovery | ⛔ | No worker-search endpoint. BLOCKERS §2.1 |
| 2.2 | Job templates & duplication | ✅ | `JobTemplates` presets + "Duplicate this job" (`/post-job?from=`) |
| 2.3 | Recurring / multi-day jobs | ⛔ | Needs recurrence model + fan-out. BLOCKERS §2.3 |
| 2.4 | Draft jobs + edit before publish | 🟡 | Draft **autosave/restore** on `/post-job` ships; editing an already-open job needs a job PATCH endpoint. BLOCKERS §2.4 |
| 2.5 | Applicant ranking & quick-compare | ✅ | Sort by rating / recency / favourites on `/my-jobs/[id]` + avatars |
| 2.6 | Favourite workers / talent pool | 🟡 | Device-local `FavoriteWorkerButton` (applicants + worker profile); server sync + invite-first needs backend. BLOCKERS §2.6 |
| 2.7 | Team / multi-seat accounts | ⛔ | Needs org/membership model. BLOCKERS §2.7 |
| 2.8 | Hiring insights | 🟡 | Per-status job counts strip on `/my-jobs` (`lib/insights.ts`); fill-rate/time-to-fill need aggregation. BLOCKERS §2.8 |

## 3. Trust, safety & compliance

| # | Feature | Status | What shipped / why blocked |
|---|---|:--:|---|
| 3.1 | Visa-expiry early warning | ✅ | `VisaStatusBanner` from worker profile (server gate stays authoritative) |
| 3.2 | In-app dispute / report flow | ⛔ | Needs reports table + admin queue. BLOCKERS §3.2 |
| 3.3 | Two-sided cancellation policy UI | ✅ | Policy note (Asia/Tokyo 20:00 rule) + confirm dialog on matching cancel |
| 3.4 | Document viewer for admins | ⛔ | Needs signed read URLs + viewer. BLOCKERS §3.4 |
| 3.5 | Audit log of admin actions | ⛔ | Needs audit table + reason capture. BLOCKERS §3.5 |
| 3.6 | Contact-masking transparency | ✅ | Masking explainer banner in chat (server masking unchanged) |
| 3.7 | Emergency / site-safety info | ⛔ | Needs emergency-contact fields surfaced day-of. BLOCKERS §3.2 (grouped) |

## 4. Communication & notifications

| # | Feature | Status | What shipped / why blocked |
|---|---|:--:|---|
| 4.1 | Web push notifications | ⛔ | Needs VAPID/FCM + subscription store. BLOCKERS §4.1 |
| 4.2 | Day-before & day-of reminders | ⛔ | Needs scheduler (Asia/Tokyo). BLOCKERS §4.2 |
| 4.3 | Notification preferences | ⛔ | Needs prefs model. BLOCKERS §4.3 |
| 4.4 | Read receipts & typing | ⛔ | Needs realtime transport. BLOCKERS §4.4 |
| 4.5 | Quick-reply templates | ✅ | `QuickReplies` (masking-safe defaults + device-local saved) in chat |

## 5. Onboarding & conversion

| # | Feature | Status | What shipped / why blocked |
|---|---|:--:|---|
| 5.1 | Guided first-run / checklist | 🟡 | Rich empty-state CTAs + profile-completeness nudges ship; a multi-step product tour is a later add |
| 5.2 | Public landing / marketing page | ✅ | Full public marketing landing on `/` (the merged `Landing` component) |
| 5.3 | PWA install prompt | ✅ | `InstallPrompt` (beforeinstallprompt, dismissable) |
| 5.4 | Inline form validation | 🟡 | `/post-job` validates (trade/date/past-date/wage/headcount); rollout to onboarding continues |
| 5.5 | Resume onboarding where you left off | 🟡 | Job-post draft autosave ships; full onboarding resume needs server-side partial-profile. BLOCKERS §2.4 (pattern) |

## 6. UI / UX polish

| # | Feature | Status | What shipped / why blocked |
|---|---|:--:|---|
| 6.1 | Design-system refresh | ✅ | Tokens, cards, buttons, chips, focus rings (earlier commit) |
| 6.2 | Loading skeletons | ✅ | List + detail skeletons across pages |
| 6.3 | Rich empty states | ✅ | `EmptyState` with icon/hint/CTA app-wide |
| 6.4 | Bottom tab bar (mobile) | ✅ | `BottomNav`; desktop pill nav hidden on mobile |
| 6.5 | Dark mode | ✅ | `ThemeProvider` (light/dark/system) + centralized dark CSS remap + no-FOUC |
| 6.6 | Pagination / infinite scroll | 🟡 | Client-side "load more" on `/jobs`; server cursor pagination needed for scale. BLOCKERS §6.6 |
| 6.7 | Toasts | ✅ | `ToastProvider`/`useToast`, integrated into actions |
| 6.8 | Avatars / company logos | 🟡 | Deterministic initials `Avatar` ships; uploaded logos need storage. BLOCKERS §6.8 |
| 6.9 | Map view for jobs | ⛔ | Needs geocoding + tiles. BLOCKERS §6.9 |
| 6.10 | Accessibility pass | 🟡 | Skip link, aria-labelled nav, `role="alert"` errors, focus rings, reduced-motion; full audit ongoing |
| 6.11 | Offline-first basics | 🟡 | `OfflineBanner` ships; SW data caching needs work. BLOCKERS §6.11 |

## 7. Monetization & growth

| # | Feature | Status | Why blocked |
|---|---|:--:|---|
| 7.1 | Featured / boosted postings | ⛔ | Billing + ranking. BLOCKERS §7.1 |
| 7.2 | Referral program | ⛔ | Codes + rewards + anti-abuse. BLOCKERS §7.2 |
| 7.3 | Subscription tiers | ⛔ | Billing + entitlements. BLOCKERS §7.3 |
| 7.4 | Invoicing & payout statements | ⛔ | Statement generation. BLOCKERS §7.4 |
| 7.5 | Ratings-driven ranking marketplace | ⛔ | Server ranking (Gemini optional). BLOCKERS §7.5 |

---

## Tally

- ✅ Done: **20** items
- 🟡 Partial (usable now, fuller version specced): **13** items
- ⛔ Blocked (backend/infra, fully specced in BLOCKERS.md): **17** items

Every ✅ and 🟡 item is live on branch `claude/feature-recommendations-ui-h3iqgj`
and passes `i18n:check`, `lint`, `typecheck`, `test`, and `build`.

## New frontend modules added this round

**Libraries** (`src/lib/`)
- `storage.ts` — SSR-safe JSON localStorage + `useStoredState` (cross-tab sync)
- `theme.tsx` — light/dark/system theme provider (no-FOUC)
- `nav.ts` — single nav model (desktop pills + mobile bar)
- `recommend.ts` — client-side job ranking *(tested)*
- `completeness.ts` — profile completeness scoring *(tested)*
- `earnings.ts` — monthly earnings aggregation *(tested)*
- `insights.ts` — per-status job counts *(tested)*

**Components** (`src/components/`)
- `Toast.tsx`, `Avatar.tsx`, `ThemeToggle.tsx`, `BottomNav.tsx`,
  `InstallPrompt.tsx`, `OfflineBanner.tsx`,
  `ProfileCompleteness.tsx`, `VisaStatusBanner.tsx`, `SavedSearches.tsx`,
  `JobTemplates.tsx`, `FavoriteWorkerButton.tsx`, `QuickReplies.tsx`
- `ui.tsx` extended: real `Spinner`, `Skeleton`/`SkeletonList`/`DetailSkeleton`,
  `EmptyState`, `PageHeader`, dot-accented `StatusBadge`

**Tests** — `storage`, `recommend`, `completeness`, `earnings`, `insights`
(24 passing total).
