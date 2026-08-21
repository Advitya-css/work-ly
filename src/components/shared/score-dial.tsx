import { cn } from "@/lib/utils";

/**
 * A score drawn as a ring rather than printed as a number.
 *
 * Two reasons this is worth the pixels. A ring shows position along the 0 to
 * 100 range without the reader having to hold the scale in their head, so 64
 * reads as "about two thirds" instead of as a bare figure. And it gives every
 * opportunity card a focal point, which a row of flat numbers in a grey strip
 * never did.
 *
 * The number stays in the middle, because the exact value still matters and a
 * ring alone would be a decoration. Colour is a secondary cue only: the arc
 * length carries the same information, so this still works in greyscale and
 * for anyone who cannot separate the hues.
 */

const SIZE = 52;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function tone(value: number): { stroke: string; text: string } {
  if (value >= 75) return { stroke: "var(--success)", text: "text-success" };
  if (value >= 50) return { stroke: "var(--warning)", text: "text-warning" };
  return { stroke: "var(--muted-foreground)", text: "text-muted-foreground" };
}

export function ScoreDial({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const { stroke, text } = tone(clamped);
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          // The whole control is described once, on the wrapper, so a screen
          // reader says "Fit, 84 out of 100" rather than reading a decorative
          // graphic and then a loose number.
          aria-hidden="true"
          focusable="false"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={stroke}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            // Starts at twelve o'clock and fills clockwise, which is how
            // people expect a gauge to read.
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums",
            text,
          )}
          aria-hidden="true"
        >
          {clamped}
        </span>
      </div>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="sr-only">
        {label}: {clamped} out of 100
      </span>
    </div>
  );
}
