import { api } from "@/lib/api/client";

/** The real assignment API: give chosen leads to one person. */

export interface Assignee { id: string; name: string; role: string }
export interface MoveResult { moved: number; skipped: number; to: { id: string; name: string } }

export const handoverKeys = {
  assignees: ["assignment", "assignees"] as const,
};

export async function fetchAssignees(): Promise<Assignee[]> {
  const { data } = await api.get<{ assignees: Assignee[] }>("/assignment/assignees");
  return data.assignees;
}

export async function bulkAssign(input: { leadIds: string[]; toUserId: string }): Promise<MoveResult> {
  const { data } = await api.post<MoveResult>("/assignment/bulk", input);
  return data;
}
