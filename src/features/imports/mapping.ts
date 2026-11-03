/** The CRM fields a column can map to. `custom` creates a new field from the column. */
export const CRM_FIELDS = [
  { key: "name", label: "Full name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Current company" },
  { key: "ctc", label: "CTC range" },
  { key: "gradYear", label: "Graduation year" },
  { key: "domain", label: "Current domain" },
  { key: "source", label: "Source attribution" },
] as const;

export type FieldKey = (typeof CRM_FIELDS)[number]["key"];
export type Target = FieldKey | "custom" | "skip";

export const TARGET_LABEL: Record<Target, string> = {
  ...(Object.fromEntries(CRM_FIELDS.map((f) => [f.key, f.label])) as Record<FieldKey, string>),
  custom: "New field",
  skip: "Do not import",
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const SYNONYMS: Record<FieldKey, string[]> = {
  name: ["fullname", "name", "candidatename", "leadname"],
  email: ["email", "emailaddress", "emailid", "mail"],
  phone: ["phone", "mobile", "mobilenumber", "phonenumber", "contact", "contactnumber", "whatsapp"],
  company: ["company", "currentcompany", "organisation", "organization", "employer"],
  ctc: ["ctc", "ctclpa", "currentctc", "salary"],
  gradYear: ["gradyear", "graduationyear", "passoutyear", "yearofpassing"],
  domain: ["domain", "currentdomain", "stack", "skill"],
  source: ["utmsource", "source", "leadsource", "channel"],
};

/** Guess what each column is. A target is used once; later duplicates become a new field. */
export function autoMap(headers: string[]): Target[] {
  const used = new Set<FieldKey>();
  return headers.map((h) => {
    const n = norm(h);
    const match = (Object.keys(SYNONYMS) as FieldKey[]).find((k) => !used.has(k) && SYNONYMS[k].includes(n));
    if (match) {
      used.add(match);
      return match;
    }
    if (/^(lead)?score$|^rating$|^notes?$|^id$/.test(n)) return "skip";
    return "custom";
  });
}
