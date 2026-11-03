import type { Lifecycle, MockLead, Stage, Temperature } from "./types";

const BASE: Array<Omit<MockLead, "id" | "email" | "phone" | "createdAt"> & { email: string }> = [
  { name: "Rohan Mehta", email: "rohan.mehta@gmail.com", source: "WorkR", lifecycle: "Marketing Lead", stage: "Call 1 Pending", temperature: "Hot", owner: "Aarav Bose", next: { text: "Booked · Tue 4:30 PM", kind: "booked" } },
  { name: "Ananya Iyer", email: "ananya.iyer@outlook.com", source: "VSL · Job switch", lifecycle: "Engaged Lead", stage: "Call 1", temperature: "Warm", owner: "Sneha Banerjee", next: { text: "Call back today, 6:00 PM", kind: "task" } },
  { name: "Karthik Nair", email: "karthik.nair@gmail.com", source: "Meta ads", lifecycle: "Prospect", stage: "Test", temperature: "Warm", owner: "Vikram Singh", next: { text: "Test review · Thu", kind: "task" } },
  { name: "Priya Sharma", email: "priya.sharma@yahoo.com", source: "WorkR", lifecycle: "Marketing Lead", stage: "Call 1 Pending", temperature: "Cold", owner: null, next: { text: "Not contacted yet", kind: "none" } },
  { name: "Aditya Verma", email: "aditya.v@gmail.com", source: "VSL · Job switch", lifecycle: "Prospect", stage: "Call 2", temperature: "Hot", owner: "Meera Pillai", next: { text: "Call 2 · Fri 11:00 AM", kind: "booked" } },
  { name: "Sourav Ghosh", email: "sourav.ghosh@gmail.com", source: "CSV import", lifecycle: "Engaged Lead", stage: "Call 1", temperature: "Cold", owner: "Aarav Bose", next: { text: "Follow-up in 2 days", kind: "task" } },
  { name: "Neha Gupta", email: "neha.gupta@gmail.com", source: "WorkR", lifecycle: "Prospect", stage: "Decision / Objection", temperature: "Warm", owner: "Sneha Banerjee", next: { text: "Parent discussion · Wed", kind: "task" } },
  { name: "Ishita Roy", email: "ishita.roy@gmail.com", source: "Meta ads", lifecycle: "Marketing Lead", stage: "Call 1 Pending", temperature: "Warm", owner: null, next: { text: "Not contacted yet", kind: "none" } },
];

const FIRST = ["Aarohi", "Dev", "Farhan", "Gauri", "Harsh", "Isha", "Jayant", "Kavya", "Lakshya", "Manav", "Nikita", "Om", "Pooja", "Rahul", "Simran", "Tarun", "Uma", "Varun", "Yash", "Zoya"];
const LAST = ["Kapoor", "Joshi", "Menon", "Bhatt", "Desai", "Reddy", "Saha", "Khan", "Das", "Chopra"];
const SOURCES = ["WorkR", "VSL · Job switch", "Meta ads", "CSV import", "VSL · Product companies"];
const OWNERS = ["Aarav Bose", "Sneha Banerjee", "Vikram Singh", "Meera Pillai", "Tanvi Shah", null];
const LIFECYCLES: Lifecycle[] = ["Marketing Lead", "Engaged Lead", "Prospect"];
const STAGES_USED: Stage[] = ["Call 1 Pending", "Call 1", "Test", "Call 2", "Psychometric session", "Decision / Objection", "Payment / Financing", "Closed Won"];
const TEMPS: Temperature[] = ["Hot", "Warm", "Cold"];

function generated(index: number): MockLead {
  const first = FIRST[index % FIRST.length]!;
  const last = LAST[(index * 3) % LAST.length]!;
  const owner = OWNERS[index % OWNERS.length] ?? null;
  const name = `${first} ${last}`;
  const stage = STAGES_USED[index % STAGES_USED.length]!;
  return {
    id: `lead-${100 + index}`,
    name,
    email: `${first}.${last}@gmail.com`.toLowerCase(),
    phone: `+91 9${String(800000000 + index * 7919).slice(0, 9)}`,
    source: SOURCES[index % SOURCES.length]!,
    lifecycle: stage === "Closed Won" ? "Customer" : LIFECYCLES[index % LIFECYCLES.length]!,
    stage,
    temperature: TEMPS[(index * 2) % TEMPS.length]!,
    owner,
    next: stage === "Closed Won" ? { text: "Enrolled", kind: "none" } : owner ? { text: index % 3 === 0 ? "Follow-up in 2 days" : "Call back tomorrow, 11:00 AM", kind: "task" } : { text: "Not contacted yet", kind: "none" },
    createdAt: new Date(Date.UTC(2026, 9, 30 - (index % 25), 6, 0)).toISOString(),
  };
}

export const MOCK_LEADS: MockLead[] = [
  ...BASE.map((lead, i) => ({
    ...lead,
    id: `lead-${i + 1}`,
    phone: `+91 98${String(10000000 + i * 123457).slice(0, 8)}`,
    createdAt: new Date(Date.UTC(2026, 10, 3 - (i % 3), 5 + i, 0)).toISOString(),
  })),
  ...Array.from({ length: 52 }, (_, i) => generated(i)),
];

export function findMockLead(id: string): MockLead | undefined {
  return MOCK_LEADS.find((l) => l.id === id);
}
