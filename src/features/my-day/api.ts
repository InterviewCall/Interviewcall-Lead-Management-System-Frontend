import { api } from "@/lib/api/client";
import type { MyDay } from "./types";

export async function getMyDay(view: "mine" | "team" = "mine"): Promise<MyDay> {
  const { data } = await api.get<MyDay>("/my-day", { params: { view } });
  return data;
}

/** A manager or admin takes a booked call: its lead (and so the call) becomes theirs. */
export async function takeLead(leadId: string, userId: string): Promise<void> {
  await api.post("/assignment/bulk", { leadIds: [leadId], toUserId: userId });
}

export async function completeFollowUp(taskId: string): Promise<void> {
  await api.post(`/tasks/${taskId}/complete`);
}
