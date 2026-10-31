import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SendHorizonal } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { RobotTip } from "@/components/tour/robot-tip";
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
        description="What you've applied to and what happened."
        action={<NewApplicationDialog />}
      />

      {applications.length === 0 ? (
        <EmptyState
          botImage={true}
          title="No applications tracked yet"
          description="Jobs you mark as applied show up here. You can also log ones you applied to elsewhere."
          action={{ label: "Browse opportunities", href: "/opportunities" }}
        />
      ) : (
        <>
          <RobotTip id="applications" title="Everything you've applied to, by stage">
            Move a card when something happens. The right help opens up as it moves: a follow-up after a week with no
            reply, mock interviews at the interview stage, a counter-offer when there&apos;s an offer.
          </RobotTip>
          <AnalyticsPanel summary={summary} insights={insights} />
          <ApplicationsBoard applications={applications} university={profile?.university ?? null} isFreelanceMode={profile?.isFreelanceMode ?? false} />
        </>
      )}
    </div>
  );
}
