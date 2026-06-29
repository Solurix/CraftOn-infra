# Architecture Decision Records (ADRs)

Short records of significant, hard-to-reverse decisions. Format: Context → Decision →
Consequences. To change a decision, add a new ADR that supersedes the old one (don't
silently edit history) and update affected docs.

| # | Decision | Status |
|---|---|---|
| [0001](0001-cloud-gcp.md) | Cloud provider: GCP, Tokyo region | Accepted |
| [0002](0002-backend-python-fastapi.md) | Backend: Python + FastAPI + Postgres | Accepted |
| [0003](0003-multi-repo.md) | Multi-repo (not monorepo) | Accepted |
| [0004](0004-web-pwa-first.md) | Web/PWA first; Next.js; mobile (Flutter) later | Accepted |
| [0005](0005-vertex-ai-gemini.md) | AI via Vertex AI, Gemini models | Accepted |
| [0006](0006-terraform-iac.md) | Terraform for IaC | Accepted |
| [0007](0007-auth-firebase-phone.md) | Auth: Firebase phone OTP | Accepted (amended by 0009) |
| [0008](0008-i18n-ja-default-en-full.md) | i18n: Japanese default, full English, English dev language | Accepted |
| [0009](0009-password-login-session-tokens.md) | Password login (username/email/phone) + API session tokens; OTP only at registration | Accepted |
