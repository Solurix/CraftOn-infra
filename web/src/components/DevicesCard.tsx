"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorText, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth/context";
import { getDeviceId } from "@/lib/device";
import { humanizeError } from "@/lib/errorMessage";
import { formatDate } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";

// Lists the devices/sessions the user is signed in from. They can end the
// session on any other device (sign it out), end every other session at once,
// or end the session on this device (log out here).
export function DevicesCard() {
  const t = useTranslations("devices");
  const common = useTranslations("common");
  const { api, logout } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => api.myDevices(), []);
  const current = getDeviceId();
  const [revokeError, setRevokeError] = useState("");
  const [busy, setBusy] = useState(false);

  const revoke = async (id: string) => {
    setRevokeError("");
    setBusy(true);
    try {
      await api.revokeDevice(id);
      toast.success(t("ended"));
      reload();
    } catch (e) {
      const msg = humanizeError(e, common("networkError"));
      setRevokeError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const others = (data ?? []).filter(
    (d) => !d.revoked && d.device_id !== current,
  );

  const endAllOthers = async () => {
    if (typeof window !== "undefined" && !window.confirm(t("endAllOthersConfirm"))) {
      return;
    }
    setRevokeError("");
    setBusy(true);
    try {
      for (const d of others) await api.revokeDevice(d.id);
      toast.success(t("ended"));
      reload();
    } catch (e) {
      const msg = humanizeError(e, common("networkError"));
      setRevokeError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const endThisSession = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t("title")}</h2>
        {others.length > 0 && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={busy}
            onClick={endAllOthers}
          >
            {t("endAllOthers")}
          </button>
        )}
      </div>
      <ErrorText message={error || revokeError} />
      {loading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-gray-500">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {data.map((d) => {
            const isCurrent = d.device_id === current;
            return (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {d.label || t("unknownDevice")}
                    {isCurrent && (
                      <span className="ml-1 text-xs text-brand">
                        ({t("thisDevice")})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(d.last_seen_at)}
                    {d.revoked && ` · ${t("revoked")}`}
                  </p>
                </div>
                {d.revoked ? null : isCurrent ? (
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={endThisSession}
                  >
                    {t("endThisSession")}
                  </button>
                ) : (
                  <button
                    className="btn-danger btn-sm"
                    disabled={busy}
                    onClick={() => revoke(d.id)}
                  >
                    {t("endSession")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
