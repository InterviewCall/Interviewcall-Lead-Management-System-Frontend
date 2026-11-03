"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icon";

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

/** Centred dialog on desktop, bottom sheet on phones (as in the Log call designs). */
export function Modal({ open, title, subtitle, onClose, children, footer, width = 560 }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ maxWidth: width }}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-surface shadow-pop outline-none sm:rounded-xl"
      >
        <div className="flex items-start gap-3 border-b border-border px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-h2 font-semibold text-text">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-body text-text-2">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 hover:bg-black/5">
            <Icon name="x" size={20} className="text-muted" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
