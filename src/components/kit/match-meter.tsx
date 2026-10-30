import { cn } from "@/lib/utils";

/**
 * How well the resume answers the posting, as one number with where it
 * started. The "before" tick only shows when tailoring moved it up.
 */
export function MatchMeter({
  score,
  before,
  mustShown,
  mustTotal,
  size = "default",
  label,
}: {
  score: number;
  before?: number | null;
  mustShown: number;
  mustTotal: number;
  size?: "default" | "sm";
  /** Shown on the left of the number's row, for a compact header card. */
  label?: React.ReactNode;
}) {
  const tone = score >= 75 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-destructive";
  const text = score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  const rose = before != null && score > before;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        {label}
        <span className="flex items-baseline gap-1">
          <span className={cn("font-medium tabular-nums tracking-tight", size === "sm" ? "text-[22px]" : "text-[30px]", text)}>
            {score}
          </span>
          <span className="text-[13px] text-muted-foreground">/100</span>
        </span>
        {rose && !label && (
          <span className="text-[12.5px] text-muted-foreground">
            up from <span className="tabular-nums text-foreground">{before}</span> untailored
          </span>
        )}
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-700", tone)} style={{ width: `${score}%` }} />
        {rose && <div className="absolute inset-y-0 w-0.5 bg-foreground/60" style={{ left: `calc(${before}% - 1px)` }} />}
      </div>
      {(mustTotal > 0 || (rose && label)) && (
        <span className="text-[12.5px] text-muted-foreground">
          {mustTotal > 0 ? `${mustShown} of ${mustTotal} must-haves shown in the resume` : ""}
          {rose && label ? `${mustTotal > 0 ? " · " : ""}up from ${before} untailored` : ""}
        </span>
      )}
    </div>
  );
}
