import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bookmark, Radar } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { IconDiscover } from "@/components/icons";
import { DiscoveryBoard, DiscoverySourcesCard } from "@/components/discovery/discovery-board";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/auth";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import { matchesLocationPreference } from "@/lib/jobs/location-match";
import { listDiscoveredJobsByUserId, listSourcesByUserId, getLatestRun } from "@/lib/db/discovery";
import { profileSearchText } from "@/lib/discovery/profile-text";
import { buildAlert } from "@/lib/discovery/alerts";
import { isStale } from "@/lib/discovery/sort";
import { buildMarketRadar } from "@/lib/discovery/market-radar";
import { MarketRadarCard } from "@/components/discovery/market-radar-card";
import { PersonalizeMatches } from "@/components/discovery/personalize-matches";
import { unscreenedTopCount } from "@/lib/discovery/deep-screen";
import { SOURCE_KIND_LABEL, SOURCE_STATUS_LABEL, sourceErrorHint } from "@/lib/discovery/labels";
import { embeddingProvider, profileEmbeddingText } from "@/lib/search/embeddings";
import { deriveCandidateSeniority, estimateYearsExperience } from "@/lib/scoring/shared";
import type { SearchContext } from "@/lib/search/engine";

export const metadata: Metadata = { title: "Discover" };
// Discovery runs (a server action on this page) fetch every source and then
// run the grounded AI screen on the best candidates - give them room.
// Several AI calls in a row (parse, then screen) can pass 60s when the model is busy.
export const maxDuration = 180;

export default async function DiscoverPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, careerGoal, rawJobs, sources, latestRun] = await Promise.all([
    getFullCareerProfile(user.id),
    getPrimaryCareerGoal(user.id),
    listDiscoveredJobsByUserId(user.id),
    listSourcesByUserId(user.id),
    getLatestRun(user.id),
  ]);

  const jobs = rawJobs.filter(job => {
    // Old listings are almost always filled or zombie reposts. They stay in
    // the database (and come back if a source re-lists them with a fresh
    // date) but are not shown as opportunities.
    if (isStale(job)) return false;
    // Strict part-time filtering
    if (profile.profile?.isPartTimeMode && job.employmentType === "FULL_TIME") {
      return false;
    }
    // Strict Gig & Musician (Freelance) Mode filtering: this mode means
    // real freelance/contract and gig-economy work, not an ordinary
    // full-time role, so anything the classifier didn't actually read as
    // CONTRACT or FREELANCE is left out rather than shown as if it matched.
    if (
      profile.profile?.isFreelanceMode &&
      job.employmentType !== "CONTRACT" &&
      job.employmentType !== "FREELANCE"
    ) {
      return false;
    }
    return matchesLocationPreference(job.location, job.workMode, {
    homeLocation: profile.profile?.location ?? null,
    preferredLocations: profile.profile?.preferredLocations ?? [],
    openToRemote: profile.profile?.openToRemote ?? true
    });
  });

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
    profileLocation: profile.profile?.location ?? null,
    availability: profile.profile?.availability ?? null,
    profileValues: profile.workValues.map((v) => ({ value: v.value, confidence: v.confidence })),
  };

  const alert = buildAlert(latestRun, jobs);
  const targetRole = careerGoal?.primaryTargetRole ?? careerGoal?.targetRole ?? null;
  const evidenceText = [
    ...profile.experiences.map((e) => `${e.title} ${e.description ?? ""}`),
    ...profile.projects.map((p) => `${p.name} ${p.description ?? ""}`),
    ...profile.achievements.map((a) => `${a.title} ${a.description ?? ""}`),
  ].join("\n");
  const radar = buildMarketRadar({
    jobs: rawJobs,
    skills: profile.skills,
    targetRole,
    otherRoles: careerGoal?.secondaryTargetRoles ?? [],
    evidenceText,
  });

  const pendingScreens = await unscreenedTopCount(user.id, user.isPro ? 15 : 8);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Discover"
        description="Opportunities curated from across the web, automatically scored against your profile."
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

      <PersonalizeMatches key={latestRun?.id ?? "none"} pending={pendingScreens} runKey={latestRun?.id ?? "none"} />

      <DiscoveryBoard jobs={jobs} context={context} />

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bookmark className="size-4 shrink-0" />
        <span>
          Found a job on LinkedIn or Naukri?{" "}
          <Link href="/analyze-job" className="font-medium text-primary underline-offset-4 hover:underline">
            Add the Save to Work-ly button
          </Link>{" "}
          and analyze it in one click.
        </span>
      </p>

      <MarketRadarCard radar={radar} targetRole={targetRole} />

      <DiscoverySourcesCard
        sources={sources.map((source) => ({
          id: source.id,
          name: source.name,
          kind: SOURCE_KIND_LABEL[source.kind],
          status: SOURCE_STATUS_LABEL[source.status],
          legalBasis: source.legalBasis,
          lastRunFoundCount: source.lastRunFoundCount,
          errorHint: source.status === "ERROR" || source.status === "NEEDS_CREDENTIALS" ? sourceErrorHint(source.errorMessage) : null,
        }))}
      />
    </div>
  );
}
