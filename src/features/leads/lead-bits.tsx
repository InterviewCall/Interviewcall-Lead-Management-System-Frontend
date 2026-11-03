import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { LIFECYCLE_TONE, STAGE_TONE, TEMP_TONE, type MockLead } from "@/mock/types";

export function LifecycleBadge({ lead }: { lead: MockLead }) {
  return <Badge tone={LIFECYCLE_TONE[lead.lifecycle]}>{lead.lifecycle}</Badge>;
}
export function StageBadge({ lead }: { lead: MockLead }) {
  return <Badge tone={STAGE_TONE[lead.stage]}>{lead.stage}</Badge>;
}
export function TempBadge({ lead }: { lead: MockLead }) {
  return <Badge tone={TEMP_TONE[lead.temperature]}>{lead.temperature}</Badge>;
}

export function OwnerCell({ owner }: { owner: string | null }) {
  if (!owner) return <span className="text-body text-muted">Unassigned</span>;
  return (
    <span className="flex items-center gap-2">
      <Avatar name={owner} size={24} />
      <span className="truncate text-body text-text">{owner}</span>
    </span>
  );
}

export function NextStep({ next }: { next: MockLead["next"] }) {
  if (next.kind === "none") return <span className="text-small text-text-2">{next.text}</span>;
  return (
    <span className={`flex items-center gap-1.5 text-small ${next.kind === "booked" ? "text-info" : "text-text-2"}`}>
      <Icon name={next.kind === "booked" ? "calendar" : "clock"} size={14} />
      {next.text}
    </span>
  );
}
