import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/coverage";

/**
 * A headline score, or an honest refusal to give one.
 *
 * This component exists to make one mistake impossible: showing a large,
 * confident number that was computed from almost no data. A big "19/100"
 * reads as a measurement of the person. When Workly could only assess two
 * of seven criteria, that number is a percentage of very little, and the
 * precision is exactly what makes it persuasive.
 *
 * So below the coverage threshold the number is not shown at all. Not
 * greyed out, not shown with an asterisk: not shown. What replaces it says
 * what is missing and what would fix it, because that is the only useful
 * thing to say at that point.
 */
export function ScoreReadout({
  label,
  value,
  coverage,
  caption,
  unassessed = [],
  className,
}: {
  label: string;
  value: number;
  /** 0-1. Below the threshold the number is withheld. */
  coverage: number;
  caption: string;
  unassessed?: string[];
  className?: string;
}) {
  const reliable = coverage >= MIN_COVERAGE_FOR_SCORE;

  if (!reliable) {
    return (
      <div className={cn("flex flex-col items-center gap-1.5 text-center", className)}>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <AlertCircle className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Not enough information</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Workly could only assess {Math.round(coverage * 100)}% of the criteria here, so it is not
          giving a score.
          {unassessed.length > 0 && (
            <>
              {" "}
              Missing: {unassessed.map(humanize).join(", ")}.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-1 text-center", className)}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={cn("text-4xl font-bold tabular-nums", colorFor(value))}>
        {value}
        <span className="text-lg font-medium text-muted-foreground">/100</span>
      </p>
      <p className="text-xs text-muted-foreground">{caption}</p>
      {coverage < 1 && (
        <p className="text-xs text-muted-foreground">
          Based on {Math.round(coverage * 100)}% of the criteria.
        </p>
      )}
    </div>
  );
}

function colorFor(value: number): string {
  if (value >= 75) return "text-success";
  if (value >= 50) return "text-warning";
  return "text-muted-foreground";
}

/** Turns a component key like "industryRelevance" into "industry relevance". */
function humanize(key: string): string {
  return key.replace(/([A-Z])/g, " $1").toLowerCase().trim();
}
