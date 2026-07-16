"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { RequireAuth } from "@/components/RequireAuth";
import { useToast } from "@/components/Toast";
import { EmptyState, ErrorText, PageHeader, SkeletonList, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";
import { useAsync } from "@/lib/useAsync";

function MyApplications() {
  const t = useTranslations("applications");
  const jobs = useTranslations("jobs");
  const common = useTranslations("common");
  const { api } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.myApplications(), []);

  const withdraw = async (id: string) => {
    try {
      await api.withdraw(id);
      toast.success(t("withdrawn"));
      reload();
    } catch (e) {
      toast.error(humanizeError(e, common("networkError")));
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} />
      <ErrorText message={error} />
      {loading ? (
        <SkeletonList />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={t("empty")}
          hint={t("emptyHint")}
          icon="📋"
          action={
            <Link href="/jobs" className="btn-primary">
              {jobs("listTitle")}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data.map((a) => (
            // Whole row navigates to the job; the withdraw action sits on top as
            // a sibling overlay (interactive controls can't nest inside <a>).
            <li key={a.id} className="relative">
              <Link
                href={`/jobs/${a.job_id}`}
                className="card card-hover block pr-28"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{jobs("detailTitle")}</span>
                  <StatusBadge status={a.status} />
                </div>
              </Link>
              {a.status === "applied" && (
                <button
                  className="btn-danger btn-sm absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => withdraw(a.id)}
                >
                  {t("withdraw")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <RequireAuth role="worker">
      <MyApplications />
    </RequireAuth>
  );
}
