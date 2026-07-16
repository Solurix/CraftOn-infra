"use client";

import { useTranslations } from "next-intl";

import { KEY, useStoredState } from "@/lib/storage";

// A persisted set of job-search facets (trade / prefecture / wage range). Stored
// on the device for now; a server-backed version with new-match alerts is
// specced in BLOCKERS.md (§1.3).
export type SavedSearch = {
  trade?: string;
  prefecture?: string;
  wageMin?: string;
  wageMax?: string;
};

function label(s: SavedSearch, allLabel: string): string {
  const parts = [
    s.trade,
    s.prefecture,
    s.wageMin ? `≥¥${s.wageMin}` : undefined,
    s.wageMax ? `≤¥${s.wageMax}` : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : allLabel;
}

function isEmpty(s: SavedSearch): boolean {
  return !s.trade && !s.prefecture && !s.wageMin && !s.wageMax;
}

function sameSearch(a: SavedSearch, b: SavedSearch): boolean {
  return (
    (a.trade ?? "") === (b.trade ?? "") &&
    (a.prefecture ?? "") === (b.prefecture ?? "") &&
    (a.wageMin ?? "") === (b.wageMin ?? "") &&
    (a.wageMax ?? "") === (b.wageMax ?? "")
  );
}

export function SavedSearches({
  current,
  onApply,
}: {
  current: SavedSearch;
  onApply: (s: SavedSearch) => void;
}) {
  const t = useTranslations("savedSearch");
  const common = useTranslations("common");
  const [searches, setSearches] = useStoredState<SavedSearch[]>(KEY.savedSearches, []);

  const alreadySaved = searches.some((s) => sameSearch(s, current));
  const canSave = !isEmpty(current) && !alreadySaved;

  const save = () => setSearches((prev) => [...prev, current]);
  const remove = (i: number) =>
    setSearches((prev) => prev.filter((_, idx) => idx !== i));

  if (searches.length === 0 && !canSave) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {searches.length > 0 && (
        <span className="text-xs text-gray-500">{t("title")}:</span>
      )}
      {searches.map((s, i) => (
        <span key={i} className="inline-flex items-center">
          <button
            type="button"
            onClick={() => onApply(s)}
            className="rounded-l-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:border-brand hover:text-brand"
          >
            {label(s, t("all"))}
          </button>
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label={common("remove")}
            className="rounded-r-full border border-l-0 border-gray-200 bg-white px-2 py-1 text-xs text-gray-400 hover:text-red-600"
          >
            ×
          </button>
        </span>
      ))}
      {canSave && (
        <button
          type="button"
          onClick={save}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-brand/50 px-3 py-1 text-xs font-medium text-brand hover:bg-brand-soft"
        >
          ☆ {t("save")}
        </button>
      )}
    </div>
  );
}
