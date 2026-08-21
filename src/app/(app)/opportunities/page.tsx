import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { IllustrationNoResults } from "@/components/shared/empty-illustration";
import { OpportunitiesBoard } from "@/components/opportunities/opportunities-board";
import { SeedDemoButton } from "@/components/opportunities/seed-demo-button";
import { getCurrentUser } from "@/lib/auth";
import { listOpportunitiesWithJobByUserId } from "@/lib/opportunities/get-with-job";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [opportunities, profile] = await Promise.all([
    listOpportunitiesWithJobByUserId(user.id),
    getCareerProfileByUserId(user.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Jobs"
        description="Everything you have analyzed, ordered by what is actually worth your time."
      />

      <SectionTabs section="jobs" />

      {opportunities.length === 0 ? (
        <div className="flex flex-col items-center gap-4">
          <EmptyState
            illustration={IllustrationNoResults}
            title="No opportunities yet"
            description="Analyze a real job posting, or load a set of fictional ones to see how prioritization works."
            action={{ label: "Analyze a job", href: "/analyze-job" }}
            className="w-full"
          />
          <SeedDemoButton />
        </div>
      ) : (
        <OpportunitiesBoard
          opportunities={opportunities}
          locationPreference={{
            homeLocation: profile?.location ?? null,
            preferredLocations: profile?.preferredLocations ?? [],
            openToRemote: profile?.openToRemote ?? true,
          }}
        />
      )}
    </div>
  );
}
