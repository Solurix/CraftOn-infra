"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { ErrorText, StatusBadge } from "@/components/ui";
import type { DocumentOut } from "@/lib/api/models";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";
import { useAsync } from "@/lib/useAsync";
import type { WorkerFormValue } from "@/lib/workerForm";

// Residence-card / work-permission documents for non-JP workers in profile
// settings: shows the review status of each side (front/back) and lets the
// worker upload a replacement — e.g. after an admin rejected the previous
// image. Uploading only registers the document; the surrounding form's Save
// sends the new doc id via PATCH /workers/me (workerFormToPayload), which is
// what links it to the profile. Review itself is server-side (visa gate,
// docs/08).
const SIDES = ["residence_card_front", "residence_card_back"] as const;
type Side = (typeof SIDES)[number];

const SIDE_TO_FIELD: Record<Side, "residence_card_front_doc_id" | "residence_card_back_doc_id"> = {
  residence_card_front: "residence_card_front_doc_id",
  residence_card_back: "residence_card_back_doc_id",
};

// Latest uploaded document of a given side (the API lists all of them).
function latestDoc(docs: DocumentOut[] | null, side: Side): DocumentOut | null {
  let latest: DocumentOut | null = null;
  for (const d of docs ?? []) {
    if (d.doc_type !== side) continue;
    if (!latest || d.created_at > latest.created_at) latest = d;
  }
  return latest;
}

function SideRow({
  side,
  uploadedId,
  doc,
  busy,
  onPick,
}: {
  side: Side;
  uploadedId: string | null;
  doc: DocumentOut | null;
  busy: boolean;
  onPick: (side: Side, file: File) => void;
}) {
  const p = useTranslations("profile");
  const ob = useTranslations("onboarding");
  const photos = useTranslations("photos");
  const inputRef = useRef<HTMLInputElement>(null);
  const label = side === "residence_card_front" ? ob("residenceCardFront") : ob("residenceCardBack");
  const rejected = !uploadedId && doc?.review_status === "rejected";

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-sm text-gray-700">{label}</span>
        {doc ? (
          <StatusBadge status={doc.review_status} />
        ) : (
          <span className="text-xs text-gray-400">{p("residenceMissing")}</span>
        )}
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? photos("uploading") : doc ? p("residenceReupload") : p("residenceUpload")}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // allow re-selecting the same file
            if (file) onPick(side, file);
          }}
        />
      </div>
      {rejected && (
        <p className="text-xs text-red-600">
          {p("residenceRejected")}
          {doc?.review_note ? ` (${doc.review_note})` : ""}
        </p>
      )}
      {uploadedId && <p className="text-xs text-green-700">{p("residenceUploaded")}</p>}
    </div>
  );
}

export function ResidenceCardSection({
  value,
  onChange,
}: {
  value: Pick<WorkerFormValue, "residence_card_front_doc_id" | "residence_card_back_doc_id">;
  onChange: (patch: Partial<WorkerFormValue>) => void;
}) {
  const p = useTranslations("profile");
  const common = useTranslations("common");
  const { api } = useAuth();
  const docs = useAsync(() => api.myDocuments(), []);
  const [busySide, setBusySide] = useState<Side | null>(null);
  const [error, setError] = useState("");

  const upload = async (side: Side, file: File) => {
    setBusySide(side);
    setError("");
    try {
      const ticket = await api.uploadUrl(side, file.type || "image/jpeg");
      // Bytes go straight to storage via the signed URL. On real storage the
      // PUT must succeed before registering — a card record with no image
      // behind it can't be reviewed. Dev/preview fake storage (unreachable
      // host by design) skips the PUT so the flow stays demoable.
      if (!ticket.upload_url.includes("fake-storage.local")) {
        const put = await fetch(ticket.upload_url, {
          method: ticket.method,
          headers: ticket.headers,
          body: file,
        });
        if (!put.ok) throw new Error(common("networkError"));
      }
      const doc = await api.registerDocument(side, ticket.storage_path);
      onChange({ [SIDE_TO_FIELD[side]]: doc.id });
      docs.reload();
    } catch (err) {
      setError(humanizeError(err, common("networkError")));
    } finally {
      setBusySide(null);
    }
  };

  return (
    <fieldset className="space-y-2 rounded-lg border border-gray-200 p-3">
      <legend className="field-label px-1">{p("residenceTitle")}</legend>
      {SIDES.map((side) => (
        <SideRow
          key={side}
          side={side}
          uploadedId={value[SIDE_TO_FIELD[side]]}
          doc={latestDoc(docs.data, side)}
          busy={busySide === side}
          onPick={(s, f) => void upload(s, f)}
        />
      ))}
      <ErrorText message={error} />
    </fieldset>
  );
}
