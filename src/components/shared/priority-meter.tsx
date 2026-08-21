import { cn } from "@/lib/utils";

/**
 * The Priority score as a filled bar rather than a ring.
 *
 * A ring is a nice object on its own but a poor thing to compare: twenty of
 * them down a page, each at a slightly different angle, and you cannot tell
 * 48 from 52 without reading both numbers. Bars share a baseline and a
 * length, so a column of them can be scanned in one pass, which is exactly
 * what someone triaging a list of jobs is doing.
 *
 * The colour is thresholded, not a gradient across the range. Three bands
 * mean something ("worth your time", "maybe", "probably not"); a continuous
 * hue ramp only looks like it does.
 *
 * The bar itself is decorative and hidden from assistive technology. The
 * number and label next to it are real text, so a screen reader gets
 * "Priority 72 out of 100" rather than a description of a rectangle.
 */
function band(value: number) {
  if (value >= 75) return { bar: "bg-success", text: "text-success" };
  if (value >= 50) return { bar: "bg-warning", text: "text-warning" };
  return { bar: "bg-muted-foreground/45", text: "text-muted-foreground" };
}

export function PriorityMeter({
  value,
  label = "Priority",
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const colour = band(clamped);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <span className={cn("text-sm font-semibold tabular-nums", colour.text)}>
          {clamped}
          <span className="text-xs font-normal text-muted-foreground">/100</span>
        </span>
      </div>
      <div aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", colour.bar)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="sr-only">
        {label} {clamped} out of 100
      </span>
    </div>
  );
}
