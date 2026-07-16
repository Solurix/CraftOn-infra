"use client";

import { useTranslations } from "next-intl";

import type { Review } from "@/lib/api/models";

export function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  const t = useTranslations("reviews");
  if (reviews.length === 0) return <p className="text-sm text-gray-500">{t("empty")}</p>;
  return (
    <ul className="space-y-2">
      {reviews.map((r) => (
        <li key={r.id} className="rounded border border-gray-100 p-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-600">{"★".repeat(r.rating)}</span>
            {r.tags?.map((tag) => (
              <span key={tag} className="rounded-full bg-gray-100 px-2 text-xs text-gray-600">
                {tag}
              </span>
            ))}
          </div>
          {r.comment && <p className="mt-1 text-gray-700">{r.comment}</p>}
        </li>
      ))}
    </ul>
  );
}
