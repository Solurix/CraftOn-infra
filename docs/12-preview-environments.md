# 12 — Per-PR preview environments

Every pull request on `crafton-api` and `crafton-web` gets its own deployed preview:
a **no-traffic, tagged Cloud Run revision** reachable at a deterministic URL. The
**API** preview is backed by its **own isolated database** (`crafton_pr<N>` on the
shared `crafton-dev` Cloud SQL instance), migrated and smoke-tested in isolation.
The **web** preview is baked to point at the shared live API. Prod (the live
revisions and the `crafton` database) is never touched by a PR. On PR close the
preview and its database are torn down.

This adapts MuchoKarte's monorepo playbook to CraftOn's **multi-repo** layout. The
building blocks below note where CraftOn deliberately diverges.

## Mental model

```
PR opened/synchronized
  ├─ crafton-api  → preview-deploy.yml (pull_request_target, YAML from main)
  │     1. gcloud sql databases create crafton_pr<N>      ← isolated DB
  │     2. docker build + push  api:pr<N>-<sha>
  │     3. gcloud run deploy crafton-api-dev --no-traffic --tag pr<N>
  │          • runtime SA + Cloud SQL instance + crafton-db-url secret attached
  │          • CRAFTON_DB_NAME=crafton_pr<N>  → app swaps the db-name segment
  │          • migrations run at container BOOT against crafton_pr<N> (advisory-locked)
  │     4. smoke test: /openapi.json → signup → login → /me  (against the isolated DB)
  │     5. comment the preview URL + DB name on the PR
  └─ crafton-web  → preview-deploy.yml
        1. resolve the live crafton-api-dev URL
        2. docker build + push  web:pr<N>-<sha>  (NEXT_PUBLIC_API_BASE_URL baked)
        3. gcloud run deploy crafton-web-dev --no-traffic --tag pr<N>
        4. smoke test: GET / → 2xx/3xx ; comment the URL

PR merged → push to main → existing ci.yml `deploy` job (unchanged; prod `crafton` DB)
PR closed → preview-cleanup.yml → remove tag → delete pr<N> revisions → drop crafton_pr<N> (api only)
```

**Deterministic URL.** A tagged Cloud Run revision is reachable at
`https://pr<N>---<service-host>`. The workflows read the live service host with
`gcloud run services describe … --format='value(status.url)'` and prefix `pr<N>---`,
so the URL is knowable from the PR number — which is what lets the web build bake
the API URL and the API smoke test hit the preview before any traffic shifts.

## What lives where

| Block | Files | Repo |
|---|---|---|
| App plumbing (db-name swap + advisory lock) | `app/core/config.py`, `app/db/session.py`, `migrations/env.py` | crafton-api |
| Workflows | `.github/workflows/preview-deploy.yml`, `preview-cleanup.yml`; `ci.yml` migration guard | crafton-api, crafton-web |
| Governance | `.github/CODEOWNERS` | crafton-api, crafton-web |
| IAM | `infra/terraform/environments/dev/cicd.tf` (custom `craftonPreviewDbManager` role) | crafton-infra |

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
the same preview revision — so they can't corrupt the schema. It must be **inside**
`context.begin_transaction()`: running any statement before it makes SQLAlchemy
autobegin a transaction that Alembic never commits, and on a fresh DB all the DDL
silently rolls back. The lock is per-database, so prod and each `crafton_pr<N>` lock
independently, and it also hardens the existing prod migrate-at-boot.

## Block B — workflows

`pull_request_target` runs the workflow **and its credentialed steps from `main`**,
guarded to **same-repo, non-draft** PRs (fork PRs can't mint a WIF token and are
skipped). The isolated DB, the `--no-traffic --tag pr<N>` revision, and the
smoke/cleanup steps follow the mental model above. Cleanup is best-effort and
**ordered**: remove the tag → delete the `crafton-<svc>-pr<N>-*` revisions → drop
`crafton_pr<N>` (removing the tag before the revision is required, or the delete
fails). Cleanup also exposes `workflow_dispatch` (input `pr_number`) so the owner
can reclaim a leaked preview from the Actions tab.

`ci.yml` gains an **"exactly one migration head"** guard (two heads → rebase/merge
the graph before it can deploy, since previews and prod both migrate at boot).

## CraftOn-specific divergences from the MuchoKarte playbook

- **Runner build, not Cloud Build.** CraftOn's existing deploy jobs `docker build`
  on the GitHub runner and `gcloud run …`; the previews do the same for consistency.
  Trade-off: the PR's Dockerfile runs on a runner holding the WIF token — accepted
  for a trusted in-repo team, and bounded by the same-repo guard + CODEOWNERS on
  `**/Dockerfile`. (Revisit — adopt Cloud Build's build-SA isolation — before taking
  outside contributors.)
- **Migrate at container boot, not a separate migrate job.** CraftOn's API image
  entrypoint is `alembic upgrade head && uvicorn`, so the preview revision migrates
  itself against `crafton_pr<N>`; the advisory lock covers multi-instance races.
- **Empty preview DB (no prod clone).** Dev uses fake auth, so the smoke test's own
  signup seeds what it needs. No PII is copied into previews.
- **`CRAFTON_DB_NAME`** (not `DB_NAME`) — CraftOn's env prefix. Previews also set
  `CRAFTON_STORAGE_MODE=fake` so they don't write to the shared uploads bucket.

## One-time owner setup (not done by the pipeline)

1. **`make tf-apply`** (dev) to create the `craftonPreviewDbManager` role and bind it
   to `crafton-deployer@…` (Terraform apply stays manual). This is the only hard
   prerequisite — without it the "Create per-PR database" step can't run.
2. **Branch protection on `main`** in both app repos (GitHub UI): require a PR,
   require review from Code Owners, required status checks (`lint-type-test`; the API
   also runs the migration-head guard inside that job), no direct pushes.
3. Because the workflows run from `main` (`pull_request_target`), a pipeline change
   only takes effect after it's merged — the PR that introduces it can't validate
   itself. App-code PRs take effect immediately (built from PR head).

> **No Postgres schema grant is needed.** Cloud SQL automatically makes users
> created through its Admin API (`crafton_app`) members of `cloudsqlsuperuser`, and
> `gcloud sql databases create` makes the new DB owned by that role — so `crafton_app`
> can create tables in a fresh `crafton_pr<N>`'s `public` schema, and the generic
> PG15+ "no CREATE on public" restriction never bites. Verified end-to-end by the
> first preview PR (signup wrote to `crafton_pr1` with no grant). If you ever see
> *permission denied for schema public*, the one-time fix is
> `GRANT ALL ON SCHEMA public TO crafton_app;` on `template1`.

## Gotchas (already handled in the code)

- Advisory lock **inside** the Alembic transaction, first statement.
- Liveness polls **`/openapi.json`**, not `/healthz` (GFE returns 404 for `/healthz`
  on `*.run.app` — see STATUS.md).
- `--update-env-vars` (merge), not `--set-env-vars` (wipes the rest of the env);
  attach `--service-account` + `--add-cloudsql-instances` + `--update-secrets`
  explicitly on the preview revision (template inheritance is unreliable → 500s).
- Cleanup order: remove tag → delete revisions → drop DB.
- The GitHub bot may lack `actions:write`; run `preview-cleanup` `workflow_dispatch`
  from the Actions tab if a preview leaks.

## Identifiers (dev)

`crafton-dev-500709` (#784671749504) · `asia-northeast1` · Cloud SQL `crafton-dev`
(user `crafton_app`, prod DB `crafton`, previews `crafton_pr<N>`) · AR repo
`crafton` · services `crafton-api-dev` / `crafton-web-dev` · runtime SA
`crafton-api-dev@…` · deployer SA `crafton-deployer@…` · WIF
`github-actions/github` · secret `crafton-db-url` · advisory-lock key `727274`.
