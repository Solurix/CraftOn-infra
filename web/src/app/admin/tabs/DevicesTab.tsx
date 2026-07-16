"use client";

import { useTranslations } from "next-intl";

import { Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { formatDate } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";

export function DevicesTab() {
  const t = useTranslations("admin");
  const dv = useTranslations("devices");
  const { api } = useAuth();
  const devices = useAsync(() => api.adminDevices(), []);

  return (
    <div className="space-y-3">
      {devices.loading ? (
        <Spinner />
      ) : !devices.data || devices.data.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">{t("noDevices")}</p>
      ) : (
        <ul className="space-y-2">
          {devices.data.map((d) => (
            <li key={d.id} className="card flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">
                  {d.user_display_name ?? "—"}
                  <span className="ml-2 text-xs text-gray-500">
                    {d.label || dv("unknownDevice")}
                  </span>
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(d.last_seen_at)}
                  {d.revoked && ` · ${dv("revoked")}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
