import type { Role } from "@/lib/roles";
import type { LifecycleCode, StageCode } from "./types";

/**
 * Who may mark what. The API enforces the same rules; this only decides what to offer, so nobody
 * clicks something that is bound to be refused. Keep in step with LeadsService and PipelineService.
 */
const MARK_ROLES: readonly Role[] = ["ADMIN", "SALES_MANAGER", "BDA", "CLOSER"];
const ONBOARD_ROLES: readonly Role[] = ["ADMIN", "SALES_MANAGER", "CLOSER", "OPS"];
const CORRECT_ROLES: readonly Role[] = ["ADMIN", "SALES_MANAGER"];

export const canMark = (role: Role) => MARK_ROLES.includes(role);
export const canCloseWon = (role: Role) => role !== "BDA" && canMark(role);

/** The contact stages in the order the handbook tells the story, with what each one means. */
export const CONTACT_STAGES: Array<{ code: LifecycleCode; hint: string }> = [
  { code: "MARKETING_LEAD", hint: "Not yet qualified. Receives the scheduled nurture." },
  { code: "ENGAGED_LEAD", hint: "Showed interest but is not ready for a sales call." },
  { code: "PROSPECT", hint: "Interested and qualified. The BDA relationship begins." },
  { code: "EXHAUSTED_NOT_CONNECTED", hint: "Three attempts made, never connected." },
  { code: "NOT_INTERESTED", hint: "Stop all active sales follow-up." },
  { code: "ENROLLED", hint: "Payment or financing is complete." },
  { code: "LEARNER_ONBOARDED", hint: "Onboarding is finished." },
];

export function contactStageAccess(role: Role, from: LifecycleCode, to: LifecycleCode): { ok: boolean; why?: string } {
  if (from === to) return { ok: true };
  if (to === "ENROLLED") return { ok: false, why: "Set automatically when the opportunity is closed as won." };
  if (to === "LEARNER_ONBOARDED") {
    if (from !== "ENROLLED") return { ok: false, why: "Only an enrolled lead can be onboarded." };
    return ONBOARD_ROLES.includes(role) ? { ok: true } : { ok: false, why: "Marked by the team that onboards." };
  }
  if (!MARK_ROLES.includes(role)) return { ok: false, why: "Your role cannot change this." };
  if ((from === "ENROLLED" || from === "LEARNER_ONBOARDED") && !CORRECT_ROLES.includes(role)) {
    return { ok: false, why: "Only a manager can move an enrolled lead back." };
  }
  return { ok: true };
}

export const stageIndex = (stage: StageCode, order: StageCode[]) => order.indexOf(stage);
