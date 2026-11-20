import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatDate, relativeTime } from "@/lib/format";
import type { Tone } from "@/lib/roles";
import type { Lead, LifecycleCode, StageCode, TemperatureCode } from "./types";

export const LIFECYCLE: Record<LifecycleCode, { label: string; tone: Tone }> = {
  MARKETING_LEAD: { label: "Marketing Lead", tone: "neutral" },
  ENGAGED_LEAD: { label: "Engaged Lead", tone: "info" },
  PROSPECT: { label: "Prospect", tone: "primary" },
  ENROLLED: { label: "Enrolled", tone: "success" },
  LEARNER_ONBOARDED: { label: "Learner Onboarded", tone: "success" },
  NOT_INTERESTED: { label: "Not interested", tone: "danger" },
  EXHAUSTED_NOT_CONNECTED: { label: "Exhausted, not connected", tone: "danger" },
};

export const STAGE_ORDER: StageCode[] = [
  "CALL_1_PENDING", "CALL_1", "TEST", "CALL_2", "PSYCHOMETRIC_SESSION", "DECISION_OBJECTION", "PAYMENT_FINANCING", "CLOSED_WON",
];

export const STAGE: Record<StageCode, { label: string; tone: Tone }> = {
  CALL_1_PENDING: { label: "Call 1 Pending", tone: "neutral" },
  CALL_1: { label: "Call 1", tone: "info" },
  TEST: { label: "Test", tone: "violet" },
  CALL_2: { label: "Call 2", tone: "primary" },
  PSYCHOMETRIC_SESSION: { label: "Psychometric session", tone: "violet" },
  DECISION_OBJECTION: { label: "Decision / Objection", tone: "warning" },
  PAYMENT_FINANCING: { label: "Payment / Financing", tone: "warning" },
  CLOSED_WON: { label: "Closed Won", tone: "success" },
};

export const TEMPERATURE: Record<TemperatureCode, { label: string; tone: Tone }> = {
  HOT: { label: "Hot", tone: "danger" },
  WARM: { label: "Warm", tone: "warning" },
  COLD: { label: "Cold", tone: "info" },
};

export const LifecycleChip = ({ code }: { code: LifecycleCode }) => <Badge tone={LIFECYCLE[code].tone}>{LIFECYCLE[code].label}</Badge>;

const DOT: Record<Tone, string> = {
  neutral: "bg-muted", primary: "bg-primary", success: "bg-ok", warning: "bg-warn", danger: "bg-bad", info: "bg-info", violet: "bg-violet",
};
const STAGE_FILL: Record<Tone, string> = {
  neutral: "bg-muted", primary: "bg-primary", success: "bg-ok", warning: "bg-warm", danger: "bg-bad", info: "bg-info", violet: "bg-violet",
};

/** A contact stage as a coloured dot and its name: quieter than a pill in a dense table. */
export function LifecycleText({ code }: { code: LifecycleCode }) {
  const l = LIFECYCLE[code];
  return (
    <span className="inline-flex items-center gap-2 text-body whitespace-nowrap text-text">
      <span className={`size-2 shrink-0 rounded-full ${DOT[l.tone]}`} />
      {l.label}
    </span>
  );
}

/**
 * How far an opportunity has got: one segment per pipeline stage, filled up to the current one in its colour,
 * with the stage's name. Lost and merged deals are not shown here (the lead has no open opportunity).
 */
export function StageMeter({ code }: { code: StageCode | null }) {
  if (!code) return <span className="text-small whitespace-nowrap text-muted">No open deal</span>;
  const index = STAGE_ORDER.indexOf(code);
  const fill = STAGE_FILL[STAGE[code].tone];
  return (
    <span className="inline-flex flex-col gap-1.5" title={`${STAGE[code].label}: step ${index + 1} of ${STAGE_ORDER.length}`}>
      <span className="flex gap-[3px]" aria-hidden>
        {STAGE_ORDER.map((stage, i) => (
          <span key={stage} className={`h-1 w-3 rounded-full ${i <= index ? fill : "bg-border"}`} />
        ))}
      </span>
      <span className="text-small leading-4 font-medium whitespace-nowrap text-text">{STAGE[code].label}</span>
    </span>
  );
}

const HEAT: Record<TemperatureCode, { bars: number; color: string; text: string }> = {
  HOT: { bars: 3, color: "bg-hot", text: "text-hot" },
  WARM: { bars: 2, color: "bg-warm", text: "text-warm" },
  COLD: { bars: 1, color: "bg-cold", text: "text-cold" },
};

/** Three rising bars, lit by how warm the lead is: readable at a glance, and without colour. */
export function HeatBars({ code, className = "" }: { code: TemperatureCode | null; className?: string }) {
  const heat = code ? HEAT[code] : null;
  return (
    <span className={`inline-flex items-end gap-[2px] ${className}`} aria-hidden>
      {[6, 9, 12].map((h, i) => (
        <span key={h} style={{ height: h }} className={`w-[3px] rounded-full ${heat && i < heat.bars ? heat.color : "bg-border-strong/70"}`} />
      ))}
    </span>
  );
}

export function StageChip({ code }: { code: StageCode | null }) {
  if (!code) return <span className="text-small text-muted">No opportunity</span>;
  return <Badge tone={STAGE[code].tone}>{STAGE[code].label}</Badge>;
}

/** How warm a lead is: the heat bars and the word. */
export function TempChip({ code }: { code: TemperatureCode | null }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-small font-semibold whitespace-nowrap ${code ? HEAT[code].text : "font-normal text-muted"}`}>
      <HeatBars code={code} />
      {code ? TEMPERATURE[code].label : "Not rated"}
    </span>
  );
}

const whenFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function NextStepText({ next }: { next: Lead["next"] }) {
  if (next.kind === "none" || !next.at) return <span className="text-small whitespace-nowrap text-muted">Not set</span>;
  const when = whenFormat.format(new Date(next.at));
  return (
    <span className={`flex items-center gap-1.5 text-small font-medium whitespace-nowrap ${next.kind === "booked" ? "text-info" : "text-text-2"}`}>
      <Icon name={next.kind === "booked" ? "calendar" : "clock"} size={14} />
      {next.kind === "booked" ? `Call ${when}` : `Follow up ${when}`}
    </span>
  );
}

/** When the lead was added, and who added it when a person did (an import, or typed in by hand). */
export function AddedText({ lead }: { lead: Pick<Lead, "createdAt" | "addedBy"> }) {
  return (
    <span className="flex flex-col" title={new Date(lead.createdAt).toLocaleString("en-IN")}>
      <span className="text-small whitespace-nowrap text-text">{formatDate(lead.createdAt)}</span>
      {lead.addedBy ? <span className="max-w-[140px] truncate text-small text-muted">by {lead.addedBy}</span> : null}
    </span>
  );
}

/** How long ago a person last worked the lead, and who. A lead nobody has worked says so. */
export function LastActivityText({ at, by }: { at: string | null; by: string | null }) {
  if (!at) return <span className="text-small whitespace-nowrap text-muted">None yet</span>;
  return (
    <span className="flex flex-col" title={new Date(at).toLocaleString("en-IN")}>
      <span className="text-small whitespace-nowrap text-text-2">{relativeTime(at)}</span>
      {by ? <span className="max-w-[140px] truncate text-small text-muted">by {by}</span> : null}
    </span>
  );
}

/** The lead score with a small bar (full at 100). */
export function ScoreChip({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-2" title={`Lead score ${score}`}>
      <span className="nums w-6 text-right text-body font-semibold text-text">{score}</span>
      <span className="h-1 w-8 overflow-hidden rounded-full bg-border" aria-hidden>
        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </span>
    </span>
  );
}

/** "+919876543210" becomes "+91 98765 43210". Anything else is shown as stored. */
export function formatPhone(phone: string | null): string {
  if (!phone) return "No phone";
  const match = /^\+91(\d{5})(\d{5})$/.exec(phone);
  return match ? `+91 ${match[1]} ${match[2]}` : phone;
}

export function LeadAvatar({ name, size }: { name: string; size?: number }) {
  return <Avatar name={name} size={size} />;
}
