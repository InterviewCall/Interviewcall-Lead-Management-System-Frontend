import { relativeTime } from "@/lib/format";
import type { Activity } from "./types";

export interface CallStats {
  calls: number;
  connected: number;
  notPickedInARow: number;
  lastAt: string | null;
}

/** Counts calls only (notes, WhatsApp and email are not calls). A call nobody picked is one with connected = false. */
export function callStats(activities: Activity[]): CallStats {
  const calls = activities.filter((a) => a.kind === "CALL").sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  let notPickedInARow = 0;
  for (const c of calls) {
    if (c.connected !== false) break;
    notPickedInARow += 1;
  }
  return { calls: calls.length, connected: calls.filter((c) => c.connected === true).length, notPickedInARow, lastAt: calls[0]?.at ?? null };
}

export function CallSummary({ activities, stage }: { activities: Activity[]; stage: string }) {
  const s = callStats(activities);
  if (s.calls === 0) {
    return stage === "CALL_1_PENDING" ? <p className="text-small text-muted">No calls yet. Moves to Call 1 after the first real conversation.</p> : null;
  }
  const parts = [
    `${s.calls} ${s.calls === 1 ? "call" : "calls"}`,
    `${s.connected} connected`,
    s.lastAt ? `last ${relativeTime(s.lastAt)}` : null,
  ].filter(Boolean);
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-small text-text-2" data-testid="call-summary">
      <span>{parts.join(" · ")}</span>
      {s.notPickedInARow > 0 ? <span className="font-medium text-warn">· {s.notPickedInARow} not picked in a row</span> : null}
      {stage === "CALL_1_PENDING" ? <span className="text-muted">· Moves to Call 1 after the first real conversation</span> : null}
    </p>
  );
}
