# 08 — Compliance & Legal Notes

> ⚠️ This is an engineering reference, **not legal advice**. The contract/tax/insurance/
> immigration schemes must be validated by qualified professionals (社労士 / 税理士 /
> 弁護士) before the Phase 2 logic goes live. When unsure, **flag the question** rather
> than invent a rule.

## The three identities (don't conflate)

| Concern | Question | What we need | Where |
|---|---|---|---|
| **Authentication** | "Same person logging in?" | Phone + SMS OTP (Firebase). No documents. | P1 |
| **Identity / work-eligibility** | "Real person, legally allowed to work?" | Residence card (non-JP) / photo ID (JP), checked once. | P1 manual → P2 eKYC |
| **Tax data** | "Withholding & records" | My Number — **avoid storing if at all possible**. | P2+ |

## My Number — do NOT store

- My Number is governed by its own law (マイナンバー法); collection is legal only for
  narrow tax/social-security purposes and triggers heavy obligations + liability.
- **Phase 1:** not needed at all (cash, no withholding).
- **Phase 2:** even with withholding, prefer **not** to warehouse raw My Numbers —
  delegate filing to the contractor or a payroll/tax partner.
- The マイナンバーカード (physical card) ≠ マイナンバー (the number). **JPKI** lets you
  verify identity using the card's certificate **without** reading/storing the number.

## Residence cards — verify, don't hoard

- Needed for **immigration compliance** (defending against 不法就労助長罪 — the
  "one-strike = shutdown" risk), **not** auth.
- "Verify" ≠ "store the image forever." Prefer storing **derived data** (expiry,
  work-restriction flag, "verified on X by Y") over the raw image. If images are kept:
  encrypt, least-privilege access, lifecycle/retention policy.
- **Hard gate (enforced from MVP):** a non-JP worker cannot be approved/confirmed
  without residence card on file + a non-expired visa. Card documents that an admin
  **rejected do not count** — a rejected card is treated as no card until re-uploaded.
  P1 = manual admin check; P2 = automated via eKYC + a nightly visa-expiry job that
  locks expired accounts.

## Available APIs (for Phase 2 integration)

**Government (official):**
- 在留カード等番号失効情報照会 — residence-card number validity/revocation check
  (Immigration Services Agency). Web/app, not a clean REST API.
- 在留カード等読取アプリ — NFC IC-chip authenticity reader.
- JPKI / デジタル認証アプリ — My Number **card** auth (OpenID Connect / OAuth2); no My
  Number exposed.

**Commercial eKYC (wrap the above; recommended):**
- **TRUSTDOCK** — identity + 在留資格 + 就労制限 + residence-card validity; explicitly
  targets gig/matching/staffing platforms hiring foreign workers. Strong fit.
- Alternatives: LIQUID eKYC, ProTech ID Checker, Polarify.

**Construction-specific:**
- CCUS (建設キャリアアップシステム) — API/linkage for accredited systems; holds verified
  IDs + qualifications. Could reduce raw document handling. Confirm access level.

## Contract / tax routing (Phase 2 logic; recorded in P1)

Auto-selected by `worker_class`:
- **`employee` (side job, employed elsewhere)** → **day-labor employment contract**
  (Timee-style). Site's labor insurance applies. Withholding tax auto-deducted (丙欄).
- **`freelance` (一人親方 / sole proprietor)** → **subcontract** (業務委託). No
  withholding (外注費). Requires proof of 一人親方労災 (personal labor insurance). System
  issues a proxy invoice (代理交付).

In Phase 1 we **record** the contract type and generate human-readable terms; we do
**not** run tax/insurance automation yet.

## Anti-disintermediation (中抜き)

- Mask phone/LINE/email/contact until match confirmed; filter 11-digit numbers and
  keywords ("LINE", "電話") in chat. Enforce **server-side** (authoritative) + client-side
  (UX warning). `contact_mask_enabled` flag stays ON.
- Reinforce with app-only value (auto safety docs, insurance) in later phases.

## Personal data (APPI)

- Store personal data in **asia-northeast1 (Tokyo)**.
- Encrypt sensitive images at rest; signed URLs for access; least-privilege IAM.
- Define retention/deletion for ID documents; never log raw document contents.
- No My Number in logs, code, or repos.

## Open legal questions (need professional sign-off — track in STATUS.md)
- Exact wording of the auto-generated employment / subcontract terms.
- Whether the platform may ever hold My Number, or must always delegate.
- Insurance partner & policy structure (損保ジャパン / 東京海上 / AIG) for the 1-day
  add-on; how/when it attaches.
- Factoring partner contract terms (NP掛け払い / Money Forward Kessai) incl. receivable
  assignment clause in the contractor ToS.
- Working-hour aggregation across employers (複数事業所通算) handling.
