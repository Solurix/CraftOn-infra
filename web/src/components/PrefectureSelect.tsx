"use client";

import { useLocale } from "next-intl";

import { PREFECTURES, prefectureLabel } from "@/lib/prefectures";

// A guided prefecture picker (replaces the old free-text inputs). If the stored
// value predates the picker and isn't in the canonical list, it's kept as an
// extra option so opening the form doesn't silently drop it.
export function PrefectureSelect({
  value,
  onChange,
  emptyLabel,
  id,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  // When set, an empty first option with this label is offered ("optional" /
  // "all prefectures" semantics). Omit for required fields with a preselection.
  emptyLabel?: string;
  id?: string;
  required?: boolean;
}) {
  const locale = useLocale();
  const known = PREFECTURES.some((p) => p.value === value);
  return (
    <select
      id={id}
      className="field-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {!known && value && <option value={value}>{value}</option>}
      {PREFECTURES.map((p) => (
        <option key={p.value} value={p.value}>
          {prefectureLabel(p.value, locale)}
        </option>
      ))}
    </select>
  );
}
