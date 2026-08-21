import Link from "next/link";
import { Route, ArrowRight, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { computeProgress, nextUpFor } from "@/lib/pathway/get-full-pathway";
import type { FullPathway } from "@/lib/db/types";

/** Dashboard summary of the active pathway - step counter, bar, next action. */
export function PathwayProgressCard({ pathway }: { pathway: FullPathway | null }) {
  if (!pathway) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Career pathway</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Route}
            title="No pathway yet"
            description="Build one from the gaps to your target role."
            action={{ label: "Build my pathway", href: "/career-path" }}
            className="border-0 px-0 py-4"
          />
        </CardContent>
      </Card>
    );
  }

  const progress = computeProgress(pathway);
  const next = nextUpFor(pathway);
  const isComplete = progress.completed + progress.skipped === progress.total && progress.total > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Career pathway</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <p className="text-base font-semibold text-foreground">{pathway.targetStateLabel}</p>
          <p className="text-xs text-muted-foreground">
            {isComplete
              ? `All ${progress.totalSteps} steps resolved`
              : `Step ${progress.currentStepNumber} of ${progress.totalSteps}`}
          </p>
        </div>

        <Progress value={progress.percent} label="Career pathway progress" />

        <p className="text-xs tabular-nums text-muted-foreground">
          {progress.completed} / {progress.total} completed
          {progress.skipped > 0 && ` · ${progress.skipped} skipped`}
        </p>

        {next && !isComplete && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next</p>
            <p className="text-sm text-foreground">{next.label}</p>
          </div>
        )}

        {isComplete && (
          <p className="flex items-start gap-1.5 text-sm text-success">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            Pathway complete: regenerate it to see where you stand now.
          </p>
        )}

        <Button asChild size="sm" className="w-fit">
          <Link href="/career-path">
            {isComplete ? "Review path" : "Continue path"}
            <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
