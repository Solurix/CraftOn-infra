# 06 — API Contract (Phase 1)

REST + JSON, served by FastAPI. Base path `/api/v1`. Auth via a bearer token in
`Authorization: Bearer <token>` — normally an **API session token** issued by
login/registration; at registration only, a **Firebase OTP token**. The API verifies it
and loads the `users` row. FastAPI auto-generates OpenAPI at `/docs` — that is the
**authoritative** schema; this file is the human overview, keep them in sync.

Conventions: snake_case JSON; money integer JPY; timestamps ISO-8601 UTC; errors as
`{ "error": { "code": "...", "message": "..." } }` with appropriate HTTP status.

## Auth & session
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/auth/session` | valid OTP token | Register on first login (verifies the OTP token; sets username/email/password) or return the existing user. Returns an API session token on creation. |
| POST | `/auth/login` | public | Returning login: identifier (username/email/phone) + password → API session token. No OTP. |
| POST | `/auth/password` | self (active) | Set/replace own password. |
| GET | `/me` | any | Current user + profile + status |

> SMS OTP (handled by Firebase on the client) is required **only at registration** to
> prove phone ownership. Returning logins use identifier + password and the API issues
> its own signed session token (ADR 0009). Phone stays the canonical identity.

## Onboarding & profiles
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/onboarding/worker` | worker | Create/complete worker profile |
| POST | `/onboarding/contractor` | contractor | Create/complete contractor profile |
| GET | `/workers/{id}` | any approved | Public worker profile (reviews, trust, trades) |
| GET | `/contractors/{id}` | any approved | Public contractor profile (rating, reviews) |
| PATCH | `/workers/me` | worker | Edit own profile |
| PATCH | `/contractors/me` | contractor | Edit own profile |

## Documents (upload & vetting)
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/documents/upload-url` | worker/contractor | Get a signed Cloud Storage upload URL |
| POST | `/documents` | worker/contractor | Register an uploaded doc (type, path) |
| GET | `/documents/me` | owner | List own docs + review status |

## Jobs
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/jobs` | contractor | Post a job (validates service area) |
| GET | `/jobs` | worker | Search/list open jobs (filters: trade, date, prefecture) |
| GET | `/jobs/{id}` | any approved | Job detail |
| PATCH | `/jobs/{id}` | owner contractor | Edit (while `open`) |
| POST | `/jobs/{id}/cancel` | owner contractor | Cancel job |
| GET | `/jobs/mine` | contractor | Contractor's own jobs |

## Applications & matching
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/jobs/{id}/apply` | worker | Apply to a job |
| GET | `/jobs/{id}/applications` | owner contractor | List applicants |
| POST | `/applications/{id}/confirm` | owner contractor | Confirm worker → creates matching (sets contract_type, platform_fee) |
| POST | `/applications/{id}/reject` | owner contractor | Reject applicant |
| POST | `/applications/{id}/withdraw` | worker | Withdraw |
| GET | `/applications/mine` | worker | Worker's applications |

## Matching lifecycle (day-of)
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/matchings/mine` | worker/contractor | Active & past matchings |
| GET | `/matchings/{id}` | participant | Matching detail |
| POST | `/matchings/{id}/check-in` | worker | Mark arrived (timestamp; GPS optional, P2) |
| POST | `/matchings/{id}/complete-request` | worker | Worker marks work done |
| POST | `/matchings/{id}/approve-completion` | contractor | Approve → `completed`, record fee owed |
| POST | `/matchings/{id}/cancel` | participant | Cancel (records reason; `noshow` is admin/auto in P2) |

## Chat
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/matchings/{id}/messages` | participant | Fetch messages |
| POST | `/matchings/{id}/messages` | participant | Send message — **server applies contact-mask filter**; rejects/flags blocked content |

> Real-time delivery may use Firestore listeners on the client; the POST endpoint remains
> the authoritative write path enforcing masking. See `08-compliance-legal.md`.

## Reviews
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/matchings/{id}/reviews` | participant | Leave a review (one per direction, after `completed`) |
| GET | `/workers/{id}/reviews` | any approved | Worker's reviews |
| GET | `/contractors/{id}/reviews` | any approved | Contractor's reviews |

## Admin
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/admin/vetting/queue` | admin | Pending users + docs |
| POST | `/admin/users/{id}/approve` | admin | Approve user (enforces visa gate for non-JP workers) |
| POST | `/admin/users/{id}/reject` | admin | Reject with reason |
| POST | `/admin/users/{id}/suspend` | admin | Suspend / reactivate |
| GET | `/admin/matchings` | admin | All matchings (filters) |
| POST | `/admin/matchings/{id}/mark-fee-paid` | admin | Reconcile ¥3,000 fee |
| GET | `/admin/config` | admin | Read config & flags |
| PATCH | `/admin/config` | admin | Update config & flags |

## System
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/healthz` | none | Liveness |
| GET | `/readyz` | none | Readiness (DB reachable) |

## Validation rules to enforce server-side (Phase 1)
- Service-area check on job post (config; can be disabled).
- Non-JP worker: cannot be `approved` / confirmed without residence card + valid visa.
- `freelance` worker with `has_insurance=false`: block confirmation (config-toggleable).
- Contact-mask filter on every outgoing message.
- Reviews only after `completed`; one per direction; participants only.
- State-machine guards on matching status transitions.
