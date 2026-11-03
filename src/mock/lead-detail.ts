import type { Tone } from "@/lib/roles";
import type { MockLead } from "./types";

export interface LeadEvent {
  id: string;
  title: string;
  sub: string;
  detail?: string;
  when: string;
  tone: Tone | "plain";
  kind: "call" | "system";
}
export interface LeadTask { id: string; title: string; due: string; done: boolean }
export interface LeadDetail {
  profile: Array<{ label: string; value: string }>;
  vsl: Array<{ q: string; a: string }>;
  vslWhen: string;
  score: number;
  headline: string[];
  events: LeadEvent[];
  tasks: LeadTask[];
  slot: { time: string; meridiem: string; title: string; sub: string } | null;
}

const ROHAN: Omit<LeadDetail, "slot"> = {
  profile: [
    { label: "Current company", value: "Tata Consultancy Services" },
    { label: "CTC range", value: "8–12 LPA" },
    { label: "Graduation year", value: "2019" },
    { label: "Current domain", value: "Backend · Java" },
    { label: "Notice period", value: "60 days" },
    { label: "City", value: "Pune" },
  ],
  vsl: [
    { q: "Why are you looking to switch?", a: "Stuck on support projects, want a product-company role" },
    { q: "Biggest blocker today?", a: "DSA and system design" },
    { q: "Ready to invest in upskilling?", a: "Yes, within this month" },
    { q: "Target companies", a: "Product companies, 25+ LPA" },
  ],
  vslWhen: "Submitted 2 Nov, 9:38 PM",
  score: 82,
  headline: ["Backend engineer · TCS", "8–12 LPA", "Graduated 2019", "Java, Spring Boot"],
  events: [
    { id: "e1", title: "Aarav Bose logged a call", sub: "Attempt 2 · Not connected", detail: "Follow-up set for today 6:00 PM. Phone rang but was not picked up.", when: "Today, 2:14 PM", tone: "info", kind: "call" },
    { id: "e2", title: "Assigned to Aarav Bose", sub: "Manual assignment by Riya Mukherjee", when: "Today, 11:02 AM", tone: "primary", kind: "system" },
    { id: "e3", title: "Booked a slot on VSL", sub: "Call 1 · Tue 3 Nov, 4:30 PM IST", detail: "Priority raised. Slot call is due with the owner at 4:30 PM.", when: "Yesterday, 9:41 PM", tone: "warning", kind: "system" },
    { id: "e4", title: "Submitted the full form", sub: "Score 82 · Hot", when: "Yesterday, 9:38 PM", tone: "success", kind: "system" },
    { id: "e5", title: "Opportunity opened at Call 1 Pending", sub: "Details submitted on VSL job-switch", when: "Yesterday, 9:35 PM", tone: "violet", kind: "system" },
    { id: "e6", title: "Lead created from WorkR signup", sub: "Working professional · organic", when: "2 Nov, 6:10 PM", tone: "plain", kind: "system" },
  ],
  tasks: [
    { id: "k1", title: "Call back after evening", due: "Today, 6:00 PM", done: false },
    { id: "k2", title: "Scheduled call · Call 1", due: "Tue, 4:30 PM", done: false },
  ],
};

/** MOCK: every lead gets a believable detail page. Events logged in this session are kept in memory. */
const extraEvents = new Map<string, LeadEvent[]>();

export function addMockEvent(leadId: string, event: LeadEvent): void {
  extraEvents.set(leadId, [event, ...(extraEvents.get(leadId) ?? [])]);
}

export function mockDetailFor(lead: MockLead): LeadDetail {
  const base: Omit<LeadDetail, "slot"> =
    lead.id === "lead-1"
      ? ROHAN
      : {
          profile: [
            { label: "Current company", value: "—" },
            { label: "CTC range", value: "—" },
            { label: "Graduation year", value: "—" },
            { label: "Current domain", value: "—" },
            { label: "Notice period", value: "—" },
            { label: "City", value: "—" },
          ],
          vsl: [],
          vslWhen: "",
          score: lead.temperature === "Hot" ? 82 : lead.temperature === "Warm" ? 61 : 34,
          headline: [lead.source],
          events: [{ id: "c1", title: `Lead created from ${lead.source}`, sub: "Added by intake", when: "Recently", tone: "plain", kind: "system" }],
          tasks: lead.next.kind === "task" ? [{ id: "k1", title: lead.next.text, due: "Upcoming", done: false }] : [],
        };
  return {
    ...base,
    events: [...(extraEvents.get(lead.id) ?? []), ...base.events],
    slot: lead.next.kind === "booked" ? { time: "4:30", meridiem: "PM", title: lead.next.text.replace("Booked · ", "Call 1 · "), sub: "VSL booking" } : null,
  };
}
