"use client";

// This utility intentionally keys its effect on caller-provided `deps` rather
// than a literal array, so the exhaustive-deps heuristic can't verify it.
/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useRef, useState } from "react";

// Minimal data-loading helper: runs `fn`, tracks loading/error, exposes reload.
// Only the most recent run is allowed to update state, so a slow earlier request
// can't overwrite a newer one's result (out-of-order response race).
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const latest = useRef(0);

  const run = useCallback(() => {
    const callId = ++latest.current;
    setLoading(true);
    setError("");
    fn()
      .then((d) => {
        if (callId === latest.current) setData(d);
      })
      .catch((e: unknown) => {
        if (callId === latest.current)
          setError(e instanceof Error ? e.message : "error");
      })
      .finally(() => {
        if (callId === latest.current) setLoading(false);
      });
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, reload: run, setData };
}
