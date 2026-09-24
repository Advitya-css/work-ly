import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ResumeBuilder } from "@/components/resume/resume-builder";
import { getCurrentUser } from "@/lib/auth";
import { getOpportunityWithJobById } from "@/lib/opportunities/get-with-job";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";

export const metadata: Metadata = { title: "Tailored Resume" };
// Building the resume is one model call; give it room.
export const maxDuration = 60;

export default async function TailoredResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const opportunity = await getOpportunityWithJobById(user.id, id);
  if (!opportunity || opportunity.userId !== user.id) notFound();

  const job = opportunity.job;
  const back = (
    <Button asChild variant="ghost" size="sm" className="w-fit text-muted-foreground print:hidden">
      <Link href={`/opportunities/${opportunity.id}`}>
        <ArrowLeft />
        Back to opportunity
      </Link>
    </Button>
  );

  if (!user.isPro) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <EmptyState
          icon={Lock}
          title="Tailored resumes are a Pro feature"
          description="Get an apply-ready resume for this job, rewritten from your real experience, in about a minute."
          action={{ label: "Upgrade to Pro", href: "/settings" }}
        />
      </div>
    );
  }

  const profile = await getFullCareerProfile(user.id);

  return (
    <div className="flex flex-col gap-6">
      {back}
      <div className="print:hidden">
        <PageHeader
          title="Tailored resume"
          description={`For ${job.title ?? "this role"}${job.company ? ` at ${job.company}` : ""}. Built only from facts on your profile.`}
        />
      </div>
      <ResumeBuilder
        opportunityId={opportunity.id}
        candidate={{
          name: user.name ?? "",
          email: user.email,
          location: profile.profile?.location ?? null,
          headline: profile.profile?.headline ?? profile.profile?.currentRole ?? null,
        }}
        jobLabel={`${job.title ?? "Role"}${job.company ? ` - ${job.company}` : ""}`}
      />
    </div>
  );
}
