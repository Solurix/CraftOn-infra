"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { useAuth } from "@/lib/auth/context";

// A star toggle that bookmarks a job for the current worker. Optimistic: it
// flips immediately and reverts if the request fails. Used standalone and as an
// overlay on a clickable JobCard (hence preventDefault/stopPropagation so a tap
// on the star never also navigates into the card).
export function SaveJobButton({
  jobId,
  saved: initialSaved,
  onChange,
  className = "",
}: {
  jobId: string;
  saved: boolean;
  onChange?: (saved: boolean) => void;
  className?: string;
}) {
  const t = useTranslations("jobs");
  const { api } = useAuth();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !saved;
    setSaved(next); // optimistic
    setBusy(true);
    try {
      if (next) await api.saveJob(jobId);
      else await api.unsaveJob(jobId);
      onChange?.(next);
    } catch {
      setSaved(!next); // revert on failure
    } finally {
      setBusy(false);
    }
  };

  const label = saved ? t("unsave") : t("save");
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      // p-2 grows the tap target to a comfortable size around the glyph.
      className={`p-2 text-xl leading-none ${saved ? "text-brand" : "text-gray-300 hover:text-gray-400"} ${className}`}
    >
      <span aria-hidden>{saved ? "★" : "☆"}</span>
    </button>
  );
}
