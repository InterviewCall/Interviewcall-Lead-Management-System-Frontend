import { BOOKED_SLOTS, FOLLOW_UPS, WEEK_CALLS, WEEK_CALLS_TOTAL } from "@/mock/my-day";

/** MOCK: replace with the real "my day" endpoint when it exists. */
export async function getMyDay() {
  await new Promise((r) => setTimeout(r, 250));
  return {
    followUps: FOLLOW_UPS,
    booked: BOOKED_SLOTS,
    week: WEEK_CALLS,
    weekTotal: WEEK_CALLS_TOTAL,
    kpis: { due: 7, overdue: 2, booked: 5, unassigned: 3, newToday: 128, newDelta: "+18% vs yesterday", connect: "41%", connectDelta: "+3 pts vs last week" },
  };
}
