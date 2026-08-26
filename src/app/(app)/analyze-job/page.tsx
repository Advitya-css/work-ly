import type { Metadata } from "next";
import Link from "next/link";
import { ScanSearch, ArrowRight, Clock, Compass } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { IconAnalyze } from "@/components/icons";
import { JobInputForm } from "@/components/jobs/job-input-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { listJobsByUserId } from "@/lib/db/jobs";
import { getOpportunityByJobId } from "@/lib/db/opportunities";
import { RECOMMENDATION_LABEL, RECOMMENDATION_VARIANT } from "@/lib/jobs/labels";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Analyze a Job" };

export default async function AnalyzeJobPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const jobs = await listJobsByUserId(user.id);
  const opportunities = await Promise.all(
    jobs.map(async (job) => (job.status === "PARSED" ? getOpportunityByJobId(job.id) : null)),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analyze a Job"
        description="Paste a job description or its public URL. Workly compares it against your career profile and tells you how you stack up."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/opportunities">
              <Compass />
              View all opportunities
            </Link>
          </Button>
        }
      />

      <SectionTabs section="jobs" />

      <Card>
        <CardHeader>
          <CardTitle>New analysis</CardTitle>
          <CardDescription>
            Never invented: every requirement and gap traces back to your profile or the posting text. Every job you
            analyze here is automatically tracked as an opportunity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobInputForm />
        </CardContent>
      </Card>

      {jobs.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Recent analyses</h2>
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {jobs.map((job, i) => {
              const opportunity = opportunities[i];
              return (
                <Link
                  key={job.id}
                  href={opportunity ? `/opportunities/${opportunity.id}` : "#"}
                  aria-disabled={!opportunity}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-secondary/50 aria-disabled:pointer-events-none aria-disabled:opacity-60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <ScanSearch className="size-4 text-muted-foreground" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {job.title ?? "Untitled role"}
                        {job.company ? ` · ${job.company}` : ""}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        {job.status === "PARSING" && (
                          <>
                            <Clock className="size-3" /> Still processing
                          </>
                        )}
                        {job.status === "FAILED" && "Parsing failed"}
                        {job.status === "PARSED" && new Date(job.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {opportunity && (
                      <>
                        {opportunity.competitiveness !== "Insufficient data" ? (
                          <span className="text-sm font-medium text-foreground">{opportunity.fitScore}/100</span>
                        ) : (
                          <Badge variant="outline">Not enough info to score</Badge>
                        )}
                        <Badge variant={RECOMMENDATION_VARIANT[opportunity.recommendation]}>
                          {RECOMMENDATION_LABEL[opportunity.recommendation]}
                        </Badge>
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
