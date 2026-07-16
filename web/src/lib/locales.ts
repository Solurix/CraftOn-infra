// All supported UI locales, shown in the language switcher in this order. Add a
// new entry here (and its messages/<code>.json catalog) and it appears in the
// dropdown automatically — no other code changes needed.
export const LOCALES = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];
