import { redirect } from "next/navigation";

// This route only redirects, so there is no page to validate for instant navigation (Next 16 dev "Insights").
export const instant = false;

export default function Home() {
  redirect("/my-day");
}
