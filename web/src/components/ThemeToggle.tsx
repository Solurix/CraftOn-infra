"use client";

import { useTranslations } from "next-intl";

import { useTheme, type Theme } from "@/lib/theme";

// Cycles light → dark → system. The glyph shows the *current* setting; the
// title/aria-label announces what a click will switch to.
const ORDER: Theme[] = ["light", "dark", "system"];
const GLYPH: Record<Theme, string> = { light: "☀️", dark: "🌙", system: "🖥️" };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
      aria-label={t("switchTo", { mode: t(next) })}
      title={t("current", { mode: t(theme) })}
    >
      <span aria-hidden>{GLYPH[theme]}</span>
    </button>
  );
}
