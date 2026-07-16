"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { JobCard } from "@/components/JobCard";
import { PrefectureSelect } from "@/components/PrefectureSelect";
import { ProfileCompleteness } from "@/components/ProfileCompleteness";
import { RequireAuth } from "@/components/RequireAuth";
import { SavedSearches, type SavedSearch } from "@/components/SavedSearches";
import { VisaStatusBanner } from "@/components/VisaStatusBanner";
import { EmptyState, ErrorText, PageHeader, SkeletonList } from "@/components/ui";
import { workerCompleteness } from "@/lib/completeness";
import { useAuth } from "@/lib/auth/context";
import { recommendJobs } from "@/lib/recommend";
import { useAsync } from "@/lib/useAsync";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

type Sort = "date" | "wage_high" | "wage_low" | "new";

const PAGE_SIZE = 10;

// Only send a wage filter when it's a valid non-negative integer; otherwise omit
// it so a stray "-" or partial entry never 422s and blanks the whole list.
function wageParam(v: string): string | undefined {
  const n = Number(v);
  return v !== "" && Number.isInteger(n) && n >= 0 ? String(n) : undefined;
}

function JobsList() {
  const t = useTranslations("jobs");
  const { api, me } = useAuth();
  const params = useSearchParams();

  // Deep-linkable facets (saved searches, "find similar" from history) seed the
  // initial trade/prefecture filters.
  const [trade, setTrade] = useState(params.get("trade") ?? "");
  const [prefecture, setPrefecture] = useState(params.get("prefecture") ?? "");
  const [wageMin, setWageMin] = useState(params.get("wage_min") ?? "");
  const [wageMax, setWageMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<Sort>("date");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const hasFilters =
    !!(trade || prefecture || wageMin || wageMax || dateFrom || dateTo) ||
    sort !== "date";

  const clearFilters = () => {
    setTrade("");
    setPrefecture("");
    setWageMin("");
    setWageMax("");
    setDateFrom("");
    setDateTo("");
    setSort("date");
  };

  const applySaved = (s: SavedSearch) => {
    setTrade(s.trade ?? "");
    setPrefecture(s.prefecture ?? "");
    setWageMin(s.wageMin ?? "");
    setWageMax(s.wageMax ?? "");
  };

  // Debounce free-text/number filters so each keystroke doesn't fire a request;
  // the date pickers and sort select commit discretely and stay immediate.
  const qTrade = useDebouncedValue(trade);
  const qPrefecture = useDebouncedValue(prefecture);
  const qWageMin = useDebouncedValue(wageMin);
  const qWageMax = useDebouncedValue(wageMax);

  // Load jobs, then the worker's saved-job ids. Saved state is non-essential
  // decoration, so a failure there must not block browsing jobs — fall back to
  // empty stars rather than failing the whole list.
  const { data, loading, error } = useAsync(async () => {
    const jobs = await api.jobs({
      trade: qTrade || undefined,
      prefecture: qPrefecture || undefined,
      wage_min: wageParam(qWageMin),
      wage_max: wageParam(qWageMax),
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      sort,
    });
    let saved = new Set<string>();
    try {
      saved = new Set(await api.savedJobIds());
    } catch {
      /* leave stars unfilled */
    }
    return { jobs, saved };
  }, [qTrade, qPrefecture, qWageMin, qWageMax, dateFrom, dateTo, sort]);

  // Reset the visible window whenever the result set changes.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [qTrade, qPrefecture, qWageMin, qWageMax, dateFrom, dateTo, sort]);

  const worker = me?.worker_profile ?? null;
  const completeness = useMemo(
    () => (worker ? workerCompleteness(worker) : null),
    [worker],
  );
  // Only suggest when the worker isn't actively filtering (the strip would be
  // redundant with an explicit search).
  const recommended = useMemo(
    () => (data && !hasFilters ? recommendJobs(data.jobs, worker, 3) : []),
    [data, hasFilters, worker],
  );

  return (
    <div className="space-y-4">
      <PageHeader title={t("listTitle")} />
      <VisaStatusBanner profile={worker} />
      {completeness && <ProfileCompleteness data={completeness} />}

      <div className="card space-y-3">
        <SavedSearches
          current={{ trade, prefecture, wageMin, wageMax }}
          onApply={applySaved}
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col text-xs text-gray-500">
            {t("filterTrade")}
            <input
              className="field-input"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
            />
          </label>
          <label className="flex flex-col text-xs text-gray-500">
            {t("filterPrefecture")}
            <PrefectureSelect
              value={prefecture}
              onChange={setPrefecture}
              emptyLabel={t("anyPrefecture")}
            />
          </label>
          <label className="flex flex-col text-xs text-gray-500">
            {t("filterWageMin")}
            <input
              className="field-input"
              type="number"
              min={0}
              inputMode="numeric"
              value={wageMin}
              onChange={(e) => setWageMin(e.target.value)}
            />
          </label>
          <label className="flex flex-col text-xs text-gray-500">
            {t("filterWageMax")}
            <input
              className="field-input"
              type="number"
              min={0}
              inputMode="numeric"
              value={wageMax}
              onChange={(e) => setWageMax(e.target.value)}
            />
          </label>
          <label className="flex flex-col text-xs text-gray-500">
            {t("filterDateFrom")}
            <input
              className="field-input"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="flex flex-col text-xs text-gray-500">
            {t("filterDateTo")}
            <input
              className="field-input"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="field-input flex-1"
            aria-label={t("sortLabel")}
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value="date">{t("sortDate")}</option>
            <option value="wage_high">{t("sortWageHigh")}</option>
            <option value="wage_low">{t("sortWageLow")}</option>
            <option value="new">{t("sortNew")}</option>
          </select>
          {hasFilters && (
            <button type="button" className="link text-sm" onClick={clearFilters}>
              {t("clearFilters")}
            </button>
          )}
        </div>
      </div>

      {recommended.length > 0 && (
        <section className="space-y-2" aria-labelledby="rec-heading">
          <h2 id="rec-heading" className="flex items-center gap-1 text-sm font-semibold">
            <span aria-hidden>✨</span> {t("recommendedTitle")}
          </h2>
          <ul className="space-y-3">
            {recommended.map((job) => (
              <JobCard key={`rec-${job.id}`} job={job} saved={data!.saved.has(job.id)} />
            ))}
          </ul>
        </section>
      )}

      <ErrorText message={error} />
      {loading ? (
        <SkeletonList />
      ) : error ? null : !data || data.jobs.length === 0 ? (
        <EmptyState title={t("empty")} hint={t("emptyHint")} icon="🔍" />
      ) : (
        <>
          {recommended.length > 0 && (
            <h2 className="pt-2 text-sm font-semibold text-gray-700">{t("allJobsTitle")}</h2>
          )}
          <ul className="space-y-3">
            {data.jobs.slice(0, visible).map((job) => (
              <JobCard key={job.id} job={job} saved={data.saved.has(job.id)} />
            ))}
          </ul>
          {data.jobs.length > visible && (
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
            >
              {t("loadMore", { count: data.jobs.length - visible })}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <RequireAuth role="worker">
      <Suspense fallback={<SkeletonList />}>
        <JobsList />
      </Suspense>
    </RequireAuth>
  );
}
