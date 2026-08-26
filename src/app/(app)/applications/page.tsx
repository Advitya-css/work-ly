import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SendHorizonal } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { IconApplication } from "@/components/icons";
import { EmptyState } from "@/components/shared/empty-state";
import { ApplicationsBoard } from "@/components/applications/applications-board";
import { AnalyticsPanel } from "@/components/applications/analytics-panel";
import { NewApplicationDialog } from "@/components/applications/new-application-dialog";
import { getCurrentUser } from "@/lib/auth";
import { listApplicationsByUserId } from "@/lib/db/applications";
import { summarize } from "@/lib/applications/analytics";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { buildInsights } from "@/lib/applications/insights";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  const profile = user ? await getCareerProfileByUserId(user.id) : null;
  if (!user) redirect("/login");

  const applications = await listApplicationsByUserId(user.id);
  const summary = summarize(applications);
  const insights = buildInsights(applications);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={IconApplication}
        title="Applications"
        description="Track what you've applied to, what happened, and what that tells you."
        action={<NewApplicationDialog />}
      />

      {applications.length === 0 ? (
        <EmptyState
          icon={SendHorizonal}
          title="No applications tracked yet"
          description="Mark an opportunity as applied and it'll appear here automatically, or log a role you applied to elsewhere. Outcomes feed back into what Workly can tell you about your search."
          action={{ label: "Browse opportunities", href: "/opportunities" }}
        />
      ) : (
        <>
          <AnalyticsPanel summary={summary} insights={insights} />
          <ApplicationsBoard applications={applications} university={profile?.university ?? null} isFreelanceMode={profile?.isFreelanceMode ?? false} />
        </>
      )}
    </div>
  );
}
