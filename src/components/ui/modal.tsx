"use client";

import { AnimatePresence, m, useDragControls } from "motion/react";
import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { fast, slow, spring } from "@/lib/motion";
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

const PHONE_QUERY = "(max-width: 639px)";
const subscribePhone = (notify: () => void) => {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const isPhone = () => window.matchMedia(PHONE_QUERY).matches;

const subscribeNothing = () => () => {};

/** Centred dialog on desktop, bottom sheet on phones (as in the Log call designs). */
export function Modal({ open, title, subtitle, onClose, children, footer, width = 560 }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const dragControls = useDragControls();
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
  // False on the server and during hydration, true afterwards, so the portal never mismatches.
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <m.div
            className="absolute inset-0 bg-slate-900/50"
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fast}
          />
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            style={{ maxWidth: width }}
            className="relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-surface shadow-pop outline-none sm:rounded-xl"
            // Phones: the sheet rises from the bottom and can be pulled down to dismiss. Desktop: a soft pop.
            initial={phone ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 10 }}
            animate={phone ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={phone ? { y: "100%", transition: fast } : { opacity: 0, scale: 0.97, y: 6, transition: fast }}
            transition={phone ? spring : slow}
            drag={phone ? "y" : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) onClose();
            }}
          >
            <div
              className="flex touch-none justify-center pt-2.5 sm:hidden"
              onPointerDown={(event) => dragControls.start(event)}
              aria-hidden="true"
            >
              <span className="h-1 w-10 rounded-full bg-border-strong" />
            </div>
            <div className="flex items-start gap-3 border-b border-border px-6 py-4 max-sm:touch-none" onPointerDown={phone ? (event) => dragControls.start(event) : undefined}>
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
          </m.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
