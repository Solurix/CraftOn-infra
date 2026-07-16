// Remembered accounts on this device, so a returning user can log in (or switch
// between worker/contractor/admin) without retyping their phone number.
//
// We persist only non-secret identity (phone, display name, role) — NOT a
// long-lived credential. In fake auth mode the token is deterministic from the
// phone, so a remembered account re-logs-in with no OTP; in firebase mode we use
// it to pre-fill the phone and re-run OTP.

export type RememberedAccount = {
  phone: string;
  displayName: string;
  role: string;
  lastUsedAt: number;
};

export const ACCOUNTS_STORAGE_KEY = "crafton.accounts";
const KEY = ACCOUNTS_STORAGE_KEY;

// Cap the remembered list — it holds PII (phone + name), so don't let it grow
// unbounded on a shared device; keep only the most-recently-used few.
const MAX_ACCOUNTS = 8;

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadAccounts(): RememberedAccount[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as RememberedAccount[])
      .filter((a) => a && typeof a.phone === "string")
      .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
  } catch {
    return [];
  }
}

function save(accounts: RememberedAccount[]): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(KEY, JSON.stringify(accounts));
}

// Insert or update an account (keyed by phone), stamping last-used = now.
export function rememberAccount(
  account: Omit<RememberedAccount, "lastUsedAt">,
  now: number = Date.now(),
): RememberedAccount[] {
  const others = loadAccounts().filter((a) => a.phone !== account.phone);
  const next = [{ ...account, lastUsedAt: now }, ...others]
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, MAX_ACCOUNTS);
  save(next);
  return next;
}

export function forgetAccount(phone: string): RememberedAccount[] {
  const next = loadAccounts().filter((a) => a.phone !== phone);
  save(next);
  return next;
}
