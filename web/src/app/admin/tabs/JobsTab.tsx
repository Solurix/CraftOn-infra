"use client";

import { useTranslations } from "next-intl";

import { Spinner, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { formatTimeRange, formatYen } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";

export function JobsTab() {
  const t = useTranslations("admin");
  const j = useTranslations("jobs");
  const { api } = useAuth();
  const jobs = useAsync(() => api.adminJobs(), []);

  return jobs.loading ? (
    <Spinner />
  ) : !jobs.data || jobs.data.length === 0 ? (
    <p className="py-6 text-center text-sm text-gray-500">{t("noJobs")}</p>
  ) : (
    <ul className="space-y-3">
      {jobs.data.map((job) => (
        <li key={job.id} className="card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium [overflow-wrap:anywhere]">{job.trades.join(", ")}</span>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-sm text-gray-600">
            {job.contractor_company_name} · {job.prefecture} · {job.work_date} ·{" "}
            {formatTimeRange(job.start_time, job.end_time)} · {formatYen(job.daily_wage)} ·{" "}
            {j("headcount")} {job.headcount}
          </p>
        </li>
      ))}
    </ul>
  );
}
