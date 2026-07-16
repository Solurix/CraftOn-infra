import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const SUPPORTED_LOCALES = ["ja", "en"] as const;
export const DEFAULT_LOCALE = "ja";

// Locale comes from the NEXT_LOCALE cookie (set by the language switcher),
// defaulting to Japanese — no URL prefix (next-intl without i18n routing).
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("NEXT_LOCALE")?.value;
  const locale =
    cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as never)
      ? cookieLocale
      : DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
