import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Radar } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { IconDiscover } from "@/components/icons";
import { DiscoveryBoard, DiscoverySourcesCard } from "@/components/discovery/discovery-board";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/auth";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import { listDiscoveredJobsByUserId, listSourcesByUserId, getLatestRun } from "@/lib/db/discovery";
import { profileSearchText } from "@/lib/discovery/profile-text";
import { buildAlert } from "@/lib/discovery/alerts";
import { SOURCE_KIND_LABEL, SOURCE_STATUS_LABEL } from "@/lib/discovery/labels";
import { embeddingProvider, profileEmbeddingText } from "@/lib/search/embeddings";
import { deriveCandidateSeniority, estimateYearsExperience } from "@/lib/scoring/shared";
import type { SearchContext } from "@/lib/search/engine";

export const metadata: Metadata = { title: "Discover" };

export default async function DiscoverPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, careerGoal, jobs, sources, latestRun] = await Promise.all([
    getFullCareerProfile(user.id),
    getPrimaryCareerGoal(user.id),
    listDiscoveredJobsByUserId(user.id),
    listSourcesByUserId(user.id),
    getLatestRun(user.id),
  ]);

  const profileText = profileSearchText(profile);
  const candidateYears = estimateYearsExperience(profile);

  // The profile vector is the one embedding computed per request. It's the
  // local provider - pure arithmetic over a few hundred tokens, no network,
  // sub-millisecond - and it's a single vector, not one per listing. Job
  // embeddings were all computed during the discovery run and read straight
  // from the database.
  const profileEmbedding = await embeddingProvider.embed(
    profileEmbeddingText({
      headline: profile.profile?.headline ?? null,
      summary: profile.profile?.summary ?? null,
      currentRole: profile.profile?.currentRole ?? null,
      skills: profile.skills.map((skill) => skill.name),
      experienceTitles: profile.experiences.map((experience) => experience.title),
      projectNames: profile.projects.map((project) => project.name),
    }),
  );

  const context: SearchContext = {
    profileText,
    profileEmbedding,
    profileSkills: profile.skills.filter((s) => !s.isTransferable).map((s) => s.name),
    candidateSeniority: deriveCandidateSeniority(candidateYears, careerGoal),
    careerGoal,
  };

  const alert = buildAlert(latestRun, jobs);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Discover"
        description="Opportunities pulled from sources that permit it, scored against your profile, and sorted so the shortlist is obvious."
      />

      <SectionTabs section="jobs" />

      {alert.shouldNotify && (
        <Alert>
          <Radar className="size-4" />
          <AlertDescription>
            <span className="font-medium text-foreground">{alert.headline}</span> {alert.body}
          </AlertDescription>
        </Alert>
      )}

      <DiscoveryBoard jobs={jobs} context={context} />

      <DiscoverySourcesCard
        sources={sources.map((source) => ({
          id: source.id,
          name: source.name,
          kind: SOURCE_KIND_LABEL[source.kind],
          status: SOURCE_STATUS_LABEL[source.status],
          legalBasis: source.legalBasis,
          lastRunFoundCount: source.lastRunFoundCount,
        }))}
      />
    </div>
  );
}
