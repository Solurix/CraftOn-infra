# ADR 0002 — Backend: Python + FastAPI + PostgreSQL

**Status:** Accepted · 2026-06 (supersedes an earlier lean toward Node/NestJS)

## Context
The plan suggested "Node.js / Go / Python." The owner chose **Python**. The domain has a
relational data model (UUIDs, enums, FKs), AI/translation integration, and batch jobs.

## Decision
- **FastAPI** (async, Pydantic validation, auto OpenAPI docs).
- **SQLAlchemy** ORM + **Alembic** migrations.
- **PostgreSQL** on **Cloud SQL**.
- **pytest** for tests.
- Alternative considered: **Django** (free admin panel) — kept as a fallback if we want
  batteries-included admin; default remains FastAPI + a small Next.js admin.

## Consequences
- Best-supported Vertex AI / Gemini SDK; tax logic already drafted in Python; batch jobs
  natural as Python Cloud Run Jobs.
- Trade-off: more than one language across repos (Python API, TypeScript web). Acceptable.
- Web client consumes the generated OpenAPI schema for typed access (no duplicate types).
- All schema changes are Alembic migrations; never hand-edit the DB.
