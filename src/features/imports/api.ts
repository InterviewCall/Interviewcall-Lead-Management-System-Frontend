import { MOCK_LEADS } from "@/mock/leads";
import type { MockLead } from "@/mock/types";
import type { DryRunRow } from "./dry-run";
import type { Existing } from "./dry-run";
import { normalizePhone } from "./dry-run";

/**
 * MOCK: the file is parsed and checked in the browser (that part is real), but the "import" step writes
 * to the sample leads in memory. Swap `runImport` for a multipart `api.post("/imports", form)`.
 */
const wait = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface ImportRecord {
  id: string;
  file: string;
  when: string;
  rows: number;
  imported: number;
  status: "Done" | "Failed";
  note?: string;
}

const recent: ImportRecord[] = [
  { id: "imp-3", file: "naukri-oct-batch.csv", when: "2026-11-01T11:20:00.000Z", rows: 1248, imported: 1190, status: "Done", note: "41 matched, 17 skipped" },
  { id: "imp-2", file: "webinar-attendees.csv", when: "2026-10-27T08:05:00.000Z", rows: 312, imported: 301, status: "Done", note: "11 matched" },
  { id: "imp-1", file: "campus-fair.xlsx", when: "2026-10-18T13:40:00.000Z", rows: 0, imported: 0, status: "Failed", note: "Only .csv files are supported" },
];

export const importKeys = { recent: ["imports", "recent"] as const };

export async function listImports(): Promise<ImportRecord[]> {
  await wait(150);
  return [...recent];
}

export function existingLeads(): Existing {
  return {
    emails: new Set(MOCK_LEADS.map((l) => l.email.toLowerCase())),
    phones: new Set(MOCK_LEADS.map((l) => normalizePhone(l.phone)).filter((p): p is string => p !== null)),
  };
}

export interface RunImportInput {
  file: string;
  totalRows: number;
  rows: DryRunRow[];
  sourceTag: string;
  /** Names to share new leads between, or empty to leave them unassigned. */
  assignTo: string[];
}

export async function runImport(input: RunImportInput): Promise<ImportRecord> {
  await wait(700);
  const fresh = input.rows.filter((r) => r.verdict.kind === "new");
  const now = new Date().toISOString();
  const leads: MockLead[] = fresh.map((r, i) => ({
    id: `lead-imp-${Date.now()}-${i}`,
    name: r.values.name ?? "Unnamed",
    email: r.values.email ?? "",
    phone: r.values.phone ?? "",
    source: r.values.source ? `${input.sourceTag} · ${r.values.source}` : input.sourceTag,
    lifecycle: "Marketing Lead",
    stage: "Call 1 Pending",
    temperature: "Cold",
    owner: input.assignTo.length ? input.assignTo[i % input.assignTo.length]! : null,
    next: input.assignTo.length ? { text: "Call within 1 hour", kind: "task" } : { text: "Not contacted yet", kind: "none" },
    createdAt: now,
  }));
  MOCK_LEADS.unshift(...leads);
  const matched = input.rows.filter((r) => r.verdict.kind === "matched").length;
  const errors = input.rows.filter((r) => r.verdict.kind === "error").length;
  const record: ImportRecord = {
    id: `imp-${Date.now()}`, file: input.file, when: now, rows: input.totalRows, imported: leads.length, status: "Done",
    note: `${matched} matched, ${errors} skipped`,
  };
  recent.unshift(record);
  return record;
}
