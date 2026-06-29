# ADR 0009 — Password login + API-issued session tokens

**Status:** Accepted · 2026-06 · **amends [ADR 0007](0007-auth-firebase-phone.md)**

## Context
ADR 0007 made Firebase phone OTP the login method for every session, with the API
staying stateless by trusting the Firebase ID token on each request. Product now wants
returning users to sign in with **email / username / phone number + password**, and to
require **SMS OTP only during registration** (not on every login). Username is not a
Firebase-native identity, and re-running OTP on each login is the friction we want to
remove.

## Decision
- **Registration** still requires phone-number ownership via **Firebase phone OTP**. At
  `POST /auth/session` the API verifies the OTP token and captures the user's
  **username, email, and password** (all required; phone stays the canonical identity).
- **Returning login** is `POST /auth/login` with an **identifier (username | email |
  phone) + password** — no OTP. Username/email are matched case-insensitively.
- On successful registration or login the API issues its **own signed session token**
  (HS256 JWT, stdlib-signed, short-lived; secret + TTL via config). This token — not a
  Firebase token — authenticates every subsequent request. The auth dependency accepts
  either an app session token (normal case) or, at registration, the OTP token.
- Passwords are stored as PBKDF2-HMAC-SHA256 hashes (existing `core.security`).
- A bootstrap admin (`admin` / `admin`) is seeded by migration for fresh environments;
  it is a weak credential to **rotate/remove before production**.

## Consequences
- The API is no longer purely "trust Firebase per request": it is now a small token
  authority. Tokens are stateless JWTs (no server session store); revocation is
  best-effort until tokens are bound to the device record (follow-up).
- `users` gains unique `username` and `email` columns (see `05-data-model.md`).
- Firebase Auth is still used, but only for the registration OTP step; web/mobile only
  need the OTP flow there.
- Security follow-ups before wide exposure: per-identifier + per-IP rate limiting /
  lockout on failed logins, a real `CRAFTON_SESSION_SECRET` from Secret Manager, and
  device-bound revocation.
