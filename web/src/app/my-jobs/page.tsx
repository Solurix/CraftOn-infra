"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorText, PageHeader, SkeletonList, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { formatTimeRange, formatYen } from "@/lib/format";
import { jobInsights } from "@/lib/insights";
import { useAsync } from "@/lib/useAsync";

function MyJobs() {
  const t = useTranslations("jobs");
  const nav = useTranslations("nav");
  const ins = useTranslations("insights");
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.myJobs(), []);
  const stats = data ? jobInsights(data) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title={nav("myJobs")}
        action={
          <Link href="/post-job" className="btn-primary">
            {nav("postJob")}
          </Link>
        }
      />
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="card py-3 text-center">
            <p className="text-xl font-bold text-brand">{stats.open}</p>
            <p className="text-[11px] text-gray-500">{ins("open")}</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-xl font-bold text-brand">{stats.filled}</p>
            <p className="text-[11px] text-gray-500">{ins("filled")}</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-xl font-bold text-brand">{stats.total}</p>
            <p className="text-[11px] text-gray-500">{ins("total")}</p>
          </div>
        </div>
      )}
      <ErrorText message={error} />
      {loading ? (
        <SkeletonList />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={t("myEmpty")}
          hint={t("myEmptyHint")}
          icon="🛠️"
          action={
            <Link href="/post-job" className="btn-primary">
              {nav("postJob")}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data.map((job) => (
            <li key={job.id}>
              <Link href={`/my-jobs/${job.id}`} className="card card-hover block">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{job.trades.join(", ")}</span>
                  <StatusBadge status={job.status} />
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {job.prefecture} · {job.work_date} ·{" "}
                  {formatTimeRange(job.start_time, job.end_time)}
                </p>
                <p className="mt-1 text-sm font-semibold text-brand">{formatYen(job.daily_wage)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MyJobsPage() {
  return (
    <RequireAuth role="contractor">
      <MyJobs />
    </RequireAuth>
  );
}
