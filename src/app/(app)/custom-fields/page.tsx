import type { Metadata } from "next";
import { CustomFieldsScreen } from "@/features/custom-fields/custom-fields-screen";

export const instant = false;
export const metadata: Metadata = { title: "Custom fields" };

export default function CustomFieldsPage() {
  return <CustomFieldsScreen />;
}
