# ADR 0007 — Auth: Firebase Auth (phone OTP)

**Status:** Accepted · 2026-06 · **amended by [ADR 0009](0009-password-login-session-tokens.md)**

> **Amendment (ADR 0009):** phone OTP is now used **only at registration** to verify
> phone ownership. Returning users log in with an identifier (username / email / phone)
> + password, and the API issues its **own signed session token** for subsequent
> requests rather than verifying a Firebase token each time.

## Context
The data model uses phone number as the login identifier. We need SMS OTP, low ops
burden, and web (PWA) support now, mobile later.

## Decision
- Use **Firebase Authentication** with **phone-number OTP** as the login method for all
  roles (worker, contractor, admin).
- The frontend handles the OTP flow; the **API verifies the Firebase ID token** and maps
  it to a `users` row.
- Identity/work-eligibility verification (residence card, eKYC, JPKI) is a **separate
  concern** from auth (see `08-compliance-legal.md`) and is not part of login.

## Consequences
- SMS OTP handled by Google infra; no separate SMS provider needed for auth (Twilio
  remains an option for non-auth SMS, e.g. critical alerts/fallback).
- Works on web today; reusable if a native app is added later.
- API stays stateless: it trusts verified Firebase tokens, not its own session store.
- Admin accounts use the same mechanism with elevated `user_type`.
