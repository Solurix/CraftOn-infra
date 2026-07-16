"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Avatar } from "@/components/Avatar";
import {
  FavoriteWorkerButton,
  useFavoriteWorkers,
} from "@/components/FavoriteWorkerButton";
import { RequireAuth } from "@/components/RequireAuth";
import { useToast } from "@/components/Toast";
import { BackLink, EmptyState, ErrorText, Skeleton, StatusBadge } from "@/components/ui";
import type { Applicant } from "@/lib/api/models";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";
import { formatTimeRange, formatYen } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";

type Sort = "trust" | "recent" | "favorites";

function JobApplicants() {
  const t = useTranslations("applications");
  const ob = useTranslations("onboarding");
  const nav = useTranslations("nav");
  const common = useTranslations("common");
  const { id } = useParams<{ id: string }>();
  const { api } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const job = useAsync(() => api.job(id), [id]);
  const apps = useAsync(() => api.applicants(id), [id]);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<Sort>("trust");
  const [favorites] = useFavoriteWorkers();

  const confirm = async (applicationId: string) => {
    setError("");
    try {
      const m = await api.confirm(applicationId);
      toast.success(t("confirmed"));
      router.push(`/matchings/${m.id}`);
    } catch (e) {
      const msg = humanizeError(e, common("networkError"));
      setError(msg);
      toast.error(msg);
    }
  };

  const reject = async (applicationId: string) => {
    try {
      await api.rejectApplication(applicationId);
      apps.reload();
    } catch (e) {
      toast.error(humanizeError(e, common("networkError")));
    }
  };

  const favIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);
  const sorted = useMemo(() => {
    const list = [...(apps.data ?? [])];
    const trust = (a: Applicant) => Number(a.worker_trust_score) || 0;
    if (sort === "recent") {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else if (sort === "favorites") {
      list.sort(
        (a, b) =>
          Number(favIds.has(b.worker_id)) - Number(favIds.has(a.worker_id)) ||
          trust(b) - trust(a),
      );
    } else {
      list.sort((a, b) => trust(b) - trust(a));
    }
    return list;
  }, [apps.data, sort, favIds]);

  if (job.loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (job.error || !job.data) return <ErrorText message={job.error || "not found"} />;

  return (
    <div className="space-y-4">
      <BackLink href="/my-jobs" label={nav("myJobs")} />
      <div className="card space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold [overflow-wrap:anywhere]">
            {job.data.trades.join(", ")}
          </h1>
          <StatusBadge status={job.data.status} />
        </div>
        <p className="text-sm text-gray-600">
          {job.data.prefecture} · {job.data.work_date} ·{" "}
          {formatTimeRange(job.data.start_time, job.data.end_time)} · {formatYen(job.data.daily_wage)}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          {job.data.status === "open" && (
            <Link href={`/post-job?edit=${job.data.id}`} className="btn-secondary btn-sm">
              {t("editJob")}
            </Link>
          )}
          <Link href={`/post-job?from=${job.data.id}`} className="btn-secondary btn-sm">
            {t("duplicateJob")}
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t("applicantsTitle")}</h2>
        {apps.data && apps.data.length > 1 && (
          <select
            className="field-input w-auto text-xs"
            aria-label={t("sortApplicants")}
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value="trust">{t("sortTrust")}</option>
            <option value="recent">{t("sortRecent")}</option>
            <option value="favorites">{t("sortFavorites")}</option>
          </select>
        )}
      </div>

      <ErrorText message={error} />
      {apps.loading ? (
        <ul className="space-y-3">
          {[0, 1].map((i) => (
            <li key={i} className="card">
              <Skeleton className="h-10 w-full" />
            </li>
          ))}
        </ul>
      ) : !apps.data || apps.data.length === 0 ? (
        <EmptyState title={t("noApplicants")} icon="📭" />
      ) : (
        <ul className="space-y-3">
          {sorted.map((a) => (
            <li key={a.id} className="card flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Avatar name={a.worker_display_name} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <Link href={`/workers/${a.worker_id}`} className="link">
                      {a.worker_display_name}
                    </Link>
                    <FavoriteWorkerButton
                      workerId={a.worker_id}
                      workerName={a.worker_display_name}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {ob(a.worker_class)} · {t("trust")}:{" "}
                    {Number(a.worker_trust_score).toFixed(1)}
                  </p>
                  <StatusBadge status={a.status} />
                </div>
              </div>
              {a.status === "applied" && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button className="btn-primary" onClick={() => confirm(a.id)}>
                    {t("confirm")}
                  </button>
                  <button className="btn-danger" onClick={() => reject(a.id)}>
                    {t("reject")}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function JobApplicantsPage() {
  return (
    <RequireAuth role="contractor">
      <JobApplicants />
    </RequireAuth>
  );
}
