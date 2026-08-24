import Link from "next/link";
import { Mail, Clock, ArrowRight } from "lucide-react";
function formatDays(date: Date) {
  const days = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return days === 1 ? "1 day" : `${days} days`;
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Application } from "@/lib/db/types";

export function StaleApplicationsCard({ applications }: { applications: Application[] }) {
  const now = new Date();
  
  const staleApps = applications.filter((app) => {
    if (app.status === "APPLIED" && app.dateApplied) {
      const days = (now.getTime() - app.dateApplied.getTime()) / (1000 * 60 * 60 * 24);
      return days >= 7;
    }
    if (app.status === "ASSESSMENT" && app.reachedAssessmentAt) {
      const days = (now.getTime() - app.reachedAssessmentAt.getTime()) / (1000 * 60 * 60 * 24);
      return days >= 7;
    }
    if (app.status === "INTERVIEW" && app.reachedInterviewAt) {
      const days = (now.getTime() - app.reachedInterviewAt.getTime()) / (1000 * 60 * 60 * 24);
      return days >= 7;
    }
    return false;
  }).sort((a, b) => {
    // Sort by whichever date made it stale
    const dateA = a.reachedInterviewAt ?? a.reachedAssessmentAt ?? a.dateApplied ?? new Date();
    const dateB = b.reachedInterviewAt ?? b.reachedAssessmentAt ?? b.dateApplied ?? new Date();
    return dateA.getTime() - dateB.getTime();
  });

  if (staleApps.length === 0) return null;

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-warning">
          <Clock className="size-5" />
          <CardTitle>Follow-ups needed</CardTitle>
        </div>
        <CardDescription>
          These applications have been sitting without an update for over 7 days. Time to send a polite nudge.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {staleApps.slice(0, 3).map((app) => {
            const date = app.reachedInterviewAt ?? app.reachedAssessmentAt ?? app.dateApplied!;
            return (
              <li key={app.id} className="flex items-center justify-between gap-4 rounded-md border bg-background p-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-foreground">
                    {app.roleTitle} at {app.company}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Stuck in {app.status.toLowerCase()} since {formatDays(date)} ago
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link href={`/applications/${app.id}`}>
                    <ArrowRight className="mr-1.5 size-3.5" />
                    Review
                  </Link>
                </Button>
              </li>
            );
          })}
          {staleApps.length > 3 && (
            <p className="text-xs text-muted-foreground mt-2">
              + {staleApps.length - 3} more. Check your <Link href="/applications" className="underline">Applications board</Link>.
            </p>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
