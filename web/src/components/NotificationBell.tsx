"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/context";
import { NOTIFICATIONS_CHANGED } from "@/lib/notifications";

// A header bell with an unread badge. Polls the unread count lightly, on window
// focus, and whenever the inbox marks notifications read (NOTIFICATIONS_CHANGED);
// navigates to the inbox. (Real-time push is a later, GCP feature.)
export function NotificationBell() {
  const { me, api } = useAuth();
  const t = useTranslations("notifications");
  const router = useRouter();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    api
      .unreadCount()
      .then((r) => setCount(r.count))
      .catch(() => {
        /* best-effort */
      });
  }, [api]);

  useEffect(() => {
    if (!me) {
      setCount(0); // drop a stale badge from a previous account on logout/switch
      return;
    }
    refresh();
    const id = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(NOTIFICATIONS_CHANGED, refresh);
    };
  }, [me, refresh]);

  if (!me) return null;

  return (
    <button
      onClick={() => router.push("/notifications")}
      aria-label={count > 0 ? t("bellUnread", { count }) : t("bell")}
      className="relative rounded-full px-1 text-lg"
    >
      <span aria-hidden>🔔</span>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
