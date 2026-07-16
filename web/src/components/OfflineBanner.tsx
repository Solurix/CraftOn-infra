"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

// Subtle banner shown when the device goes offline, so failed loads read as
// "you're offline" rather than "the app is broken". Pairs with the PWA service
// worker; richer offline caching is tracked in BLOCKERS.md (§6.11).
export function OfflineBanner() {
  const t = useTranslations("common");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
    >
      <span aria-hidden>⚠️</span>
      {t("offline")}
    </div>
  );
}
