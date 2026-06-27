# ADR 0004 — Web/PWA first; Next.js; native (Flutter) later

**Status:** Accepted · 2026-06

## Context
The plan assumed a mobile app (Flutter or React Native). The owner chose to **start with
web/PWA** and has no mobile experience, delegating the mobile decision.

## Decision
- Phase 1 frontend is a **mobile-first, installable PWA** built with **Next.js (React +
  TypeScript)**, serving workers (mobile), contractors (mobile/desktop), and a gated
  admin area from one codebase.
- Notifications: web push where supported + **SMS fallback** for critical alerts.
- **Native app (Flutter)** is deferred to Phase 3 / "later," to be revisited only if PWA
  limits (notably iOS web-push reliability, background tasks, deep device integration)
  block core needs.

## Consequences
- Fastest path to a working app; no app-store review friction at MVP.
- One web codebase instead of web + 2 native targets.
- Risk: iOS PWA push is less reliable than native — mitigated by SMS fallback in Phase 1;
  re-evaluate for Phase 2/3 (no-show reminders depend on reliable push).
- React Native was considered and not chosen (we are not doing native first at all).
