"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LOCALES } from "@/lib/locales";

// A globe button showing the current language; clicking opens a dropdown of all
// supported locales (driven by LOCALES, so new languages appear automatically).
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  const choose = (code: string) => {
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=31536000;samesite=lax`;
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("language")}
      >
        <span aria-hidden>🌐</span>
        {/* On phones the full language name crowds the header — icon only. */}
        <span className="hidden font-medium sm:inline">{current.label}</span>
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
            className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-gray-200 bg-white p-1 text-sm shadow-lg"
          >
            {LOCALES.map((l) => (
              <button
                key={l.code}
                role="menuitemradio"
                aria-checked={l.code === locale}
                onClick={() => choose(l.code)}
                className={`flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-gray-100 ${
                  l.code === locale ? "font-bold text-brand" : "text-gray-700"
                }`}
              >
                {l.label}
                {l.code === locale && <span aria-hidden>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
