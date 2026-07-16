"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorText, PageHeader, SkeletonList, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { formatYen } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";

function MatchingsList() {
  const t = useTranslations("matchings");
  const { api } = useAuth();
  const { data, loading, error } = useAsync(() => api.myMatchings(), []);

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} />
      <ErrorText message={error} />
      {loading ? (
        <SkeletonList />
      ) : !data || data.length === 0 ? (
        <EmptyState title={t("empty")} hint={t("emptyHint")} icon="🤝" />
      ) : (
        <ul className="space-y-3">
          {data.map((m) => (
            <li key={m.id}>
              <Link href={`/matchings/${m.id}`} className="card card-hover block">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {m.work_date ?? ""} {m.prefecture ? `· ${m.prefecture}` : ""}
                  </span>
                  <StatusBadge status={m.status} />
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {m.worker_display_name ?? ""}
                  {m.contractor_company_name ? ` · ${m.contractor_company_name}` : ""}
                </p>
                <p className="mt-1 text-sm font-semibold text-brand">{formatYen(m.daily_wage)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MatchingsPage() {
  return (
    <RequireAuth>
      <MatchingsList />
    </RequireAuth>
  );
}
