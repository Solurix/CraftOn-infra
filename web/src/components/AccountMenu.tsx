"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";

// Header account chip + dropdown: shows the current account and lets the user
// switch to another remembered account (one tap in fake mode), add a new one,
// or log out. Remembered accounts persist across reloads on the device.
export function AccountMenu() {
  const { me, accounts, switchAccount, forgetAccount, logout, authMode } = useAuth();
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on Escape and return focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!me) return null;
  const others = accounts.filter((a) => a.phone !== me.user.phone_number);

  const pick = async (phone: string) => {
    setError("");
    if (authMode === "firebase") {
      setOpen(false);
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      const { needsSignup } = await switchAccount(phone);
      setOpen(false);
      router.replace(needsSignup ? "/onboarding" : "/");
    } catch (e) {
      setError(humanizeError(e, common("networkError")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-0.5 text-xs sm:px-3 sm:py-1"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={me.user.display_name}
      >
        {/* Phones: initial-only avatar so the header fits 320px screens.
            ≥sm: full name + role chip. */}
        <span
          className="grid h-6 w-6 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand sm:hidden"
          aria-hidden
        >
          {(me.user.display_name.trim()[0] ?? "?").toUpperCase()}
        </span>
        <span className="hidden max-w-[12rem] truncate font-medium text-gray-800 sm:inline">
          {me.user.display_name}
        </span>
        <span className="hidden rounded-full bg-gray-100 px-1.5 text-[10px] text-gray-500 sm:inline">
          {me.user.user_type}
        </span>
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-10 cursor-default"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-60 rounded-md border border-gray-200 bg-white p-1 text-sm shadow-lg"
          >
            {others.length > 0 && (
              <>
                <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-gray-400">
                  {t("switchAccount")}
                </p>
                {others.map((a) => (
                  <div key={a.phone} className="flex items-center justify-between">
                    <button
                      role="menuitem"
                      onClick={() => pick(a.phone)}
                      disabled={busy}
                      className="flex-1 rounded px-2 py-1 text-left hover:bg-gray-100 disabled:opacity-50"
                    >
                      <span className="font-medium">{a.displayName}</span>{" "}
                      <span className="text-xs text-gray-500">{a.role}</span>
                    </button>
                    <button
                      onClick={() => forgetAccount(a.phone)}
                      aria-label={t("forgetNamed", { name: a.displayName })}
                      className="px-3 py-1 text-gray-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <hr className="my-1 border-gray-100" />
              </>
            )}
            {error && <p className="px-2 py-1 text-xs text-red-600">{error}</p>}
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                router.push("/login");
              }}
              className="w-full rounded px-2 py-1 text-left hover:bg-gray-100"
            >
              {t("addAccount")}
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
                router.replace("/login");
              }}
              className="w-full rounded px-2 py-1 text-left text-red-600 hover:bg-red-50"
            >
              {common("logout")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
