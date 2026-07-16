"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import {
  composePhone,
  flagEmoji,
  PHONE_COUNTRIES,
  splitPhone,
} from "@/lib/phone";

// Phone entry as country picker + national number. Emits the composed
// +<dial><digits> value (empty string while the number part is blank), so
// callers keep a single string exactly like the old free-text input.
export function PhoneInput({
  value,
  onChange,
  id,
  required,
}: {
  value: string;
  onChange: (e164: string) => void;
  id?: string;
  required?: boolean;
}) {
  const t = useTranslations("auth");
  const [dial, setDial] = useState("81");
  const [national, setNational] = useState("");
  // Track what we last emitted so an outside reset ("" or a stored number)
  // can be told apart from our own onChange echoing back.
  const lastEmitted = useRef<string | null>(null);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    if (!value) {
      setNational("");
      return;
    }
    const parts = splitPhone(value);
    setDial(parts.dial);
    setNational(parts.national);
  }, [value]);

  const emit = (d: string, n: string) => {
    const composed = composePhone(d, n);
    lastEmitted.current = composed;
    onChange(composed);
  };

  return (
    <div className="flex gap-2">
      <select
        className="field-input w-auto shrink-0"
        aria-label={t("countryCode")}
        value={dial}
        onChange={(e) => {
          setDial(e.target.value);
          emit(e.target.value, national);
        }}
      >
        {/* Compact labels (flag + ISO code + dial) — a closed <select> sizes to
            its longest option, so full country names would overflow 320px. */}
        {PHONE_COUNTRIES.map((c) => (
          <option key={c.code} value={c.dial}>
            {flagEmoji(c.code)} {c.code} +{c.dial}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        className="field-input min-w-0 flex-1"
        placeholder={t("phoneNationalPlaceholder")}
        value={national}
        onChange={(e) => {
          setNational(e.target.value);
          emit(dial, e.target.value);
        }}
        required={required}
      />
    </div>
  );
}
