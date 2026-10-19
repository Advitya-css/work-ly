import { cn } from "@/lib/utils";

/**
 * The fit score as a ring: one number, read at a glance. Colour follows the
 * same bands as everywhere else (75+ good, 50+ middling, below that weak).
 * `value` null means Work-ly withheld the score (too little to go on).
 */
export function ScoreRing({ value, size = 112, className }: { value: number | null; size?: number; className?: string }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value)) / 100;
  const tone = value == null ? "text-muted-foreground" : value >= 75 ? "text-success" : value >= 50 ? "text-warning" : "text-destructive";

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/70" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          className={tone}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-semibold tabular-nums leading-none", tone)}>{value ?? "–"}</span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Fit</span>
      </div>
    </div>
  );
}
