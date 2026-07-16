"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import type { Completeness } from "@/lib/completeness";

// Progress meter nudging users to finish their profile. Hidden at 100%. The
// missing-field chips link through to the profile editor.
export function ProfileCompleteness({
  data,
  className = "",
}: {
  data: Completeness;
  className?: string;
}) {
  const t = useTranslations("completeness");
  const fields = useTranslations("completeness.fields");
  if (data.pct >= 100) return null;

  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">{t("title")}</p>
        <span className="text-sm font-bold text-brand">{data.pct}%</span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200"
        role="progressbar"
        aria-valuenow={data.pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${data.pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">{t("hint")}</p>
      {data.missing.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {data.missing.slice(0, 6).map((key) => (
            <Link
              key={key}
              href="/profile"
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600 hover:border-brand hover:text-brand"
            >
              + {fields(key as never)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
