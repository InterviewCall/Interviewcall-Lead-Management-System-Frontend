"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { fast } from "@/lib/motion";
import { Icon, type IconName } from "./icon";

export interface MenuItem {
  label: string;
  icon?: IconName;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/** The ⋮ button on a table row and the popover under it. */
export function RowMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-8 items-center justify-center rounded-md text-text-2 hover:bg-black/5"
      >
        <Icon name="more" size={16} />
      </button>
      <AnimatePresence>
        {open ? (
        <m.div
          role="menu"
          style={{ transformOrigin: "top right" }}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: fast }}
          exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
          className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-pop"
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-body hover:bg-surface-alt disabled:opacity-50",
                item.danger ? "text-bad" : "text-text",
              )}
            >
              {item.icon ? <Icon name={item.icon} size={16} /> : null}
              {item.label}
            </button>
          ))}
        </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function Popover({ trigger, children, up = false, align = "right", className }: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  /** Content, or a function that is given `close` so a choice can dismiss the popover. */
  children: ReactNode | ((api: { close: () => void }) => ReactNode);
  up?: boolean;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      <AnimatePresence>
        {open ? (
          <m.div
            style={{ transformOrigin: `${up ? "bottom" : "top"} ${align}` }}
            initial={{ opacity: 0, scale: 0.95, y: up ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: fast }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
            className={cn("absolute z-40 rounded-lg border border-border bg-surface shadow-pop", align === "right" ? "right-0" : "left-0", up ? "bottom-full mb-1" : "mt-1", className)}
          >
            {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
