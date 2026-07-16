"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { PhoneInput } from "@/components/PhoneInput";
import { useToast } from "@/components/Toast";
import { ErrorText, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";
import { isValidNationalNumber, splitPhone } from "@/lib/phone";

type Mode = "login" | "signup" | "reset";
type Role = "worker" | "contractor";

// Same shape the API enforces (normalized lower-case server-side).
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;

// Inline, per-field validation message (shown only once the field has input,
// so an empty form isn't a wall of red).
function FieldHint({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function LoginPage() {
  // Landing-page CTAs link to /login?mode=signup to open the sign-up flow directly.
  const searchParams = useSearchParams();
  const initialMode: Mode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const legal = useTranslations("legal");
  const {
    loginWithPhone,
    loginWithIdentifier,
    resetPassword,
    forgetAccount,
    completeSignup,
    accounts,
  } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>(initialMode);
  // Signup starts by choosing a role — that is the first decision, before details.
  const [role, setRole] = useState<Role | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  // Login: a single identifier (username / email / phone).
  const [identifier, setIdentifier] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Field-level validity (signup/reset). The buttons stay disabled and each
  // invalid field explains itself, instead of the server's generic 422.
  const usernameOk = USERNAME_RE.test(username);
  const emailOk = EMAIL_RE.test(email);
  const phoneOk = phone !== "" && isValidNationalNumber(splitPhone(phone).national);
  const passwordOk = password.length >= PASSWORD_MIN;

  const goAfterLogin = (needsSignup: boolean) =>
    router.replace(needsSignup ? "/onboarding" : "/");

  const reset = () => {
    setRole(null);
    setUsername("");
    setEmail("");
    setPhone("");
    setPassword("");
    setIdentifier("");
    setCode("");
    setCodeSent(false);
    setError("");
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    reset();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") {
        await loginWithIdentifier(identifier, password);
        router.replace("/");
        return;
      }
      if (mode === "reset") {
        // Forgot-password: OTP proves phone ownership, then set a new password.
        await resetPassword(phone, code, password);
        router.replace("/");
        return;
      }
      // Signup: OTP proves phone ownership, then we register the credentials.
      const { needsSignup } = await loginWithPhone(phone, code);
      if (needsSignup && role) {
        // No display name asked at signup — it's derived from the profile
        // (company name / worker name) and editable later in settings.
        await completeSignup({
          user_type: role,
          username,
          email,
          password,
        });
        router.replace("/onboarding");
      } else {
        // The phone already has an account: OTP proved ownership, so we sign
        // into it — but say so instead of silently ignoring the signup form.
        if (needsSignup === false) toast.info(t("phoneAlreadyRegistered"));
        goAfterLogin(needsSignup);
      }
    } catch (err) {
      setError(humanizeError(err, common("networkError")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-sm space-y-4">
        <h1 className="text-lg font-bold tracking-tight sm:text-xl">
          {mode === "login"
            ? t("loginTitle")
            : mode === "reset"
              ? t("resetTitle")
              : t("signupTab")}
        </h1>

        {mode === "reset" ? (
          <form onSubmit={submit} className="card space-y-4">
            <p className="text-sm text-gray-600">{t("resetHint")}</p>
            <div>
              <label className="field-label" htmlFor="reset-phone">
                {t("phoneLabel")}
              </label>
              <PhoneInput id="reset-phone" value={phone} onChange={setPhone} required />
              <FieldHint show={!!phone && !phoneOk} message={t("phoneInvalid")} />
            </div>
            {!codeSent ? (
              <button
                type="button"
                className="btn-primary w-full"
                disabled={!phoneOk}
                onClick={() => setCodeSent(true)}
              >
                {t("sendCode")}
              </button>
            ) : (
              <>
                <div>
                  <label className="field-label" htmlFor="reset-code">
                    {t("codeLabel")}
                  </label>
                  <input
                    id="reset-code"
                    className="field-input"
                    placeholder={t("codePlaceholder")}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-400">{t("devHint")}</p>
                </div>
                <div>
                  <label className="field-label" htmlFor="reset-password">
                    {t("newPasswordLabel")}
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    className="field-input"
                    minLength={PASSWORD_MIN}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <FieldHint
                    show={!!password && !passwordOk}
                    message={t("passwordTooShort", { min: PASSWORD_MIN })}
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={busy || !code || !passwordOk}
                >
                  {busy ? common("loading") : t("resetSubmit")}
                </button>
              </>
            )}
            <ErrorText message={error} />
            <button
              type="button"
              className="link text-sm"
              onClick={() => switchMode("login")}
            >
              ← {t("loginTitle")}
            </button>
          </form>
        ) : (
          <>{/* login / signup */}

        {/* Sign up: choose role FIRST, before entering any details. */}
        {mode === "signup" && !role ? (
          <div className="space-y-3">
            <h2 className="font-semibold">{t("chooseRole")}</h2>
            {/* Two self-explanatory role cards instead of bare buttons. */}
            <button
              type="button"
              className="card card-hover flex w-full items-center gap-3 text-left"
              onClick={() => setRole("worker")}
            >
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-xl"
                aria-hidden
              >
                🔨
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{t("roleWorker")}</span>
                <span className="block text-sm text-gray-500">{t("roleWorkerDesc")}</span>
              </span>
              <span className="ml-auto text-gray-300" aria-hidden>
                ›
              </span>
            </button>
            <button
              type="button"
              className="card card-hover flex w-full items-center gap-3 text-left"
              onClick={() => setRole("contractor")}
            >
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-xl"
                aria-hidden
              >
                🏗️
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{t("roleContractor")}</span>
                <span className="block text-sm text-gray-500">{t("roleContractorDesc")}</span>
              </span>
              <span className="ml-auto text-gray-300" aria-hidden>
                ›
              </span>
            </button>
          </div>
        ) : (
          <>
            {mode === "login" && accounts.length > 0 && (
              <div className="card space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {t("recentAccounts")}
                </p>
                {accounts.map((a) => (
                  <div key={a.phone} className="flex items-center justify-between">
                    <button
                      onClick={() => setIdentifier(a.phone)}
                      disabled={busy}
                      className="flex-1 rounded px-2 py-2 text-left hover:bg-gray-100"
                    >
                      <span className="font-medium">{a.displayName}</span>{" "}
                      <span className="text-xs text-gray-500">{a.role}</span>
                      <span className="block text-xs text-gray-400">{a.phone}</span>
                    </button>
                    <button
                      onClick={() => forgetAccount(a.phone)}
                      aria-label={t("forgetNamed", { name: a.displayName })}
                      className="px-3 py-2 text-gray-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={submit} className="card space-y-4">
              {mode === "signup" && (
                <button
                  type="button"
                  onClick={reset}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  ← {t("chooseRole")}
                </button>
              )}

              {mode === "login" ? (
                <>
                  <div>
                    <label className="field-label" htmlFor="identifier">
                      {t("identifierLabel")}
                    </label>
                    <input
                      id="identifier"
                      className="field-input"
                      placeholder={t("identifierPlaceholder")}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="password">
                      {t("passwordLabel")}
                    </label>
                    <input
                      id="password"
                      type="password"
                      className="field-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={busy || !identifier || !password}
                  >
                    {busy ? common("loading") : t("verify")}
                  </button>
                  <button
                    type="button"
                    className="link text-xs"
                    onClick={() => switchMode("reset")}
                  >
                    {t("forgotPassword")}
                  </button>
                </>
              ) : (
                <>
                  {/* Signup: collect credentials only; the public display name
                      comes from the profile (worker/company name) and can be
                      changed later in settings. */}
                  <div>
                    <label className="field-label" htmlFor="username">
                      {t("usernameLabel")}
                    </label>
                    <input
                      id="username"
                      className="field-input"
                      placeholder={t("usernamePlaceholder")}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoCapitalize="none"
                      required
                    />
                    <FieldHint
                      show={!!username && !usernameOk}
                      message={t("usernameInvalid")}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="email">
                      {t("emailLabel")}
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="field-input"
                      placeholder={t("emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoCapitalize="none"
                      required
                    />
                    <FieldHint show={!!email && !emailOk} message={t("emailInvalid")} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="phone">
                      {t("phoneLabel")}
                    </label>
                    <PhoneInput id="phone" value={phone} onChange={setPhone} required />
                    <FieldHint show={!!phone && !phoneOk} message={t("phoneInvalid")} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="signup-password">
                      {t("passwordLabel")}
                    </label>
                    <input
                      id="signup-password"
                      type="password"
                      className="field-input"
                      minLength={PASSWORD_MIN}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <FieldHint
                      show={!!password && !passwordOk}
                      message={t("passwordTooShort", { min: PASSWORD_MIN })}
                    />
                  </div>

                  {!codeSent ? (
                    <button
                      type="button"
                      className="btn-primary w-full"
                      disabled={!usernameOk || !emailOk || !phoneOk || !passwordOk}
                      onClick={() => setCodeSent(true)}
                    >
                      {t("sendCode")}
                    </button>
                  ) : (
                    <>
                      <div>
                        <label className="field-label" htmlFor="code">
                          {t("codeLabel")}
                        </label>
                        <input
                          id="code"
                          className="field-input"
                          placeholder={t("codePlaceholder")}
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          required
                        />
                        <p className="mt-1 text-xs text-gray-400">{t("devHint")}</p>
                      </div>
                      <button
                        type="submit"
                        className="btn-primary w-full"
                        disabled={busy || !code}
                      >
                        {busy ? common("loading") : t("createAccount")}
                      </button>
                    </>
                  )}
                </>
              )}
              <ErrorText message={error} />
            </form>
          </>
        )}
          </>
        )}

        {mode !== "reset" && (
          <p className="text-center text-sm text-gray-500">
            {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
            <button
              type="button"
              className="link"
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? t("signupTab") : t("loginTitle")}
            </button>
          </p>
        )}

        <p className="text-center text-xs text-gray-400">
          <Link href="/terms" className="link">
            {legal("terms")}
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="link">
            {legal("privacy")}
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

// useSearchParams() requires a Suspense boundary under the App Router.
export default function LoginPageRoute() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginPage />
    </Suspense>
  );
}
