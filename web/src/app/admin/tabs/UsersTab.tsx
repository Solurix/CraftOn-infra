"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

import { ErrorText, Spinner, StatusBadge } from "@/components/ui";
import type { VettingItem } from "@/lib/api/models";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";
import { useAsync } from "@/lib/useAsync";

function profileHref(item: VettingItem): string | null {
  // Only link to a profile page that actually exists. A user who signed up but
  // never completed onboarding has no worker/contractor profile, so the public
  // profile endpoint would 404 (error.not_found). Render their name as plain
  // text instead — same condition surfaced below as `awaitingOnboarding`.
  if (item.user.user_type === "worker" && item.worker_profile) return `/workers/${item.user.id}`;
  if (item.user.user_type === "contractor" && item.contractor_profile)
    return `/contractors/${item.user.id}`;
  return null;
}

export function UsersTab() {
  const t = useTranslations("admin");
  const ob = useTranslations("onboarding");
  const common = useTranslations("common");
  const { api } = useAuth();
  const [userType, setUserType] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  // Optional per-user rejection reason, keyed by user id (sent with Reject).
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const users = useAsync(
    () => api.adminUsers({ user_type: userType || undefined, status: status || undefined }),
    [userType, status],
  );

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      users.reload();
    } catch (e) {
      setError(humanizeError(e, common("networkError")));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select className="field-input" value={userType} onChange={(e) => setUserType(e.target.value)}>
          <option value="">{t("filterAll")}</option>
          <option value="worker">worker</option>
          <option value="contractor">contractor</option>
          <option value="admin">admin</option>
        </select>
        <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("filterAll")}</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="suspended">suspended</option>
        </select>
      </div>
      <ErrorText message={error} />
      {users.loading ? (
        <Spinner />
      ) : !users.data || users.data.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">{t("noUsers")}</p>
      ) : (
        <ul className="space-y-3">
          {users.data.items.map((item) => {
            const href = profileHref(item);
            // A non-admin with neither profile signed up but never finished the
            // onboarding form — the backend approve gate would reject it, so
            // surface that here instead of offering an action that 400s.
            const awaitingOnboarding =
              item.user.user_type !== "admin" &&
              !item.worker_profile &&
              !item.contractor_profile;
            const vettingDocs = item.documents.filter(
              (d) => d.doc_type !== "job_photo",
            );
            return (
              <li key={item.user.id} className="card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 [overflow-wrap:anywhere]">
                    {href ? (
                      <Link href={href} className="link">
                        {item.user.display_name}
                      </Link>
                    ) : (
                      <span className="font-medium">{item.user.display_name}</span>
                    )}
                    <p className="text-xs text-gray-500">
                      {item.user.user_type} · {item.user.phone_number}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={item.user.status} />
                  </div>
                </div>
                {item.worker_profile && (
                  <p className="text-xs text-gray-600">
                    {item.worker_profile.nationality} · {ob(item.worker_profile.worker_class)} ·{" "}
                    {item.worker_profile.years_experience}y ·{" "}
                    {item.worker_profile.trades?.join(", ")}
                  </p>
                )}
                {item.contractor_profile && (
                  <p className="text-xs text-gray-600">
                    {item.contractor_profile.company_name} · {item.contractor_profile.prefecture}
                  </p>
                )}
                {/* Per-document review status so a rejected document is visible
                    at a glance (not just a count). Work photos are post-moderated
                    (not part of vetting), so they're left out of this list. */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                  <span>
                    {t("documents")}
                    {vettingDocs.length === 0 ? `: ${vettingDocs.length}` : ":"}
                  </span>
                  {vettingDocs.map((d) => (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 py-0.5 pl-2 pr-0.5 text-gray-600"
                    >
                      {t(`docTypes.${d.doc_type}` as never)}
                      <StatusBadge status={d.review_status} />
                    </span>
                  ))}
                </div>
                {awaitingOnboarding && (
                  <p className="text-xs text-amber-700">{t("awaitingOnboarding")}</p>
                )}
                {item.user.user_type !== "admin" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="btn-primary"
                      disabled={awaitingOnboarding}
                      onClick={() => run(() => api.approveUser(item.user.id))}
                    >
                      {t("approve")}
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() =>
                        // Send the typed reason; empty → omit (no hardcoded text).
                        run(() =>
                          api.rejectUser(
                            item.user.id,
                            (reasons[item.user.id] ?? "").trim() || undefined,
                          ),
                        )
                      }
                    >
                      {t("reject")}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        run(() => api.suspendUser(item.user.id, item.user.status !== "suspended"))
                      }
                    >
                      {item.user.status === "suspended" ? t("unsuspend") : t("suspend")}
                    </button>
                    <input
                      className="field-input min-w-[10rem] flex-1 text-sm"
                      placeholder={t("rejectReasonPlaceholder")}
                      aria-label={t("rejectReasonPlaceholder")}
                      value={reasons[item.user.id] ?? ""}
                      onChange={(e) =>
                        setReasons((r) => ({ ...r, [item.user.id]: e.target.value }))
                      }
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
