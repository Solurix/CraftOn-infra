# ADR 0010 — Single monorepo (supersedes 0003)

**Status:** Accepted · 2026-07 · **Supersedes [0003](0003-multi-repo.md)**

## Context

ADR 0003 chose **multiple repositories** (`crafton` infra/docs, `crafton-api`,
`crafton-web`, `crafton-mobile`) for clean boundaries and independent release
cadence. In practice CRAFT-ON is developed **solo and GenAI-first**, and the split
turned out to be pure overhead for that workflow:

- **Cross-repo doc-sync obligations.** `crafton-api` and `crafton-web` both say
  "read the `crafton` repo docs first" and must update `crafton/docs/*` from another
  repo in the same change — a class of drift the golden rule exists to prevent.
- **Coordination cost.** A schema/API change spans an api PR and a web PR that must
  be kept in step; the web preview needed an explicit `api-pr:` opt-in to pair.
- **Per-repo CI.** Three CI setups, three branch-protection configs, three CODEOWNERS,
  and a WIF trust list enumerating each repo.

The `crafton-mobile` (Expo/React Native) client was a near-pure mirror of `crafton-web`
on the same API contract, carrying only platform glue (SecureStore token storage, a
custom i18n/theme, Expo build config). The installable **PWA covers Android/iOS**, so
the native app was cost without distinct product value.

## Decision

Consolidate into a **single monorepo** rooted at the existing infra repo
(`Solurix/CraftOn-infra`), mirroring the sibling MuchoKarte project's layout:

```
CraftOn-infra/            the monorepo
├── api/                  FastAPI backend (was crafton-api)
├── web/                  Next.js PWA (was crafton-web)
├── infra/terraform/      GCP IaC (environments/{dev,prod} + modules/)
├── docs/                 product / architecture / governance (source of truth)
├── scripts/              check.sh + helpers
├── .github/              consolidated workflows + CODEOWNERS
├── Makefile              single containerized entrypoint
└── docker-compose.yml    local db + api + web
```

- **Drop `crafton-mobile`.** Not carried into the monorepo; the PWA is the mobile story.
- **Keep the existing `environments/{dev,prod}` + `modules/` Terraform** (dev is applied
  and live) — not flattened to MuchoKarte's single-env style.
- Code moved by **clean copy** (no git-history subtree merge); the old repos remain as a
  read-only archive with a deprecation notice pointing here.

## Consequences

- **One CI pipeline** (`ci.yml`, path-filtered) with a single required `ci` check;
  **one preview pipeline** that deploys `crafton-{api,web}-dev-pr<N>` together and
  auto-pairs web → this PR's api preview (no opt-in label); one CODEOWNERS; one WIF
  trust entry (`Solurix/CraftOn-infra`, set in `environments/dev/variables.tf`).
- **Cross-repo doc-sync disappears** — code and its docs live and change together.
- **One-time owner action:** `make tf-apply` to update the WIF trust list, so Actions
  from the monorepo can impersonate the deployer SA (until applied, previews/deploys
  from this repo fail auth). Optionally rename the GitHub repo `CraftOn-infra` →
  `CraftOn` to match its new role (GitHub redirects the old name).
- The old app repos' git history stays in those repos (not carried here).
- Trade-off accepted: coarser blast radius than separate repos, mitigated by
  path-scoped CODEOWNERS and path-filtered CI.
