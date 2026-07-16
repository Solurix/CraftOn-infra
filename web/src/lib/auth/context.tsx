"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiClient, ApiError, AUTH_EXPIRED_EVENT } from "@/lib/api/client";
import type { Me, SessionCreate } from "@/lib/api/models";
import {
  ACCOUNTS_STORAGE_KEY,
  forgetAccount as forgetAccountStore,
  loadAccounts,
  rememberAccount,
  type RememberedAccount,
} from "./accounts";
import { makeFakeToken } from "./fakeToken";

const TOKEN_KEY = "crafton.token";
const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE ?? "fake";

type AuthContextValue = {
  token: string | null;
  me: Me | null;
  loading: boolean;
  api: ApiClient;
  authMode: string;
  accounts: RememberedAccount[];
  loginWithPhone: (phone: string, code: string) => Promise<{ needsSignup: boolean }>;
  loginWithIdentifier: (identifier: string, password: string) => Promise<void>;
  resetPassword: (phone: string, code: string, password: string) => Promise<void>;
  switchAccount: (phone: string) => Promise<{ needsSignup: boolean }>;
  forgetAccount: (phone: string) => void;
  completeSignup: (body: SessionCreate) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function obtainToken(phone: string, _code: string): Promise<string> {
  if (AUTH_MODE === "firebase") {
    // Integration point: run Firebase phone-OTP here and return the ID token.
    // Phase 1 dev/CI/E2E use the fake verifier; wire firebase-web when going live.
    throw new ApiError(0, "auth_mode", "Firebase auth mode is not bundled in this build.");
  }
  return makeFakeToken(phone);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<RememberedAccount[]>([]);

  const api = useMemo(() => new ApiClient(token), [token]);

  // Record the signed-in identity (non-secret) so it can be re-used later.
  const remember = useCallback((m: Me) => {
    setAccounts(
      rememberAccount({
        phone: m.user.phone_number,
        displayName: m.user.display_name,
        role: m.user.user_type,
      }),
    );
  }, []);

  const fetchMe = useCallback(
    async (t: string): Promise<Me | null> => {
      try {
        const m = await new ApiClient(t).me();
        setMe(m);
        remember(m);
        return m;
      } catch {
        setMe(null);
        return null;
      }
    },
    [remember],
  );

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setAccounts(loadAccounts());
    const stored = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored);
    void fetchMe(stored).finally(() => setLoading(false));
  }, [fetchMe]);

  // Keep tabs in sync (login/logout/account changes in another tab).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) {
        const next = e.newValue;
        if (!next) {
          setToken(null);
          setMe(null);
        } else {
          setToken(next);
          void fetchMe(next);
        }
      } else if (e.key === ACCOUNTS_STORAGE_KEY) {
        setAccounts(loadAccounts());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [fetchMe]);

  // Extracted so the effect below can key on the status string itself (the
  // exhaustive-deps rule rejects member expressions in the deps array).
  const meStatus = me?.user.status;

  // Keep `me` fresh without a hard reload: refetch on window focus /
  // visibilitychange (throttled to once per 30s so the two firing together
  // don't double-fetch), and, while the account is still pending, poll every
  // 30s so an admin approval flips "under review" screens automatically.
  useEffect(() => {
    if (!token) return;
    const REFRESH_MS = 30_000;
    // Start the throttle window now: this effect (re)mounts right after a
    // successful fetch (hydrate/login/status change), so an immediate
    // focus/visibility event shouldn't refetch again.
    let last = Date.now();
    const refetch = () => {
      last = Date.now();
      void fetchMe(token);
    };
    const onWake = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - last < REFRESH_MS) return;
      refetch();
    };
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    // Only pending accounts poll; approved/suspended rely on focus refresh.
    const interval =
      meStatus === "pending" ? window.setInterval(refetch, REFRESH_MS) : undefined;
    return () => {
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [token, meStatus, fetchMe]);

  // The API client fires this on a 401 to an authenticated request (e.g. this
  // device was revoked) — drop the session so the app falls back to /login.
  useEffect(() => {
    const onExpired = () => {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setMe(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const loginWithPhone = useCallback(
    async (phone: string, code: string) => {
      const prevToken =
        typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
      const t = await obtainToken(phone, code);
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      let m: Me;
      try {
        m = await new ApiClient(t).me();
      } catch (e) {
        // Valid token but no app user yet → needs signup. Keep the new token (the
        // onboarding step uses it) but clear any stale identity from a prior account.
        if (e instanceof ApiError && e.status === 401) {
          setMe(null);
          return { needsSignup: true };
        }
        // Unexpected failure (network/5xx): roll back so a failed switch doesn't
        // strand the app with a new token but the previous account's `me`.
        if (prevToken) {
          localStorage.setItem(TOKEN_KEY, prevToken);
          setToken(prevToken);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
        throw e;
      }
      setMe(m);
      remember(m);
      return { needsSignup: false };
    },
    [remember],
  );

  // Returning login without OTP: identifier (username/email/phone) + password →
  // the API issues a signed session token.
  const loginWithIdentifier = useCallback(
    async (identifier: string, password: string) => {
      const prevToken =
        typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
      const { token: t } = await new ApiClient(null).login(identifier, password);
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      const m = await fetchMe(t);
      if (!m) {
        // /me failed under the new token → roll back rather than sit on a token
        // with no identity.
        if (prevToken) {
          localStorage.setItem(TOKEN_KEY, prevToken);
          setToken(prevToken);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
        throw new ApiError(0, "login_failed", "login_failed");
      }
    },
    [fetchMe],
  );

  // Forgot-password: re-verify the phone by OTP, set a new password, and stay
  // logged in with the session token the API returns. SMS only proves phone
  // ownership here — consistent with the OTP-at-registration-only model.
  const resetPassword = useCallback(
    async (phone: string, code: string, password: string) => {
      const otp = await obtainToken(phone, code);
      const { token: t } = await new ApiClient(otp).resetPassword(password);
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      await fetchMe(t);
    },
    [fetchMe],
  );

  // Switch to a remembered account. In fake mode this is a no-OTP re-login; in
  // firebase mode obtainToken throws and the caller falls back to the phone form.
  const switchAccount = useCallback(
    (phone: string) => loginWithPhone(phone, ""),
    [loginWithPhone],
  );

  const forgetAccount = useCallback(
    (phone: string) => {
      setAccounts(forgetAccountStore(phone));
      // Forgetting the active account also ends its session — otherwise the next
      // /me fetch would silently re-add it and the device would stay signed in.
      if (me?.user.phone_number === phone) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setMe(null);
      }
    },
    [me],
  );

  const completeSignup = useCallback(
    async (body: SessionCreate) => {
      // Read the token from localStorage FIRST: loginWithPhone stores the fresh
      // OTP token there synchronously, while the `token` state in this closure
      // can still be a previous account's session token when signup runs in the
      // same handler (state doesn't re-render mid-handler). Preferring the
      // stale state token made "add account while logged in" silently return
      // the already-logged-in user instead of registering the new one.
      const otp =
        (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null) ?? token;
      if (!otp) throw new Error("no token");
      // Registration verifies the OTP token and returns a durable session token
      // (SMS is only needed here) — swap to it so the device stays logged in
      // without the one-time OTP token.
      const res = await new ApiClient(otp).createSession(body);
      const sessionToken = res.token ?? otp;
      localStorage.setItem(TOKEN_KEY, sessionToken);
      setToken(sessionToken);
      await fetchMe(sessionToken);
    },
    [token, fetchMe],
  );

  const refresh = useCallback(async () => {
    if (token) await fetchMe(token);
  }, [token, fetchMe]);

  // Ends the active session; keeps the remembered-accounts list for quick re-login.
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setMe(null);
  }, []);

  const value: AuthContextValue = {
    token,
    me,
    loading,
    api,
    authMode: AUTH_MODE,
    accounts,
    loginWithPhone,
    loginWithIdentifier,
    resetPassword,
    switchAccount,
    forgetAccount,
    completeSignup,
    refresh,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
