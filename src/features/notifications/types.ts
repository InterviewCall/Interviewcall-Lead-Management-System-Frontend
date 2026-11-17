export type NotificationType = "NEW_ASSIGNMENT" | "BOOKED_SLOT_UNASSIGNED" | "SLOT_SOON" | "FOLLOWUP_OVERDUE" | "DUPLICATE_REVIEW" | "LEAD_REENGAGED";

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  createdAt: string;
  read: boolean;
  lead: { id: string; name: string } | null;
}

export interface Inbox {
  unread: number;
  items: AppNotification[];
}
