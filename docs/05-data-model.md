# 05 — Data Model

PostgreSQL. UUID v4 primary keys. Money is **integer JPY**. Timestamps stored UTC.
All schema changes go through **Alembic migrations**.

> Phase 1 tables below. Fields marked _(P2)_ exist in the schema from day one (hard to
> retrofit) but their **logic** lands in Phase 2. Fields marked _(P2-add)_ are added in
> Phase 2 and listed here only for foresight.

## Entity overview

```
users 1──1 worker_profiles
users 1──1 contractor_profiles
users 1──* jobs            (contractor posts)
jobs  1──* applications     (worker applies)
jobs  1──* matchings        (confirmed application → matching)
matchings 1──* reviews      (one per direction)
users 1──* documents        (uploaded IDs / residence cards / quals)
matchings 1──* messages     (chat; or keyed by a conversation)
```

## users (common)
| column | type | constraints | notes |
|---|---|---|---|
| id | UUID | PK | |
| phone_number | varchar | unique, not null | Firebase phone; login id |
| user_type | enum | not null | `worker` \| `contractor` \| `admin` |
| status | enum | default `pending` | `pending` \| `approved` \| `suspended` |
| display_name | varchar | not null | nickname shown in app |
| preferred_language | varchar | default `ja` | `ja` \| `en` \| … |
| created_at | timestamptz | not null | |
| updated_at | timestamptz | not null | |

## worker_profiles
| column | type | constraints | notes |
|---|---|---|---|
| user_id | UUID | PK, FK→users.id | |
| nationality | varchar | not null | ISO-ish: `JP`, `VN`, `ID`, … |
| worker_class | enum | not null | `employee` (side-job) \| `freelance` (一人親方) |
| residence_card_front_doc_id | UUID | FK→documents.id, null | required if non-JP |
| residence_card_back_doc_id | UUID | FK→documents.id, null | required if non-JP |
| visa_expiry_date | date | null | required if non-JP |
| work_restriction | varchar | null _(P2)_ | e.g. visa type / 28h limit flags; checked in P2 |
| has_insurance | boolean | default false | 一人親方労災 proof; required for `freelance` to be confirmable |
| trades | text[] | default `{}` | trade tags |
| tools | text[] | default `{}` | |
| trust_score | numeric | default 0 | derived display value in P1 |
| created_at / updated_at | timestamptz | | |

## contractor_profiles
| column | type | constraints | notes |
|---|---|---|---|
| user_id | UUID | PK, FK→users.id | |
| company_name | varchar | not null | |
| contact_person | varchar | not null | |
| prefecture | varchar | not null | |
| address | varchar | null | |
| rating | numeric | default 0 | derived display value |
| created_at / updated_at | timestamptz | | |

## documents
| column | type | constraints | notes |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK→users.id | |
| doc_type | enum | not null | `photo_id` \| `residence_card_front` \| `residence_card_back` \| `qualification` \| `insurance_proof` \| `job_photo` |
| storage_path | varchar | not null | Cloud Storage object path (signed URL on read) |
| review_status | enum | default `pending` | `pending` \| `approved` \| `rejected` |
| review_note | varchar | null | admin reason |
| created_at | timestamptz | | |

> Retention: residence-card images get a lifecycle/retention policy — keep only as long
> as needed; prefer storing derived fields (expiry, restriction) over the image. See
> `08-compliance-legal.md`.

## jobs
| column | type | constraints | notes |
|---|---|---|---|
| id | UUID | PK | |
| contractor_id | UUID | FK→users.id | |
| trades | text[] | not null | trades needed |
| work_date | date | not null | |
| start_time / end_time | time | not null | Asia/Tokyo business time |
| prefecture | varchar | not null | |
| area | varchar | null | finer area within prefecture |
| address | varchar | null | full site address (masked until confirm if needed) |
| daily_wage | integer | not null | JPY |
| headcount | integer | default 1 | workers needed |
| notes | text | null | requirements |
| status | enum | default `open` | `open` \| `filled` \| `closed` \| `canceled` |
| created_at / updated_at | timestamptz | | |

## applications
| column | type | constraints | notes |
|---|---|---|---|
| id | UUID | PK | |
| job_id | UUID | FK→jobs.id | |
| worker_id | UUID | FK→users.id | |
| status | enum | default `applied` | `applied` \| `confirmed` \| `rejected` \| `withdrawn` |
| created_at | timestamptz | | |
| | | unique(job_id, worker_id) | no double-apply |

## matchings
| column | type | constraints | notes |
|---|---|---|---|
| id | UUID | PK | |
| job_id | UUID | FK→jobs.id | |
| worker_id | UUID | FK→users.id | |
| application_id | UUID | FK→applications.id | |
| status | enum | not null | `confirmed` \| `checked_in` \| `completed` \| `canceled` \| `noshow` |
| contract_type | enum | not null | `employment_daylabor` (employee) \| `subcontract` (freelance) |
| daily_wage | integer | not null | snapshot of agreed wage |
| platform_fee | integer | not null | P1: flat ¥3,000 (config var) |
| fee_status | enum | default `unpaid` | `unpaid` \| `paid` (manual in P1) |
| checked_in_at | timestamptz | null | |
| completed_at | timestamptz | null | |
| withholding_tax | integer | default 0 _(P2)_ | employee route only; computed in P2 |
| checkin_lat / checkin_lng | numeric | null _(P2)_ | GPS verify in P2 |
| created_at / updated_at | timestamptz | | |

## reviews
| column | type | constraints | notes |
|---|---|---|---|
| id | UUID | PK | |
| matching_id | UUID | FK→matchings.id | |
| reviewer_id | UUID | FK→users.id | |
| reviewee_id | UUID | FK→users.id | |
| direction | enum | not null | `contractor_to_worker` \| `worker_to_contractor` |
| rating | smallint | not null, 1–5 | |
| comment | text | null | |
| tags | text[] | default `{}` | |
| created_at | timestamptz | | |
| | | unique(matching_id, direction) | one review per side |

## messages (chat)
| column | type | constraints | notes |
|---|---|---|---|
| id | UUID | PK | |
| matching_id | UUID | FK→matchings.id | conversation key (or job pre-confirm) |
| sender_id | UUID | FK→users.id | |
| body | text | not null | stored **after** masking filter |
| was_filtered | boolean | default false | flagged if contact info was attempted |
| created_at | timestamptz | | |

> Chat may physically live in Firestore for real-time delivery in Phase 1; the masking
> filter and `was_filtered` audit still apply server-side. Keep an abstraction so it can
> move to Postgres+websockets later. See `02-architecture.md`.

## app_config / feature_flags
Small key-value tables (or a typed settings table) backing `07-config-and-flags.md`.
| column | type | notes |
|---|---|---|
| key | varchar PK | e.g. `platform_fee_per_match` |
| value | jsonb | typed value |
| updated_by | UUID | admin |
| updated_at | timestamptz | |

Defaults come from env/Terraform; admin can override at runtime where it makes sense.

## Indexing notes
- `jobs (status, work_date, prefecture)` for the job-search query.
- `applications (worker_id, status)`, `matchings (worker_id, status)`,
  `matchings (job_id)`.
- `users (phone_number)` unique already covers login.
