import type { Transition } from "motion/react";

/** Fast out, gentle landing. Used for almost everything. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Keep these short: people click through this app all day. */
export const DURATION = { fast: 0.15, base: 0.2, slow: 0.35 } as const;

export const fast: Transition = { duration: DURATION.fast, ease: EASE_OUT };
export const base: Transition = { duration: DURATION.base, ease: EASE_OUT };
export const slow: Transition = { duration: DURATION.slow, ease: EASE_OUT };

/** For things that move with the pointer or settle into place: cards, indicators. */
export const spring: Transition = { type: "spring", stiffness: 520, damping: 42, mass: 0.8 };

/** Parent delays children by this much each, so a group arrives as a wave. */
export const STAGGER = 0.045;
