import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
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

export function StageChip({ code }: { code: StageCode | null }) {
  if (!code) return <span className="text-small text-muted">No opportunity</span>;
  return <Badge tone={STAGE[code].tone}>{STAGE[code].label}</Badge>;
}

export function TempChip({ code }: { code: TemperatureCode | null }) {
  if (!code) return <span className="text-small whitespace-nowrap text-muted">Not rated</span>;
  return <Badge tone={TEMPERATURE[code].tone}>{TEMPERATURE[code].label}</Badge>;
}

const whenFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function NextStepText({ next }: { next: Lead["next"] }) {
  if (next.kind === "none" || !next.at) return <span className="text-small whitespace-nowrap text-text-2">Not contacted yet</span>;
  const when = whenFormat.format(new Date(next.at));
  return (
    <span className={`flex items-center gap-1.5 text-small whitespace-nowrap ${next.kind === "booked" ? "text-info" : "text-text-2"}`}>
      <Icon name={next.kind === "booked" ? "calendar" : "clock"} size={14} />
      {next.kind === "booked" ? `Call ${when}` : `Follow up ${when}`}
    </span>
  );
}

export function ScoreChip({ score }: { score: number }) {
  return <span className="inline-flex items-center gap-1 rounded-md bg-surface-alt px-2 py-0.5 text-small font-medium text-text-2 tabular-nums" title="Lead score"><Icon name="zap" size={12} className="text-primary" />{score}</span>;
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
