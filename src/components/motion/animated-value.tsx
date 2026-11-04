"use client";

import { animate, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef } from "react";

const PARTS = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/;

/**
 * Shows `value` and counts up to it. Works on text such as "1,284", "64%" or "99.6%": the number inside is
 * animated and the rest is kept. The final text is what the server renders, so nothing jumps and screen
 * readers always read the real figure. When the value changes later it counts from what was on screen.
 */
export function AnimatedValue({ value, className }: { value: string | number; className?: string }) {
  const text = String(value);
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef<number | null>(null);
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parts = PARTS.exec(text);
    if (!parts || reduce) {
      el.textContent = text;
      shown.current = null;
      return;
    }
    const [, prefix = "", digits = "", suffix = ""] = parts;
    const target = Number(digits.replace(/,/g, ""));
    const decimals = digits.includes(".") ? (digits.split(".")[1]?.length ?? 0) : 0;
    const grouped = digits.includes(",");
    const format = (n: number) =>
      prefix +
      (grouped
        ? n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : n.toFixed(decimals)) +
      suffix;
    const controls = animate(shown.current ?? 0, target, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (n) => {
        shown.current = n;
        el.textContent = format(n);
      },
      onComplete: () => {
        shown.current = target;
        el.textContent = text;
      },
    });
    return () => controls.stop();
  }, [text, reduce]);

  return <span ref={ref} className={className}>{text}</span>;
}
