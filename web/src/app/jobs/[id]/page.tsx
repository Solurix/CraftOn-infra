"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { SaveJobButton } from "@/components/SaveJobButton";
import { useToast } from "@/components/Toast";
import { BackLink, DetailSkeleton, ErrorText, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";
import { formatTimeRange, formatYen } from "@/lib/format";
import { prefectureLabel } from "@/lib/prefectures";
import { useAsync } from "@/lib/useAsync";

function JobDetail() {
  const t = useTranslations("jobs");
  const ph = useTranslations("photos");
  const common = useTranslations("common");
  const locale = useLocale();
  const nav = useTranslations("nav");
  const { id } = useParams<{ id: string }>();
  const { api } = useAuth();
  // Photos are decoration — a failure must not break the job page.
  const photos = useAsync(async () => {
    try {
      return await api.jobPhotos(id);
    } catch {
      return [];
    }
  }, [id]);
  const { data, loading, error } = useAsync(async () => {
    const job = await api.job(id);
    let saved = false;
    try {
      saved = (await api.savedJobIds()).includes(id);
    } catch {
      /* bookmark state is non-essential; show the job regardless */
    }
    return { job, saved };
  }, [id]);
  const job = data?.job;
  const toast = useToast();
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    setApplyError("");
    try {
      await api.apply(id);
      setApplied(true);
      toast.success(t("applied"));
    } catch (e) {
      const msg = humanizeError(e, common("networkError"));
      setApplyError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (error || !job) return <ErrorText message={error || "not found"} />;

  return (
    <div className="space-y-4">
      <BackLink href="/jobs" label={t("listTitle")} />
      <div className="card space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold [overflow-wrap:anywhere]">{job.trades.join(", ")}</h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={job.status} />
            <SaveJobButton
              key={String(data?.saved)}
              jobId={job.id}
              saved={data?.saved ?? false}
            />
          </div>
        </div>
        <Row label={t("date")} value={job.work_date} />
        <Row label={t("time")} value={formatTimeRange(job.start_time, job.end_time)} />
        <Row label={t("filterPrefecture")} value={`${prefectureLabel(job.prefecture, locale)}${job.area ? ` / ${job.area}` : ""}`} />
        <Row label={t("wage")} value={formatYen(job.daily_wage)} />
        <Row label={t("headcount")} value={String(job.headcount)} />
        {job.notes && <Row label={t("notes")} value={job.notes} />}
      </div>

      {photos.data && photos.data.length > 0 && (
        <div className="card space-y-2">
          <h2 className="font-semibold">{ph("jobPhotos")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {photos.data.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.document_id}
                src={p.read_url}
                alt=""
                className="aspect-square w-full rounded-lg border border-gray-200 object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {applied ? (
        <div className="card flex flex-col items-center gap-2 text-center text-sm text-green-700">
          <span>{t("applied")}</span>
          <Link href="/applications" className="btn-secondary btn-sm">
            {nav("myApplications")}
          </Link>
        </div>
      ) : (
        <button
          className="btn-primary w-full"
          disabled={busy || job.status !== "open"}
          onClick={apply}
        >
          {t("apply")}
        </button>
      )}
      <ErrorText message={applyError} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function JobDetailPage() {
  return (
    <RequireAuth role="worker">
      <JobDetail />
    </RequireAuth>
  );
}
