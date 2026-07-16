"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { useToast } from "@/components/Toast";
import { ErrorText, Spinner, ToggleSwitch } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";
import { useAsync } from "@/lib/useAsync";

export function TradesTab() {
  const t = useTranslations("admin");
  const common = useTranslations("common");
  const { api } = useAuth();
  const toast = useToast();
  const trades = useAsync(() => api.adminTrades(), []);
  const custom = useAsync(() => api.customTrades(), []);
  const [ja, setJa] = useState("");
  const [en, setEn] = useState("");
  const [error, setError] = useState("");
  // Per-custom-value merge target (trade id).
  const [target, setTarget] = useState<Record<string, string>>({});

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      trades.reload();
      custom.reload();
    } catch (e) {
      setError(humanizeError(e, common("networkError")));
    }
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api.createTrade({ name_ja: ja, name_en: en });
      setJa("");
      setEn("");
    });
  };

  const merge = (name: string) => {
    const into = target[name];
    if (!into) return;
    void run(async () => {
      const res = await api.mergeTrade(name, into);
      toast.success(
        t("mergeDone", {
          name: res.canonical_name,
          workers: res.workers_updated,
          jobs: res.jobs_updated,
        }),
      );
    });
  };

  return (
    <div className="space-y-3">
      <form onSubmit={create} className="card space-y-2">
        <h2 className="font-semibold">{t("addTrade")}</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[9rem] flex-1">
            <span className="field-label">{t("tradeJa")}</span>
            <input className="field-input" value={ja} onChange={(e) => setJa(e.target.value)} required />
          </label>
          <label className="min-w-[9rem] flex-1">
            <span className="field-label">{t("tradeEn")}</span>
            <input className="field-input" value={en} onChange={(e) => setEn(e.target.value)} required />
          </label>
          <button className="btn-primary" disabled={!ja.trim() || !en.trim()}>
            {t("addTrade")}
          </button>
        </div>
      </form>
      <ErrorText message={error} />

      {trades.loading ? (
        <Spinner />
      ) : (
        <ul className="card divide-y divide-gray-100">
          {(trades.data ?? []).map((tr) => (
            <li key={tr.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0 [overflow-wrap:anywhere]">
                <span className="font-medium">{tr.name_ja}</span>
                <span className="ml-2 text-sm text-gray-500">{tr.name_en}</span>
              </div>
              <ToggleSwitch
                checked={tr.active}
                aria-label={tr.name_ja}
                onClick={() => run(() => api.updateTrade(tr.id, { active: !tr.active }))}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Free-text values users typed that aren't in the catalog: merge them
          into a canonical trade or promote them to a new one. */}
      <div className="card space-y-2">
        <h2 className="font-semibold">{t("customTrades")}</h2>
        <p className="text-xs text-gray-500">{t("customTradesHint")}</p>
        {custom.loading ? (
          <Spinner />
        ) : (custom.data ?? []).length === 0 ? (
          <p className="py-2 text-sm text-gray-500">{t("noCustomTrades")}</p>
        ) : (
          <ul className="space-y-2">
            {(custom.data ?? []).map((c) => (
              <li key={c.name} className="rounded-lg border border-gray-200 p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium [overflow-wrap:anywhere]">{c.name}</span>
                  <span className="text-xs text-gray-500">
                    {t("customUsage", { workers: c.worker_count, jobs: c.job_count })}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    className="field-input min-w-0 flex-1"
                    aria-label={t("mergeInto")}
                    value={target[c.name] ?? ""}
                    onChange={(e) => setTarget((m) => ({ ...m, [c.name]: e.target.value }))}
                  >
                    <option value="">{t("mergeInto")}</option>
                    {(trades.data ?? []).map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.name_ja} / {tr.name_en}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={!target[c.name]}
                    onClick={() => merge(c.name)}
                  >
                    {t("merge")}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => run(() => api.createTrade({ name_ja: c.name, name_en: c.name }))}
                  >
                    {t("promote")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
