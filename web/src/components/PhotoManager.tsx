"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { useToast } from "@/components/Toast";
import { Skeleton } from "@/components/ui";
import type { DocumentOut } from "@/lib/api/models";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";
import { useAsync } from "@/lib/useAsync";

// Upload + view your own work photos (doc type `job_photo`). Bytes go straight to
// Cloud Storage via a signed PUT URL; the API only records the object path and
// later mints a signed read URL for display (owner/admin only — see
// docs/06 + BLOCKERS.md §1.8 for public portfolio display).
const DOC_TYPE = "job_photo";

export function PhotoThumb({ id }: { id: string }) {
  const { api } = useAuth();
  const { data, loading } = useAsync(() => api.documentViewUrl(id), [id]);
  const [broken, setBroken] = useState(false);

  if (loading) return <Skeleton className="aspect-square w-full rounded-lg" />;
  if (!data || broken) {
    // Fake storage (dev) returns a non-loadable URL — show a neutral placeholder.
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-2xl text-gray-300">
        🖼️
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={data.read_url}
      alt=""
      onError={() => setBroken(true)}
      className="aspect-square w-full rounded-lg border border-gray-200 object-cover"
    />
  );
}

export function PhotoManager() {
  const t = useTranslations("photos");
  const common = useTranslations("common");
  const toast = useToast();
  const { api } = useAuth();
  const { data, loading, reload } = useAsync(() => api.myDocuments(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const photos = (data ?? []).filter((d: DocumentOut) => d.doc_type === DOC_TYPE);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    try {
      const ticket = await api.uploadUrl(DOC_TYPE, file.type || "image/jpeg");
      // Upload the bytes directly to storage. Registering a photo whose bytes
      // never landed would create a blank gallery entry, so on real storage the
      // PUT must succeed. Only dev/preview fake storage (an unreachable host by
      // design) skips the byte upload so the flow stays demoable.
      const isFakeStorage = ticket.upload_url.includes("fake-storage.local");
      if (!isFakeStorage) {
        const put = await fetch(ticket.upload_url, {
          method: ticket.method,
          headers: ticket.headers,
          body: file,
        });
        if (!put.ok) throw new Error(common("networkError"));
      }
      await api.registerDocument(DOC_TYPE, ticket.storage_path);
      toast.success(t("added"));
      reload();
    } catch (err) {
      toast.error(humanizeError(err, common("networkError")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t("title")}</h2>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? t("uploading") : t("add")}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPick}
        />
      </div>
      <p className="text-xs text-gray-500">{t("hint")}</p>
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((d) => (
            <div key={d.id} className="relative">
              <PhotoThumb id={d.id} />
              {/* Photos are post-moderated: no per-photo approval exists, so the
                  only state worth flagging is one an admin removed. */}
              {d.review_status === "rejected" && (
                <span className="absolute left-1 top-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800">
                  {t("hidden")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
