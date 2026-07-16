# 12 — Per-PR preview environments

Every pull request in the monorepo gets **two** deployed previews from one pipeline:
a **standalone, per-PR Cloud Run service** for each of api and web
(`crafton-api-dev-pr<N>` / `crafton-web-dev-pr<N>`), each at its own URL. The **API**
preview is backed by its **own isolated database** (`crafton_pr<N>` on the shared
`crafton-dev` Cloud SQL instance), migrated and smoke-tested in isolation. The **web**
preview is baked to point at **this PR's own API preview** (auto-paired), so every PR —
including a coordinated api+web change — previews end-to-end with no opt-in needed.
Prod (the live `crafton-api-dev` / `crafton-web-dev` services and the `crafton`
database) is **never touched** by a PR. On PR close both preview services (and the
API's database) are torn down.

This adapts MuchoKarte's preview playbook. The building blocks below note where CraftOn
deliberately diverges.

> ## ⚠️ Why a separate service per PR (not a tagged revision)
>
> Previews originally deployed a `--no-traffic --tag pr<N>` **revision of the shared
> live service** and set `CRAFTON_DB_NAME=crafton_pr<N>` via `--update-env-vars`.
> **That is unsafe.** `--tag`/`--no-traffic` only control *traffic routing* — they do
> **not** sandbox configuration. `gcloud run deploy <shared-service> --update-env-vars …`
> mutates the **shared service's base template**, so `CRAFTON_DB_NAME=crafton_pr<N>`
> and the `preview-pr` label leaked onto `crafton-api-dev`. The next ordinary revision
> (a merge-to-main deploy, a traffic recreate, a terraform reconcile) **inherited** the
> leaked template. When the PR closed and `crafton_pr<N>` was dropped, the live service
> could no longer boot:
>
> ```
> FATAL: database "crafton_pr1" does not exist
> ```
>
> (The API image entrypoint runs `alembic upgrade head` before uvicorn, so a DB it
> can't reach means uvicorn never binds `$PORT` and every revision fails the startup
> probe — "container failed to start and listen on the port".)
>
> **Fix:** deploy each preview as its **own standalone service**. A dedicated service
> has its own template, so nothing a preview does can ever touch the live service, and
> teardown is a single `gcloud run services delete` (no un-tag dance, no "can't delete
> the latest revision" caveat). This is the model documented below.

## Mental model

```
PR opened/synchronized → preview-deploy.yml (pull_request_target, YAML from main)
  ├─ job `api`
  │     1. gcloud sql databases create crafton_pr<N>          ← isolated DB
  │     2. docker build + push  api:pr<N>-<sha>   (context ./api)
  │     3. gcloud run deploy crafton-api-dev-pr<N>            ← STANDALONE service
  │          • runtime SA + Cloud SQL instance + crafton-db-url secret attached
  │          • --set-env-vars: full preview env, incl. CRAFTON_DB_NAME=crafton_pr<N>
  │          • --allow-unauthenticated (reachable like the public dev service)
  │          • migrations run at container BOOT against crafton_pr<N> (advisory-locked)
  │     4. smoke test: /openapi.json → signup → login → /me  (against the isolated DB)
  │     5. comment the API preview URL + DB name on the PR
  │     → outputs api_url
  └─ job `web`  (needs: api)
        1. bake NEXT_PUBLIC_API_BASE_URL = this PR's api_url (auto-paired)
        2. docker build + push  web:pr<N>-<sha>   (context ./web)
        3. gcloud run deploy crafton-web-dev-pr<N>            ← STANDALONE service
        4. smoke test: GET / → 2xx/3xx ; comment the web preview URL

PR merged → push to main → ci.yml deploy-api / deploy-web (only the changed service;
             prod `crafton` DB); the deploy also scrubs any historical preview leak
PR closed → preview-cleanup.yml → delete both crafton-<svc>-dev-pr<N> services → drop crafton_pr<N>
```

**Deterministic URL.** Each preview is a normal Cloud Run service, so its URL is read
with `gcloud run services describe crafton-<svc>-dev-pr<N> --format='value(status.url)'`.
The `api` job exposes its URL as a job output that the `web` job bakes into the image.
(This replaces the old `https://pr<N>---<host>` tag-URL scheme.)

## Web ↔ API pairing (automatic)

In the monorepo, api and web deploy from the **same PR in one workflow**, so the web
preview is **always baked against this PR's own API preview** (`crafton-api-dev-pr<N>`):
the `web` job `needs` the `api` job and reads its `api_url` output. A coordinated api+web
change therefore previews end-to-end with **no opt-in label** — this replaces the old
multi-repo `api-pr:` hint, which existed only because the two repos deployed independently
and couldn't share a run.

**No API-side change is needed.** `crafton-api` CORS is `allow_origins=["*"]` with
`allow_credentials=False`, so the preview web origin can call its paired API preview. The
API preview keeps its own isolated `crafton_pr<N>` database, so the web preview exercises
the full isolated stack. (Previews run `CRAFTON_STORAGE_MODE=fake`, so cross-origin uploads
to the GCS bucket aren't exercised — the bucket's CORS allow-list needs no preview origins.)

The baked API URL is build-time (as every web preview is). A follow-up could serve it at
runtime (`window.__ENV__`) so one image repoints with no rebuild — not needed here, so
deferred.

## Self-heal on the live service

The main-branch deploy jobs in `ci.yml` scrub any preview config that may have leaked onto
the live service **before** the separate-service model existed:

- **`deploy-api`**: `--remove-env-vars CRAFTON_DB_NAME --remove-labels preview-pr` and
  re-asserts `--update-env-vars CRAFTON_STORAGE_MODE=gcs` (the canonical dev value from
  `environments/dev/main.tf`). So even a still-wedged live service heals on the next merge to
  main. These flags are no-ops once the service is clean.
- **`deploy-web`**: `--remove-labels preview-pr` (web previews never set a DB env, so
  there's nothing else to scrub).

With previews now on their own services this can't recur; the scrub is a cheap safety net for
the historical leak and any stray manual `gcloud`.

## What lives where

| Block | Files (all in this monorepo) |
|---|---|
| App plumbing (db-name swap + advisory lock) | `api/app/core/config.py`, `api/app/db/session.py`, `api/migrations/env.py` |
| Workflows | `.github/workflows/preview-deploy.yml`, `preview-cleanup.yml`; `ci.yml` (api migration guard + deploy self-heal) |
| Governance | `.github/CODEOWNERS` |
| IAM | `infra/terraform/environments/dev/cicd.tf` (`craftonPreviewDbManager` role; deployer `roles/run.admin` covers per-PR service create/delete + public IAM) |

## Block A — app plumbing (crafton-api)

The DB password stays in the `crafton-db-url` secret; previews pass only a
**non-secret `CRAFTON_DB_NAME`**, which `Settings.effective_database_url` swaps into
the URL's db-name segment (handles both the Cloud SQL socket form
`…@/crafton?host=/cloudsql/…` and the plain `@host:port/crafton` form; credentials
and socket/host are preserved). `db/session.py` and `migrations/env.py` build from
`effective_database_url`. When `CRAFTON_DB_NAME` is unset (dev/CI/prod), it equals
`database_url`, so those paths are untouched.

`migrations/env.py` takes a **transaction-scoped advisory lock as the first
statement inside** Alembic's transaction (`pg_advisory_xact_lock(727274)`). This
serializes concurrent migrators — e.g. multiple Cloud Run instances cold-starting
the same preview service — so they can't corrupt the schema. It must be **inside**
`context.begin_transaction()`: running any statement before it makes SQLAlchemy
autobegin a transaction that Alembic never commits, and on a fresh DB all the DDL
silently rolls back. The lock is per-database, so prod and each `crafton_pr<N>` lock
independently, and it also hardens the existing prod migrate-at-boot.

## Block B — workflows

`pull_request_target` runs the workflow **and its credentialed steps from `main`**,
guarded to **same-repo, non-draft** PRs (fork PRs can't mint a WIF token and are
skipped). The isolated DB, the standalone `crafton-<svc>-dev-pr<N>` service, and the
smoke/cleanup steps follow the mental model above. Cleanup is best-effort: delete the
per-PR **service** (revisions and all), then drop `crafton_pr<N>` (API only). There is
no ordering constraint anymore (no tag to remove first). Cleanup also exposes
`workflow_dispatch` (input `pr_number`) so the owner can reclaim a leaked preview from
the Actions tab.

The `api` job in `ci.yml` keeps the **"exactly one migration head"** guard (two heads →
rebase/merge the graph before it can deploy, since previews and prod both migrate at boot)
plus the upgrade/downgrade round-trip; the main-branch `deploy-api`/`deploy-web` jobs add
the **self-heal** scrub described above.

## CraftOn-specific divergences from the MuchoKarte playbook

- **Separate service per PR, not a tagged revision.** A tagged revision shares the live
  service's mutable template and leaks preview config onto prod (the incident above).
  CraftOn isolates each preview in its own `crafton-<svc>-dev-pr<N>` service.
- **Runner build, not Cloud Build.** CraftOn's existing deploy jobs `docker build`
  on the GitHub runner and `gcloud run …`; the previews do the same for consistency.
  Trade-off: the PR's Dockerfile runs on a runner holding the WIF token — accepted
  for a trusted in-repo team, and bounded by the same-repo guard + CODEOWNERS on
  `**/Dockerfile`. (Revisit — adopt Cloud Build's build-SA isolation — before taking
  outside contributors.)
- **Migrate at container boot, not a separate migrate job.** CraftOn's API image
  entrypoint is `alembic upgrade head && uvicorn`, so the preview service migrates
  itself against `crafton_pr<N>`; the advisory lock covers multi-instance races.
- **Empty preview DB (no prod clone).** Dev uses fake auth, so the smoke test's own
  signup seeds what it needs. No PII is copied into previews.
- **`CRAFTON_DB_NAME`** (not `DB_NAME`) — CraftOn's env prefix. Previews also set
  `CRAFTON_STORAGE_MODE=fake` so they don't write to the shared uploads bucket.

## One-time owner setup (not done by the pipeline)

1. **`make tf-apply`** (dev) to create the `craftonPreviewDbManager` role and bind it
   to `crafton-deployer@…` (Terraform apply stays manual). This is the only hard
   prerequisite for the DB step. The deployer's existing `roles/run.admin` already
   covers creating/deleting per-PR services and setting their public (`allUsers`
   invoker) IAM, so no extra role is needed for the service side.
2. **Branch protection on `main`** (GitHub UI): require a PR, require review from Code
   Owners, and set the single required status check to **`ci`** (the aggregating gate;
   the path-filtered `api`/`web`/`smoke` jobs roll up into it, so requiring individual
   job names would hang on filtered-out jobs). No direct pushes.
3. Because the workflows run from `main` (`pull_request_target`), a pipeline change
   only takes effect after it's merged — the PR that introduces it can't validate
   itself. App-code PRs take effect immediately (built from PR head).

> **No Postgres schema grant is needed.** Cloud SQL automatically makes users
> created through its Admin API (`crafton_app`) members of `cloudsqlsuperuser`, and
> `gcloud sql databases create` makes the new DB owned by that role — so `crafton_app`
> can create tables in a fresh `crafton_pr<N>`'s `public` schema, and the generic
> PG15+ "no CREATE on public" restriction never bites. If you ever see
> *permission denied for schema public*, the one-time fix is
> `GRANT ALL ON SCHEMA public TO crafton_app;` on `template1`.

## Gotchas (already handled in the code)

- **Never `gcloud run deploy` preview config onto a shared service** — even with
  `--no-traffic --tag`, it mutates the shared template and leaks onto prod. Previews
  are their own services precisely to make this impossible.
- Advisory lock **inside** the Alembic transaction, first statement.
- Liveness polls **`/openapi.json`**, not `/healthz` (GFE returns 404 for `/healthz`
  on `*.run.app` — see STATUS.md).
- A standalone service has **no shared template to inherit**, so the preview deploy
  sets the full runtime config explicitly (`--set-env-vars`, `--service-account`,
  `--add-cloudsql-instances`, `--set-secrets`, `--allow-unauthenticated`).
- Cleanup deletes the whole **service** — no tag/revision ordering, and no "can't
  delete a service's latest-created revision" (`FAILED_PRECONDITION`) caveat, both of
  which the old tagged-revision scheme had to work around.
- The GitHub bot may lack `actions:write`; run `preview-cleanup` `workflow_dispatch`
  from the Actions tab if a preview leaks.

## Identifiers (dev)

`crafton-dev-500709` (#784671749504) · `asia-northeast1` · Cloud SQL `crafton-dev`
(user `crafton_app`, prod DB `crafton`, previews `crafton_pr<N>`) · AR repo
`crafton` · live services `crafton-api-dev` / `crafton-web-dev` · preview services
`crafton-api-dev-pr<N>` / `crafton-web-dev-pr<N>` · runtime SA `crafton-api-dev@…` ·
deployer SA `crafton-deployer@…` · WIF `github-actions/github` · secret
`crafton-db-url` · advisory-lock key `727274`.
