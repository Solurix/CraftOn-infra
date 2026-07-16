# MAP — `web/` index

One-line purpose per file so an AI session can find things without reading the
tree. Product/API source of truth is the repo-root `../../docs/`; web-local
rules are in `../CLAUDE.md`.

**Never read or edit wholesale:** `src/lib/api/schema.ts` (generated, ~5300
lines — regenerate with `npm run gen:api`), `openapi.snapshot.json` (generated
input to it), `package-lock.json`. **Large reference docs** (read only when the
task needs them): `docs/BLOCKERS.md` (~150 KB backend feature specs),
`docs/FEATURE_RECOMMENDATIONS.md`, `docs/IMPLEMENTATION_STATUS.md`.

## Root
| File | Purpose |
|---|---|
| `CLAUDE.md` | Web-local conventions + quality gates (run before committing) |
| `README.md` | Setup / run instructions |
| `package.json` | Scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `i18n:check`, `gen:api`, `e2e` |
| `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `.eslintrc.json` | Build / style / TS / lint config |
| `vitest.config.ts`, `playwright.config.ts` | Unit and E2E test config |
| `Dockerfile`, `.env.example` | Container build + env template |
| `scripts/check-i18n-parity.mjs` | CI check: `messages/ja.json` and `messages/en.json` have identical keys |
| `messages/{ja,en}.json` | UI string catalogs — always change both in the same commit |

## `src/app/` — App Router pages (all `"use client"`)
| Path | Purpose |
|---|---|
| `layout.tsx` | Root layout: providers (auth, theme, toast, i18n), SW registrar |
| `page.tsx` | Home: `Landing` logged-out, dashboard/redirect logged-in |
| `login/page.tsx` | Login / signup / password reset, role chooser, recent accounts (largest page, ~490 lines) |
| `onboarding/page.tsx` | Worker & contractor profile-completion forms |
| `profile/page.tsx` | Settings: worker/contractor edit (incl. residence-card re-upload for non-JP workers), photos, account, password, devices |
| `post-job/page.tsx` | Contractor job post/edit form (`?from=<id>` duplicate, `?edit=<id>` edit — edits PATCH only changed fields; drafts + templates for new posts); pure helpers in `post-job/jobForm.ts` |
| `jobs/page.tsx`, `jobs/[id]/page.tsx` | Job search/list with filters; job detail + apply |
| `my-jobs/page.tsx`, `my-jobs/[id]/page.tsx` | Contractor's postings; posting detail + applicants + edit/duplicate actions |
| `applications/page.tsx` | Worker's applications list |
| `matchings/page.tsx`, `matchings/[id]/page.tsx` | Matchings list; detail with chat, check-in/out, completion, review |
| `history/page.tsx` | Worker's completed work + monthly earnings |
| `saved/page.tsx`, `notifications/page.tsx` | Bookmarked jobs; notification inbox |
| `workers/[id]/page.tsx`, `contractors/[id]/page.tsx` | Public profiles + reviews |
| `admin/page.tsx` | Admin dashboard shell (tab strip); each tab in `admin/tabs/*.tsx` (Users, Jobs, Matchings, Trades, Devices, Admins, Debug, Config) |
| `terms/page.tsx`, `privacy/page.tsx` | Legal pages (via `LegalPage`) |
| `globals.css` | Tailwind layers + component classes |

## `src/components/`
- Shell/nav/PWA: `AppShell`, `RequireAuth`, `BottomNav`, `AccountMenu`, `LanguageSwitcher`, `ThemeToggle`, `NotificationBell`, `InstallPrompt`, `OfflineBanner`, `ServiceWorkerRegistrar`
- Feature widgets: `Avatar`, `JobCard`, `SaveJobButton`, `FavoriteWorkerButton`, `SavedSearches`, `JobTemplates`, `JobPhotoPicker`, `PhotoManager`, `ResidenceCardSection` (non-JP residence-card status + re-upload in profile settings), `TagInput`, `PhoneInput`, `PrefectureSelect`, `QuickReplies`, `ProfileCompleteness`, `ProfileSubmissionSummary`, `VisaStatusBanner`, `Toast`, `DevicesCard`, `Landing`, `LegalPage`
- `ui.tsx` — shared primitives: `Spinner`, `ErrorText`, skeletons, `EmptyState`, `PageHeader`, `StatusBadge`, `BackLink`, `ToggleSwitch`
- `profile.tsx` — `ProfileRow`, `ReviewList`
- `WorkerProfileFields.tsx` — worker profile form component (form model lives in `src/lib/workerForm.ts`, re-exported here)

## `src/lib/`
| Path | Purpose |
|---|---|
| `api/schema.ts` | **GENERATED** OpenAPI types — never hand-edit |
| `api/models.ts` | Hand-picked type aliases re-exported from `schema.ts` |
| `api/request.ts` | Transport: `request<T>()`, `ApiError`, `AUTH_EXPIRED_EVENT`, base URL |
| `api/client.ts` | `ApiClient` — the only way to call the API (one method per endpoint) |
| `auth/context.tsx` | `AuthProvider` / `useAuth`: session + token lifecycle, account switching; refreshes `me` on focus/visibility (30s throttle) and polls while status is pending |
| `auth/accounts.ts` | Remembered-accounts localStorage store |
| `auth/fakeToken.ts` | Dev/CI fake OTP token (matches API's fake verifier) |
| `workerForm.ts` | Worker profile form model: types + to/from-payload converters |
| `errorMessage.ts` | `humanizeError` — always use for user-facing API error text |
| `format.ts` | JPY / Asia-Tokyo time formatting |
| `useAsync.ts`, `useDebouncedValue.ts` | Loading/error/reload hook; debounce hook |
| `storage.ts`, `device.ts` | SSR-safe localStorage; device id/name headers |
| `phone.ts`, `prefectures.ts`, `trades.ts`, `locales.ts` | Domain constants + helpers |
| `nav.ts`, `notifications.ts`, `theme.tsx` | Shared nav model; bell refresh signal; theme provider |
| `completeness.ts`, `earnings.ts`, `insights.ts`, `recommend.ts` | Pure scoring/aggregation helpers |

## `src/i18n/`, `public/`, `tests/`
- `src/i18n/request.ts` — next-intl config (locale from `NEXT_LOCALE` cookie, default `ja`)
- `public/` — `manifest.webmanifest`, `sw.js`, icons (PWA installability)
- `tests/` — Vitest unit tests; `tests/e2e/` — Playwright (needs a running API)

## Where to change what
| Task | Touch |
|---|---|
| New screen | `src/app/<route>/page.tsx` + nav in `src/lib/nav.ts` (+ `BottomNav`/`AppShell` if top-level) |
| New API call | Regenerate `schema.ts` if contract changed (`npm run gen:api`), add method to `api/client.ts`, alias in `api/models.ts` if needed |
| New user-facing string | Keys in **both** `messages/ja.json` and `messages/en.json` (CI enforces parity) |
| Error display | `humanizeError(e, common("networkError"))` — never render `e.message` raw |
| Shared UI element | `src/components/ui.tsx` (primitives) or a new component file |
| Auth/session behavior | `src/lib/auth/context.tsx` (+ `accounts.ts` for remembered accounts) |

## Quality gates
`npm run i18n:check && npm run lint && npm run typecheck && npm test && npm run build`
