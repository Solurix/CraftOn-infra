# 07 — Configuration & Feature Flags

Principle (your instruction): **start permissive; make everything a variable.** No
business limit is hardcoded. Defaults live in env/Terraform; some are runtime-editable by
admin (backed by the `app_config` table — see `05-data-model.md`).

## How config is layered
1. **Terraform** sets infra-level + default env values per environment.
2. **Env vars** (injected via Secret Manager / Cloud Run) configure the running service.
3. **`app_config` table** allows admin runtime overrides for business knobs.
4. **Feature flags** gate whole features on/off per phase/environment.

Precedence: runtime `app_config` override → env var → built-in default.

## Business config (with Phase 1 defaults)

| Key | Default | Meaning |
|---|---|---|
| `service_area_prefectures` | `["Tokyo","Kanagawa","Saitama","Chiba"]` | Allowed job areas (Greater Tokyo). Empty list = no restriction. |
| `service_area_enforce` | `false` → set `true` at launch | If false, area is not enforced (most permissive). |
| `allowed_trades` | `[]` (empty = any) | If non-empty, restrict trades. |
| `platform_fee_per_match` | `3000` | Phase 1 flat fee (JPY). |
| `commission_rate` | `0.15` _(P2)_ | Phase 2 commission. |
| `worker_management_fee_monthly` | `220` _(P2)_ | Phase 2 per-worker/month. |
| `subscription_management_monthly` | `29800` _(P3)_ | Phase 3 management plan. |
| `spot_plan_commission_rate` | `0.25` _(P3)_ | Phase 3 spot plan. |
| `withholding_threshold_jpy` | `9300` _(P2)_ | Below this, no withholding (丙欄). |
| `noshow_confirm_hour_local` | `20` | Night-before confirm deadline (Asia/Tokyo). _(reminders P2)_ |
| `noshow_morning_lead_minutes` | `120` | "Departed" button lead time. _(P2)_ |
| `checkin_radius_meters` | `500` | GPS check-in radius. _(GPS verify P2)_ |
| `weekly_work_hours_cap` | `null` (no cap) | Optional weekly cap; null = permissive. |
| `student_visa_weekly_hours` | `28` _(P2)_ | Legal cap for restricted visas; enforced P2. |
| `require_freelance_insurance` | `true` | Block confirming uninsured 一人親方. Toggle if needed early. |
| `penalty_thresholds` | `{warn:1, restrict:2, ban:3}` _(P2)_ | No-show penalty steps. |
| `default_language` | `"ja"` | |
| `supported_languages` | `["ja","en"]` | Add `vi`, `id` later. |

## Feature flags (Phase 1 defaults)

| Flag | Default | Gates |
|---|---|---|
| `payments_enabled` | `false` | In-app payment, wallet, payout (P2). |
| `withholding_enabled` | `false` | Auto withholding tax (P2). |
| `factoring_enabled` | `false` | BtoB factoring (P2). |
| `insurance_autoattach_enabled` | `false` | 1-day add-on insurance (P2). |
| `ekyc_enabled` | `false` | Automated residence-card validity / restriction (P2). |
| `auto_checkin_enabled` | `false` | QR/GPS auto check-in (P2). |
| `auto_penalties_enabled` | `false` | Automated no-show penalties + recovery (P2). |
| `translation_enabled` | `false` | Machine translation (P3). |
| `ai_instruction_sheets_enabled` | `false` | Vertex AI Gemini sheets (P3). |
| `greensite_export_enabled` | `false` | Green Site / CCUS CSV (P3). |
| `subscriptions_enabled` | `false` | Subscription plans (P3). |
| `supervisor_matching_enabled` | `false` | Spot-supervisor matching (P3). |
| `waitlist_out_of_area` | `true` | Show waitlist screen outside service area. |
| `contact_mask_enabled` | `true` | Contact masking in chat (keep ON — core value). |
| `visa_gate_enabled` | `true` | Non-JP visa gate (keep ON — legal). |
| `auto_approve_users` | `false` | When ON, finishing onboarding approves the account automatically (no manual vetting); turning it on also clears the existing pending backlog. The non-JP visa gate still applies (a worker who fails it stays pending). Handy for dev/testing. |

## Auth / session (infra-level env settings)

Not in `app_config` (these are app/infra settings read once at startup, like
`CRAFTON_AUTH_MODE`), but listed here so they aren't hardcoded. See ADR 0009.

| Env var | Default | Meaning |
|---|---|---|
| `CRAFTON_SESSION_SECRET` | dev placeholder | HMAC key signing the API's HS256 session tokens. **Must** be a real secret (Secret Manager) in staging/prod. |
| `CRAFTON_SESSION_TTL_SECONDS` | `604800` (7d) | Lifetime of an issued session token. |

## Rules for AI sessions
- Never hardcode any value that appears in this file — read it from config.
- Adding a new tunable? Add it here **and** to the config mechanism in the same change.
- Keep defaults **permissive** unless the value is a legal/compliance gate
  (`contact_mask_enabled`, `visa_gate_enabled`, `require_freelance_insurance`).
