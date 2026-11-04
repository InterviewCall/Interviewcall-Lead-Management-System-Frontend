"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const KEY = "crm.sidebar";
const listeners = new Set<() => void>();
// Held in memory too, so the choice still works for this visit when storage is blocked.
let memory: boolean | null = null;

function read(): boolean {
  if (memory !== null) return memory;
  try {
    // Collapsed unless this person has chosen to expand it.
    memory = window.localStorage.getItem(KEY) !== "expanded";
  } catch {
    memory = true;
  }
  return memory;
}

function write(value: boolean) {
  memory = value;
  try {
    window.localStorage.setItem(KEY, value ? "collapsed" : "expanded");
  } catch {
    // Private window or blocked storage: the sidebar still toggles, it just will not be remembered.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether the desktop sidebar is collapsed to icons. Collapsed by default; the choice is remembered per browser. */
export function useSidebar() {
  const collapsed = useSyncExternalStore(subscribe, read, () => true);
  const toggle = useCallback(() => write(!read()), []);
  return { collapsed, toggle };
}

/** Press [ to collapse or expand the sidebar, unless the person is typing. */
export function useSidebarShortcut(toggle: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "[" || event.metaKey || event.ctrlKey || event.altKey) return;
      const el = event.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);
}
