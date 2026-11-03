"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
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
      {open ? (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-pop">
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
        </div>
      ) : null}
    </div>
  );
}

export function Popover({ trigger, children, up = false, className }: { trigger: (props: { open: boolean; toggle: () => void }) => ReactNode; children: ReactNode; up?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open ? (
        <div className={cn("absolute right-0 z-30 rounded-lg border border-border bg-surface shadow-pop", up ? "bottom-full mb-1" : "mt-1", className)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
