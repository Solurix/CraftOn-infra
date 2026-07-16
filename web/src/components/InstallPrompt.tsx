"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { readJSON, writeJSON, KEY } from "@/lib/storage";

// Minimal shape of the (non-standard) beforeinstallprompt event.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_ID = "install";

// Contextual "Add to Home Screen" banner. Appears once the browser signals the
// app is installable (beforeinstallprompt) and the user hasn't dismissed or
// installed it. iOS/Safari don't fire the event, so nothing shows there.
export function InstallPrompt() {
  const t = useTranslations("install");
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = readJSON<string[]>(KEY.dismissedTips, []);
    if (dismissed.includes(DISMISS_ID)) return;
    // Already installed (standalone display mode) → never prompt.
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    const dismissed = readJSON<string[]>(KEY.dismissedTips, []);
    writeJSON(KEY.dismissedTips, [...dismissed, DISMISS_ID]);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice.catch(() => undefined);
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="card mb-4 flex items-center gap-3 border-brand/30 bg-brand-soft">
      <span className="text-xl" aria-hidden>
        📲
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{t("title")}</p>
        <p className="text-xs text-gray-600">{t("body")}</p>
      </div>
      <button type="button" className="btn-primary shrink-0" onClick={install}>
        {t("action")}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="shrink-0 px-1 text-gray-400 hover:text-gray-600"
      >
        ×
      </button>
    </div>
  );
}
