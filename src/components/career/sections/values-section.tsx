import { Compass } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SourceBadge } from "@/components/career/source-badge";
import { workValueByKey } from "@/lib/values/value-graph";
import type { CandidateValueSignal } from "@/lib/db/types";

/**
 * Values & Culture Matching, made visible on its own rather than only ever
 * surfacing as a line of reasoning on a job card that happens to match.
 * That was the actual product gap behind "I don't see it": the inference
 * was real and already scoring jobs, but nothing on the Career Profile
 * page let a user look at what Work-ly thinks it learned about them, or
 * check the evidence behind it - the one place every other inferred thing
 * on this page (skills, transferable skills) already gets that treatment.
 *
 * Read-only by design: a fresh resume parse replaces the whole set (see
 * replaceCandidateValues in lib/db/candidate-values.ts) rather than
 * accumulating edits, so there's nothing here to edit in place - re-upload
 * or re-parse your CV to refresh it.
 */
export function ValuesSection({ values }: { values: CandidateValueSignal[] }) {
  const sorted = [...values].sort((a, b) => b.confidence - a.confidence);

  return (
    <Card id="values">
      <CardHeader>
        <CardTitle>Work Values</CardTitle>
        <CardDescription>
          What Work-ly has inferred you care about from your CV, and why - this feeds a Values Alignment
          boost or penalty into every job's Fit score.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="No work values inferred yet"
            description="Upload or re-parse your CV and Work-ly will look for signals like sustainability, mission-driven work, or startup pace - always with the evidence shown here, never invented."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {sorted.map((signal) => {
              const catalogEntry = workValueByKey(signal.value);
              return (
                <li key={signal.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground">
                      {catalogEntry?.label ?? signal.value}
                    </p>
                    <Badge variant="outline">{Math.round(signal.confidence * 100)}% confidence</Badge>
                    <SourceBadge source={signal.source} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    &ldquo;{signal.evidence}&rdquo;
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
