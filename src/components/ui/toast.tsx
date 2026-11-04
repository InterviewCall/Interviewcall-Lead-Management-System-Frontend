"use client";

import { AnimatePresence, m } from "motion/react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { fast, spring } from "@/lib/motion";
import { Icon } from "./icon";

type ToastTone = "success" | "error" | "info";
interface ToastAction { label: string; onClick: () => void }
interface ToastItem { id: number; tone: ToastTone; message: string; action?: ToastAction }
interface ToastApi { show: (message: string, tone?: ToastTone, action?: ToastAction) => void }

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const show = useCallback((message: string, tone: ToastTone = "success", action?: ToastAction) => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, tone, message, action }]);
    setTimeout(() => dismiss(id), tone === "error" ? 7000 : action ? 8000 : 4000);
  }, [dismiss]);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-20 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end lg:bottom-6">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((t) => (
            <m.div
              key={t.id}
              layout
              role={t.tone === "error" ? "alert" : "status"}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: spring }}
              exit={{ opacity: 0, scale: 0.95, transition: fast }}
              className={cn(
                "pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-lg px-4 py-3 text-body text-white shadow-pop",
                t.tone === "error" ? "bg-bad" : t.tone === "info" ? "bg-slate-800" : "bg-ok",
              )}
            >
              <Icon name={t.tone === "error" ? "warn" : "check"} size={16} className="mt-0.5" />
              <span>{t.message}</span>
              {t.action ? (
                <button type="button" onClick={() => { t.action?.onClick(); dismiss(t.id); }} className="ml-2 rounded-md bg-white/15 px-2 py-0.5 text-small font-semibold hover:bg-white/25">{t.action.label}</button>
              ) : null}
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside <ToastProvider>");
  return value;
}
