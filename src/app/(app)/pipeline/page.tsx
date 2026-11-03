import type { Metadata } from "next";
import { PipelineScreen } from "@/features/pipeline/pipeline-screen";

export const instant = false;
export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return <PipelineScreen />;
}
