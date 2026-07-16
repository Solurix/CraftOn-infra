"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { PhotoThumb } from "@/components/PhotoManager";
import { useToast } from "@/components/Toast";
import { Skeleton } from "@/components/ui";
import type { DocumentOut } from "@/lib/api/models";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";
import { useAsync } from "@/lib/useAsync";

const DOC_TYPE = "job_photo";

// Attach photos to a job posting. Offers the account's previously uploaded
// work photos for reuse (same document → same object in Cloud Storage, no
// duplicates) plus a fresh-upload button.
export function JobPhotoPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations("photos");
  const common = useTranslations("common");
  const toast = useToast();
  const { api } = useAuth();
  const { data, loading, reload } = useAsync(() => api.myDocuments(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const photos = (data ?? []).filter((d: DocumentOut) => d.doc_type === DOC_TYPE);

  const toggle = (id: string) =>
    onChange(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const ticket = await api.uploadUrl(DOC_TYPE, file.type || "image/jpeg");
      // On real storage the byte upload must succeed before registering —
      // otherwise the job would reference a blank photo. Only dev/preview fake
      // storage (unreachable host by design) skips the PUT.
      if (!ticket.upload_url.includes("fake-storage.local")) {
        const put = await fetch(ticket.upload_url, {
          method: ticket.method,
          headers: ticket.headers,
          body: file,
        });
        if (!put.ok) throw new Error(common("networkError"));
      }
      const doc = await api.registerDocument(DOC_TYPE, ticket.storage_path);
      onChange([...selected, doc.id]); // a fresh upload is meant for this job
      reload();
    } catch (err) {
      toast.error(humanizeError(err, common("networkError")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {loading ? (
        <div className="grid grid-cols-4 gap-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="aspect-square w-full rounded-lg" />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {photos.map((d) => {
            const active = selected.includes(d.id);
            return (
              <button
                type="button"
                key={d.id}
                onClick={() => toggle(d.id)}
                aria-pressed={active}
                className={`relative rounded-lg ${
                  active ? "ring-2 ring-brand ring-offset-1" : "opacity-80 hover:opacity-100"
                }`}
              >
                <PhotoThumb id={d.id} />
                {active && (
                  <span
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand text-[11px] text-white"
                    aria-hidden
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="grid aspect-square w-full place-items-center rounded-lg border border-dashed border-gray-300 text-2xl text-gray-400 hover:border-brand hover:text-brand disabled:opacity-50"
            aria-label={t("add")}
          >
            {busy ? "…" : "＋"}
          </button>
        </div>
      )}
      <p className="text-xs text-gray-400">{t("reuseHint")}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}
