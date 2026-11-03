import type { Tone } from "@/lib/roles";

export interface FollowUp {
  id: string;
  leadId: string;
  name: string;
  note: string;
  badge: { label: string; tone: Tone };
  due: string;
  overdue: boolean;
  kind: "call" | "other";
}

export interface BookedSlot {
  id: string;
  leadId: string;
  name: string;
  detail: string;
  hour: string;
  meridiem: "AM" | "PM";
  owner: string | null;
}

export const FOLLOW_UPS: FollowUp[] = [
  { id: "t1", leadId: "lead-2", name: "Ananya Iyer", note: "Call back · VSL job switch · asked for evening", badge: { label: "Call back", tone: "info" }, due: "Today 6:00 PM", overdue: false, kind: "call" },
  { id: "t2", leadId: "lead-5", name: "Meera Nair", note: "Scheduled call · Call 1 · booked on VSL", badge: { label: "Booked call", tone: "primary" }, due: "Today 4:30 PM", overdue: false, kind: "call" },
  { id: "t3", leadId: "lead-1", name: "Rohan Mehta", note: "Third attempt · not connected twice", badge: { label: "Follow-up", tone: "danger" }, due: "Overdue 2 h", overdue: true, kind: "call" },
  { id: "t4", leadId: "lead-3", name: "Karthik Nair", note: "Share test result and next steps", badge: { label: "Follow-up", tone: "warning" }, due: "Today 7:15 PM", overdue: false, kind: "other" },
  { id: "t5", leadId: "lead-7", name: "Neha Gupta", note: "Parent discussion · payment plan", badge: { label: "Follow-up", tone: "warning" }, due: "Tomorrow 11:00 AM", overdue: false, kind: "call" },
  { id: "t6", leadId: "lead-4", name: "Priya Sharma", note: "Possible duplicate of Priya S. · review", badge: { label: "Duplicate", tone: "violet" }, due: "Today", overdue: false, kind: "other" },
];

export const BOOKED_SLOTS: BookedSlot[] = [
  { id: "b1", leadId: "lead-1", name: "Rohan Mehta", detail: "VSL · Job switch", hour: "4:30", meridiem: "PM", owner: null },
  { id: "b2", leadId: "lead-8", name: "Ishita Roy", detail: "VSL · Product companies", hour: "5:15", meridiem: "PM", owner: null },
  { id: "b3", leadId: "lead-5", name: "Aditya Verma", detail: "VSL · Job switch", hour: "6:00", meridiem: "PM", owner: "Meera Pillai" },
  { id: "b4", leadId: "lead-6", name: "Sourav Ghosh", detail: "VSL · Career switch", hour: "7:30", meridiem: "PM", owner: null },
];

/** Bar heights in px for the weekly chart: total height, then the connected part. */
export const WEEK_CALLS: Array<{ day: string; total: number; connected: number }> = [
  { day: "Mon", total: 120, connected: 52 },
  { day: "Tue", total: 150, connected: 64 },
  { day: "Wed", total: 138, connected: 60 },
  { day: "Thu", total: 168, connected: 70 },
  { day: "Fri", total: 126, connected: 50 },
  { day: "Sat", total: 74, connected: 30 },
  { day: "Sun", total: 66, connected: 24 },
];
export const WEEK_CALLS_TOTAL = 842;
