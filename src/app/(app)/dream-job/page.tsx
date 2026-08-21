import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, ArrowRight, Clock } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { IconDream } from "@/components/icons";
import { DreamJobForm } from "@/components/dream-job/dream-job-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { listDreamJobsByUserId } from "@/lib/db/dream-jobs";
import { getDreamJobAnalysisByDreamJobId } from "@/lib/db/dream-job-analyses";

export const metadata: Metadata = { title: "Dream Job" };

function readinessColor(score: number): string {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

export default async function DreamJobPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dreamJobs = await listDreamJobsByUserId(user.id);
  const analyses = await Promise.all(
    dreamJobs.map(async (dj) => (dj.status === "PARSED" ? getDreamJobAnalysisByDreamJobId(dj.id) : null)),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="How close are you to your dream job?"
        description="Paste a posting for the role you're ultimately aiming for. Workly compares it against your career profile and shows exactly what's already there, what's missing, and the highest-impact next step to close the gap."
      />

      <SectionTabs section="career" />

      <Card>
        <CardHeader>
          <CardTitle>New dream job analysis</CardTitle>
          <CardDescription>
            Your readiness score is the same trusted Candidate Fit calculation used everywhere else: never a hiring
            probability. Every gap and suggestion traces back to your profile or the posting text; nothing is
            invented.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DreamJobForm />
        </CardContent>
      </Card>

      {dreamJobs.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Past analyses</h2>
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {dreamJobs.map((dreamJob, i) => {
              const analysis = analyses[i];
              return (
                <Link
                  key={dreamJob.id}
                  href={`/dream-job/${dreamJob.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <Sparkles className="size-4 text-muted-foreground" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {dreamJob.title ?? dreamJob.dreamRole}
                        {dreamJob.company ? ` · ${dreamJob.company}` : ""}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        {dreamJob.status === "PARSING" && (
                          <>
                            <Clock className="size-3" /> Still processing
                          </>
                        )}
                        {dreamJob.status === "FAILED" && "Parsing failed"}
                        {dreamJob.status === "PARSED" && new Date(dreamJob.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {analysis && (
                      <>
                        <span className={`text-sm font-medium ${readinessColor(analysis.readinessScore)}`}>
                          {analysis.readinessScore}/100
                        </span>
                        <Badge variant="outline">Readiness</Badge>
                      </>
                    )}
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
