"use client";

import { useCallback, useEffect, useRef, useState, type FocusEvent, type PointerEvent } from "react";

/** A short pause before opening, so a mouse passing over the rail on its way somewhere else does not open it. */
const OPEN_DELAY = 120;
/** A short pause before closing, so slipping a few pixels past the edge does not snap it shut. */
const CLOSE_DELAY = 200;

/**
 * The desktop sidebar opens while the mouse is over it and closes when the mouse leaves. Keyboard users get the same:
 * tabbing into it opens it, tabbing out or pressing Escape closes it. Touch never opens it, so a tap just navigates.
 */
export function useSidebarHover() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback((value: boolean, delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(value), delay);
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handlers = {
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType === "mouse") schedule(true, OPEN_DELAY);
    },
    onPointerLeave: (event: PointerEvent) => {
      if (event.pointerType === "mouse") schedule(false, CLOSE_DELAY);
    },
    onFocus: (event: FocusEvent) => {
      // Only keyboard focus opens it; a mouse click already opened it by hovering.
      if ((event.target as HTMLElement).matches(":focus-visible")) schedule(true, 0);
    },
    onBlur: (event: FocusEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) schedule(false, 0);
    },
    onKeyDown: (event: { key: string }) => {
      if (event.key === "Escape") schedule(false, 0);
    },
  };
  return { open, handlers };
}
