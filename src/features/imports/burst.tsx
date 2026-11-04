"use client";

import { m } from "motion/react";
import { EASE_OUT } from "@/lib/motion";

const DOTS = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2);

/** A ring and a ring of dots that fly outwards once, behind a success icon. */
export function Burst({ className = "bg-ok" }: { className?: string }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <m.span
        initial={{ scale: 0.7, opacity: 0.55 }}
        animate={{ scale: 2.1, opacity: 0 }}
        transition={{ duration: 0.9, ease: EASE_OUT }}
        className="absolute inset-0 rounded-full border-2 border-ok"
      />
      {DOTS.map((angle, i) => (
        <m.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos(angle) * 54, y: Math.sin(angle) * 54, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.85, ease: EASE_OUT, delay: 0.12 }}
          className={`absolute top-1/2 left-1/2 -mt-[3px] -ml-[3px] size-1.5 rounded-full ${i % 3 === 0 ? "bg-primary" : className}`}
        />
      ))}
    </span>
  );
}
