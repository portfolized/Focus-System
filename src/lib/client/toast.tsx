"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, Sparkles } from "lucide-react";

type ToastType = "" | "success" | "error" | "info" | "xp";
interface Toast {
  id: number;
  msg: string;
  type: ToastType;
  leaving: boolean;
}

const ToastContext = createContext<(msg: string, type?: ToastType) => void>(() => {});

let nextId = 1;

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info, xp: Sparkles } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((msg: string, type: ToastType = "") => {
    const id = nextId++;
    setToasts((t) => [...t.slice(-3), { id, msg, type, leaving: false }]);
    setTimeout(() => setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x))), 2600);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2900);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => {
          const Icon = t.type ? ICONS[t.type] : Info;
          return (
            <div key={t.id} className={`toast ${t.type} ${t.leaving ? "leaving" : ""}`}>
              <Icon />
              <span>{t.msg}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
