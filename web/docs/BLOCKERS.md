# CRAFT-ON — Backend & Infrastructure Blockers (Design Specs)

> Companion to [`FEATURE_RECOMMENDATIONS.md`](./FEATURE_RECOMMENDATIONS.md) and
> [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md). The web/PWA frontend
> delivered everything it could on the existing OpenAPI surface (and device-local
> stand-ins where useful). The items below need **new API endpoints, schema
> migrations, schedulers, push infrastructure, payment rails, or server-side
> aggregation** — they cannot be completed from the frontend alone.
>
> This document is an **implementable spec**, not a wishlist. Each feature lists
> why it is blocked, the data model + Alembic migration outline, the API
> endpoints (method/path/request/response/authZ/rules), config flags (docs/07
> precedence), compliance notes (visa gate, contact masking, retention,
> anti-中抜き / anti-ドタキャン), and how the existing web screen consumes it.
>
> These specs were generated against the locked backend conventions: Python 3.11
> + FastAPI, SQLAlchemy 2.0 + Alembic, PostgreSQL, UUID v4 PKs, integer JPY, UTC
> storage with Asia/Tokyo business rules, Firebase bearer auth, ConfigService
> precedence, and ja/en catalog-key i18n parity. Treat them as a starting point —
> review against the live code before implementing.

## Contents

1. Marketplace & engagement data — availability, invitations, saved-search alerts, worker discovery, recurring jobs, talent pool
2. Trust, safety & compliance — disputes, document viewer, audit log, skill badges, reliability score
3. Notifications & realtime — web push, reminders, preferences, read receipts
4. Media, storage & maps — portfolio photos, avatars/logos, map view, offline-first
5. Monetization & growth — featured postings, referrals, subscriptions, invoicing, ranking
6. Platform & scale — server pagination, hiring-insights aggregation, team accounts, server-side recommendations

---

## Marketplace & engagement data

This group adds server-backed marketplace plumbing that the web PWA currently fakes in `localStorage` (saved searches, templates, favourite workers) plus the genuinely server-only pieces (cross-device sync, alerting, worker discovery, recurring jobs). All endpoints follow the existing FastAPI patterns: role guards from `app/api/deps.py` (`approved_worker`, `approved_contractor`, `require_approved`), `ConfigService` for tunables, `Notification` rows with `type` (varchar) + `params` (jsonb) + `link`, and the `{error:{code,message}}` envelope. Every new user-facing string is a catalog key added to **both** `app/locales/ja.json` and `app/locales/en.json`.

A note on a cross-cutting dependency: features 1.1, 2.1, and 2.6 require **worker discovery** by contractors, which today does not exist (contractors can only see workers via applicants on their own jobs). The worker-discovery read model (2.1) is the keystone; 1.1 (availability) and 2.6 (talent pool) layer onto it. Build order: **2.1 → 1.1 → 2.6 → 1.2 → 2.3 → 1.3**.

---

### 1.1 Availability calendar (workers mark free days; contractors filter/invite by availability)

**Why it's blocked on the backend**
Availability must be queryable by contractors across all workers (a cross-user aggregation + filter), which `localStorage` on a worker's device cannot expose; it also feeds the visa gate and discovery ranking on the server.

**Data model**
New table `worker_availability` — one row per (worker, date) the worker marks free. Sparse "free-day" model (absence of a row = unknown/unavailable), which matches spot-work reality and keeps the table small.

- `id` UUID PK (`UUIDPKMixin`)
- `worker_id` UUID FK→`users.id` (ondelete CASCADE), nullable=False
- `date` Date (Asia/Tokyo business day), nullable=False
- `status` enum `availability_status` {`free`, `tentative`, `unavailable`} via `pg_enum(AvailabilityStatus, "availability_status")`, server_default `'free'`. `unavailable` is an explicit block-out (e.g. already matched elsewhere) so the UI can show it distinctly from "unknown".
- `note` Text nullable (worker-private, e.g. "AM only")
- `time_window` enum `availability_window` {`full_day`, `am`, `pm`} server_default `'full_day'`
- `source` enum `availability_source` {`manual`, `auto_matching`} server_default `'manual'` — `auto_matching` rows are written by the system when a matching is confirmed for that date so a worker isn't double-invited; these are not editable by the worker.
- `TimestampMixin` (created_at/updated_at)
- Constraints/indexes: `UniqueConstraint(worker_id, date, name="uq_worker_availability_worker_date")`; `Index("ix_worker_availability_date_status", "date", "status")` (contractor "who's free on D" query); `Index("ix_worker_availability_worker_date", "worker_id", "date")`.

New enums in `app/models/enums.py`: `AvailabilityStatus`, `AvailabilityWindow`, `AvailabilitySource` (StrEnum, value-stored).

**Alembic migration outline**
- upgrade: create the three pg enum types, create `worker_availability` with FK + unique + indexes.
- downgrade: drop table, then drop the three enum types (`sa.Enum(...).drop(bind)` for each, mirroring the existing initial-schema migration's enum handling).

**API endpoints**

- `GET /api/v1/me/availability?date_from=&date_to=` — **worker** (`approved_worker`). Returns the caller's own rows in range (default range = today..+60d, capped at `availability_horizon_days`). Response: `list[AvailabilityOut]` with `{date, status, time_window, note, source}`.
- `PUT /api/v1/me/availability` — **worker**. Bulk upsert. Body `AvailabilityBulkSet{ entries: list[{date, status, time_window?, note?}] }`. Rules: rejects dates in the past (Asia/Tokyo `today`) and beyond `availability_horizon_days` (422 `error.availability.out_of_range`); cannot overwrite a `source=auto_matching` row to `free` (409 `error.availability.locked_by_matching`); idempotent upsert on (worker, date). Returns the updated `list[AvailabilityOut]`.
- `DELETE /api/v1/me/availability/{date}` — **worker**. Removes a manual mark (back to "unknown"). 404 if absent; 409 if `auto_matching`.
- `GET /api/v1/workers/{worker_id}/availability?date_from=&date_to=` — **contractor** (`approved_contractor`) or admin. Read-only view of a single worker's free/tentative days (note field stripped — worker-private). Used pre-invite. Subject to visa gate (see below).

Server hooks: on matching `confirmed` (in `app/services/matching.py` confirm flow) insert/upsert an `auto_matching` `unavailable` row for the work_date; on matching `canceled`/`noshow` remove it.

**Config flags** (docs/07)
- `availability_horizon_days` default `60` (how far ahead a worker can mark).
- `availability_calendar_enabled` (feature flag) default `True`.

**Compliance notes**
Contractor-facing availability views (`GET /workers/{id}/availability` and any availability filter in discovery) must apply the **visa gate**: when `visa_gate_enabled` is ON, a foreign worker whose `visa_expiry_date` is null or `< work_date` is excluded/flagged exactly as elsewhere, so contractors never plan around an unauthorised worker. No contact info is exposed (still masked/anti-中抜き). The private `note` is never returned to contractors.

**Web integration**
Consumes a new worker "空き予定 / Availability" calendar screen and feeds the contractor worker-search filter (2.1). The current device-local availability stand-in (if present) migrates by a one-time `PUT /me/availability` replaying any locally-stored marks on first load when the flag is on; thereafter the server is authoritative and cross-device.

**Effort**: **M**. Sequence after 2.1's read model exists (so contractor views can reuse the same worker-fetch/visa-gate path). Self-marking (worker side) is S and can ship first.

---

### 1.2 Job invitations (contractor → worker invite; worker accept/decline; ties to matching)

**Why it's blocked on the backend**
Invitations are a new bi-directional relationship object with its own lifecycle that must notify the other party and convert into the existing application→matching flow — none of which can live client-side.

**Data model**
New table `job_invitations`.

- `id` UUID PK
- `job_id` UUID FK→`jobs.id` (CASCADE), nullable=False
- `contractor_id` UUID FK→`users.id` (CASCADE), nullable=False (denormalised from job for authZ/index; must equal `job.contractor_id`)
- `worker_id` UUID FK→`users.id` (CASCADE), nullable=False
- `status` enum `invitation_status` {`pending`, `accepted`, `declined`, `expired`, `withdrawn`} server_default `'pending'`
- `message` Text nullable (contractor's short note; **server-masked** like chat — see compliance)
- `was_filtered` Boolean server_default false (mirrors `MessageOut.was_filtered`; true if masking redacted contact info from `message`)
- `application_id` UUID FK→`applications.id` (SET NULL) nullable — set when an accept produces an application
- `responded_at` timestamptz nullable
- `expires_at` timestamptz nullable (computed from config at create time)
- `TimestampMixin`
- Constraints/indexes: `UniqueConstraint(job_id, worker_id, name="uq_job_invitations_job_worker")` (one live invite per worker per job; re-inviting after decline updates the row); `Index("ix_job_invitations_worker_status", "worker_id", "status")` (worker inbox); `Index("ix_job_invitations_contractor_status", "contractor_id", "status")`.

New enum `InvitationStatus` in `enums.py`. New `NotificationType` values (varchar, no migration needed): `invitation_received`, `invitation_accepted`, `invitation_declined`.

**Alembic migration outline**
- upgrade: create `invitation_status` enum, create `job_invitations` with FKs + unique + indexes.
- downgrade: drop table, drop enum type.

**API endpoints**

- `POST /api/v1/jobs/{job_id}/invitations` — **contractor** (`approved_contractor`). Body `InvitationCreate{ worker_id, message? }`. Rules: caller must own the job; job must be `open`; worker must exist, be `approved`, type `worker`; **visa gate** for the job's `work_date`; reject if worker already has a live (`pending`/`accepted`) invite for this job (409 `error.invitation.duplicate`) or an existing application/matching for it; `message` passed through the same contact-masking service as chat (sets `was_filtered`). Sets `expires_at = work_date eve 20:00 Asia/Tokyo` or `now + invitation_ttl_hours`, whichever is sooner. Emits `invitation_received` notification to worker. Response `InvitationOut{ id, job(JobOut subset), contractor_company_name, worker_id, status, message, was_filtered, expires_at, created_at }`. 201.
- `GET /api/v1/invitations/mine` — **worker**. Their inbox; `?status=` filter, default open ones (`pending`). Returns `list[InvitationOut]` with job + contractor company name (masked contact rules apply).
- `GET /api/v1/jobs/{job_id}/invitations` — **contractor** (owner). List sent invites for a job with worker display summary (reuse the discovery `WorkerCardOut`).
- `POST /api/v1/invitations/{id}/accept` — **worker**. Rules: invite `pending` and not past `expires_at` (else 409 `error.invitation.expired`); job still `open` with headcount remaining (409 `error.invitation.job_full`). Effect: creates an `applications` row (status `applied`) **then** runs the existing confirm path so it lands as `confirmed` + a `matchings` row (invitation = pre-vetted, so it short-circuits to confirmed; the fee/contract-type logic is the unchanged matching-confirm service). Sets `status=accepted`, `application_id`, `responded_at`. Marks that day's availability `unavailable` (1.1 hook). Notifies contractor (`invitation_accepted`). Returns `MatchingOut`.
- `POST /api/v1/invitations/{id}/decline` — **worker**. Body optional `{reason?}`. Sets `declined`, notifies contractor (`invitation_declined`). 200.
- `POST /api/v1/invitations/{id}/withdraw` — **contractor** (owner). Only while `pending`. Sets `withdrawn`.

Expiry: a sweep (cron/Cloud Scheduler job, same mechanism as no-show confirm) flips past-due `pending` → `expired`. Lazy expiry also enforced on read/accept.

**Config flags** (docs/07)
- `invitations_enabled` (flag) default `True`.
- `invitation_ttl_hours` default `48`.
- `invitation_auto_confirm` (flag) default `True` — when true, accept short-circuits to a confirmed matching (above). When false, accept only creates an `applied` application the contractor must confirm normally (safer fallback).

**Compliance notes**
The free-text `message` is a direct contractor→worker channel and is a **中抜き risk**, so it must go through the authoritative server-side contact-masking service (same as chat) with `was_filtered` surfaced — never trust the client. Visa gate enforced at invite-create and re-checked at accept. Accepting consumes a headcount slot atomically to avoid over-filling (row-lock the job like the existing confirm path).

**Web integration**
New "招待 / Invitations" worker inbox screen (badge from `unread-count` extension or invitation count) and a "Invite" action on contractor-side worker cards (2.1/2.6). No localStorage stand-in exists today; this is net-new and ties directly into the existing applications/matchings screens (an accepted invite shows up in the worker's matchings list unchanged).

**Effort**: **M**. Depends on 2.1 (need a worker to invite) and reuses matching-confirm + masking services. Sequence after 2.1/1.1.

---

### 1.3 Saved searches + new-match alerts (server-backed; notify on new matching jobs)

**Why it's blocked on the backend**
Alerting requires running a stored query against jobs the worker hasn't seen yet and pushing notifications — a server batch job; `localStorage` can store filters but can never alert.

**Data model**
New table `saved_searches`.

- `id` UUID PK
- `worker_id` UUID FK→`users.id` (CASCADE), nullable=False
- `name` String(80) nullable (worker label, defaults to a summary)
- `filters` JSONB nullable=False — the same filter shape as `GET /jobs` query params: `{trade?, prefecture?, wage_min?, wage_max?, date_from?, date_to?}`. Validated against a Pydantic `SearchFilters` model on write (rejects unknown keys / bad types — never store raw arbitrary jsonb).
- `alerts_enabled` Boolean server_default true
- `last_alerted_at` timestamptz nullable — high-water mark; alerts only consider jobs with `created_at > last_alerted_at`.
- `last_matched_job_id` UUID nullable (for de-dupe / display "newest match")
- `TimestampMixin`
- Indexes: `Index("ix_saved_searches_worker", "worker_id")`; partial `Index("ix_saved_searches_alerts", "alerts_enabled")` for the sweep.
- Cap rows per worker via config (see flags).

New `NotificationType` value `saved_search_match` (varchar; `params` carries `{saved_search_id, saved_search_name, job_count, sample_job_id}`, `link` → the search/jobs screen).

**Alembic migration outline**
- upgrade: create `saved_searches` table + indexes (no new enum).
- downgrade: drop table.

**API endpoints**

- `GET /api/v1/me/saved-searches` — **worker**. `list[SavedSearchOut{ id, name, filters, alerts_enabled, last_alerted_at, created_at }]`.
- `POST /api/v1/me/saved-searches` — **worker**. Body `SavedSearchCreate{ name?, filters: SearchFilters, alerts_enabled? }`. Rejects over `saved_searches_max_per_worker` (422 `error.saved_search.limit`). Validates `filters` shape and trade against `allowed_trades`/prefecture against service area if `service_area_enforce`. 201.
- `PATCH /api/v1/me/saved-searches/{id}` — **worker** (owner). Update name/filters/alerts_enabled.
- `DELETE /api/v1/me/saved-searches/{id}` — **worker** (owner). 204.
- `GET /api/v1/me/saved-searches/{id}/results` — **worker**. Convenience: runs the stored filters through the existing `jobs.list_open_jobs` service and returns `list[JobOut]` (so the client doesn't re-encode filters). Supports `limit`/`offset`.

Alert sweep: a scheduled service (`app/services/saved_search_alerts.py`, triggered by Cloud Scheduler at `saved_search_alert_interval_minutes`) iterates `alerts_enabled` searches, runs each filter for jobs with `created_at > last_alerted_at` and `status=open`, and if any match emits one batched `saved_search_match` notification (job_count + newest sample), then advances `last_alerted_at`. Idempotent via the high-water mark.

**Config flags** (docs/07)
- `saved_searches_max_per_worker` default `20`.
- `saved_search_alerts_enabled` (flag) default `True`.
- `saved_search_alert_interval_minutes` default `60`.
- `saved_search_alert_max_jobs_in_notification` default `5` (cap on `params.sample` list).

**Compliance notes**
Jobs surfaced in alerts/results go through the same job-visibility rules as `GET /jobs` (service-area filter when `service_area_enforce`, visa-relevant trade restrictions). No contact info is in jobs, so no masking concern. Notification text is a catalog key, localized at read time per the existing notification pattern.

**Web integration**
Replaces the device-local "saved searches" stand-in on the worker jobs/search screen. Migration: on first load with the flag on, replay any locally-stored saved searches via `POST /me/saved-searches`, then clear local copies; the bell/notifications screen now shows `saved_search_match` items linking back to the pre-filled search.

**Effort**: **M**. CRUD is S; the sweep + scheduler wiring is the bulk. Reuses `jobs.list_open_jobs` verbatim. Can ship after jobs (no dependency on 2.x).

---

### 2.1 Worker search & discovery (browse/filter worker profiles directly)

**Why it's blocked on the backend**
No endpoint lets a contractor browse/filter the worker population today (only applicants on their own jobs); this read model with authZ, visa gating, masking, and ranking is inherently server-side and underpins 1.1, 1.2, and 2.6.

**Data model**
Mostly **read-only over existing `worker_profiles`** — no new core table. Add for performance + display:

- Add column `worker_profiles.discoverable` Boolean server_default true — worker opt-out of being browsed (privacy). Surfaced/edited via the existing `workers/me` PATCH.
- Add column `worker_profiles.rating_avg` Numeric(3,2) server_default 0 and `rating_count` Integer server_default 0 — denormalised aggregates maintained when a `contractor_to_worker` review is left (in `app/services/reviews.py`), so discovery can filter/sort by rating without a join-aggregate per request. (Distinct from the existing display-only `trust_score`.)
- Index for the common filter: `Index("ix_worker_profiles_discovery", "prefecture", "discoverable")`. Trades is `ARRAY(Text)`; add a GIN index `Index("ix_worker_profiles_trades_gin", "trades", postgresql_using="gin")` for `trades && :wanted` containment filters.

**Alembic migration outline**
- upgrade: add `discoverable`, `rating_avg`, `rating_count` columns (with server_defaults so existing rows backfill); create the btree + GIN indexes; one-time backfill of `rating_avg`/`rating_count` from existing reviews.
- downgrade: drop indexes + columns.

**API endpoints**

- `GET /api/v1/workers` — **contractor** (`approved_contractor`) or admin. Query params (mirroring jobs' style): `trade`, `prefecture`, `area`, `rating_min` (float 0–5), `available_on` (date → joins `worker_availability` for `status in (free,tentative)`), `available_from`/`available_to`, `has_insurance` (bool), `worker_class`, `sort` ∈ {`rating`, `experience`, `new`, `relevance`}, `limit` (≤100), `offset`. Returns `list[WorkerCardOut]`. Excludes `discoverable=false`, suspended/pending workers, and (when `visa_gate_enabled`) foreign workers with invalid/expired visa **relative to `available_on` if given**.
- `GET /api/v1/workers/{worker_id}` — already exists; ensure the contractor-facing projection returns the **public** `WorkerCardOut` (PII like full_name/email/phone stripped unless self/admin), reusing the existing worker public-projection logic.

`WorkerCardOut` (public, masked) field list: `worker_id`, `display_name` (kana/handle, **not** full legal name), `trades`, `skills`, `qualifications`, `prefecture`, `area`, `years_experience`, `worker_class`, `has_insurance`, `rating_avg`, `rating_count`, `current_employer` (only if `current_employer_public`), `next_available_date` (min upcoming free day, when availability flag on), `is_favourited` (per-caller, from 2.6), `visa_ok` (bool, computed for the queried date). **No phone, no email, no exact address.**

Ranking: default `relevance` sort uses a cheap deterministic score (trade overlap × rating × recency). Optional `sort=relevance` with a contractor's job context may call **Vertex AI Gemini** (cheaper than Claude, per ADR-0005) behind `worker_ranking_ai_enabled` to re-rank the top N candidates; default OFF → falls back to the deterministic score, so the feature works with zero AI cost.

**Config flags** (docs/07)
- `worker_discovery_enabled` (flag) default `True`.
- `worker_discovery_default_radius_prefectures` default `service_area_prefectures` (reused).
- `worker_ranking_ai_enabled` (flag) default `False`.
- `worker_discovery_page_size_max` default `100`.

**Compliance notes**
This is the highest-sensitivity surface. **PII minimisation:** the public card exposes no phone/email/full legal name/exact address — only coarse location and a display name (APPI, docs/08). **Contact masking / anti-中抜き:** nothing in the card lets a contractor reach a worker off-platform; the only contact path remains invitations/chat (server-masked). **Visa gate:** foreign workers without valid work permission for the relevant date are excluded when `visa_gate_enabled` is ON. **Discoverability opt-out** respected. Residence-card images are never exposed here.

**Web integration**
New contractor "職人を探す / Find workers" screen (filters: trade, area, rating, availability, insurance). Powers the "Invite" CTA (1.2) and "Add to talent pool" (2.6). No localStorage stand-in (workers were never browsable client-side); the favourite-workers local list (2.6) hydrates `is_favourited`.

**Effort**: **L**. The read model + PII projection + visa gate + indexes are the core; AI ranking is an optional add-on behind a default-off flag. Build this **first** in the group.

---

### 2.3 Recurring / multi-day jobs (a posting spanning several dates or repeating weekly)

**Why it's blocked on the backend**
The `jobs` table is single-date (`work_date`); spanning dates or weekly repetition needs a parent/series model plus per-date applications/matchings — pure data-model work on the server.

**Data model**
Introduce a lightweight **series** parent; keep each `jobs` row single-date (so the entire existing apply/confirm/matching/fee machinery is unchanged — one matching + one fee **per date**, preserving anti-no-show and fee semantics).

New table `job_series`:
- `id` UUID PK
- `contractor_id` UUID FK→`users.id` (CASCADE), nullable=False
- `recurrence` enum `recurrence_type` {`multi_day`, `weekly`} via pg_enum
- `recurrence_config` JSONB nullable=False — for `multi_day`: `{dates:[...]}`; for `weekly`: `{weekdays:[1,3,5], until:"YYYY-MM-DD"}` (Asia/Tokyo). Validated by Pydantic on create.
- Shared posting template fields snapshotted: `trades` ARRAY(Text), `start_time`/`end_time` Time, `prefecture`, `area`, `address`, `daily_wage` Int (JPY), `headcount` Int, `notes` Text — same columns as `jobs`, used to materialise children.
- `status` enum reusing `JobStatus` semantics at the series level (`open`/`closed`/`canceled`)
- `TimestampMixin`
- Index `Index("ix_job_series_contractor", "contractor_id")`.

Change to `jobs`: add nullable `series_id` UUID FK→`job_series.id` (SET NULL) + `Index("ix_jobs_series_id", "series_id")`. A standalone job keeps `series_id` null (fully backward compatible).

New enum `RecurrenceType`.

**Alembic migration outline**
- upgrade: create `recurrence_type` enum, create `job_series`, add `jobs.series_id` column + FK + index.
- downgrade: drop `jobs.series_id` (and index/FK), drop `job_series`, drop enum.

**API endpoints**

- `POST /api/v1/job-series` — **contractor** (`approved_contractor`). Body `JobSeriesCreate{ recurrence, recurrence_config, trades, start_time, end_time, prefecture, area?, address?, daily_wage, headcount, notes? }`. Service materialises one `jobs` row per resolved date (each defaulting to `status=open`, `series_id=this`) via the existing `jobs.create_job` validation per child (trade/service-area/wage checks reused). Caps total children at `job_series_max_occurrences` (422 `error.job_series.too_many`). Rejects past dates. Returns `JobSeriesOut{ id, recurrence, recurrence_config, child_job_ids, occurrence_count, ...template fields, status }`. 201.
- `GET /api/v1/job-series/mine` — **contractor**. List the caller's series with occurrence counts + fill summary.
- `GET /api/v1/job-series/{id}` — **contractor** (owner) or admin. Series + child `JobOut` list (each with its own application/matching state).
- `PATCH /api/v1/job-series/{id}` — **contractor** (owner). Edit template fields; applies only to **future, still-`open`, unfilled** children (never rewrites a child that already has confirmed matchings — protects worker commitments). Optionally extend a weekly series (`recurrence_config.until` forward) which materialises new children.
- `POST /api/v1/job-series/{id}/cancel?scope=future|all` — **contractor** (owner). Cancels future open children (default `future`); children with confirmed matchings follow the **existing single-job cancel rules** (no-show/penalty semantics unchanged) — the series cancel never bypasses them.

Worker side needs **no new endpoints**: each child is an ordinary job in `GET /jobs`. Optional `series_id` echoed in `JobOut` so the UI can badge "週次 / recurring" and link siblings.

**Config flags** (docs/07)
- `recurring_jobs_enabled` (flag) default `True`.
- `job_series_max_occurrences` default `30` (guard against accidental fan-out).
- `job_series_weekly_max_weeks` default `12`.

**Compliance notes**
Critically, **one matching + one platform fee per date** (no batch discounting that would dilute the per-engagement fee) — preserves the fee model and anti-no-show: each date is independently confirmable/cancelable with its own 20:00-eve confirm and no-show handling. Visa gate runs per child date (a worker's visa might expire mid-series). No masking impact.

**Web integration**
New contractor "繰り返し / Recurring" toggle on the post-job screen (date list or weekly pattern picker). Replaces the device-local **job-templates** stand-in: a saved template becomes a series template, and existing local templates migrate by letting the contractor "post as series" from them (optional one-time import via `POST /job-series`). The my-jobs screen groups children under their series.

**Effort**: **L**. Materialisation + the future-only edit/cancel rules and per-child reuse of existing validators are the work; worker-facing surface is free.

---

### 2.6 Favourite workers / talent pool (server-backed; invite-first next time)

**Why it's blocked on the backend**
A talent pool must be cross-device, shared logic with discovery (`is_favourited`) and invitations (invite-first), and potentially team-shared per contractor org — none of which `localStorage` supports.

**Data model**
New table `favourite_workers` (contractor's talent pool; mirrors `saved_jobs` structure).

- `id` UUID PK
- `contractor_id` UUID FK→`users.id` (CASCADE), nullable=False
- `worker_id` UUID FK→`users.id` (CASCADE), nullable=False
- `note` Text nullable (private label, e.g. "good on 内装")
- `tags` ARRAY(Text) server_default `'{}'` (e.g. `["内装","reliable"]`) for pool segmentation
- `CreatedAtMixin` (append-only bookmark, like `saved_jobs`) — `updated_at` only if note/tags editable (use `TimestampMixin`).
- Constraints/indexes: `UniqueConstraint(contractor_id, worker_id, name="uq_favourite_workers_contractor_worker")`; `Index("ix_favourite_workers_contractor_created", "contractor_id", "created_at")`; `Index("ix_favourite_workers_worker", "worker_id")`.

**Alembic migration outline**
- upgrade: create `favourite_workers` table + unique + indexes (no new enum).
- downgrade: drop table.

**API endpoints** (mirror the saved-jobs surface)

- `GET /api/v1/favourite-workers` — **contractor** (`approved_contractor`). Returns `list[WorkerCardOut]` (reuse discovery projection; PII-masked, visa-aware) augmented with `note`/`tags`. Supports `?tag=` filter, `limit`/`offset`.
- `GET /api/v1/favourite-workers/ids` — **contractor**. `list[uuid]` for cheap `is_favourited` hydration on discovery screens (parallels `/jobs/saved-ids`).
- `PUT /api/v1/favourite-workers/{worker_id}` — **contractor**. Idempotent add. Body optional `{note?, tags?}`. Validates worker exists, `discoverable` or previously matched, approved. 204.
- `PATCH /api/v1/favourite-workers/{worker_id}` — **contractor**. Update note/tags.
- `DELETE /api/v1/favourite-workers/{worker_id}` — **contractor**. Remove. 204.

"Invite-first next time": no new endpoint — the talent-pool list exposes the same **Invite** CTA as discovery (1.2), and when posting a job the contractor can filter discovery to `is_favourited=true`. Optionally, a future hook can prioritise pool members in `saved_search`-style alerts, but that's out of scope here.

**Config flags** (docs/07)
- `talent_pool_enabled` (flag) default `True`.
- `favourite_workers_max_per_contractor` default `500` (422 `error.favourite_workers.limit` over cap).

**Compliance notes**
Favouriting must **not** leak PII or a contact path: the stored row is just an FK pair + private note/tags; the read projection is the same masked `WorkerCardOut` (no phone/email). Visa gate still applies on display and on any subsequent invite — a favourited foreign worker with an expired visa is shown as `visa_ok=false` and cannot be invited for an out-of-validity date. The private `note`/`tags` are contractor-only (never shown to the worker), avoiding off-platform identification. Anti-中抜き preserved: the pool is a re-engagement shortcut **inside** the platform, not a contact list.

**Web integration**
Replaces the device-local **favourite-workers** stand-in on the contractor side. Migration: on first load with the flag on, replay locally-stored worker ids via `PUT /favourite-workers/{id}` (best-effort, skipping non-existent), then clear local copies. The discovery screen (2.1) star toggles call these endpoints; the my-jobs/post-job flow gains a "from talent pool" filter; each pool card has the **Invite** action (1.2).

**Effort**: **S–M**. CRUD mirrors `saved_jobs` (S); the bulk is reusing the discovery `WorkerCardOut` projection + visa gate (already built in 2.1). Sequence right after 2.1, alongside or just before 1.2.

---

## Trust, safety & compliance

This spec covers five features that the web PWA cannot fully deliver because the API lacks the relevant endpoints. All five live in the `crafton-api` repo and follow the locked conventions (FastAPI, SQLAlchemy 2.0 + Alembic, UUID v4 PKs, integer JPY, UTC storage / Asia/Tokyo business rules, catalog-key i18n, `ConfigService` precedence, server-authoritative compliance gates).

A note on a primitive used by 3.2, 3.5 and 1.9 below: `admin_id` always refers to an admin row in the existing admin/user model; "actor" means the authenticated principal (worker / contractor / admin) resolved from the Firebase ID token. Where a feature both writes a moderation/admin action and needs an audit trail, it MUST also append to the `admin_audit_log` defined in 3.5 (single source of truth — do not invent per-feature audit tables).

---

### 3.2 In-app dispute / report flow (report no-show, unsafe site, payment issue; admin queue)

**Why it's blocked on the backend.** There is no `reports`/`disputes` table or endpoint today; a worker who hits an unsafe site or a no-show counterpart, or a contractor disputing a payment, has nowhere to file, and admin has no queue to triage. This is pure server state (cross-party, moderated, retained for compliance) and cannot live in localStorage.

**Data model.**

New table `disputes`:
- `id` UUID PK
- `reporter_id` UUID FK → users.id, NOT NULL, indexed
- `reporter_role` enum(`worker`,`contractor`) NOT NULL — denormalised for queue filtering
- `subject_user_id` UUID FK → users.id, NULLABLE, indexed (the reported counterpart, when applicable)
- `matching_id` UUID FK → matchings.id, NULLABLE, indexed (most disputes are matching-scoped)
- `job_id` UUID FK → jobs.id, NULLABLE, indexed
- `category` enum(`no_show`,`unsafe_site`,`payment_issue`,`harassment`,`other`) NOT NULL
- `status` enum(`open`,`under_review`,`resolved`,`dismissed`) NOT NULL default `open`, indexed
- `severity` enum(`low`,`normal`,`high`,`urgent`) NOT NULL default `normal` — `unsafe_site`/`harassment` default to `high` (set server-side on create)
- `description` text NOT NULL (≤ config max length)
- `resolution_note` text NULLABLE (admin-only, set on resolve/dismiss)
- `assigned_admin_id` UUID FK → users.id, NULLABLE
- `resolved_by_admin_id` UUID FK → users.id, NULLABLE
- `resolved_at` timestamptz NULLABLE
- `created_at` / `updated_at` timestamptz NOT NULL

New table `dispute_attachments` (photos of unsafe site / evidence; reuse the existing documents upload-url flow, new doc type `dispute_evidence`):
- `id` UUID PK
- `dispute_id` UUID FK → disputes.id ON DELETE CASCADE, indexed
- `document_id` UUID FK → documents.id, NOT NULL
- `created_at` timestamptz NOT NULL

Indexes: `(status, severity, created_at)` composite for the admin queue ordering; `(reporter_id, created_at)` for "my reports".

Migration outline — **upgrade**: create enums `dispute_category`, `dispute_status`, `dispute_severity`; create `disputes` and `dispute_attachments`; add the `dispute_evidence` value to the existing document-type enum (separate `ALTER TYPE ... ADD VALUE`, non-transactional — keep in its own migration step). **downgrade**: drop both tables then the three new enums; the document-type enum value cannot be cleanly dropped in PG, so downgrade leaves `dispute_evidence` in place (document this intent).

**API endpoints.**

`POST /api/v1/disputes` — file a dispute. authZ: worker or contractor (any authenticated non-admin). Request: `{category, matching_id?, job_id?, subject_user_id?, description, attachment_document_ids?: [UUID]}`. Response `DisputeOut`: `{id, category, status, severity, matching_id, job_id, subject_user_id, description, created_at}`. Rules: if `matching_id` given, reporter MUST be a party to that matching (else 403, mirror matchings authZ); `subject_user_id` defaults from the matching's counterpart; rate-limit per reporter via config; `description` length validated against config; auto-derive `severity` from category; attachments must be documents owned by the reporter of type `dispute_evidence`.

`GET /api/v1/disputes/mine` — reporter's own disputes, paginated. authZ: reporter. Response: list of `DisputeOut` (no `resolution_note` of other parties; reporter sees their own resolution note once resolved).

`GET /api/v1/disputes/{id}` — authZ: the reporter, the subject_user, or admin. Subject sees a redacted view (category/status/created_at, not the free-text description unless config `dispute_show_description_to_subject` is on — default off, since descriptions may contain accusations).

`GET /api/v1/admin/disputes` — admin queue. Query: `status?, category?, severity?, assigned_admin_id?, sort=severity|created_at`. Response: paginated `AdminDisputeOut` (full record incl. reporter, subject, description, attachment signed URLs via 3.4 mechanism). Default sort: `severity desc, created_at asc` (urgent oldest first). Mirrors existing `/admin/matchings` queue pattern.

`PATCH /api/v1/admin/disputes/{id}` — triage/resolve. authZ: admin. Request: `{status?, severity?, assigned_admin_id?, resolution_note?}`. Rules: setting `status` to `resolved`/`dismissed` requires `resolution_note` (validation error otherwise); sets `resolved_by_admin_id`/`resolved_at`; **MUST append an `admin_audit_log` entry** (action `dispute.resolve`/`dispute.dismiss`/`dispute.reassign`, reason = `resolution_note`). On resolution, emit a notification to the reporter (existing notifications system, new catalog keys).

**Config flags.**
- `disputes_enabled` (default `true`)
- `dispute_max_description_len` (default `2000`)
- `dispute_rate_limit_per_day` (default `10` per reporter)
- `dispute_max_attachments` (default `5`)
- `dispute_show_description_to_subject` (default `false`)
- `dispute_high_severity_categories` (default `["unsafe_site","harassment"]`)

**Compliance notes.** `unsafe_site` reports are a labour-safety signal — they must never be silently auto-dismissed; flag to admin (high severity). Descriptions can contain personal data (APPI) and accusations → not exposed to the subject by default. No-show disputes feed reliability score (1.10) only after admin confirmation, never on the raw report, to prevent retaliatory reporting. Anti-disintermediation: dispute free-text passes through the **same server-side contact-masking** as chat (reuse the chat masking utility) so users can't leak phone/LINE via a "report".

**Web integration.** Consumed by a new "Report a problem" action on the matching detail screen and the chat screen; admin side adds a "Disputes" queue tab alongside the existing vetting/matchings queues. No device-local stand-in exists today (this is net-new), so no migration — but the chat quick-replies localStorage stand-in can offer a "report" shortcut that deep-links here.

**Effort.** M. Sequence after 3.5 (needs `admin_audit_log`) and alongside 3.4 (shares signed-URL evidence viewing).

---

### 3.4 Admin document viewer (preview/zoom residence cards; signed read URLs; retention rules)

**Why it's blocked on the backend.** Documents are uploaded via signed PUT URLs, but there is no endpoint to mint short-lived signed **read** URLs for admin preview, and retention/expiry of sensitive images (residence cards) is unenforced. Both are server-only concerns (GCS signing creds, retention sweeper).

**Data model.**

Changes to existing `documents` table (Alembic `add_column`s, nullable, backfilled by sweeper):
- `retention_expires_at` timestamptz NULLABLE, indexed — when a sensitive doc becomes purge-eligible
- `purged_at` timestamptz NULLABLE — set when the object is deleted from GCS (row kept as tombstone)
- `last_viewed_by_admin_id` UUID FK → users.id, NULLABLE
- `last_viewed_at` timestamptz NULLABLE
- `view_count` int NOT NULL default 0

New table `document_access_log` (every admin read-URL mint is logged for APPI accountability):
- `id` UUID PK
- `document_id` UUID FK → documents.id, NOT NULL, indexed
- `admin_id` UUID FK → users.id, NOT NULL, indexed
- `purpose` enum(`vetting`,`dispute`,`audit`,`support`) NOT NULL
- `ip` text NULLABLE, `user_agent` text NULLABLE
- `created_at` timestamptz NOT NULL, indexed

Migration outline — **upgrade**: add the five columns to `documents`; create enum `document_access_purpose` and table `document_access_log`; add partial index on `documents(retention_expires_at) WHERE purged_at IS NULL` for the sweeper. **downgrade**: drop `document_access_log` + enum, drop the five columns (retention metadata loss is acceptable on downgrade; objects themselves are untouched).

**API endpoints.**

`POST /api/v1/admin/documents/{id}/view-url` — mint a short-lived signed GET URL. authZ: admin only. Request: `{purpose: vetting|dispute|audit|support}`. Response `DocumentViewUrlOut`: `{url, expires_at, content_type, doc_type, owner_user_id, retention_expires_at, purged: bool}`. Rules: 404 if `purged_at` set (object gone — return `{purged:true}` with no URL); URL TTL from config; increments `view_count`, sets `last_viewed_*`; writes a `document_access_log` row (capture IP/UA); **appends `admin_audit_log`** (action `document.view`, reason = purpose). Signed URL TTL deliberately short (minutes) and single-object scoped.

`GET /api/v1/admin/documents/{id}/access-log` — authZ: admin. Response: paginated access-log entries `{admin_id, purpose, created_at}` for accountability/oversight.

`GET /api/v1/admin/users/{id}/documents` — list a user's documents for the vetting screen. authZ: admin. Response: `[{document_id, doc_type, created_at, retention_expires_at, purged}]` (metadata only; URLs minted on demand via the view-url endpoint, never bulk).

Retention sweeper (not an endpoint — a scheduled job, Cloud Run job / Cloud Scheduler): for docs whose `doc_type ∈ sensitive set` and `created_at + retention window < now()` and `purged_at IS NULL`, delete the GCS object and set `purged_at`. Run daily. Driven by config below.

**Config flags.**
- `admin_doc_view_url_ttl_seconds` (default `300`)
- `residence_card_retention_days` (default `90` — minimise per docs/08; tune with legal)
- `document_retention_sensitive_types` (default `["residence_card_front","residence_card_back","photo_id"]`)
- `document_retention_sweeper_enabled` (default `true`)
- `qualification_retention_days` (default `1825` / 5y — qualifications are trust-positive, longer)

**Compliance notes.** Core APPI / docs/08 surface. Residence-card images are minimised: short retention window, hard purge via sweeper, tombstone row retained for audit but object deleted. Every view is logged (who/when/why) → satisfies access-accountability. **My Number is never stored or viewable** — if any future doc type implies My Number, it must be excluded here. Read URLs are short-TTL, single-object, admin-only — never returned in list endpoints to avoid URL leakage. Retention window is config, not hardcoded, so legal can tighten it without a deploy.

**Web integration.** Consumed by the admin vetting-queue detail screen (existing) — replaces any direct image embedding with on-demand "View document" buttons that call `view-url` and open the signed URL in a zoomable lightbox. Also consumed by the 3.2 admin dispute view for evidence. No device-local stand-in (admin-only, never cached client-side; instruct the lightbox not to persist).

**Effort.** M. Sequence early — 3.2 evidence viewing and 1.9 badge verification both depend on the view-url mechanism.

---

### 3.5 Audit log of admin actions (who approved/rejected/suspended + reason)

**Why it's blocked on the backend.** Admin mutations (vetting approve/reject, user suspend, fee-paid, config patch, dispute resolution) currently leave no immutable trail; regulators and internal oversight need an append-only record of who did what, when, and why. This is foundational server state that several other features (3.2, 3.4, 1.9) write into.

**Data model.**

New table `admin_audit_log` (append-only; no UPDATE/DELETE in app code):
- `id` UUID PK
- `admin_id` UUID FK → users.id, NOT NULL, indexed
- `action` text NOT NULL, indexed — namespaced verb, e.g. `vetting.approve`, `vetting.reject`, `user.suspend`, `user.unsuspend`, `matching.cancel`, `fee.mark_paid`, `config.patch`, `dispute.resolve`, `dispute.dismiss`, `document.view`, `badge.grant`, `badge.revoke`
- `target_type` enum(`user`,`worker`,`contractor`,`job`,`matching`,`document`,`dispute`,`badge`,`config`) NOT NULL, indexed
- `target_id` UUID NULLABLE (nullable for `config` actions keyed by name)
- `target_key` text NULLABLE (e.g. config key name)
- `reason` text NULLABLE — the human reason ("rejected: residence card expired")
- `before` jsonb NULLABLE, `after` jsonb NULLABLE — minimal diff snapshot (NO sensitive image bytes, NO My Number, NO raw contact info — store IDs/enums/flags only)
- `ip` text NULLABLE, `user_agent` text NULLABLE
- `created_at` timestamptz NOT NULL, indexed

Indexes: `(admin_id, created_at)`, `(target_type, target_id, created_at)`, `(action, created_at)`. Consider monthly partitioning later; not required for MVP.

Migration outline — **upgrade**: create enum `audit_target_type`; create `admin_audit_log` with the three composite indexes. **downgrade**: drop table + enum. (Append-only is enforced in the service layer, not via DB triggers, for MVP simplicity — note this.)

**API endpoints.**

A shared internal helper `record_admin_action(admin, action, target_type, target_id=…, target_key=…, reason=…, before=…, after=…, request=…)` is the canonical write path; **every existing admin mutation endpoint is retrofitted to call it** (vetting approve/reject, suspend, mark-fee-paid, config patch, matching cancel). This is the bulk of the work — wiring, not new surface.

`GET /api/v1/admin/audit-log` — read the trail. authZ: admin (optionally restrict to a super-admin role via config — see flag). Query: `admin_id?, action?, target_type?, target_id?, from?, to?, sort=created_at`. Response: paginated `AuditLogOut` `{id, admin_id, action, target_type, target_id, target_key, reason, before, after, created_at}`. Read-only; no write/patch/delete endpoints exist by design.

`GET /api/v1/admin/users/{id}/audit-log` — convenience filtered view of actions targeting a user. authZ: admin. Same response shape.

**Config flags.**
- `admin_audit_log_enabled` (default `true` — disabling only affects new writes, never deletes history)
- `admin_audit_log_retention_days` (default `2555` / 7y — long, regulatory)
- `admin_audit_read_requires_superadmin` (default `false` in MVP; flip true once a super-admin role exists)

**Compliance notes.** Append-only immutability is the whole point — no edit/delete API, enforced in service layer. `before`/`after` snapshots MUST exclude sensitive payloads (image bytes, My Number, raw phone/contact) — store only IDs, enums, and flags so the audit log itself isn't a PII leak. Long retention (7y) is deliberate and regulatory; the document retention sweeper (3.4) does NOT purge audit rows. Captures the reason for every visa-gate rejection → directly supports the docs/08 compliance gate's defensibility.

**Web integration.** Consumed by a new admin "Audit log" screen (global + per-user tab on the admin user-detail screen). No device-local stand-in. The existing admin mutation screens (vetting, fee, config, suspend) gain a mandatory "reason" field where one isn't already collected, which now feeds `reason`.

**Effort.** M-L. **Build first** — 3.2, 3.4 and 1.9 all depend on `record_admin_action`. The L portion is retrofitting every existing admin mutation, not the table itself.

---

### 1.9 Skill verification badges (admin/document-verified qualifications shown as trust badges)

**Why it's blocked on the backend.** Workers upload `qualification` documents today, but there's no notion of an admin **verifying** a qualification and surfacing it as a durable, queryable trust badge on the worker profile. Verification status is server-authoritative trust state, not client UI.

**Data model.**

New table `skill_badges` (catalogue of grantable badge types — config-ish but relational so jobs/filters can reference):
- `id` UUID PK
- `code` text UNIQUE NOT NULL (e.g. `tobi` 鳶, `forklift` フォークリフト, `scaffolding` 足場, `gas_welding` ガス溶接, `first_aid`)
- `name_key` text NOT NULL — i18n catalog key (rendered ja/en)
- `requires_document` bool NOT NULL default `true`
- `active` bool NOT NULL default `true`
- `created_at` timestamptz NOT NULL

New table `worker_badges`:
- `id` UUID PK
- `worker_id` UUID FK → workers.id, NOT NULL, indexed
- `badge_id` UUID FK → skill_badges.id, NOT NULL, indexed
- `status` enum(`pending`,`verified`,`rejected`,`expired`,`revoked`) NOT NULL default `pending`, indexed
- `document_id` UUID FK → documents.id, NULLABLE (the qualification proof)
- `verified_by_admin_id` UUID FK → users.id, NULLABLE
- `verified_at` timestamptz NULLABLE
- `expires_at` timestamptz NULLABLE (some certs expire; surfaces re-verification)
- `rejection_reason` text NULLABLE
- `created_at` / `updated_at` timestamptz NOT NULL
- UNIQUE `(worker_id, badge_id)` — one badge row per worker/type (re-grant updates status)

Indexes: `(worker_id, status)` for profile rendering; `(status, created_at)` for the admin verification queue.

Migration outline — **upgrade**: create enum `worker_badge_status`; create `skill_badges` and `worker_badges`; seed `skill_badges` rows for the initial trade set (data migration, codes + name_keys). **downgrade**: drop both tables + enum.

**API endpoints.**

`GET /api/v1/badges` — public catalogue of active badge types. authZ: any authenticated. Response: `[{id, code, name_key, requires_document}]`. Drives filter chips and the "request badge" picker.

`POST /api/v1/workers/me/badges` — worker requests a badge. authZ: worker. Request: `{badge_id, document_id?}`. Rules: if badge `requires_document`, `document_id` (type `qualification`, owned by caller) is mandatory; creates/updates `worker_badges` to `pending`; re-request after rejection allowed.

`GET /api/v1/workers/{id}/badges` — badges for a worker profile. authZ: any authenticated (contractors view worker trust). Response: **only `verified` (and non-expired) badges** to non-admins: `[{code, name_key, verified_at, expires_at}]`. The worker viewing their own profile additionally sees `pending`/`rejected` with `rejection_reason`.

`GET /api/v1/admin/badges/queue` — pending verification queue. authZ: admin. Query: `status?, badge_id?`. Response: `[{worker_badge_id, worker_id, badge_code, document_id, status, created_at}]` (document viewed via 3.4 view-url).

`PATCH /api/v1/admin/workers/{worker_id}/badges/{badge_id}` — verify/reject/revoke. authZ: admin. Request: `{status: verified|rejected|revoked, expires_at?, rejection_reason?}`. Rules: `rejected`/`revoked` require a reason; `verified` may set `expires_at`; sets `verified_by_admin_id`/`verified_at`; **appends `admin_audit_log`** (`badge.grant`/`badge.revoke`, reason); notifies the worker (new catalog keys). An expired badge (`expires_at < now`) renders as not-verified to viewers (computed at read time and/or swept).

Optional (Phase 2): expose `?badge=` filter on the existing `GET /api/v1/jobs` applicant ranking and on worker search, so contractors can require a badge. When AI ranking is used, verified badges become a Vertex AI Gemini ranking signal.

**Config flags.**
- `skill_badges_enabled` (default `true`)
- `badge_requires_admin_verification` (default `true` — if ever false, document-presence alone grants; keep true)
- `badge_default_expiry_days` (default `null` = no expiry unless admin sets one)
- `badge_show_pending_to_contractors` (default `false`)

**Compliance notes.** Badges are trust-positive and distinct from the visa gate — a badge NEVER substitutes for or bypasses the foreign-worker visa/work-permission gate (keep them orthogonal; a badged worker still passes the visa gate). Qualification documents backing a badge inherit 3.4 retention (longer `qualification_retention_days`, since trust-positive). Only `verified` badges are shown to counterparts → no unverified self-claims leak as trust signals. Revocation is auditable.

**Web integration.** Consumed by the worker profile screen (badge chips), the "request verification" flow in worker onboarding/profile, contractor-facing applicant cards, and the admin badge queue. The device-local "favourite workers" stand-in is unrelated; this is net-new server trust state with no localStorage predecessor.

**Effort.** M. Sequence after 3.4 (admin needs to view the qualification doc to verify) and 3.5 (audit writes).

---

### 1.10 Streaks & reliability score (on-time check-in rate / no-cancel streak surfaced)

**Why it's blocked on the backend.** A reliability score must aggregate authoritative matching outcomes (check-in punctuality, completions, cancels, no-shows) across all of a worker's history — data that lives only server-side and must be computed consistently, not trusted from a device.

**Data model.**

New table `worker_reliability` (one row per worker; a materialised rollup, recomputed on matching state transitions):
- `worker_id` UUID PK / FK → workers.id
- `total_matchings` int NOT NULL default 0
- `completed_count` int NOT NULL default 0
- `on_time_checkin_count` int NOT NULL default 0
- `late_checkin_count` int NOT NULL default 0
- `worker_cancel_count` int NOT NULL default 0
- `noshow_count` int NOT NULL default 0
- `current_no_cancel_streak` int NOT NULL default 0 — consecutive completed-without-cancel/noshow
- `longest_no_cancel_streak` int NOT NULL default 0
- `on_time_rate` int NOT NULL default 0 — **stored as integer basis points or 0–100 percent** (never float; pick 0–100), recomputed
- `reliability_score` int NOT NULL default 0 — 0–100 composite, recomputed via config-weighted formula
- `last_recomputed_at` timestamptz NOT NULL
- `updated_at` timestamptz NOT NULL

Optional event source table `matching_reliability_events` (append-only, lets the score be re-derivable / auditable):
- `id` UUID PK
- `worker_id` UUID FK, indexed
- `matching_id` UUID FK, indexed
- `event` enum(`on_time_checkin`,`late_checkin`,`completed`,`worker_cancel`,`noshow`) NOT NULL
- `occurred_at` timestamptz NOT NULL
- `created_at` timestamptz NOT NULL

On-time is computed from the existing matching `check-in` event vs the job's scheduled start + a config grace window (Asia/Tokyo). The recompute runs in the matching state-transition service (check-in, complete, cancel, noshow) — no new write path for those transitions, just a hook that emits an event and updates the rollup.

Migration outline — **upgrade**: create enum `reliability_event`; create `worker_reliability` (PK = worker_id) and `matching_reliability_events`; optional backfill data migration that replays existing terminal matchings to seed rollups. **downgrade**: drop both tables + enum.

**API endpoints.**

`GET /api/v1/workers/me/reliability` — authZ: worker (self). Response `ReliabilityOut`: `{reliability_score, on_time_rate, current_no_cancel_streak, longest_no_cancel_streak, completed_count, total_matchings}`. The worker sees their own full breakdown to motivate behaviour (anti-no-show / ドタキャン).

`GET /api/v1/workers/{id}/reliability` — authZ: any authenticated (contractors evaluating an applicant). Response: a **reduced** `ReliabilityPublicOut`: `{reliability_score, on_time_rate_band, no_cancel_streak_band}` where bands are coarse buckets (e.g. score → tier label key) to avoid exposing raw counts that could enable harassment; granularity controlled by config. Counts like `noshow_count` are NOT exposed to contractors directly.

No public write endpoint — the score is derived, never set. An admin recompute/repair endpoint: `POST /api/v1/admin/workers/{id}/reliability/recompute` (authZ admin, audited via 3.5) for support cases.

**Config flags.**
- `reliability_enabled` (default `true`)
- `reliability_on_time_grace_minutes` (default `10` — within 10 min of scheduled start = on time, Asia/Tokyo)
- `reliability_score_weights` (jsonb, default `{"on_time":0.4,"completion":0.3,"no_cancel_streak":0.2,"low_noshow":0.1}`) — config-weighted composite, normalised to 0–100
- `reliability_min_matchings_to_show` (default `3` — below this, show "new worker" instead of a misleadingly extreme score)
- `reliability_public_band_thresholds` (jsonb, default tiers, e.g. `{"excellent":85,"good":70,"fair":50}`)
- `reliability_noshow_penalty_weight` already covered by weights jsonb

**Compliance notes.** Anti-no-show (ドタキャン) and anti-disintermediation core value: surfacing reliability directly disincentivises cancels/no-shows. Score is server-computed only — never accept a client-supplied score. Public exposure is **banded**, not raw, to prevent the score from becoming a harassment/retaliation vector (APPI fairness); raw counts stay self/admin only. No-show counts only increment from the authoritative matching `noshow` state (admin/system-confirmed), not from raw disputes — preventing retaliatory score damage (ties to 3.2's "admin-confirmed only" rule). New workers below `reliability_min_matchings_to_show` are protected from extreme scores.

**Web integration.** Consumed by the worker's own dashboard/profile (full breakdown, streak badge) and contractor-facing applicant cards / worker profile (banded tier). No device-local stand-in — this is genuinely server-aggregated. Plays alongside 1.9 badges on the same profile/applicant surfaces.

**Effort.** M. Sequence after the matching state machine is stable; the recompute hook is the main integration point. Backfill migration is optional but recommended so existing histories aren't blank.

---

## Notifications & realtime

This group makes outbound, time-driven, and cross-device features authoritative on the server. All four build on the existing `notifications` table + `notify()` service (which writes localized `type`+`params`, not rendered text) and the existing `devices` table / `X-Device-Id` convention. Nothing here weakens contact masking or the visa gate; reminders and pushes are deliberately built so payloads carry **no** unmasked contact info.

### 4.1 Web push notifications (PWA Web Push + FCM; VAPID; subscription store)

**Why it's blocked on the backend.** The web app can register a service worker and call `PushManager.subscribe()`, but there is no endpoint to persist the resulting push subscription, and no server component to sign/send Web Push (VAPID) or FCM messages — delivery must originate server-side from the same events that already call `notify()`.

**Data model.**

New table `push_subscriptions` — one row per (user, device, browser push endpoint):
- `id` UUID PK.
- `user_id` UUID FK → `users.id` `ON DELETE CASCADE`, not null.
- `device_id` text(64) not null — the same client-generated id used in `devices` / `X-Device-Id` (loose link, not an FK, so a subscription can outlive a device-row cleanup but is still attributable).
- `transport` enum `push_transport` `{web_push, fcm}` not null — `web_push` for desktop/PWA standard Web Push, `fcm` for the mobile wrapper/native FCM token path.
- `endpoint` text not null — Web Push endpoint URL, or FCM registration token for `fcm`.
- `p256dh` text nullable, `auth` text nullable — Web Push encryption keys (null for `fcm`).
- `user_agent` text(255) nullable — for the device list UI / debugging.
- `failure_count` int not null default 0 — incremented on transient send failure; reset on success.
- `last_success_at` timestamptz nullable, `last_failure_at` timestamptz nullable.
- `created_at` timestamptz (CreatedAtMixin).
- Constraints/indexes: `UniqueConstraint(user_id, endpoint)` (`uq_push_subscriptions_user_endpoint`) — re-subscribing upserts; `Index(user_id)` for fan-out lookups.

Changed table `notifications`: add `pushed_at` timestamptz nullable — set when at least one push transport has accepted the message, so a backfill/retry job won't double-send and the in-app feed stays the source of truth.

VAPID keypair is **not** in the DB. Private key lives in GCP Secret Manager (`CRAFTON_PUSH__VAPID_PRIVATE_KEY`), public key in env/config; never committed.

Migration outline:
- *upgrade*: `op.create_table("push_subscriptions", ...)` with `pg_enum(PushTransport, "push_transport")` created first; add `pushed_at` column to `notifications`; create the unique constraint + index.
- *downgrade*: drop `pushed_at`, drop `push_subscriptions`, drop the `push_transport` enum type.

**API endpoints.**

`POST /api/v1/push/subscriptions` — register/upsert the current device's subscription.
- Auth: any authenticated user (worker/contractor/admin).
- Request `PushSubscriptionIn`: `transport: Literal["web_push","fcm"]`, `endpoint: str`, `keys: {p256dh: str|None, auth: str|None}` (Web Push shape), `user_agent: str|None`. `device_id` is taken from the `X-Device-Id` header (mirrors `devices`).
- Response `PushSubscriptionOut`: `id, transport, created_at`.
- Rules: upsert on `(user_id, endpoint)`; `web_push` requires `p256dh`+`auth` (422 otherwise); reset `failure_count`/`last_failure_at` on upsert.

`DELETE /api/v1/push/subscriptions` — unsubscribe.
- Auth: owner. Body `{endpoint: str}` (or `device_id` from header to drop all of that device's subs). Idempotent 204.

`GET /api/v1/push/vapid-public-key` — returns `{public_key: str}` so the SW can subscribe without a hardcoded key. Auth: any authenticated user (or public — it's not a secret).

`POST /api/v1/push/test` — admin/dev only; sends a test push to the caller's own subscriptions. Auth: any authenticated user but only to **self**. Gated behind `push_test_endpoint_enabled` (default off in prod).

Sending is **not** a request-driven endpoint. Extend the existing `notify()` service: after a notification row is committed, enqueue a push-send side-effect. Implementation: `app/services/push.py` `send_to_user(db, user_id, notification)` resolves the user's prefs (4.3) + subscriptions, renders `title`/`body` via `translate(f"notification.{type}.title/body", user.preferred_language, **params)` (identical to `_render` in the notifications router), and posts to each endpoint. Use the `pywebpush` library for Web Push and the FCM HTTP v1 API (Vertex/GCP service-account auth) for `fcm`. On `404`/`410` (Gone) → delete the subscription; on transient `5xx` → increment `failure_count`, prune after `push_max_failures` consecutive failures. To keep request latency low, dispatch happens out-of-band via Cloud Tasks (push queue) or a lightweight worker — the API request only writes the row and enqueues.

**Config flags.**
- `push_enabled` (feature flag) default `true` — master switch for outbound push.
- `push_test_endpoint_enabled` (flag) default `false`.
- `push_max_failures` (int) default `5` — prune a subscription after this many consecutive failures.
- `push_ttl_seconds` (int) default `86400` — Web Push/FCM TTL so stale reminders don't fire after the job.
- VAPID public key surfaced as config (`push_vapid_public_key`), private key from Secret Manager (not in the registry).

**Compliance notes.** Push payloads must contain **only** the localized `title`/`body`/`link` derived from `notification.params` — never unmasked phone numbers, addresses, or contact info, since payloads transit Google/Mozilla/Apple push services (anti-中抜き + APPI). Keep bodies generic for chat (e.g. "新しいメッセージ" / "New message") and link into the app rather than embedding message content. Subscriptions are personal data: delete on user deletion (CASCADE) and on device revoke; respect retention by pruning dead endpoints.

**Web integration.** Consumed by the SW registrar component and the notifications bell/header. The PWA already has a service worker; add a push subscription flow on first grant of `Notification.permission` and post to `POST /push/subscriptions`. The existing in-app notification feed remains the source of truth; push is an additional channel. No device-local stand-in to migrate (this is net-new), but it pairs with device list (§devices) so users can see/revoke push per device.

**Effort.** **L**. Sequence: (1) table + migration + subscribe/unsubscribe/vapid endpoints; (2) `push.py` sender + wire into `notify()`; (3) out-of-band dispatch (Cloud Tasks) + failure pruning; (4) FCM transport. Ship (1)+(2) first behind `push_enabled=false` in prod until VAPID/Secret Manager wiring is verified.

### 4.2 Day-before / day-of reminders ("confirm tonight", "check-in")

**Why it's blocked on the backend.** These are *time-triggered*, not event-triggered: nothing in a request flow fires them. They need a server scheduler evaluating job times in Asia/Tokyo and writing notifications (and push) idempotently — impossible from a stateless client.

**Data model.**

New table `scheduled_reminders` — dedupe/audit ledger so a cron that runs every minute never double-sends:
- `id` UUID PK.
- `matching_id` UUID FK → `matchings.id` `ON DELETE CASCADE`, not null.
- `reminder_kind` enum `reminder_kind` `{confirm_night_before, checkin_morning, completion_nudge}` not null.
- `scheduled_for` timestamptz not null — the UTC instant the reminder becomes due (computed from job `work_date`/`start_time` in Asia/Tokyo).
- `sent_at` timestamptz nullable — null = pending, set when dispatched.
- `created_at` timestamptz.
- Constraints/indexes: `UniqueConstraint(matching_id, reminder_kind)` (`uq_reminders_matching_kind`) — one of each kind per matching, the idempotency guarantee; `Index(sent_at, scheduled_for)` partial-ish for the "due and unsent" sweep (`WHERE sent_at IS NULL`).

No change to `matchings`/`jobs` needed — `work_date`, `start_time`, and `status` already exist.

Migration outline:
- *upgrade*: create `reminder_kind` enum; `create_table("scheduled_reminders", ...)`; add unique constraint + the due-sweep index.
- *downgrade*: drop table, drop enum.

**API endpoints.** No public API — this is a scheduler. Two internal/ops surfaces:

`POST /api/v1/admin/reminders/run` — manually trigger the sweep (idempotent), for ops/testing and as the Cloud Scheduler target.
- Auth: **admin** only (and/or an OIDC service-account caller for Cloud Scheduler).
- Request `{now: datetime|None}` — optional override for deterministic tests (defaults to `now_utc()`).
- Response `ReminderRunOut`: `{evaluated: int, sent: int, skipped: int}`.

`GET /api/v1/admin/reminders` — admin visibility into pending/sent reminders (filter by `sent`/`matching_id`). Auth: admin.

**Scheduler design.** A Cloud Scheduler job (cron, `asia-northeast1`, Asia/Tokyo cron expression) hits `POST /admin/reminders/run` every minute (or every 5 min). The sweep, in `app/services/reminders.py`:
1. **Materialize**: for each `confirmed` matching whose job is in the future, ensure a `scheduled_reminders` row per kind exists (insert-if-absent via the unique constraint). `scheduled_for` is computed in Asia/Tokyo using `clock.TOKYO`:
   - `confirm_night_before`: the evening before `work_date` at `noshow_confirm_hour_local` (config, default `20`) Tokyo, converted to UTC. Matches the existing 20:00 "夜前確認" rule already in config.
   - `checkin_morning`: `work_date` at `start_time` minus `reminder_checkin_lead_minutes` (config) Tokyo.
   - `completion_nudge` (optional): `start_time + reminder_completion_after_minutes` for a `checked_in` matching not yet `completed`.
2. **Dispatch**: select rows where `sent_at IS NULL AND scheduled_for <= now`; for each, re-check the matching is still in the eligible state (skip if `canceled`/`noshow`/already `completed`), then call `notify()` with a new `NotificationType` (`REMINDER_CONFIRM_TONIGHT`, `REMINDER_CHECKIN`, `REMINDER_COMPLETION`) → fan-out to push (4.1), and set `sent_at`. Commit per row (or small batches) so a crash mid-sweep resumes safely.

Add the three `NotificationType` members and their `notification.<type>.title/body` keys to **both** `app/locales/ja.json` and `en.json` (e.g. `notification.reminder_confirm_tonight.title` = "今夜中に出勤確認を" / "Confirm attendance tonight"), params include `{job_date, start_time, site_area}` (area only — never the full masked address).

**Config flags.**
- `reminders_enabled` (flag) default `true`.
- `noshow_confirm_hour_local` (int) default `20` — **reuse the existing key**; do not add a duplicate.
- `reminder_checkin_lead_minutes` (int) default `60` — how long before `start_time` to nudge check-in.
- `reminder_completion_after_minutes` (int) default `240` — completion nudge delay after start (gated, optional).
- `reminder_sweep_grace_minutes` (int) default `120` — don't send a reminder whose `scheduled_for` is older than this (so a backlog after downtime doesn't blast stale "confirm tonight" at noon).

**Compliance notes.** Reminders reinforce anti-ドタキャン (no-show) value — the 20:00 confirm prompt is the product's core no-show defence. Payloads carry date/time/area only, never the masked address or contact info (consistent with 4.1). No visa/My Number impact. Times are evaluated in Asia/Tokyo via `clock.TOKYO` and stored as UTC `scheduled_for` — never compute reminder times in naive local time.

**Web integration.** No new screen needed — reminders surface in the existing notification feed + as push, and deep-link via `link` to the matching detail / day-of check-in screen. The web app's local "remind me" affordances (if any) become server-authoritative. Admin reminders list can appear under the existing admin matchings area.

**Effort.** **M**. Sequence: (1) table + enum + migration + `reminders.py` materialize/dispatch with config-driven Tokyo math + new notification keys; (2) `POST/GET /admin/reminders` + Cloud Scheduler wiring; (3) completion-nudge kind (optional). Depends on 4.1 only for the push channel — the in-app notification works without it.

### 4.3 Notification preferences (per-channel, per-type toggles)

**Why it's blocked on the backend.** Preferences must gate server-side fan-out (push send, future email/SMS) and sync across devices; localStorage can't suppress a push the server originates. Currently every event notifies unconditionally.

**Data model.**

New table `notification_preferences` — one row per (user, type, channel), sparse (absent = default-on):
- `id` UUID PK.
- `user_id` UUID FK → `users.id` `ON DELETE CASCADE`, not null.
- `notification_type` text(64) not null — same varchar space as `notifications.type` (so new types need no migration); a special value `"*"` (or a separate `category`) lets a user mute a whole channel.
- `channel` enum `notification_channel` `{in_app, push, email, sms}` not null — only `in_app`/`push` are live in Phase 1; `email`/`sms` reserved.
- `enabled` bool not null default true.
- `updated_at` timestamptz (TimestampMixin).
- Constraints/indexes: `UniqueConstraint(user_id, notification_type, channel)` (`uq_notif_prefs_user_type_channel`); `Index(user_id)`.

Quiet hours (optional, config-gated): add `quiet_hours_start` / `quiet_hours_end` (smallint, Tokyo hour 0–23, nullable) on the `worker_profile`/`contractor_profile` or a tiny `user_settings` row — recommend a single `user_notification_settings` table (`user_id` PK FK, `quiet_hours_start`, `quiet_hours_end`, `push_paused_until` timestamptz) rather than overloading profiles. During quiet hours, suppress **push** only; `in_app` always writes.

Migration outline:
- *upgrade*: create `notification_channel` enum; create `notification_preferences` + unique constraint; optionally create `user_notification_settings`.
- *downgrade*: drop tables, drop enum.

**API endpoints.**

`GET /api/v1/notifications/preferences` — current user's effective prefs (defaults merged with stored overrides), so the UI shows the full matrix.
- Auth: any authenticated user.
- Response `NotificationPreferencesOut`: `{ settings: {quiet_hours_start: int|None, quiet_hours_end: int|None, push_paused_until: datetime|None}, preferences: [{notification_type: str, channel: str, enabled: bool}] }` — server returns one entry per known `NotificationType` × live channel with the resolved value.

`PATCH /api/v1/notifications/preferences` — upsert toggles.
- Auth: owner.
- Request `NotificationPreferencesPatch`: `{ preferences?: [{notification_type, channel, enabled}], settings?: {quiet_hours_start?, quiet_hours_end?, push_paused_until?} }`.
- Rules: validate `notification_type ∈ NotificationType ∪ {"*"}` and `channel` is a live channel (422 otherwise); upsert per pair; `enabled=true` may delete the override row (back to default) or store it — store it for explicit auditability. Quiet hours must be 0–23.

**Resolution in the sender.** `push.send_to_user` (4.1) and `reminders.dispatch` (4.2) consult a helper `prefs.is_enabled(db, user_id, notification_type, channel)`:
- precedence: explicit `(user, type, channel)` row → `(user, "*", channel)` row → default `true`.
- `in_app` is **not suppressible** for system-critical types (e.g. `account_approved`, completion/fee events) — keep a `non_mutable_in_app_types` set so users can't lose audit-relevant notifications; they can still mute push.
- push additionally suppressed during quiet hours / `push_paused_until` (the in-app row still writes; push is just skipped).

**Config flags.**
- `notification_prefs_enabled` (flag) default `true`.
- `quiet_hours_enabled` (flag) default `false` (Phase 1 keep simple; enable later).
- `email_channel_enabled` / `sms_channel_enabled` (flags) default `false` (channels reserved, not built).
- `non_mutable_in_app_types` (list) default `["account_approved","account_rejected","completion_approved"]` — types that cannot be turned off for `in_app`.

**Compliance notes.** No visa/masking impact. APPI note: critical legal/compliance notifications (account approval/rejection, fee/contract events) remain deliverable in-app regardless of prefs so a user can't unknowingly opt out of records they're entitled to. Quiet hours/pause apply to push timing only.

**Web integration.** New "通知設定 / Notification settings" screen (under profile/settings). It replaces any device-local notification toggles: on first load, `GET /preferences` seeds the UI; toggles `PATCH`. Because state is server-side, settings sync across devices — the localStorage stand-in is dropped (migration: read old localStorage flags once, `PATCH` them up, then delete the local key).

**Effort.** **M** (S if quiet hours deferred). Sequence: (1) `notification_preferences` table + GET/PATCH + `prefs.is_enabled` helper wired into the push sender; (2) settings screen; (3) quiet hours / pause (optional). Depends on 4.1 for the push gate to matter; the in-app gate works standalone.

### 4.4 Read receipts & typing state in chat (realtime transport)

**Why it's blocked on the backend.** "Seen" and "typing…" are cross-user, near-real-time signals; the existing chat is request/response over the Postgres `messages` table with no read-state column and no push/socket channel to deliver ephemeral typing events.

**Transport choice.** Recommended: **Firestore (native mode) as the realtime fan-out**, which the chat model comment already anticipates ("Chat may move to Firestore for real-time delivery later; this row remains the audit record"). Rationale on GCP: managed, low-latency, client SDKs with security-rules-scoped subscriptions, no socket server to run on Cloud Run (which is request-scoped and a poor fit for long-lived WebSockets). Postgres `messages` stays the **authoritative audit record** (masking applied there); Firestore holds a mirror + ephemeral signals.
- *Read receipts* are durable → store in Postgres (source of truth) **and** mirror to Firestore for live UI.
- *Typing state* is ephemeral → **Firestore only** (or a short-TTL doc); never written to Postgres (no audit value, high write churn).
- Fallback if Firestore is deferred: short-interval polling of a read-state endpoint (below) for receipts, and a debounced typing-ping endpoint — works without sockets but is chattier. The endpoints are designed to support both transports.

**Data model.**

Read receipts in Postgres — augment, don't bloat `messages`. Add a per-(matching, user) high-water mark rather than per-message rows (cheap, sufficient for "seen up to"):

New table `message_read_state`:
- `id` UUID PK.
- `matching_id` UUID FK → `matchings.id` `ON DELETE CASCADE`, not null.
- `user_id` UUID FK → `users.id` `ON DELETE CASCADE`, not null.
- `last_read_message_id` UUID FK → `messages.id` nullable.
- `last_read_at` timestamptz not null.
- `updated_at` timestamptz (TimestampMixin).
- Constraints/indexes: `UniqueConstraint(matching_id, user_id)` (`uq_read_state_matching_user`); `Index(matching_id)`.

This gives unread counts per conversation and a "seen" marker (the other party has read up to ≥ a given message's `created_at`). No DB storage for typing.

Migration outline:
- *upgrade*: `create_table("message_read_state", ...)` + unique constraint + index. (Firestore needs no migration; provisioned via Terraform + security rules.)
- *downgrade*: drop table.

**API endpoints.**

`POST /api/v1/matchings/{matching_id}/chat/read` — mark read up to a message.
- Auth: a participant of the matching (the worker or the job's contractor) — reuse the existing chat authZ check.
- Request `{last_read_message_id: UUID}` (or `read_at` defaulting to now). Validate the message belongs to this matching.
- Response `ChatReadStateOut`: `{matching_id, user_id, last_read_message_id, last_read_at}`. Upsert the high-water mark (monotonic — never move backwards). Side-effect: mirror to Firestore for live "seen" on the peer's screen.

`GET /api/v1/matchings/{matching_id}/chat/read-state` — both participants' high-water marks (for rendering "既読 / Seen" and unread badges without Firestore).
- Auth: participant. Response `[ChatReadStateOut]` (self + peer).

`POST /api/v1/matchings/{matching_id}/chat/typing` — typing ping (only needed in the no-Firestore fallback).
- Auth: participant. Request `{typing: bool}`. Response 204. In the Firestore path this is unused (clients write the typing doc directly under security rules); the endpoint exists so the web app works without the Firestore SDK and so the server can rate-limit.

Firestore access for clients is brokered by a short-lived **custom token / scoped claim**: the API mints (or Firebase issues) a token whose security rules restrict reads/writes to `chats/{matching_id}` docs where the caller is a participant of that matching. The participant set is derived server-side from `matchings` (worker_id + job.contractor_id) — clients can't subscribe to arbitrary conversations.

**Config flags.**
- `chat_read_receipts_enabled` (flag) default `true`.
- `chat_typing_enabled` (flag) default `true`.
- `chat_realtime_transport` (str) default `"firestore"` — `{firestore, polling}`; lets us ship polling first and flip to Firestore without client/API contract changes.
- `chat_typing_ttl_seconds` (int) default `8` — typing doc/state expiry.

**Compliance notes.** Masking stays authoritative on **Postgres** write — the Firestore mirror must contain **only already-masked** message bodies (mirror after the masking filter, never the raw input), or, safer, mirror only message **ids + timestamps + read-state + typing** and let clients fetch masked bodies from the existing `GET messages` endpoint. Recommend the latter to avoid duplicating message content into a second store (smaller anti-中抜き / APPI surface). Read receipts are not contact data; typing state is ephemeral and not persisted to the audit store. Firestore security rules must scope to matching participants only.

**Web integration.** Consumed by the chat screen. Today the web app uses device-local quick-replies and request/response messaging; this adds: (a) a "既読 / Seen" indicator driven by the peer's `read-state`, (b) per-conversation unread badges (from read high-water marks), (c) "入力中… / typing…" via Firestore subscription or the polling fallback. The chat send/list endpoints are unchanged; the client calls `POST .../chat/read` on view and either subscribes to Firestore or polls `read-state`. Local quick-replies remain device-local (out of scope here) but can later move to the job-templates server feature.

**Effort.** **L** (M if shipped polling-only first). Sequence: (1) `message_read_state` table + `read` / `read-state` endpoints + unread-per-conversation (works with polling, no Firestore) — delivers "seen" + badges immediately; (2) typing endpoint + polling; (3) Firestore provisioning (Terraform), security rules, custom-token broker, and client subscription to replace polling. Ship (1) first — it's the high-value, low-risk part and is transport-independent.

---

## Media, storage & maps

These four features all hinge on the same backend gap: the API can mint signed Cloud Storage upload URLs for **vetting documents** (residence cards, quals), but it has no concept of **public-facing media** (portfolio galleries, avatars, logos), no **geocoded coordinates** for jobs, and no **server-driven offline contract** for the PWA. The web app today fakes all of this device-locally (initials avatars, no map, a naive cache-everything service worker). Below is the server-backed replacement. All of it reuses the existing `documents` signed-URL pattern (`POST /documents/upload-url` → upload to GCS → `POST /documents` register), `ConfigService` precedence, and the i18n catalog discipline.

A shared building block referenced throughout: a **`media_assets`** table that generalises "an uploaded image that is served publicly (or semi-publicly) via signed read URL", distinct from `documents` (which stays private/compliance-scoped). Keeping these separate is deliberate — see Compliance notes under 1.8 and 6.8.

---

### 1.8 Worker portfolio photos (公開ポートフォリオ / public gallery)

**Why it's blocked on the backend**
The worker public profile (`GET /workers/{id}`) returns no image list, and while `documents` already supports `doc_type=job_photo`, those rows are private/admin-vetted and have no ordering, captions, or public read URLs. There's no endpoint that returns a worker's curated, publicly viewable gallery.

**Data model**

New table **`portfolio_items`** (a thin, ordered, public view over uploaded images; the actual bytes live as a `media_assets` row — see 6.8 — so storage/serving/lifecycle is shared):

| column | type | constraints | notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `worker_id` | UUID | FK→`users.id`, not null | owner |
| `media_asset_id` | UUID | FK→`media_assets.id`, not null | the stored image |
| `caption` | text | null | optional, masked-on-write like chat (see compliance) |
| `trade_tag` | varchar | null | optional trade this photo demonstrates |
| `sort_order` | int | not null, default 0 | display order, 0-based |
| `visibility` | enum(`public`,`hidden`) | not null, default `public` | worker can hide without deleting |
| `moderation_status` | enum(`pending`,`approved`,`rejected`) | not null, default `approved` | default approved (permissive); flips to `pending` if `portfolio_moderation_enabled` |
| `created_at` / `updated_at` | timestamptz | not null | |

Indexes: `(worker_id, visibility, sort_order)` for gallery fetch; FK index on `media_asset_id`.

Alembic outline — **upgrade**: create `media_assets` (if 6.8 not yet shipped — it is the dependency, sequence it first), create enums `portfolio_visibility`, `media_moderation_status`, create `portfolio_items` with FKs + indexes. **downgrade**: drop `portfolio_items`, drop the enums it introduced (leave `media_assets` to 6.8's migration).

**API endpoints**

- **POST `/api/v1/workers/me/portfolio`** — register a new portfolio item from an already-uploaded asset. Role: **worker** (self only). Request: `{ media_asset_id: UUID, caption?: str, trade_tag?: str }`. Response `PortfolioItemOut`: `{ id, read_url, caption, trade_tag, sort_order, visibility, moderation_status, created_at }`. Rules: cap count at `portfolio_max_items` (409 `portfolio.limit_reached`); the `media_asset` must be owned by the caller and have `purpose=portfolio` (else 422); `caption` runs through the same server-side contact-mask filter as chat before persist (sets a `was_filtered` audit flag, reuse `app/core/masking`).
- **GET `/api/v1/workers/{id}/portfolio`** — public gallery. Role: **any approved user**. Response: `PortfolioItemOut[]`, only `visibility=public` and (if moderation on) `moderation_status=approved`, ordered by `sort_order`. Each `read_url` is a short-TTL signed GCS URL minted per request (reuse the `DocumentWithUrlOut.read_url` pattern).
- **PATCH `/api/v1/workers/me/portfolio/{item_id}`** — `{ caption?, trade_tag?, visibility?, sort_order? }`. Worker self only. Re-orders are accepted as absolute `sort_order`; server normalises ties by `updated_at`.
- **DELETE `/api/v1/workers/me/portfolio/{item_id}`** — soft pattern not needed; hard-delete the row and enqueue the underlying `media_asset` for GCS deletion (or mark `media_assets.deleted_at`).

Optionally extend `GET /workers/{id}` to include a `portfolio_preview` (first 3 public items with `read_url`) so the profile header renders without a second round-trip — mirror how reviews are summarised.

**Config flags** (docs/07 — add these)
- `portfolio_enabled` (flag) default **`true`**.
- `portfolio_max_items` default **`12`**.
- `portfolio_moderation_enabled` (flag) default **`false`** (permissive; when off, items are `approved` on create).
- `media_read_url_ttl_seconds` default **`600`** (shared with 6.8).

**Compliance notes**
Keep portfolio media in `media_assets`, **never** in `documents` — a job_photo proving a residence card must never accidentally surface in a public gallery. Captions are an anti-disintermediation (中抜き) surface: run the **server-authoritative** contact-mask filter on `caption` exactly like chat. Storage region `asia-northeast1`. These are voluntarily-public photos, so no special retention beyond delete-on-request, but strip EXIF/GPS on ingest (the upload pipeline in 6.8 handles this) to avoid leaking the worker's home location.

**Web integration**
Consumes: worker public profile `src/app/workers/[id]/page.tsx` (currently only `<Avatar size="lg">`) gets a gallery grid; the worker's own `src/app/profile/page.tsx` gets an "add/reorder/hide photo" manager reusing the existing `documents/upload-url` upload flow with `doc_type`→`purpose=portfolio`. No device-local stand-in existed for this (it was simply absent), so it's additive; regenerate types via `npm run gen:api`.

**Effort** — **M**. Sequence **after 6.8** (depends on `media_assets`). Within itself: migration → register/list endpoints → reorder/visibility → optional profile-embed preview.

---

### 6.8 Avatars / company logos (アバター・会社ロゴ)

**Why it's blocked on the backend**
There is no field anywhere for a user's avatar or a contractor's logo, and no storage/serving path for public profile imagery — the web app fakes identity entirely with the deterministic-initials `Avatar` component. Until the API stores and serves an image URL, every user is initials-only.

**Data model**

New table **`media_assets`** (the shared, public-serving image store — dependency for 1.8 too):

| column | type | constraints | notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `owner_user_id` | UUID | FK→`users.id`, not null | who uploaded it |
| `purpose` | enum(`avatar`,`company_logo`,`portfolio`) | not null | scopes how it may be served |
| `storage_path` | varchar | not null | GCS object path |
| `content_type` | varchar | not null | validated allow-list |
| `width` / `height` | int | null | filled by post-process |
| `byte_size` | int | null | enforce max |
| `state` | enum(`pending`,`ready`,`rejected`) | not null, default `pending` | `pending` until confirm+post-process |
| `deleted_at` | timestamptz | null | soft-delete → GCS lifecycle reaps |
| `created_at` / `updated_at` | timestamptz | not null | |

Changed tables (pointer columns, nullable — safe to retrofit):
- `worker_profiles.avatar_media_id` UUID FK→`media_assets.id` null.
- `contractor_profiles.avatar_media_id` UUID FK→`media_assets.id` null (the contact person's avatar).
- `contractor_profiles.logo_media_id` UUID FK→`media_assets.id` null (company logo).

Indexes: `media_assets(owner_user_id, purpose)`; partial index `WHERE deleted_at IS NULL`.

Alembic outline — **upgrade**: create enums `media_purpose`, `media_state`; create `media_assets`; add the three nullable FK columns. **downgrade**: drop the FK columns, drop `media_assets`, drop enums. Backfill is a no-op (all start null → initials fallback).

**API endpoints**

Reuse the existing two-step upload, but on the **media** namespace (separate signed-URL minter so the bucket/prefix and post-processing differ from compliance docs):

- **POST `/api/v1/media/upload-url`** — Role: **worker/contractor**. Request: `{ purpose: 'avatar'|'company_logo'|'portfolio', content_type: str }`. Response: `{ upload_url, storage_path, method, headers, media_asset_id }` (same shape as `UploadUrlOut` plus `media_asset_id`; the row is created in `pending`). Validation: `content_type` ∈ `media_allowed_content_types`; `company_logo` only allowed for contractors.
- **POST `/api/v1/media/{media_asset_id}/confirm`** — Role: owner. Empty body. Server stat()s the object, enforces `media_max_bytes`, decodes dimensions, **strips EXIF/GPS**, generates a square thumbnail, sets `state=ready`. Returns `MediaAssetOut`: `{ id, purpose, read_url, width, height, state }`.
- **PATCH `/api/v1/workers/me`** / **PATCH `/api/v1/contractors/me`** — extend the existing self-edit bodies with `avatar_media_id?`, and for contractors `logo_media_id?`. Server verifies the asset is owned, `state=ready`, and `purpose` matches the slot (avatar slot rejects a `company_logo` asset, 422 `media.purpose_mismatch`). Setting a new one orphans the old (soft-delete).
- **Read path**: `GET /workers/{id}`, `GET /contractors/{id}`, applicant lists, chat participant headers, etc. gain `avatar_url` / `logo_url` (nullable signed read URLs, short TTL). When null, clients fall back to initials.

**Config flags** (docs/07 — add)
- `avatars_enabled` (flag) default **`true`**.
- `company_logos_enabled` (flag) default **`true`**.
- `media_allowed_content_types` default **`["image/jpeg","image/png","image/webp"]`**.
- `media_max_bytes` default **`5_000_000`** (5 MB).
- `media_read_url_ttl_seconds` default **`600`** (shared with 1.8).

**Compliance notes**
Avatars/logos are public by design — keep them in a **separate GCS bucket/prefix** from `documents` so compliance retention policy on residence cards never entangles public imagery. **Strip EXIF/GPS on confirm** (avatars are face/selfie-shaped and could leak location). No My Number / ID surface here. Region `asia-northeast1`. Avatars are *not* identity verification — the residence-card/visa gate is unaffected and must not read from this table.

**Web integration**
The `Avatar` component (`src/components/Avatar.tsx`) keeps its initials logic as the **fallback** and gains an optional `src` prop: render the image when `avatar_url` is present, else current behaviour. Contractor pages (`src/app/contractors/[id]/page.tsx`, `post-job`, job cards) render `logo_url`. Profile editors (`src/app/profile/page.tsx`) get an upload control. No device-local stand-in to migrate (initials were always computed, never stored); just thread the new nullable URLs through.

**Effort** — **M**. Foundational — **build first** in this group (1.8 depends on it). Sequence: migration + `media_assets` → upload-url/confirm + post-process → wire avatar/logo into profile reads → web `Avatar` `src`.

---

### 6.9 Map view for jobs (地図表示 / geocoded job locations)

**Why it's blocked on the backend**
`jobs` stores only `prefecture` / `area` / free-text `address` — no coordinates — so the web app cannot plot jobs on a map without client-side geocoding (rate-limited, inconsistent, and it would leak the exact site address pre-confirmation, violating anti-disintermediation/privacy). Geocoding and a privacy-aware coarse location must be computed server-side.

**Data model**

Changed table **`jobs`** — add geocoding columns (all nullable; backfilled by a job):

| column | type | constraints | notes |
|---|---|---|---|
| `geocode_lat` | numeric(9,6) | null | exact, **never** returned pre-confirm |
| `geocode_lng` | numeric(9,6) | null | exact |
| `coarse_lat` | numeric(8,4) | null | snapped/jittered to ~`map_coarse_grid_meters`; safe to show publicly |
| `coarse_lng` | numeric(8,4) | null | |
| `geocode_precision` | enum(`exact`,`area`,`prefecture`,`failed`) | null | provenance of the coords |
| `geocode_source` | varchar | null | e.g. `vertex_geocode`/`google_geocoding`/`manual` |
| `geocoded_at` | timestamptz | null | |

(Optional, normalised alternative: a `job_geocodes` 1:1 side table if you prefer not to widen `jobs`; either is fine — widening is simpler and matches the existing flat `jobs` row.)

Indexes: a spatial-ish lookup index on `(coarse_lat, coarse_lng)` for viewport queries (PostGIS not required in P1; a btree on the two coarse columns + a bounding-box filter is sufficient). If PostGIS is later adopted, add a `geography(Point)` generated column.

Alembic outline — **upgrade**: add the seven columns + enum `geocode_precision`, add the coarse index. Backfill via a one-off management command / nightly job that geocodes existing `open` jobs (don't block the migration on network calls). **downgrade**: drop index, columns, enum.

**Geocoding pipeline**: on `POST /jobs` and on address-changing `PATCH /jobs/{id}`, enqueue (or inline, behind a timeout) a geocode. Resolution order, most→least precise: full `address` → `area`+`prefecture` → `prefecture` centroid → `failed`. `coarse_*` is always derived by snapping the best result to a grid and applying a deterministic per-job jitter so the marker never sits exactly on the gate. Use **Vertex AI Gemini** only if free-text address parsing/normalisation is needed (cheaper than Claude, per ADR-0005); the actual lat/lng comes from a geocoding provider — pin provider + key in config, not hardcoded.

**API endpoints**

- **GET `/api/v1/jobs`** — extend the existing search response so each `JobOut` carries `coarse_lat`, `coarse_lng`, `geocode_precision` (never the exact pair). Add optional **viewport filter** params: `bbox=minLng,minLat,maxLng,maxLat` (or `near_lat/near_lng/radius_km`) layered onto the existing trade/prefecture/wage/date filters — same endpoint, no new surface, so saved searches and the map share one query.
- **GET `/api/v1/jobs/{id}`** — returns `coarse_*` to any approved viewer; returns **exact** `geocode_lat/lng` **only** when the caller has a `confirmed`+ matching for that job (worker) or owns the job (contractor). Gate identical in spirit to address-masking.
- **GET `/api/v1/jobs/map`** *(optional, recommended)* — a lightweight clustered endpoint: same filters, returns `{ clusters:[{ coarse_lat, coarse_lng, count, sample_job_ids }], items:[...] }` for the current viewport, capped at `map_max_markers`. Keeps the full job payload off the wire when zoomed out.
- **POST `/api/v1/jobs/{id}/regeocode`** *(admin)* — manual re-run / override (set `geocode_source=manual`), for the vetting/ops case where auto-geocode failed.

**Tiles/provider**: the API does **not** proxy tiles. The web client uses an OSS map lib (MapLibre GL) against a tile provider; the provider style URL + key is delivered to the client via a small **`GET /api/v1/config/public`** (or embedded in the existing config bootstrap) so the key isn't baked into the bundle and can rotate. Provider choice (MapTiler / Google / OSM-based) is config, not code.

**Config flags** (docs/07 — add)
- `map_enabled` (flag) default **`true`**.
- `map_tile_provider` default **`"maptiler"`** ; `map_tile_style_url` default null (set per env); `map_tile_api_key` via Secret Manager (never in `app_config`/repo).
- `map_coarse_grid_meters` default **`750`** (how coarse the public marker is).
- `map_coarse_jitter_meters` default **`200`** (deterministic per-job offset).
- `map_max_markers` default **`300`**.
- `geocoding_provider` default **`"google"`**, `geocoding_enabled` flag default **`true`**, `geocoding_timeout_ms` default **`4000`**.

**Compliance notes**
This is a **privacy + anti-disintermediation (中抜き)** feature. The exact site address/coords are the contractor's asset and a bypass risk; **exact `geocode_lat/lng` is gated server-side** to confirmed participants only — clients must never receive it otherwise, mirroring `address` masking (docs/08). Public markers use `coarse_*` (grid-snapped + jittered) so a worker can judge commute distance without pinpointing the gate. Geocoding queries (which contain addresses) must not be logged with PII; keep them in `asia-northeast1`. No bearing on the visa gate.

**Web integration**
New map view toggle on `src/app/jobs/page.tsx` (list ⇄ map), sharing the existing filter state; markers from `coarse_*`; tapping a marker opens the job detail. `src/app/jobs/[id]/page.tsx` shows a precise mini-map **only** post-confirmation (when the API returns exact coords). There is no device-local stand-in to migrate (no map exists today); the masked `address` UX already in place is the precedent to follow. Regenerate types.

**Effort** — **L**. Sequence: migration + geocode pipeline + backfill → coarse fields on list/detail with the confirm-gate → viewport/cluster endpoint → public-config key delivery → web MapLibre integration. The privacy gate and coarse-snapping are the load-bearing parts — test them first.

---

### 6.11 Offline-first caching (オフライン対応 / last-viewed jobs & matchings)

**Why it's blocked on the backend**
The current service worker (`public/sw.js`) is a naive stale-while-revalidate that **explicitly skips `/api`** (`pathname.startsWith("/api")` → return), so no job/matching data survives going offline; and `OfflineBanner` only detects connectivity. True offline-first needs (a) cache-safe, owner-scoped read endpoints with validators, and (b) a way to know data is stale. Most of this is a **client/SW** change, but it's "blocked" on a small set of **backend cache-contract** guarantees and one snapshot endpoint.

**Data model**
No new tables required. Backend changes are **HTTP-contract**, not schema:
- Ensure GET read endpoints that back the offline set (`/jobs/{id}`, `/matchings/mine`, `/matchings/{id}`, `/me`, `/workers/{id}`, `/contractors/{id}`) emit **`ETag`** and **`Last-Modified`**, honour **`If-None-Match`** (→ `304`), and set explicit, **private** `Cache-Control: private, max-age=0, must-revalidate` so the SW caches deliberately rather than guessing. Add `updated_at`-derived `ETag` (cheap; most rows already have `updated_at`).
- Optional convenience snapshot (below) to warm the cache in one request.

**API endpoints**

- **GET `/api/v1/me/offline-bootstrap`** *(optional but recommended)* — Role: any approved. Returns a single owner-scoped snapshot the SW can pre-cache on login / app focus: `{ me, active_matchings:[…], upcoming_jobs:[…], unread_count, server_time, generated_at }`. Strictly **read-only, owner-scoped, no contact info** (the chat masking rules mean message bodies, if included, are already filtered). Carries its own `ETag`. This replaces N cold fetches with one and gives the SW a deterministic "offline set."
- **Contract guarantees on existing GETs** (no new paths): conditional-request support (`ETag`/`If-None-Match`/`304`) and a stable `server_time` header so the client can show "last updated X前 / ago".
- **No write replay on the server.** Offline mutations (apply, check-in, send-message) are **queued client-side** and replayed when online through the *existing* POST endpoints, which are the authoritative validators (visa gate, masking, state machine). The backend's only obligation is that these POSTs are safe to retry — so add/confirm **idempotency**: accept an `Idempotency-Key` header on `POST /jobs/{id}/apply`, `/matchings/{id}/check-in`, `/matchings/{id}/messages`, `/matchings/{id}/complete-request`, dedupe within `idempotency_key_ttl`. (Store keys in a small `idempotency_keys(key, user_id, response_hash, created_at)` table — the one optional schema add.)

**Config flags** (docs/07 — add)
- `offline_mode_enabled` (flag) default **`true`**.
- `offline_bootstrap_enabled` (flag) default **`true`**.
- `offline_cache_ttl_seconds` default **`86400`** (how long the SW trusts cached reads before showing a "stale" badge).
- `offline_max_cached_jobs` default **`50`**, `offline_max_cached_matchings` default **`50`**.
- `idempotency_key_ttl_seconds` default **`86400`**.

**Compliance notes**
Offline caching means **PII at rest in the browser** (job addresses, names, masked chat). Mandate `Cache-Control: private` so shared/CDN caches never store it; **purge the SW caches and IndexedDB queue on logout/account-switch** (tie to the existing device/session revoke flow — when a device is revoked via the devices endpoint, the client must clear). **Never cache the exact-address/exact-coords payload** (6.9): the offline set uses the masked/coarse variant only. Never cache `documents`/`media` signed URLs beyond their TTL (they'd 403 anyway). Masking stays server-authoritative; cached message bodies are already filtered, so offline view is safe.

**Web integration**
- `public/sw.js` graduates from skip-`/api` to a deliberate strategy: **network-first with cache fallback** for the offline-set GETs (keyed by URL, validated by `ETag`), **cache-first** for static/app-shell, **never cache** writes. Store the offline set in **Cache Storage**; store the **replay queue** in IndexedDB.
- `OfflineBanner` (`src/components/OfflineBanner.tsx`) gains "showing cached data from X前" using `offline_cache_ttl_seconds` + `generated_at`.
- The existing device-local `storage.ts` layer is *unchanged* (it's for prefs/drafts) — this is a separate cache tier. Drafts already in `crafton:job-draft` become the natural offline write buffer for post-job; the apply/check-in/message queue is new IndexedDB.
- Pre-cache via `me/offline-bootstrap` on login and on `visibilitychange→visible`.

**Effort** — **M** (mostly web/SW; backend slice is **S**). Sequence: backend `ETag`/`304` + `Idempotency-Key` on the four POSTs (S, do first — unblocks safe retry) → `offline-bootstrap` snapshot → SW rewrite (network-first + IndexedDB replay queue) → stale-badge UX + logout cache-purge wiring.

---

**Cross-cutting build order for this group:** **6.8 (`media_assets`) → 1.8 (portfolio) → 6.9 (maps) → 6.11 (offline)**. 6.8 is the storage foundation 1.8 reuses; 6.9 and 6.11 are independent of the media work but 6.11's privacy guarantee depends on 6.9's coarse/exact split existing first.

Relevant files for the implementer: data model `/home/user/CraftOn-infra/docs/05-data-model.md`, config registry `/home/user/CraftOn-infra/docs/07-config-and-flags.md`, compliance `/home/user/CraftOn-infra/docs/08-compliance-legal.md`, API contract `/home/user/CraftOn-infra/docs/06-api-contract.md`; web consumers `/home/user/CraftOn-web/src/components/Avatar.tsx`, `/home/user/CraftOn-web/src/app/workers/[id]/page.tsx`, `/home/user/CraftOn-web/src/app/jobs/page.tsx`, `/home/user/CraftOn-web/public/sw.js`, `/home/user/CraftOn-web/src/components/OfflineBanner.tsx`, `/home/user/CraftOn-web/src/lib/storage.ts`.

---

## Monetization & growth

> Cross-cutting note: all five features depend on a shared **billing substrate** (charges, invoices, ledger) and a **`payments_enabled`-style** family of flags. Where they overlap I define the shared tables once (in 7.4) and reference them. All money is integer JPY; all amounts read via `ConfigService`; every user-facing string (statement labels, reward names, plan names) is an i18n catalog key added to both `app/locales/ja.json` and `en.json`. Following existing patterns: signed-URL downloads reuse the `documents/upload-url` mechanism; admin reconciliation reuses the `admin/matchings/{id}/mark-fee-paid` manual-settlement pattern (Phase 1 has no live PSP — `payments_enabled=false` by default, so billing is **record-and-reconcile**, not auto-charge).

---

### 7.1 Featured / boosted job postings (paid placement; ranking; billing)

**Why it's blocked on the backend**
The job-search ranking and the `GET /jobs` ordering are computed server-side, and a paid boost must record a billable charge plus an audit-safe placement window — neither ordering authority nor a charge ledger exists client-side. localStorage cannot make a job appear higher for *other* users.

**Data model**

New table `job_boosts`:
| column | type | constraints | notes |
|---|---|---|---|
| id | UUID | PK | |
| job_id | UUID | FK→jobs.id, not null | |
| contractor_id | UUID | FK→users.id, not null | denormalized owner for authZ + billing |
| tier | enum | not null | `standard` \| `premium` (config-priced) |
| status | enum | not null, default `pending_payment` | `pending_payment` \| `active` \| `expired` \| `canceled` \| `refunded` |
| starts_at | timestamptz | not null | UTC |
| ends_at | timestamptz | not null | UTC; window length from config |
| price_jpy | integer | not null | snapshot of price at purchase (never floats) |
| charge_id | UUID | FK→charges.id, null | links to billing ledger (see 7.4) |
| boost_weight | int | not null | snapshot of ranking weight at purchase |
| created_at / updated_at | timestamptz | not null | |

Indexes: `job_boosts (job_id)`, `job_boosts (status, ends_at)` (sweeper), partial index `WHERE status='active'` for the search join. Constraint: `CHECK (ends_at > starts_at)`; partial-unique `(job_id) WHERE status='active'` so a job has at most one live boost.

Alembic outline — **upgrade**: create `boost_tier`, `boost_status` enums; create `job_boosts` with FKs/indexes/checks. **downgrade**: drop table then enums (guard the `charges` FK — it's nullable, so drop FK first if `charges` not yet present).

**API endpoints**

`POST /api/v1/jobs/{id}/boost` — **contractor (owner of job)**.
Request: `{ tier: "standard"|"premium" }`. Response `BoostOut`: `{ id, job_id, tier, status, starts_at, ends_at, price_jpy, charge_id }`.
Rules: job must be `open` and owned by caller; reject if a boost is already `active` (409 `boost_already_active`); price + window + weight resolved from config and **snapshotted**; creates a `charge` (kind `job_boost`) and a boost in `pending_payment`. When `payments_enabled=false`, status flips to `active` immediately and the charge is `pending` (reconciled by admin) — mirrors the manual fee flow.

`GET /api/v1/jobs/{id}/boost` — **owner contractor / admin**. Returns current/last `BoostOut` or 404.
`POST /api/v1/jobs/{id}/boost/cancel` — **owner contractor / admin**. Sets `canceled`; pro-rata refund intent recorded as a credit `charge` only if `payments_enabled` (else no-op note). 
`GET /api/v1/admin/boosts` — **admin**. Filters `status`, `contractor_id`; for reconciliation.

Ranking change (no new endpoint): `GET /jobs` default sort gains a leading key — active-boost first, ordered by `tier` then `boost_weight`, then the existing sort within each band. Boosted results carry `is_boosted: true` and (config-gated) a `PR`/広告 label field `boost_label_key` so paid placement is disclosed. Explicit user sorts (wage/date) still apply *within* the boost band only if `boost_respects_sort=false`; default keeps boosted-on-top.

**Config flags** (docs/07)
- `boosted_jobs_enabled` = `false` (gate; Phase-3-style).
- `boost_price_standard_jpy` = `2000`, `boost_price_premium_jpy` = `5000`.
- `boost_duration_days` = `7`.
- `boost_weight_standard` = `100`, `boost_weight_premium` = `300`.
- `boost_max_active_per_contractor` = `null` (no cap).
- `boost_disclosure_label_enabled` = `true` (show 広告/PR label — keep ON for ad-disclosure compliance).

**Compliance notes**
Paid placement must be **disclosed** (景表法 / ad-labeling): keep `boost_disclosure_label_enabled` ON. Boost does not bypass the visa gate, contact masking, or service-area enforcement — a boosted job is still subject to all gates. No anti-中抜き impact (boost is contractor↔platform). No PII.

**Web integration**
Consumed by **post-job / my-jobs** screens (a "目立たせる / Boost" CTA per job) and surfaced visually in the worker **jobs** list (boosted card styling + 広告 label). No prior localStorage stand-in; this is net-new paid surface. The existing client-only "job templates" remain separate (see 7.3 insights for analytics).

**Effort** — **M**. Sequence: (1) billing substrate from 7.4 (charges) → (2) `job_boosts` + boost endpoints → (3) ranking join + label → (4) admin reconcile + expiry sweeper.

---

### 7.2 Referral program (invite codes for workers & contractors; rewards; anti-abuse)

**Why it's blocked on the backend**
Invite codes must be globally unique, attributed at signup (which happens in `/auth/session`), and rewards must be granted only on a server-verified qualifying event (first completed matching) with fraud checks across accounts/devices — none of which device-local storage can enforce or even observe.

**Data model**

`referral_codes`:
| column | type | constraints |
|---|---|---|
| id | UUID | PK |
| owner_user_id | UUID | FK→users.id, not null |
| code | varchar(12) | unique, not null (uppercase, ambiguity-free alphabet) |
| audience | enum | `worker` \| `contractor` \| `any` (default `any`) |
| is_active | boolean | default true |
| max_uses | int | null (= unlimited; config cap applied at check time) |
| uses_count | int | default 0 |
| created_at | timestamptz | not null |

`referrals` (one row per invited signup):
| column | type | constraints |
|---|---|---|
| id | UUID | PK |
| code_id | UUID | FK→referral_codes.id, not null |
| referrer_user_id | UUID | FK→users.id, not null (denormalized) |
| referee_user_id | UUID | FK→users.id, unique, not null (a user can be referred once) |
| status | enum | `attributed` \| `qualified` \| `rewarded` \| `rejected_fraud` (default `attributed`) |
| qualifying_matching_id | UUID | FK→matchings.id, null |
| signup_ip_hash | varchar | null (hashed, not raw — APPI) |
| signup_device_id | varchar | null (from devices table, for collision checks) |
| created_at / qualified_at / rewarded_at | timestamptz | null |

`referral_rewards` (ledger of granted rewards; both sides):
| column | type | constraints |
|---|---|---|
| id | UUID | PK |
| referral_id | UUID | FK→referrals.id |
| beneficiary_user_id | UUID | FK→users.id |
| beneficiary_role | enum | `referrer` \| `referee` |
| reward_kind | enum | `account_credit` \| `fee_waiver` (config) |
| amount_jpy | integer | not null |
| credit_id | UUID | FK→credits.id, null (see 7.4 wallet/credit ledger) |
| status | enum | `granted` \| `void` |
| created_at | timestamptz | |

Indexes: unique `referral_codes(code)`, unique `referrals(referee_user_id)`, `referrals(referrer_user_id, status)`, `referrals(signup_device_id)`, `referral_rewards(beneficiary_user_id)`.

Alembic outline — **upgrade**: enums + three tables + `referrals.referee_user_id` unique + device/IP-hash indexes. **downgrade**: drop rewards → referrals → codes → enums (order matters for FKs). No change to `users` (attribution stored relationally, not on the user row).

**API endpoints**

`GET /api/v1/referrals/my-code` — **worker/contractor**. Lazily creates and returns the caller's code. Response `ReferralCodeOut`: `{ code, audience, share_url, uses_count, max_uses, rewards_summary:{pending_jpy,earned_jpy} }`. `share_url` built from config base + code.

`POST /api/v1/auth/session` — **extended, not new**. Accept optional `{ referral_code }` on first-login user creation. Server validates code (active, audience matches new user_type, self-referral blocked, not already referred), writes a `referrals` row in `attributed`, increments `uses_count`. Invalid code never blocks signup — it's recorded as ignored (soft-fail) to avoid griefing.

`GET /api/v1/referrals/mine` — **worker/contractor**. List of `ReferralOut` `{ referee_display_name_masked, status, created_at, reward_jpy }` (referee identity minimised — masked display name only).

`POST /api/v1/admin/referrals/{id}/resolve` — **admin**. Body `{ action: "approve_reward"|"reject_fraud", note }`. Manual override for flagged referrals.

Qualifying event (internal, no public endpoint): on `approve-completion` → `completed`, a hook checks if the worker/contractor's `referrals` row is `attributed` and this is their **first** completed matching → transition to `qualified`, run anti-abuse checks, and if clean grant `referral_rewards` to both sides (transition `rewarded`). Rewards are **credits** (see 7.4), redeemed against platform fees — not cash payouts in Phase 1.

**Config flags** (docs/07)
- `referrals_enabled` = `false`.
- `referral_reward_referrer_jpy` = `1000`, `referral_reward_referee_jpy` = `1000`.
- `referral_reward_kind` = `account_credit`.
- `referral_max_uses_per_code` = `null` (unlimited; cap later).
- `referral_qualify_event` = `first_completed_matching`.
- `referral_min_account_age_hours` = `0` (permissive; raise to fight farming).
- `referral_block_same_device` = `true`, `referral_block_same_payout_target` = `true` (anti-abuse, keep ON).

**Compliance notes**
Anti-abuse must prevent self-dealing that effectively becomes a 中抜き discount funnel: block same-device / same-IP-hash referrer↔referee, block self-referral, one-referral-per-referee. Store **hashed** IP/device (APPI minimisation), never raw. Referrals never weaken the visa gate — a referred non-JP worker still cannot qualify (reach `completed`) without a valid visa, which naturally gates the reward. Reward as platform-fee credit avoids money-transmission/賞金 regulatory exposure vs. cash. Referee identity exposed to referrer is masked.

**Web integration**
Consumed by a new **"友達紹介 / Invite"** entry in onboarding/profile and a referral panel under account settings. The signup flow passes `referral_code` (from deep link / share URL) into `/auth/session`. No localStorage stand-in existed; this is server-only by nature (cross-account attribution).

**Effort** — **M/L**. Sequence: (1) credits ledger from 7.4 → (2) codes + `/auth/session` attribution → (3) qualifying hook on completion + anti-abuse → (4) admin resolve + dashboards.

---

### 7.3 Subscription tiers for contractors (volume hiring, insights, priority support; billing)

**Why it's blocked on the backend**
Entitlements (volume-hire caps, insights access, priority flags) must gate server behavior on every job-post / search / support request, and recurring billing + plan state are inherently cross-device server state. The existing `subscriptions_enabled` flag and `subscription_management_monthly` config exist in docs/07 but have no tables or enforcement.

**Data model**

`subscription_plans` (config-seeded catalog, admin-editable):
| column | type | constraints |
|---|---|---|
| id | UUID | PK |
| code | varchar | unique (`free`,`pro`,`enterprise`) |
| name_key | varchar | i18n catalog key (not raw text) |
| price_monthly_jpy | integer | not null |
| entitlements | jsonb | not null (e.g. `{insights:true, priority_support:true, boost_credits_monthly:2, active_job_cap:null, fee_discount_rate:0}`) |
| is_active | boolean | default true |
| sort_order | int | |

`contractor_subscriptions`:
| column | type | constraints |
|---|---|---|
| id | UUID | PK |
| contractor_id | UUID | FK→users.id, unique (one live plan per contractor), not null |
| plan_id | UUID | FK→subscription_plans.id, not null |
| status | enum | `active` \| `past_due` \| `canceled` \| `trialing` (default `active`) |
| current_period_start / current_period_end | timestamptz | not null (UTC; billing in Asia/Tokyo month boundaries) |
| cancel_at_period_end | boolean | default false |
| external_subscription_id | varchar | null (PSP handle when live) |
| created_at / updated_at | timestamptz | |

`subscription_invoices` → use the shared `invoices` table (7.4) with `kind='subscription'`.
Indexes: unique `contractor_subscriptions(contractor_id)`, `contractor_subscriptions(status, current_period_end)` for the renewal sweeper.

Alembic outline — **upgrade**: enum `subscription_status`; `subscription_plans` + seed default rows in a data-migration (free/pro/enterprise from config); `contractor_subscriptions`. **downgrade**: drop subscriptions table, plans table, enum.

**API endpoints**

`GET /api/v1/subscription/plans` — **contractor**. List active `PlanOut` `{ code, name_key, price_monthly_jpy, entitlements }`.
`GET /api/v1/subscription/me` — **contractor**. Current `SubscriptionOut` `{ plan, status, current_period_end, cancel_at_period_end, entitlements_effective }`. Defaults to synthetic `free` plan if none.
`POST /api/v1/subscription/subscribe` — **contractor**. Body `{ plan_code }`. Creates/upgrades subscription; generates a `subscription` invoice + charge (7.4). With `payments_enabled=false`, activates immediately, invoice `pending`.
`POST /api/v1/subscription/cancel` — **contractor**. Body `{ at_period_end: true }`. Sets `cancel_at_period_end` or immediate `canceled`.
`GET /api/v1/contractors/me/insights` — **contractor, entitlement-gated**. Aggregated analytics `InsightsOut` `{ jobs_posted, fill_rate, median_time_to_fill_minutes, avg_worker_rating, repeat_worker_rate, spend_jpy, period }`. Returns 403 `insufficient_plan` if plan lacks `insights`. Server-computed aggregates over the contractor's own jobs/matchings/reviews.
`GET /api/v1/admin/subscriptions` — **admin**. Reconciliation/oversight.

Entitlement enforcement (cross-cutting): an `entitlements(contractor)` resolver merges plan jsonb + config. `POST /jobs` checks `active_job_cap`; `platform_fee` computation applies `fee_discount_rate`; boost (7.1) consumes `boost_credits_monthly`; a `priority_support` flag tags support/notification routing. **Priority support** is modeled minimally as a boolean entitlement surfaced to admin queues (no separate ticketing system in Phase 1).

**Config flags** (docs/07)
- `subscriptions_enabled` = `false` (already exists — wire it).
- Reuse `subscription_management_monthly` = `29800` as the `enterprise`/management seed price.
- `subscription_plan_pro_monthly_jpy` = `9800`, `subscription_default_plan_code` = `free`.
- `subscription_trial_days` = `0` (permissive default).
- `insights_min_matchings` = `5` (suppress small-sample analytics — privacy/noise).

**Compliance notes**
Insights are **own-data aggregates** only; never expose another contractor's data or worker-level PII below a k-anonymity floor (`insights_min_matchings`) — protects worker identity under APPI. Subscriptions do not buy any bypass of visa gate, masking, or anti-中抜き. `fee_discount_rate` reduces the *platform* fee, not worker wage, so it can't be used to undercut workers.

**Web integration**
Consumed by a **billing/plan** screen (new) and gates the contractor **insights/dashboard** screen. The current device-local **"job templates"** stand-in is reframed: templates stay client-side, but template-driven volume posting becomes meaningful only with `active_job_cap` entitlements; the insights screen replaces any local mock metrics with `GET /contractors/me/insights`.

**Effort** — **L**. Sequence: (1) invoices/charges (7.4) → (2) plans + subscribe/cancel → (3) entitlement resolver wired into jobs/fees/boost → (4) insights aggregation → (5) renewal sweeper.

---

### 7.4 Invoicing & payout statements (downloadable statements; platform-fee transparency; JPY)

**Why it's blocked on the backend**
Invoices/statements aggregate authoritative server data (matchings, fees, boosts, subscriptions) into immutable, sequentially-numbered documents with signed-URL downloads — money records cannot be assembled or trusted client-side. This is also the **shared billing substrate** for 7.1–7.3 and 7.5.

**Data model** (shared substrate)

`charges` (immutable money events ledger; one row per billable action):
| column | type | constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK→users.id, not null (the payer; contractor in P1) |
| kind | enum | `platform_fee` \| `job_boost` \| `subscription` \| `referral_credit` \| `adjustment` |
| amount_jpy | integer | not null (negative = credit/refund) |
| currency | char(3) | default `JPY` (future-proof; always JPY in P1) |
| status | enum | `pending` \| `settled` \| `void` \| `refunded` (default `pending`) |
| source_matching_id | UUID | FK→matchings.id, null |
| source_boost_id / source_subscription_id | UUID | FK, null |
| settled_at | timestamptz | null |
| created_at | timestamptz | not null |

`credits` (account-credit wallet; referral rewards, refunds, plan boost-credits):
| column | type | constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK→users.id |
| amount_jpy | integer | not null (positive = grant; consumption recorded as paired negative row) |
| reason | enum | `referral` \| `refund` \| `promo` \| `consumed` |
| balance_after_jpy | integer | not null (running balance snapshot) |
| ref_charge_id | UUID | FK→charges.id, null |
| created_at | timestamptz | |

`invoices` (periodic, immutable, numbered):
| column | type | constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK→users.id, not null |
| invoice_number | varchar | unique, not null (`CRF-YYYYMM-000123`, gapless per config) |
| kind | enum | `monthly_statement` \| `subscription` \| `boost` |
| period_start / period_end | date | (Asia/Tokyo month) |
| subtotal_jpy / credits_applied_jpy / total_jpy | integer | not null |
| status | enum | `draft` \| `issued` \| `paid` \| `void` (default `draft`) |
| pdf_storage_path | varchar | null (rendered PDF object path) |
| issued_at / paid_at | timestamptz | null |
| created_at / updated_at | timestamptz | |

`invoice_lines`:
| column | type | constraints |
|---|---|---|
| id | UUID | PK |
| invoice_id | UUID | FK→invoices.id |
| charge_id | UUID | FK→charges.id, null |
| description_key | varchar | i18n key + jsonb params (not raw text) |
| amount_jpy | integer | not null |
| matching_id | UUID | FK, null (for fee-line traceability) |

Indexes: `charges(user_id, status)`, `charges(source_matching_id)`, unique `invoices(invoice_number)`, `invoices(user_id, period_start)`, `invoice_lines(invoice_id)`, `credits(user_id)`. Invoice numbering uses a dedicated Postgres sequence or `app_config`-backed counter to guarantee gapless numbers (税法/インボイス制度 requirement).

Alembic outline — **upgrade**: enums; `charges`, `credits`, `invoices`, `invoice_lines`; numbering sequence; **backfill** a `charge` per existing `matchings.platform_fee` (data-migration) so historical fees appear on statements; index creation. **downgrade**: drop lines → invoices → credits → charges → enums → sequence. Note: the existing `matchings.fee_status` stays as the operational truth; `charges` mirror it — keep them consistent via the approve-completion hook.

**API endpoints**

`GET /api/v1/invoices` — **contractor / admin (for any user via param)**. List `InvoiceOut` `{ id, invoice_number, kind, period_start, period_end, total_jpy, status, issued_at }`. Self-scoped for contractors.
`GET /api/v1/invoices/{id}` — **owner / admin**. Detail incl. `lines:[{description_key, params, amount_jpy, matching_id}]`, `subtotal_jpy`, `credits_applied_jpy`, `total_jpy`.
`GET /api/v1/invoices/{id}/download` — **owner / admin**. Returns `{ url, expires_at }` — a **signed Cloud Storage URL** to the rendered PDF (reuses the documents signed-URL pattern). PDF rendered on first request if absent. PDF shows platform-fee transparency: gross wage (informational), platform fee, credits, total payable.
`GET /api/v1/billing/summary` — **contractor**. Lightweight `{ current_period:{accrued_fee_jpy, boost_jpy, subscription_jpy}, credit_balance_jpy, unpaid_total_jpy }` for an in-app banner (fee transparency without a full PDF).
`POST /api/v1/admin/invoices/run` — **admin**. Body `{ period:"YYYY-MM" }`. Generates monthly statements from `charges` for all users with activity; idempotent (skip already-issued). Reuses `mark-fee-paid` semantics: `POST /api/v1/admin/invoices/{id}/mark-paid` transitions `issued`→`paid` and settles linked charges.

> **Payout statements**: in Phase 1, workers are paid in **cash on site** (per docs/08), so worker "payouts" are **informational statements** (record of completed jobs + wages), not platform-initiated transfers. Model `GET /api/v1/me/earnings-statement?period=YYYY-MM` — **worker** — returning completed matchings, wages, and a downloadable PDF, clearly labeled "現金支払い記録 / cash-paid record." Real payouts wait on `payments_enabled` (P2).

**Config flags** (docs/07)
- `invoicing_enabled` = `false`.
- `invoice_number_prefix` = `"CRF"`, `invoice_number_seq_per` = `month`.
- `invoice_pdf_enabled` = `true` (render PDFs).
- `statement_period` = `monthly`.
- Reuse `platform_fee_per_match` = `3000` as the fee line source of truth.
- `qualified_invoice_registration_no` = `null` (T番号/インボイス登録番号 — config when registered).

**Compliance notes**
インボイス制度 (qualified-invoice system): statements must carry the platform's registration number (`qualified_invoice_registration_no`) when issued — leave the field, populate at launch; flag exact format for 税理士 sign-off. Gapless sequential numbering for tax audit. **Platform-fee transparency** is the anti-中抜き counter-narrative: the statement makes the platform's cut explicit and bounded, reinforcing that value is added, not skimmed. No My Number on any statement. PDFs in Tokyo bucket, signed-URL only, retention policy; never log statement contents. Worker statements label cash payment to avoid implying a regulated money transfer.

**Web integration**
Consumed by a new **billing/statements** screen (contractor) and a **my-jobs/earnings** screen (worker). The existing fee figures shown ad-hoc in **my-jobs/matchings** get backed by `GET /billing/summary`. No localStorage stand-in (money was never client-trusted).

**Effort** — **L**, and it is the **dependency root** — build first. Sequence: (1) charges + credits + backfill → (2) invoices + lines + numbering → (3) PDF render + signed download → (4) admin run/mark-paid → (5) summary + worker earnings statement.

---

### 7.5 Ratings-driven ranking marketplace (top-rated workers surfaced; Vertex AI Gemini optional)

**Why it's blocked on the backend**
A "top-rated workers" surface requires aggregating reviews/completion/no-show signals across all matchings into a ranking and exposing a discovery endpoint the contractor browses — the web app has only its own slice and a device-local "favourite workers" list, never the cross-worker aggregate or authoritative ranking.

**Data model**

New table `worker_rankings` (materialized aggregate, refreshed by job; not source of truth):
| column | type | constraints |
|---|---|---|
| worker_id | UUID | PK, FK→users.id |
| trades | text[] | denormalized from worker_profile (for filterable ranking per trade) |
| prefecture | varchar | null (worker's primary area, for geo-relevant ranking) |
| reviews_count | int | not null default 0 |
| avg_rating | numeric(3,2) | not null default 0 |
| completed_count | int | not null default 0 |
| noshow_count | int | not null default 0 |
| reliability_score | numeric | not null (computed: Bayesian-smoothed rating × completion, penalized by no-show) |
| ai_rank_score | numeric | null (optional Vertex AI Gemini score; null when AI off) |
| is_featured | boolean | default false (top-N flag, config cutoff) |
| last_active_at | timestamptz | null |
| computed_at | timestamptz | not null |

Indexes: `worker_rankings(reliability_score DESC)`, GIN on `trades`, `worker_rankings(prefecture, reliability_score DESC)`, partial `WHERE is_featured`. This is **derived** — never authoritative; `reviews`/`matchings` remain source of truth. Extend `worker_profiles.trust_score` (already exists, docs/05) to be populated from `reliability_score` so the existing field becomes meaningful instead of static 0.

Alembic outline — **upgrade**: create `worker_rankings`; create a refresh function/job (or rely on app-layer recompute); no destructive change to `reviews`/`matchings`. **downgrade**: drop table (trust_score reverts to its prior default-0 behavior).

**API endpoints**

`GET /api/v1/workers/top` — **contractor (approved)**. Query: `trade?`, `prefecture?`, `limit` (default 20, config cap), `sort=reliability|rating|recent`. Response `TopWorkerOut[]`: `{ worker_id, display_name, trades, avg_rating, reviews_count, reliability_score, is_featured, badge_keys[] }`. Excludes suspended / visa-invalid workers. Contact details remain masked (discovery ≠ disintermediation channel).
`GET /api/v1/workers/{id}/ranking` — **any approved**. Single worker's public ranking card (rating, reliability, badges) — feeds the profile screen.
`POST /api/v1/admin/rankings/recompute` — **admin**. Triggers a full recompute (also runs on a schedule). Body `{ trade? }`. Idempotent.

**Vertex AI Gemini (optional, flag-gated):** when `ai_ranking_enabled=true`, a batch job sends **anonymized, structured aggregates only** (ratings distribution, completion/no-show counts, trade tags, review *tags* — never free-text PII, never names/contact) to Gemini (Vertex AI, asia-northeast1) to produce a tie-breaking `ai_rank_score` and human-readable `badge_keys` (e.g. `reliable_starter`, `repeat_hire_favorite`). Gemini is **advisory**: the deterministic `reliability_score` is primary; AI only re-orders within bands and never overrides the visa/suspension exclusions. When the flag is off, ranking is purely deterministic (cost-safe default, matching the "Gemini cheaper than Claude" ADR but still avoiding spend by default).

`reliability_score` formula (deterministic, in spec): Bayesian-smoothed rating `((C·m) + Σratings) / (C + reviews_count)` with prior `m=config.ranking_prior_rating`, weight `C=config.ranking_prior_weight`; multiplied by completion ratio; minus `noshow_count × config.ranking_noshow_penalty`. All terms config-driven.

**Config flags** (docs/07)
- `ratings_marketplace_enabled` = `false` (gate the `/workers/top` surface).
- `ai_ranking_enabled` = `false` (Gemini off by default — cost + privacy).
- `ranking_prior_rating` = `3.5`, `ranking_prior_weight` = `5` (Bayesian smoothing of small samples).
- `ranking_noshow_penalty` = `0.5`.
- `ranking_min_reviews_to_feature` = `3`, `ranking_featured_top_n` = `50`.
- `ranking_recompute_interval_minutes` = `60`.

**Compliance notes**
Discovery must not become a 中抜き vector: `/workers/top` exposes profile + ratings but **no contact info**; contractors still go through apply/confirm to reach a worker, and chat masking stays authoritative. Ranking must **exclude visa-invalid / suspended** workers (visa gate respected at query time, not just at approval). AI input is **anonymized aggregates only** — no names, no contact, no residence-card data, no free-text comments with PII; keep `ai_ranking_enabled` off unless reviewed. Surfacing only positive top-N avoids publishing a punitive "low-rated" list (worker-fairness / APPI reputation risk). Featuring is rating-earned, not paid — keep it distinct from 7.1 boosts to preserve trust (and disclose if the two are ever mixed).

**Web integration**
Consumed by a new contractor **"おすすめ職人 / Top workers"** discovery screen and enriches existing **worker profile** cards (badges, reliability). The device-local **"favourite workers"** stand-in migrates to a real `favorite_workers` capability: keep the existing client list but back it by a small server table (or fold into a future bookmarks endpoint) so "favourites + ranking" sync cross-device; in the meantime the local list can pre-seed the server on first sync. The contractor applicant-review screen can sort applicants by `reliability_score`.

**Effort** — **M** deterministic / **L** with Gemini. Sequence: (1) `worker_rankings` + deterministic recompute + populate `trust_score` → (2) `/workers/top` + profile ranking + visa/suspension exclusion → (3) admin recompute + scheduler → (4) optional Gemini `ai_rank_score` + badges behind the flag.

---

**Build order across the group:** 7.4 billing substrate (charges/credits/invoices) first — it unblocks 7.1 (boost charges), 7.2 (referral credits), 7.3 (subscription invoices). 7.5 is independent of billing and can proceed in parallel. Every new flag defaults OFF (or cost-safe), every price/weight/threshold flows through `ConfigService`, and every label/plan-name/badge/statement-line is an i18n key added to both `ja.json` and `en.json` in the same change.

---

## Platform & scale

These four features share one backbone: the current list endpoints (`/jobs`, `/applications/mine`, `/matchings/mine`, etc.) return bare `list[...]` with `limit`/`offset` query params and a stable total ordering already in place (`_job_ordering` ends every sort on `Job.id` as a unique tiebreaker). That stable-sort discipline is the prerequisite for everything below: cursors, aggregation windows, and recommendation ranking all assume a total order.

---

### 6.6 Server-side pagination / infinite scroll (cursor + envelope across list endpoints)

**Why it's blocked on the backend**
List endpoints return raw `list[...]` with no total count or continuation token, so the web app cannot do reliable infinite scroll (offset paging skips/repeats rows when new jobs are posted mid-scroll, and there is no "has more" signal). A server-issued opaque cursor is the only correct fix.

**Data model**
No new tables. This is an envelope + keyset-pagination change, not storage.

- Add a reusable generic response envelope (Pydantic, not DB): `Page[T]` with `items: list[T]`, `next_cursor: str | None`, `has_more: bool`, and optional `total: int | None` (only populated when cheap/requested — see rules).
- The **cursor is opaque**: base64url of a compact JSON `{"k": [<sort-key values>], "id": "<uuid>"}` plus a short HMAC tag (key from `SECRET_KEY` env) so clients can't forge/scan. It encodes the *exact* `ORDER BY` tuple of the last row returned, mirroring `_job_ordering`'s `(sort_cols…, id)` shape. This is keyset/seek pagination, so it is O(rows-returned) regardless of depth and immune to insert drift.
- Indexes: keyset paging needs the leading sort columns to be index-covered. Add composite indexes matching each list's default order, e.g. `ix_jobs_open_keyset_date (status, work_date, created_at, id)` and `ix_jobs_open_keyset_wage (status, daily_wage, work_date, id)`; `ix_applications_worker_created (worker_id, created_at, id)`; `ix_matchings_worker_created (worker_id, created_at, id)`. The existing `ix_jobs_status_work_date_prefecture` partially covers the default sort already.
- **Alembic migration outline** — *upgrade*: `create_index` for the keyset composite indexes above (use `CONCURRENTLY` via `op.create_index(..., postgresql_concurrently=True)` in a non-transactional migration to avoid locking large tables). *downgrade*: drop those indexes. No column changes, no data migration.

**API endpoints**
This is a cross-cutting change applied to existing list routes, not a new route. Pattern, using `GET /api/v1/jobs` as the exemplar:

- `GET /api/v1/jobs` — request query adds `cursor: str | None` and keeps `limit: int (1–100, default 20)`; `offset` is **deprecated but retained** for one release (ignored when `cursor` is present). Response shape changes from `list[JobOut]` to `Page[JobOut]` = `{ items: [JobOut], next_cursor, has_more, total: null }`. AuthZ unchanged (`approved_worker`). Rules: `cursor` and `sort` must be consistent — if a client sends a cursor minted under a different `sort`/filter set, reject `400 cursor_mismatch` (the cursor payload embeds a hash of the active sort+filters). `total` stays `null` for the open-jobs feed (count over a large filtered set is expensive); a client wanting a count passes `with_total=true` and accepts a capped `COUNT(*) … LIMIT 1000` "1000+" semantic.
- Apply identically to: `GET /jobs/mine`, `GET /jobs/saved`, `GET /applications/mine`, `GET /applications/{job_id}/applicants`, `GET /matchings/mine`, `GET /matchings/history`, `GET /reviews/...`, `GET /notifications`, and admin lists. For small owner-scoped lists (`/jobs/mine`, `/matchings/mine`) `with_total=true` is allowed and cheap.
- Schema field list — `Page[T]`: `items: list[T]`, `next_cursor: str | None`, `has_more: bool`, `total: int | None`. A shared `paginate_keyset(stmt, *, order_cols, cursor, limit)` service helper builds the `WHERE (cols…) > (cursor vals…)` row-comparison predicate, fetches `limit+1`, and mints `next_cursor`.

**Config flags** (docs/07)
- `pagination_default_limit` = `20`, `pagination_max_limit` = `100` (caps `limit`).
- `pagination_count_cap` = `1000` (ceiling for `with_total` counts).
- Feature flag `cursor_pagination_enabled` = `true` (lets ops fall back to legacy offset envelope per-env during rollout).

**Compliance notes**
None directly. One guardrail: the applicants list (`/applications/{job_id}/applicants`) and chat remain server-masked — pagination must not bypass the masking layer; keyset paging operates on already-authorized, already-masked serializers.

**Web integration**
Replaces the device-local "load more counter" pattern. Screens: jobs browse/search (infinite scroll), my-jobs, applications, matchings history, notifications. The web client switches from `?offset=` accumulation to "store `next_cursor`, append `items`, stop when `has_more=false`." Because the response shape changes (`list` → `{items,…}`), ship behind `cursor_pagination_enabled` and update the generated `schema.ts` (`npm run gen:api`) so `models.ts` reflects `Page<T>`.

**Effort** — **M.** Do this **first** in the group: the envelope + `paginate_keyset` helper + the stable-order indexes are the foundation the recommendation feed (1.4) and admin insights lists (2.8) build on. Sequence: (1) `Page[T]` + helper + indexes, (2) migrate `/jobs` + `/notifications`, (3) roll across remaining lists, (4) flip flag per env.

---

### 2.8 Hiring insights aggregation (fill rate, time-to-fill, applications-per-post, repeat-worker)

**Why it's blocked on the backend**
These metrics require GROUP BY/window aggregation across `jobs`, `applications`, and `matchings` that a device-local client cannot compute (it only ever sees one contractor's recently-fetched pages, not the full history). Time-to-fill especially needs server timestamps the client never holds.

**Data model**
Phase-1: **no new tables — aggregate on read** from existing rows. Definitions:
- **Fill rate (充足率)** = `filled_or_completed_headcount / requested_headcount` over a window. Numerator = count of `matchings` (excluding `canceled`/`noshow`) tied to the contractor's jobs; denominator = `SUM(jobs.headcount)`.
- **Time-to-fill (充足までの時間)** = per job, `first confirmed matching.created_at − job.created_at`, reported as median + p90 (seconds → rendered hours, Asia/Tokyo for any day bucketing).
- **Applications-per-post (応募数/件)** = `COUNT(applications) / COUNT(jobs)` over the window.
- **Repeat-worker rate (リピート率)** = share of this contractor's completed matchings whose `worker_id` has ≥2 completed matchings with the *same* contractor.

Indexes to make these cheap: `ix_jobs_contractor_created (contractor_id, created_at)` (the model already has `contractor_id` indexed; extend to composite), and reuse `ix_matchings_job_id` joined to jobs. If real usage shows the live aggregate is too slow, **Phase-2** adds a nightly **materialized rollup** table:
- `contractor_insights_daily`: `id UUID PK`, `contractor_id UUID FK→users.id`, `bucket_date date` (Asia/Tokyo day), `jobs_posted int`, `headcount_requested int`, `headcount_filled int`, `applications int`, `confirmed int`, `completed int`, `noshow int`, `time_to_fill_p50_sec int | null`, `time_to_fill_p90_sec int | null`, `repeat_completed int`, `created_at timestamptz`. Unique `(contractor_id, bucket_date)`; index `(contractor_id, bucket_date)`.

**Alembic migration outline** — *upgrade*: add the composite `ix_jobs_contractor_created`; (P2) `create_table contractor_insights_daily` + unique constraint + index. *downgrade*: drop index / drop table. No backfill needed for P1 (computed live); P2 rollup backfilled by a one-off management job, not a migration.

**API endpoints**
- `GET /api/v1/contractors/me/insights` — query: `date_from`, `date_to` (Asia/Tokyo dates; default last 90 days), `granularity: "summary"|"daily" = "summary"`. AuthZ: `approved_contractor`, **own data only** (no `{id}` form for contractors; admin uses the variant below). Response `InsightsOut`: `period: {from, to}`, `jobs_posted: int`, `headcount_requested: int`, `headcount_filled: int`, `fill_rate: float (0–1)`, `applications: int`, `applications_per_post: float`, `time_to_fill_p50_hours: float | null`, `time_to_fill_p90_hours: float | null`, `repeat_worker_rate: float (0–1)`, `noshow_count: int`, optional `daily: list[InsightsBucket]`. Rules: empty window → all-zero with `null` rates (avoid divide-by-zero); rates are computed, never stored as floats elsewhere (money stays integer JPY — insights expose no JPY revenue in P1 since `payments_enabled=false`).
- `GET /api/v1/admin/insights` — same shape, query adds optional `contractor_id` (omit = platform-wide totals). AuthZ: admin. Reuses the same aggregation service.

**Config flags** (docs/07)
- `insights_enabled` = `true` (read-only analytics; safe on).
- `insights_default_window_days` = `90`.
- `insights_repeat_min_jobs` = `2` (threshold defining a "repeat" worker).
- `insights_rollup_enabled` = `false` (P1 computes live; flip on when the nightly job lands).

**Compliance notes**
- Aggregates only — no contact details, so **no masking concern** and **no anti-disintermediation leak** (don't expose individual worker phone/identity in repeat-worker breakdowns; repeat-rate is a *count*, not a roster). If a future drill-down lists "your repeat workers," it must reuse the server-masked worker serializer.
- APPP/個人情報: insights are scoped to the requesting contractor's own jobs; admin variant is the only cross-tenant view.

**Web integration**
New contractor "ダッシュボード / Insights" screen on the contractor home/my-jobs area; replaces any device-local tallying the client did over fetched pages. No localStorage stand-in to migrate beyond removing client-side counters. Strings (`insights.fillRate`, `insights.timeToFill`, etc.) added to both `ja.json`/`en.json`.

**Effort** — **M.** Sequence after 6.6 (so the optional daily breakdown returns a paginated/bounded envelope). P1 = live aggregation service + two endpoints; P2 = rollup table + nightly Cloud Run job behind `insights_rollup_enabled`.

---

### 2.7 Team / multi-seat contractor accounts (multiple staff under one company, roles)

**Why it's blocked on the backend**
Today identity is 1:1 — one `users` row (phone) maps to one `contractor_profiles` row, and every job/matching/chat is owned by that single `contractor_id`. A company with several site managers cannot share postings, applicants, or chat across phones without a server-side org/membership model; localStorage cannot grant cross-account access.

**Data model**
Introduce an **organization** that owns contractor data, and **memberships** that attach users to it. This is the largest change because `contractor_id` ownership semantics shift from "the user" to "the org."

- `organizations`: `id UUID PK`, `name text`, `prefecture text`, `created_by UUID FK→users.id`, `status enum(active,suspended)`, timestamps. (Optionally rename/relate to existing `contractor_profiles` — see migration.)
- `organization_members`: `id UUID PK`, `organization_id UUID FK→organizations.id`, `user_id UUID FK→users.id`, `role enum org_role(owner, manager, staff)`, `status enum(invited, active, removed)`, `invited_by UUID FK→users.id`, timestamps. Unique `(organization_id, user_id)`; index `(user_id, status)`. New enum `org_role` via `pg_enum(OrgRole, "org_role")`.
- `organization_invites`: `id UUID PK`, `organization_id UUID FK`, `phone_number text` (the invitee's Firebase phone), `role org_role`, `token text unique` (opaque), `expires_at timestamptz`, `accepted_at timestamptz | null`, `invited_by UUID FK`. Index on `phone_number`.
- **Ownership migration**: `jobs.contractor_id` and `matchings`/applicants currently FK to `users.id`. Add `jobs.organization_id UUID FK→organizations.id` (nullable during transition), backfill one org per existing contractor user (`created_by = that user`, that user becomes `owner`), then make `organization_id` the authoritative owner for new jobs. Keep `contractor_id` as "created_by_user" for audit. `contractor_profiles` becomes per-org company info (move `company_name`/`prefecture`/`bio`/`rating` onto `organizations` or keep 1:1 with the org's owner — pick: attach company fields to `organizations`).

**Alembic migration outline** — *upgrade*: create `org_role` enum, `organizations`, `organization_members`, `organization_invites`; add `jobs.organization_id` (nullable); **data migration** creating one org per existing contractor + an `owner` membership + setting `jobs.organization_id`; then a follow-up migration sets `organization_id` NOT NULL once backfilled. *downgrade*: drop `organization_id` FK/column, drop the three tables and the enum (downgrade is lossy for the org grouping — document that org structure is not restorable; safe because P1 had no orgs).

**API endpoints**
- `POST /api/v1/orgs` — body `{name, prefecture}`. Creates org, caller becomes `owner`. AuthZ: `approved_contractor` not already in an org (Phase-1 rule: one active org membership per user). Response `OrgOut {id, name, prefecture, status, my_role}`.
- `GET /api/v1/orgs/me` — caller's org + `my_role`. AuthZ: contractor member.
- `GET /api/v1/orgs/me/members` — `Page[MemberOut {user_id, display_name, role, status}]`. AuthZ: any member (read); roster only.
- `POST /api/v1/orgs/me/invites` — body `{phone_number, role: manager|staff}`. AuthZ: `owner` or `manager`. Rules: cannot invite to `owner`; rejects if phone already an active member; mints token + 7-day expiry; emits a notification (`org_invite_received`). Response `InviteOut`.
- `POST /api/v1/orgs/invites/accept` — body `{token}`. AuthZ: authenticated contractor whose verified phone matches the invite. Creates `active` membership; enforces "one org per user." Response `OrgOut`.
- `PATCH /api/v1/orgs/me/members/{user_id}` — body `{role}`. AuthZ: `owner` only (promote/demote; cannot demote the last `owner`).
- `DELETE /api/v1/orgs/me/members/{user_id}` — soft-remove (`status=removed`). AuthZ: `owner`/`manager`; cannot remove the last `owner`; self-leave allowed for `staff`/`manager`.
- **Authorization rule change (cross-cutting):** ownership checks like `jobs._require_owner(job, contractor)` become **org-membership checks** — a member may act on a job if `job.organization_id == caller's org` and their `role` permits it. Define a permission matrix: `owner` = all (incl. members/invites, cancel jobs, mark-fee context); `manager` = post/edit/cancel jobs, confirm/reject applicants, chat, invite staff; `staff` = post/edit own drafts, chat, view applicants, **no** member management and (config-gated) optionally no confirm. Replace `approved_contractor`-as-owner assumptions in `jobs.py`, `applications.py`, `matching.py`, `chat.py` with an `org_member_can(action)` dependency.

**Config flags** (docs/07)
- `teams_enabled` = `false` (ship dark; flip per env — this changes core ownership semantics, so default off is safest).
- `org_max_members` = `25`.
- `org_invite_ttl_hours` = `168` (7 days).
- `staff_can_confirm_applicants` = `true` (permissive default; orgs can tighten so only manager/owner 確定).

**Compliance notes**
- **Anti-disintermediation (中抜き):** more humans now see applicant lists and chat — masking must remain server-authoritative for *every* member role; do not relax masking for "trusted staff." Audit: keep `created_by` user id on jobs/matchings so any 中抜き attempt is attributable to a person, not just a company.
- **Visa gate** is unaffected (worker-side). Member PII (phone) lives only in invites until accepted; expire and purge accepted/expired invite tokens.
- AuthZ is now role-within-org — every endpoint must re-check membership server-side; never trust a client-asserted role.

**Web integration**
New "会社・チーム / Team" settings screen (member list, invite by phone, role management) under contractor settings; an org switcher is unnecessary in P1 (one org per user). All existing contractor screens (post-job, my-jobs, applicants, chat) now operate on org-owned data — the only client change is they stop assuming "my jobs == jobs I personally created." No localStorage stand-in existed for this (it's inherently multi-device), so nothing to migrate; remove any "owner == me" client guards in favor of server 403s.

**Effort** — **L.** Largest item; do **last** in the group and gate behind `teams_enabled=false` until the ownership migration + permission matrix are fully tested (matching state machine and fee recording must respect org permissions). Sequence: (1) tables + enum + backfill migration with `organization_id` nullable, (2) org/membership/invite endpoints, (3) swap owner-checks → org-permission dependency across routers behind the flag, (4) NOT NULL migration, (5) flip flag per env.

---

### 1.4 Recommended jobs feed server-side (move client heuristic to API; Gemini ranking later)

**Why it's blocked on the backend**
The current client "recommended" ordering is a localStorage heuristic over whatever page the device already fetched — it can't see the full open-jobs set, the worker's prior applications/matchings, or compute a consistent cross-device ranking. Ranking needs server-side worker context (trades, prefecture, history) joined against all open jobs.

**Data model**
No new tables in P1 — the ranking is computed over existing `jobs`, `worker_profiles`, `applications`, `matchings`. Inputs already exist: worker's `trades`/qualifications and `prefecture` (worker profile), `daily_wage`, `work_date`, distance proxy (prefecture/area match), and recency. Add (optional) a small **feedback table** to make P2 Gemini ranking learnable:
- `job_recommendation_events` (P2, optional): `id UUID PK`, `worker_id UUID FK`, `job_id UUID FK`, `event enum(shown, clicked, applied, dismissed)`, `score int | null` (heuristic score snapshot), `created_at timestamptz`. Index `(worker_id, created_at)`. Lets us measure CTR and later train/prompt the ranker. *upgrade*: create table + index; *downgrade*: drop. Not required for the P1 heuristic endpoint to ship.

**API endpoints**
- `GET /api/v1/jobs/recommended` — query: `limit (1–50, default 20)`, `cursor` (reuses 6.6 `Page[T]`). AuthZ: `approved_worker`. Response `Page[RecommendedJobOut]` where `RecommendedJobOut = JobOut + match_score: int (0–100) + reasons: list[str]` (reason **keys**, e.g. `reason.trade_match`, `reason.same_prefecture`, `reason.high_wage`, `reason.soon` — localized client-side). Business rules: candidate set = open jobs the worker is eligible for (respects existing service-area/trade config and excludes jobs the worker already applied to/was rejected from/has a matching for). **Scoring (Phase-1 deterministic heuristic, server-side, config-weighted):** `score = w_trade*trade_overlap + w_pref*prefecture_match + w_wage*wage_percentile + w_soon*date_proximity − w_seen*already_shown`. Ties broken by the same total order as 6.6 (`…, id`) so the cursor is stable. The endpoint **must not** leak masked contact info (reuses `job_out`). 
- **Gemini path (P2, behind flag):** when `ai_job_ranking_enabled=true`, the service shortlists top-N (e.g. 100) by the cheap heuristic, then calls **Vertex AI Gemini** (per ADR-0005, cheaper than Claude) to re-rank the shortlist with a structured prompt (worker context + job summaries → ranked ids + reason keys). Strict timeout + fallback to the heuristic order on any error/timeout; cache per `(worker_id, candidate-set hash)` for a short TTL to control cost. No PII in the prompt beyond trades/prefecture (no phone/name/My Number).

**Config flags** (docs/07)
- `recommendations_enabled` = `true`.
- `rec_weight_trade` = `50`, `rec_weight_prefecture` = `20`, `rec_weight_wage` = `15`, `rec_weight_soon` = `15` (integer weights, tunable at runtime via `app_config`).
- `rec_exclude_applied` = `true`.
- `ai_job_ranking_enabled` = `false` (P2 Gemini path; off until cost/latency validated).
- `rec_gemini_shortlist_size` = `100`, `rec_gemini_timeout_ms` = `1500`, `rec_cache_ttl_sec` = `120`.

**Compliance notes**
- Ranking input is worker trades/prefecture/history only — **no My Number, no residence-card content** ever in features or in any Gemini prompt. Eligibility filtering still defers the hard **visa gate** to confirm-time (recommendation visibility is not a substitute for the gate). Masking is preserved since output reuses `JobOut`. Anti-disintermediation unaffected (recommendations point to in-platform jobs only).

**Web integration**
The worker home / job-browse "おすすめ / Recommended" tab consumes this; replaces the device-local heuristic and any localStorage "recently seen / score" state. Client migration: drop the local scorer, render `match_score` + localized `reasons`, and page via the shared `Page[T]` cursor. Reason keys added to both `ja.json`/`en.json`.

**Effort** — **M** (P1 heuristic) / **L** (P2 Gemini). Sequence after 6.6 (needs `Page[T]`). Ship the deterministic config-weighted heuristic first; add the Gemini re-rank + `job_recommendation_events` telemetry later behind `ai_job_ranking_enabled`.

---

**Group sequencing:** 6.6 (foundation: envelope + keyset helper + indexes) → 1.4 P1 heuristic and 2.8 live aggregation (both build on the envelope) → 2.7 Teams last (largest, changes ownership semantics, ship dark behind `teams_enabled`). P2 add-ons (insights rollup job, Gemini re-rank, recommendation telemetry) follow once their respective flags are validated.

---
