"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { ErrorText } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";

export function DebugTab() {
  const t = useTranslations("admin");
  const common = useTranslations("common");
  const { api } = useAuth();
  const [workers, setWorkers] = useState(5);
  const [contractors, setContractors] = useState(3);
  const [jobs, setJobs] = useState(10);
  const [result, setResult] = useState<{ workers: number; contractors: number; jobs: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const seed = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setBusy(true);
    try {
      setResult(
        await api.debugSeed({
          workers: Number(workers),
          contractors: Number(contractors),
          jobs: Number(jobs),
        }),
      );
    } catch (e) {
      setError(humanizeError(e, common("networkError")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={seed} className="card space-y-3">
      <h2 className="font-semibold">{t("seedTitle")}</h2>
      <p className="text-xs text-amber-700">{t("seedWarning")}</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[9rem] flex-1">
          <span className="field-label">{t("seedWorkers")}</span>
          <input type="number" min={0} className="field-input" value={workers} onChange={(e) => setWorkers(Number(e.target.value))} />
        </label>
        <label className="min-w-[9rem] flex-1">
          <span className="field-label">{t("seedContractors")}</span>
          <input type="number" min={0} className="field-input" value={contractors} onChange={(e) => setContractors(Number(e.target.value))} />
        </label>
        <label className="min-w-[9rem] flex-1">
          <span className="field-label">{t("seedJobs")}</span>
          <input type="number" min={0} className="field-input" value={jobs} onChange={(e) => setJobs(Number(e.target.value))} />
        </label>
        <button className="btn-primary" disabled={busy}>
          {t("seedRun")}
        </button>
      </div>
      {result && (
        <p className="text-sm text-green-700">
          {t("seedDone", {
            workers: result.workers,
            contractors: result.contractors,
            jobs: result.jobs,
          })}
        </p>
      )}
      <ErrorText message={error} />
    </form>
  );
}
