import { api } from "@/lib/api/client";
import type { Inbox } from "./types";

export async function getInbox(): Promise<Inbox> {
  const { data } = await api.get<Inbox>("/notifications");
  return data;
}

export async function markRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  await api.post("/notifications/read-all");
}
