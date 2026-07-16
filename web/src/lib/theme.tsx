"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { KEY } from "./storage";

export type Theme = "light" | "dark" | "system";

// Small inline script string injected (unhydrated) into the document head so the
// correct theme class is applied before first paint — avoids a light→dark flash.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY.theme}');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||((!t||t==='system')&&d)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

type Ctx = { theme: Theme; resolved: "light" | "dark"; setTheme: (t: Theme) => void };
const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");

  // Hydrate from storage on mount (the init script already set the class).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY.theme) as Theme | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Follow OS changes while in "system" mode.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(KEY.theme, t);
    } catch {
      /* ignore */
    }
    apply(t);
  }, []);

  const resolved: "light" | "dark" =
    theme === "dark" || (theme === "system" && systemPrefersDark())
      ? "dark"
      : "light";

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
