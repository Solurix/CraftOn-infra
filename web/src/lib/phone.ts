// Phone-number helpers for the country-code picker. Numbers are stored/sent in
// E.164-ish form (+<dial><national digits>, national leading zeros stripped) —
// the same shape the API and Firebase expect.

export type PhoneCountry = { code: string; dial: string };

// Curated for this domain (Japan construction; common worker nationalities
// first), not the full ISO list. Order = picker order after Japan.
export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { code: "JP", dial: "81" },
  { code: "VN", dial: "84" },
  { code: "ID", dial: "62" },
  { code: "PH", dial: "63" },
  { code: "TH", dial: "66" },
  { code: "MM", dial: "95" },
  { code: "KH", dial: "855" },
  { code: "NP", dial: "977" },
  { code: "LK", dial: "94" },
  { code: "BD", dial: "880" },
  { code: "IN", dial: "91" },
  { code: "CN", dial: "86" },
  { code: "KR", dial: "82" },
  { code: "TW", dial: "886" },
  { code: "MN", dial: "976" },
  { code: "BR", dial: "55" },
  { code: "PE", dial: "51" },
  { code: "US", dial: "1" },
  { code: "GB", dial: "44" },
] as const;

// 🇯🇵-style flag from a 2-letter country code (regional indicator symbols).
export function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(0x1f1a5 + c.charCodeAt(0)));
}

export function nationalDigits(national: string): string {
  return national.replace(/\D/g, "").replace(/^0+/, "");
}

// True when the national part looks like a plausible subscriber number.
export function isValidNationalNumber(national: string): boolean {
  const d = nationalDigits(national);
  return d.length >= 5 && d.length <= 14;
}

export function composePhone(dial: string, national: string): string {
  const digits = nationalDigits(national);
  return digits ? `+${dial}${digits}` : "";
}

// Best-effort split of a stored +81… value back into picker state (longest
// dial-code match wins; unknown prefixes fall back to Japan).
export function splitPhone(e164: string): { dial: string; national: string } {
  const digits = e164.replace(/\D/g, "");
  let best: PhoneCountry | null = null;
  for (const c of PHONE_COUNTRIES) {
    if (digits.startsWith(c.dial) && (!best || c.dial.length > best.dial.length)) {
      best = c;
    }
  }
  if (!best) return { dial: "81", national: digits };
  return { dial: best.dial, national: digits.slice(best.dial.length) };
}
