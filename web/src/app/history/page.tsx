"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorText, PageHeader, SkeletonList } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { monthlyEarnings } from "@/lib/earnings";
import { formatYen } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";

function WorkHistory() {
  const t = useTranslations("history");
  const { api, me } = useAuth();
  const { data, loading, error } = useAsync(() => api.workHistory(), []);

  const months = data ? monthlyEarnings(data.matchings) : [];
  const primaryTrade = me?.worker_profile?.trades?.[0];

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} />
      <ErrorText message={error} />
      {loading ? (
        <SkeletonList />
      ) : error ? null : !data ? null : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="card text-center">
              <p className="text-2xl font-bold text-brand">{data.completed_count}</p>
              <p className="text-xs text-gray-500">{t("completedJobs")}</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-brand">
                {formatYen(data.total_earned)}
              </p>
              <p className="text-xs text-gray-500">{t("totalEarned")}</p>
            </div>
          </div>

          {months.length > 0 && (
            <div className="card">
              <p className="mb-2 text-sm font-semibold text-gray-800">
                {t("byMonth")}
              </p>
              <ul className="divide-y divide-gray-100">
                {months.map((row) => (
                  <li
                    key={row.month}
                    className="flex items-center justify-between py-1.5 text-sm"
                  >
                    <span className="text-gray-600">{row.month}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {t("jobsCount", { count: row.count })}
                      </span>
                      <span className="font-semibold text-brand">
                        {formatYen(row.total)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.matchings.length === 0 ? (
            <EmptyState title={t("empty")} hint={t("emptyHint")} icon="💴" />
          ) : (
            <ul className="space-y-3">
              {data.matchings.map((m) => (
                <li key={m.id} className="card card-hover">
                  <Link href={`/matchings/${m.id}`} className="block">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {m.work_date ?? ""}
                        {m.prefecture ? ` · ${m.prefecture}` : ""}
                      </span>
                      <span className="text-sm font-semibold text-brand">
                        {formatYen(m.daily_wage)}
                      </span>
                    </div>
                    {m.contractor_company_name && (
                      <p className="mt-1 text-sm text-gray-600">
                        {m.contractor_company_name}
                      </p>
                    )}
                  </Link>
                  {/* "Work again" — jump to similar open jobs (same trade/area). */}
                  <Link
                    href={{
                      pathname: "/jobs",
                      query: {
                        ...(primaryTrade ? { trade: primaryTrade } : {}),
                        ...(m.prefecture ? { prefecture: m.prefecture } : {}),
                      },
                    }}
                    className="btn-secondary btn-sm mt-2"
                  >
                    {t("workAgain")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <RequireAuth role="worker">
      <WorkHistory />
    </RequireAuth>
  );
}
