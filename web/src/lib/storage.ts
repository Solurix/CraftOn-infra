"use client";

// SSR-safe, JSON-typed localStorage helpers with cross-component sync.
//
// Several Phase-1 conveniences (saved searches, job templates, favourite
// workers, drafts, theme) are kept on the device until the backend grows
// server-backed equivalents. All such keys live under the `crafton:` prefix so
// they're easy to find and clear. Reads/writes are guarded for SSR and for
// private-mode quota errors — persistence here is best-effort and never blocks.
import { useCallback, useEffect, useRef, useState } from "react";

export const KEY = {
  theme: "crafton:theme",
  savedSearches: "crafton:saved-searches",
  jobTemplates: "crafton:job-templates",
  jobDraft: "crafton:job-draft",
  favoriteWorkers: "crafton:favorite-workers",
  chatTemplates: "crafton:chat-templates",
  dismissedTips: "crafton:dismissed-tips",
} as const;

// Fired after any write so other hook instances in the same tab re-read. The
// native `storage` event only fires in *other* tabs, so we add our own.
const SYNC_EVENT = "crafton:storage";

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: key }));
  } catch {
    /* quota / private mode — persistence is best-effort */
  }
}

// useState mirror backed by localStorage. Starts from `fallback` on the server
// and first client render (so markup matches), then hydrates from storage in an
// effect to avoid hydration mismatches. Stays in sync across instances/tabs.
export function useStoredState<T>(
  key: string,
  fallback: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(fallback);
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    setValue(readJSON<T>(key, fallback));
    const onSync = (e: Event) => {
      const changed = (e as CustomEvent).detail;
      if (changed === undefined || changed === keyRef.current) {
        setValue(readJSON<T>(keyRef.current, fallback));
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === keyRef.current) setValue(readJSON<T>(keyRef.current, fallback));
    };
    window.addEventListener(SYNC_EVENT, onSync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SYNC_EVENT, onSync);
      window.removeEventListener("storage", onStorage);
    };
    // fallback is intentionally not a dep — callers pass a stable literal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        writeJSON(keyRef.current, resolved);
        return resolved;
      });
    },
    [],
  );

  return [value, set];
}
