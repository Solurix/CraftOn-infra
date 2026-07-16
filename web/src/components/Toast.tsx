"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

type Ctx = {
  show: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<Ctx | null>(null);

const ICON: Record<ToastKind, string> = {
  success: "✓",
  error: "!",
  info: "i",
};
const TONE: Record<ToastKind, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-brand/30 bg-brand-soft text-brand-dark",
};

// App-wide, non-blocking feedback. Toasts auto-dismiss after a few seconds and
// stack bottom-centre (thumb-reachable, clear of the header). Polite live region
// so screen readers announce them without stealing focus.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = ++seq.current;
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const value: Ctx = {
    show,
    success: useCallback((m: string) => show(m, "success"), [show]),
    error: useCallback((m: string) => show(m, "error"), [show]),
    info: useCallback((m: string) => show(m, "info"), [show]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => remove(t.id)}
            className={`toast-in pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${TONE[t.kind]}`}
          >
            <span
              aria-hidden
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/15 text-xs"
            >
              {ICON[t.kind]}
            </span>
            <span className="text-left">{t.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
