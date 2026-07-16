"use client";

import { useTranslations } from "next-intl";

import { KEY, useStoredState } from "@/lib/storage";

// Reusable posting presets so contractors don't re-enter the same job each time.
// A template captures everything except the work date (set fresh per posting).
// Device-local for now (see BLOCKERS.md §2.2 for the server-backed version).
export type JobTemplate = {
  name: string;
  trades: string;
  start_time: string;
  end_time: string;
  prefecture: string;
  area: string;
  address: string;
  daily_wage: number;
  headcount: number;
  notes: string;
};

export function JobTemplates({
  current,
  onApply,
}: {
  current: Omit<JobTemplate, "name">;
  onApply: (tpl: JobTemplate) => void;
}) {
  const t = useTranslations("templates");
  const common = useTranslations("common");
  const [templates, setTemplates] = useStoredState<JobTemplate[]>(
    KEY.jobTemplates,
    [],
  );

  const canSave = current.trades.trim().length > 0;
  const derivedName =
    [current.trades, current.prefecture].filter(Boolean).join(" · ") || t("untitled");

  const save = () =>
    setTemplates((prev) => [...prev, { ...current, name: derivedName }]);
  const remove = (i: number) =>
    setTemplates((prev) => prev.filter((_, idx) => idx !== i));

  if (templates.length === 0 && !canSave) return null;

  return (
    <div className="rounded-lg border border-dashed border-gray-200 p-2">
      <p className="mb-1 text-xs font-medium text-gray-500">{t("title")}</p>
      <div className="flex flex-wrap items-center gap-2">
        {templates.map((tpl, i) => (
          <span key={i} className="inline-flex items-center">
            <button
              type="button"
              onClick={() => onApply(tpl)}
              className="rounded-l-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:border-brand hover:text-brand"
            >
              {tpl.name}
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
            + {t("save")}
          </button>
        )}
      </div>
    </div>
  );
}
