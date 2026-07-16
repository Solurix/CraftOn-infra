"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { ErrorText, Spinner, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";
import { formatYen } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";

export function MatchingsTab() {
  const t = useTranslations("admin");
  const m = useTranslations("matchings");
  const common = useTranslations("common");
  const { api } = useAuth();
  const matchings = useAsync(() => api.adminMatchings(), []);
  const [error, setError] = useState("");

  const markPaid = async (id: string) => {
    setError("");
    try {
      await api.markFeePaid(id);
      matchings.reload();
    } catch (e) {
      setError(humanizeError(e, common("networkError")));
    }
  };

  return (
    <div className="space-y-3">
      <ErrorText message={error} />
      {matchings.loading ? (
        <Spinner />
      ) : !matchings.data || matchings.data.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">{t("noMatchings")}</p>
      ) : (
        <ul className="space-y-3">
          {matchings.data.map((mt) => (
            <li key={mt.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium [overflow-wrap:anywhere]">
                  {mt.worker_display_name} → {mt.contractor_company_name}
                </span>
                <StatusBadge status={mt.status} />
              </div>
              <p className="text-sm text-gray-600">
                {mt.work_date} · {formatYen(mt.daily_wage)} · {m("fee")} {formatYen(mt.platform_fee)} (
                {mt.fee_status === "paid" ? m("feePaid") : m("feeUnpaid")})
              </p>
              {mt.fee_status === "unpaid" && mt.status === "completed" && (
                <button className="btn-secondary mt-2" onClick={() => markPaid(mt.id)}>
                  {t("markFeePaid")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
