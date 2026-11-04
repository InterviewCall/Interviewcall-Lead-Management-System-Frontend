"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/roles";
import type { LeadDetail } from "./types";

type Vsl = NonNullable<LeadDetail["vsl"]>;

const STEPS: Array<{ depth: Vsl["depth"]; label: string }> = [
  { depth: "DETAILS", label: "Gave details" },
  { depth: "FORM", label: "Filled the form" },
  { depth: "BOOKED", label: "Booked a call" },
];
const RANK: Record<Vsl["depth"], number> = { NONE: 0, DETAILS: 1, FORM: 2, BOOKED: 3 };
const TEMP: Record<NonNullable<Vsl["temperature"]>, { label: string; tone: Tone }> = {
  HOT: { label: "Hot", tone: "danger" },
  WARM: { label: "Warm", tone: "warning" },
  COLD: { label: "Cold", tone: "info" },
};
const CALL: Record<Vsl["bookings"][number]["status"], { label: string; tone: Tone }> = {
  CONFIRMED: { label: "Booked", tone: "primary" },
  COMPLETED: { label: "Call done", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};
const callTime = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** How far this person got on the video sales letter: three steps, the score the form gave, the call they booked, and what they answered. */
export function VslJourney({ vsl }: { vsl: Vsl }) {
  const [showAnswers, setShowAnswers] = useState(false);
  const reached = RANK[vsl.depth];
  const call = vsl.bookings[0] ?? null;
  const answers = vsl.forms[0]?.answers ?? [];
  const temp = vsl.temperature ? TEMP[vsl.temperature] : null;

  return (
    <div className="flex flex-col gap-3 py-1">
      <ol className="flex items-center gap-1" aria-label="VSL steps">
        {STEPS.map((step, i) => {
          const done = reached >= RANK[step.depth];
          return (
            <li key={step.depth} className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className={cn("h-1.5 rounded-full transition-colors", done ? "bg-primary" : "bg-border")} />
              <span className={cn("flex items-center gap-1 text-small", done ? "font-medium text-text" : "text-muted")}>
                {done ? <Icon name="check" size={12} className="shrink-0 text-primary" /> : <span className="w-3 shrink-0 text-center">{i + 1}</span>}
                <span className="truncate">{step.label}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {vsl.score !== null || temp ? (
        <div className="flex flex-wrap items-center gap-2 text-body text-text-2">
          {vsl.score !== null ? <span>Form score <span className="font-semibold text-text tabular-nums">{vsl.score}</span>/100</span> : null}
          {temp ? <Badge tone={temp.tone}>{temp.label}</Badge> : null}
        </div>
      ) : null}

      {call ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-alt px-3 py-2 text-body">
          <Icon name="calendar" size={14} className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1 text-text">{callTime.format(new Date(call.slotStartAt))}</span>
          <Badge tone={CALL[call.status].tone}>{CALL[call.status].label}</Badge>
        </div>
      ) : null}

      {answers.length > 0 ? (
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => setShowAnswers((v) => !v)}
            aria-expanded={showAnswers}
            className="inline-flex w-fit items-center gap-1.5 rounded-md py-1 text-small font-medium text-primary hover:underline"
          >
            <Icon name="chev" size={13} className={cn("transition-transform", !showAnswers && "-rotate-90")} />
            What they answered ({answers.length})
          </button>
          {showAnswers ? (
            <dl className="mt-1 flex flex-col gap-2 border-l-2 border-border pl-3">
              {answers.map((a) => (
                <div key={a.key} className="flex flex-col">
                  <dt className="text-small text-muted">{a.question}</dt>
                  <dd className="text-body break-words text-text">{a.answer}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
