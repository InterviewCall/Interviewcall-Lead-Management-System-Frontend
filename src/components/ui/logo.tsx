import { cn } from "@/lib/cn";

/** The InterviewCall mark, from the Figma "Logo / Mark" component. Ratio is 105:120. */
export function LogoMark({ height = 32, className }: { height?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a small static SVG; next/image adds nothing
    <img
      src="/brand/logo-mark.svg"
      alt=""
      width={Math.round((height * 105) / 120)}
      height={height}
      className={cn("shrink-0", className)}
    />
  );
}

export function Wordmark({ large = false }: { large?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark height={large ? 55 : 32} className={large ? "mr-1" : undefined} />
      <div className="flex flex-col">
        <span className={cn("font-semibold text-white", large ? "text-h2" : "text-body")}>InterviewCall</span>
        <span className="text-small text-side-text">CRM</span>
      </div>
    </div>
  );
}
