"use client";

import { useTranslations } from "next-intl";

import { KEY, useStoredState } from "@/lib/storage";

// Masking-safe canned chat messages — tap to fill the composer (the worker can
// still edit before sending). A handful of sensible defaults plus the user's own
// saved replies (device-local). Server-side masking still applies on send.
export function QuickReplies({
  currentText,
  onPick,
}: {
  currentText: string;
  onPick: (text: string) => void;
}) {
  const t = useTranslations("chat");
  const common = useTranslations("common");
  const [saved, setSaved] = useStoredState<string[]>(KEY.chatTemplates, []);

  const defaults = [t("quickOnMyWay"), t("quickRunningLate"), t("quickArrived")];
  const replies = [...defaults, ...saved];

  const canSave =
    currentText.trim().length > 0 && !replies.includes(currentText.trim());

  return (
    <div className="flex flex-wrap gap-1.5">
      {replies.map((r, i) => {
        const isCustom = i >= defaults.length;
        return (
          <span key={`${r}-${i}`} className="inline-flex items-center">
            <button
              type="button"
              onClick={() => onPick(r)}
              className={`rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:border-brand hover:text-brand ${
                isCustom ? "rounded-r-none" : ""
              }`}
            >
              {r}
            </button>
            {isCustom && (
              <button
                type="button"
                aria-label={common("remove")}
                onClick={() =>
                  setSaved((prev) => prev.filter((_, idx) => idx !== i - defaults.length))
                }
                className="rounded-r-full border border-l-0 border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-400 hover:text-red-600"
              >
                ×
              </button>
            )}
          </span>
        );
      })}
      {canSave && (
        <button
          type="button"
          onClick={() => setSaved((prev) => [...prev, currentText.trim()])}
          className="rounded-full border border-dashed border-brand/50 px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand-soft"
        >
          + {t("saveQuickReply")}
        </button>
      )}
    </div>
  );
}
