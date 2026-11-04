import type { ColumnMapping, ImportOptions } from "./types";

/** The same checks the server makes, so a problem shows up before the round trip. */
export function mappingProblems(mapping: ColumnMapping[], fields: ImportOptions["fields"]): string[] {
  const problems: string[] = [];
  const used = new Map<string, number>();
  const customNames = new Set<string>();
  const label = (key: string) => fields.find((f) => f.key === key)?.label ?? key;

  for (const column of mapping) {
    if (column.target === "skip") continue;
    if (column.target === "custom") {
      const name = (column.label ?? "").trim();
      if (name.replace(/[^a-z0-9]/gi, "").length < 2) problems.push("A new field needs a name of at least 2 letters or digits.");
      else if (customNames.has(name.toLowerCase())) problems.push(`Two columns would make the field "${name}".`);
      customNames.add(name.toLowerCase());
      continue;
    }
    used.set(column.target, (used.get(column.target) ?? 0) + 1);
  }
  for (const [key, count] of used) if (count > 1) problems.push(`More than one column is mapped to ${label(key)}.`);

  const hasName = used.has("name");
  const hasSplit = used.has("firstName") || used.has("lastName");
  if (hasName && hasSplit) problems.push("Map either Full name or First name and Last name, not both.");
  else if (!hasName && !used.has("firstName")) problems.push("Map a column to Full name (or First name).");
  if (!used.has("email") && !used.has("phone")) problems.push("Map a column to Email or Phone. They are how duplicates are found.");
  return problems;
}

/** "CALL_1_PENDING" becomes "Call 1 Pending". */
export function stageLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
