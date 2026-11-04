"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("./features").then((module) => module.default);

/**
 * One place for motion settings.
 * - Features load in a separate chunk, so the first paint does not wait for them.
 * - `strict` makes a stray full `motion.div` (which would pull in the whole library) a dev error: use `m.div`.
 * - `reducedMotion="user"` turns movement off for people whose system asks for less of it.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadFeatures} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
