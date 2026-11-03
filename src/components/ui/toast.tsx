"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

type ToastTone = "success" | "error" | "info";
interface ToastItem { id: number; tone: ToastTone; message: string }
interface ToastApi { show: (message: string, tone?: ToastTone) => void }

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, tone, message }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), tone === "error" ? 7000 : 4000);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-20 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end lg:bottom-6">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-lg px-4 py-3 text-body text-white shadow-pop",
              t.tone === "error" ? "bg-bad" : t.tone === "info" ? "bg-slate-800" : "bg-ok",
            )}
          >
            <Icon name={t.tone === "error" ? "warn" : "check"} size={16} className="mt-0.5" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside <ToastProvider>");
  return value;
}
