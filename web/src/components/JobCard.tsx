"use client";

import { useLocale } from "next-intl";
import Link from "next/link";

import type { Job } from "@/lib/api/models";
import { formatTimeRange, formatYen } from "@/lib/format";
import { prefectureLabel } from "@/lib/prefectures";
import { SaveJobButton } from "./SaveJobButton";
import { StatusBadge } from "./ui";

// A job summary card linking to the detail page, with a save/bookmark star
// overlaid in the corner. Shared by the jobs list and the saved-jobs page.
export function JobCard({
  job,
  saved,
  onSavedChange,
}: {
  job: Job;
  saved: boolean;
  onSavedChange?: (saved: boolean) => void;
}) {
  const locale = useLocale();
  return (
    <li className="relative">
      <SaveJobButton
        key={String(saved)}
        jobId={job.id}
        saved={saved}
        onChange={onSavedChange}
        className="absolute right-1 top-1 z-10"
      />
      {/* Badge sits left of the trades, leaving the top-right corner for the star. */}
      <Link href={`/jobs/${job.id}`} className="card card-hover block">
        <div className="flex items-center gap-2 pr-10">
          <span className="font-semibold">{job.trades.join(", ")}</span>
          <StatusBadge status={job.status} />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-gray-600">
          <span aria-hidden>📍</span>
          {prefectureLabel(job.prefecture, locale)}
          <span className="text-gray-300" aria-hidden>
            ·
          </span>
          <span aria-hidden>🗓️</span>
          {job.work_date}
          <span className="text-gray-300" aria-hidden>
            ·
          </span>
          {formatTimeRange(job.start_time, job.end_time)}
        </p>
        <p className="mt-2 text-base font-bold text-brand">
          {formatYen(job.daily_wage)}
        </p>
        {job.contractor_company_name && (
          <p className="mt-0.5 text-xs text-gray-400">
            {job.contractor_company_name}
          </p>
        )}
      </Link>
    </li>
  );
}
