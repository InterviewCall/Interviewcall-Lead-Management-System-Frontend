import type { FieldKey, Target } from "./mapping";

export type RowVerdict = { kind: "new" } | { kind: "matched"; reason: string } | { kind: "error"; reason: string };

export interface DryRunRow {
  /** 1-based row number in the file, header excluded. */
  line: number;
  cells: string[];
  values: Partial<Record<FieldKey, string>>;
  verdict: RowVerdict;
}

export interface DryRun {
  rows: DryRunRow[];
  counts: { new: number; matched: number; error: number };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Digits only. A 10 digit number gets +91, a longer one keeps its country code. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  if (local.length === 10) return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  if (digits.length > 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

export interface Existing {
  emails: Set<string>;
  phones: Set<string>;
}

/**
 * Classify every row without writing anything. Needs a name and a valid email or phone.
 * A row whose email or phone is already a lead, or repeats earlier in the file, is "matched".
 */
export function dryRun(data: string[][], targets: Target[], existing: Existing): DryRun {
  const seenEmail = new Set<string>();
  const seenPhone = new Set<string>();
  const rows: DryRunRow[] = data.map((cells, i) => {
    const values: Partial<Record<FieldKey, string>> = {};
    targets.forEach((t, c) => {
      if (t !== "skip" && t !== "custom" && values[t] === undefined) values[t] = (cells[c] ?? "").trim();
    });
    const email = (values.email ?? "").toLowerCase();
    const rawPhone = values.phone ?? "";
    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    let verdict: RowVerdict;
    if (!(values.name ?? "").trim()) verdict = { kind: "error", reason: "Name is empty" };
    else if (!email && !rawPhone) verdict = { kind: "error", reason: "No email or phone" };
    else if (email && !EMAIL.test(email)) verdict = { kind: "error", reason: "Email is not valid" };
    else if (rawPhone && !phone) verdict = { kind: "error", reason: "Phone could not be read" };
    else if ((email && (existing.emails.has(email) || seenEmail.has(email))) || (phone && (existing.phones.has(phone) || seenPhone.has(phone)))) {
      verdict = { kind: "matched", reason: email && seenEmail.has(email) ? "Repeated in this file" : "Already a lead" };
    } else verdict = { kind: "new" };
    if (verdict.kind !== "error") {
      if (email) seenEmail.add(email);
      if (phone) seenPhone.add(phone);
      if (phone) values.phone = phone;
      if (email) values.email = email;
    }
    return { line: i + 1, cells, values, verdict };
  });
  return {
    rows,
    counts: {
      new: rows.filter((r) => r.verdict.kind === "new").length,
      matched: rows.filter((r) => r.verdict.kind === "matched").length,
      error: rows.filter((r) => r.verdict.kind === "error").length,
    },
  };
}
