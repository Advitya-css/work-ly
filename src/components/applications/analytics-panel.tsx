import { Info } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { AnalyticsSummary } from "@/lib/applications/analytics";
import type { InsightsResult } from "@/lib/applications/insights";
import { INSIGHT_THRESHOLDS } from "@/lib/applications/insights";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function AnalyticsPanel({
  summary,
  insights,
}: {
  summary: AnalyticsSummary;
  insights: InsightsResult;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>
            Outcomes
          </CardTitle>
          <CardDescription>
            Rates count every application that ever reached a stage. An interview still counts if
            the role was later rejected.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Stat label="Applications" value={String(summary.applications)} hint="actually sent" />
            <Stat label="Interviews" value={String(summary.interviews)} />
            <Stat label="Offers" value={String(summary.offers)} />
            <Stat label="In progress" value={String(summary.inProgress)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-foreground">Interview rate</span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {summary.interviewRate == null ? "-" : `${summary.interviewRate}%`}
                </span>
              </div>
              <Progress value={summary.interviewRate ?? 0} label="Interview rate" />
              <p className="text-xs text-muted-foreground">
                {summary.interviewRate == null
                  ? "No applications sent yet."
                  : `${summary.interviews} of ${summary.applications} applications reached interview.`}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-foreground">Offer rate</span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {summary.offerRate == null ? "-" : `${summary.offerRate}%`}
                </span>
              </div>
              <Progress value={summary.offerRate ?? 0} label="Offer rate" />
              <p className="text-xs text-muted-foreground">
                {summary.offerPerInterviewRate == null
                  ? "No interviews yet."
                  : `${summary.offerPerInterviewRate}% of your interviews converted to an offer.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            What&apos;s working
          </CardTitle>
          <CardDescription>Patterns Workly can see in your own outcomes.</CardDescription>
        </CardHeader>
        <CardContent>
          {insights.notEnoughData ? (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border px-3 py-3">
              <p className="flex items-start gap-1.5 text-sm text-foreground">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                Not enough data yet.
              </p>
              <p className="text-xs text-muted-foreground">
                You&apos;ve sent {insights.sentCount} application
                {insights.sentCount === 1 ? "" : "s"}. Workly waits until{" "}
                {INSIGHT_THRESHOLDS.MIN_SENT} before drawing any conclusions , {" "}
                {insights.needed} more to go.
              </p>
              <p className="text-xs text-muted-foreground">
                Patterns from two or three applications are noise, and acting on them would be worse
                than having no insight at all.
              </p>
            </div>
          ) : insights.insights.length === 0 ? (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border px-3 py-3">
              <p className="text-sm text-foreground">No clear pattern yet.</p>
              <p className="text-xs text-muted-foreground">
                Across {insights.sentCount} applications, no role, industry, company or location
                stands out by enough of a margin to be worth reporting. That&apos;s a real finding,
                not a gap: it means nothing is obviously working better than anything else.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {insights.insights.map((insight, i) => (
                <li key={i} className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{insight.text}</p>
                    <Badge variant="outline" className="shrink-0">
                      n={insight.sampleSize}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{insight.supportingDetail}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
