import type { Metadata } from "next";
import { MyDayScreen } from "@/features/my-day/my-day-screen";

export const instant = false;
export const metadata: Metadata = { title: "My day" };

export default function MyDayPage() {
  return <MyDayScreen />;
}
