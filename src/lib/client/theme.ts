"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "dark" | "light";
const KEY = "fs-theme";
const listeners = new Set<() => void>();

/** Runs before first paint (inlined in the root layout) so there is no theme flash. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function read(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "dark" as Theme,
  );
  const toggle = useCallback(() => {
    const next: Theme = read() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    listeners.forEach((l) => l());
  }, []);
  return { theme, toggle };
}
