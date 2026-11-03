import type { MockLead } from "./types";

/** The BDAs the assignment and reports screens work with. Replace with the staff API filtered to role BDA. */
export interface MockBda {
  name: string;
  /** Free text shown when the person is away, e.g. "Thu". */
  leaveUntil?: string;
}

export const BDAS: MockBda[] = [
  { name: "Aarav Bose" },
  { name: "Sneha Banerjee" },
  { name: "Vikram Singh" },
  { name: "Meera Pillai" },
  { name: "Rahul Sen" },
  { name: "Tanvi Shah" },
  { name: "Diya Paul" },
  { name: "Kabir Malik", leaveUntil: "Thu" },
];

const COMPANIES = ["TCS", "Infosys", "Wipro", "Cognizant", "Accenture", "Capgemini", "HCL", "Deloitte", "Tech Mahindra"];
const ROLES = ["Backend", "QA", "Support", "Testing", "SAP", "Java", "Analyst", "Dev", "Product Engineer"];

const KNOWN: Record<string, [string, string]> = {
  "Priya Sharma": ["TCS", "Backend"],
  "Ishita Roy": ["Infosys", "QA"],
  "Rohan Mehta": ["TCS", "Java"],
  "Ananya Iyer": ["Wipro", "Support"],
  "Sourav Ghosh": ["Cognizant", "Testing"],
  "Karthik Nair": ["Capgemini", "Java"],
  "Aditya Verma": ["Deloitte", "Analyst"],
  "Neha Gupta": ["HCL", "Backend"],
};

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

export function stableHash(seed: string): number {
  return hash(seed);
}

/** Current company and role for a lead. The leads API will carry these on the lead itself. */
export function companyRole(lead: Pick<MockLead, "id" | "name">): { company: string; role: string } {
  const known = KNOWN[lead.name];
  if (known) return { company: known[0], role: known[1] };
  const h = hash(lead.id + lead.name);
  return { company: COMPANIES[h % COMPANIES.length]!, role: ROLES[(h >>> 3) % ROLES.length]! };
}
