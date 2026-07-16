"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { ErrorText, Spinner, ToggleSwitch } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";
import { useAsync } from "@/lib/useAsync";

export function ConfigTab() {
  const t = useTranslations("admin");
  const common = useTranslations("common");
  const { api } = useAuth();
  const config = useAsync(() => api.readConfig(), []);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const parsed = JSON.parse(value);
      await api.updateConfig({ [key]: parsed });
      setKey("");
      setValue("");
      config.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "invalid value (use JSON)");
    }
  };

  const toggleFlag = async (flag: string, next: boolean) => {
    setError("");
    try {
      await api.updateConfig({ [flag]: next });
      config.reload();
    } catch (e) {
      setError(humanizeError(e, common("networkError")));
    }
  };

  // Every boolean config value is exposed as a quick on/off toggle.
  const flags = Object.entries(config.data?.config ?? {}).filter(
    ([, v]) => typeof v === "boolean",
  ) as [string, boolean][];

  return (
    <div className="space-y-3">
      {flags.length > 0 && (
        <div className="card space-y-2">
          <h3 className="font-semibold">{t("flags")}</h3>
          <ul className="space-y-1">
            {flags.map(([flag, on]) => (
              <li key={flag} className="flex items-center justify-between gap-2">
                <span className="text-sm">
                  {flag === "auto_approve_users" ? (
                    <span className="font-medium">{t("autoApproveUsers")}</span>
                  ) : (
                    <code className="text-xs text-gray-600">{flag}</code>
                  )}
                </span>
                <ToggleSwitch checked={on} aria-label={flag} onClick={() => toggleFlag(flag, !on)} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <form onSubmit={save} className="card flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <label className="field-label">{t("configKey")}</label>
          <input className="field-input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="platform_fee_per_match" />
        </div>
        <div className="flex-1">
          <label className="field-label">{t("configValue")} (JSON)</label>
          <input className="field-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="5000" />
        </div>
        <button className="btn-primary" disabled={!key || !value}>
          {t("saveConfig")}
        </button>
      </form>
      <ErrorText message={error} />
      {config.loading ? (
        <Spinner />
      ) : (
        <pre className="max-h-96 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-700">
          {JSON.stringify(config.data?.config ?? {}, null, 2)}
        </pre>
      )}
    </div>
  );
}
