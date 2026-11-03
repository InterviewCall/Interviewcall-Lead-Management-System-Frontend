import type { Metadata } from "next";
import { AssignmentScreen } from "@/features/assignment/assignment-screen";

export const instant = false;
export const metadata: Metadata = { title: "Assignment" };

export default function AssignmentPage() {
  return <AssignmentScreen />;
}
