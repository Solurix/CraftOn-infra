"use client";

import { useTranslations } from "next-intl";

import type { WorkerProfile } from "@/lib/api/models";

// Heads-up about residence-status / work-permission expiry. The hard gate is
// authoritative on the server (docs/08) — this is an early, friendly warning so
// a worker can renew before applications start getting blocked.
const WARN_WITHIN_DAYS = 60;

function daysUntil(isoDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const today = new Date();
  const target = new Date(`${isoDate}T00:00:00+09:00`); // Asia/Tokyo business day
  const ms = target.getTime() - today.getTime();
  return Math.ceil(ms / 86_400_000);
}

export function VisaStatusBanner({ profile }: { profile?: WorkerProfile | null }) {
  const t = useTranslations("visa");
  const expiry = profile?.visa_expiry_date;
  if (!expiry) return null;
  const days = daysUntil(expiry);
  if (days === null || days > WARN_WITHIN_DAYS) return null;

  const expired = days < 0;
  const tone = expired
    ? "border-red-200 bg-red-50 text-red-800"
    : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div
      role="alert"
      className={`mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${tone}`}
    >
      <span aria-hidden>{expired ? "⛔" : "⚠️"}</span>
      <div>
        <p className="font-medium">{expired ? t("expiredTitle") : t("expiringTitle")}</p>
        <p className="text-xs">
          {expired
            ? t("expiredBody", { date: expiry })
            : t("expiringBody", { days, date: expiry })}
        </p>
      </div>
    </div>
  );
}
