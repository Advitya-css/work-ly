import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { IconProfile } from "@/components/icons";
import { CareerProfileForm } from "@/components/career/career-profile-form";
import { ResumeCard } from "@/components/career/resume-card";
import { CareerReadinessHeader } from "@/components/career/career-readiness-header";
import { ExperienceSection } from "@/components/career/sections/experience-section";
import { EducationSection } from "@/components/career/sections/education-section";
import { ProjectSection } from "@/components/career/sections/project-section";
import { SkillSection } from "@/components/career/sections/skill-section";
import { ValuesSection } from "@/components/career/sections/values-section";
import { AchievementSection } from "@/components/career/sections/achievement-section";
import { CertificationSection } from "@/components/career/sections/certification-section";
import { getCurrentUser } from "@/lib/auth";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { listCareerGoalsByUserId } from "@/lib/db/career-goals";
import { calculateCareerReadiness, calculateProfileCompleteness } from "@/lib/career/completeness";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { ShareProfileButton } from "@/components/career/share-profile-button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { Lock } from "lucide-react";

export const metadata: Metadata = { title: "Career Profile" };

export default async function CareerProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [full, careerGoals] = await Promise.all([
    getFullCareerProfile(user.id),
    listCareerGoalsByUserId(user.id),
  ]);

  const completeness = calculateProfileCompleteness(full, careerGoals);
  const readiness = calculateCareerReadiness(completeness);

  return (
    <div className="flex flex-col gap-6">
      
      <PageHeader
        title="Career Profile"
        description="The single source of truth Work-ly uses to understand where you stand today."
        action={
          <div className="flex items-center gap-2">
            {!user.isPro ? (
              <UpgradeModal title="Unlock Career Pivot" description="Get a tailored AI strategy to transition your career, map your competencies, and generate a superpower pitch.">
                <Button variant="outline" size="sm" className="border-purple-500/30 bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">
                  <Lock className="mr-2 size-3.5" />
                  Pivot Career (Pro)
                </Button>
              </UpgradeModal>
            ) : (
              <Button asChild variant="outline" size="sm" className="border-purple-500/30 bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">
                <Link href="/career-pivot">
                  <Sparkles className="mr-2 size-3.5" />
                  Pivot Career
                </Link>
              </Button>
            )}
            {full.profile ? (
              <ShareProfileButton profileId={full.profile.id} initialIsPublic={Boolean(full.profile.isPublic)} />
            ) : null}
          </div>
        }
      />

      <SectionTabs section="career" />

      <CareerReadinessHeader completeness={completeness} readiness={readiness} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <CareerProfileForm profile={full.profile} />
          <ExperienceSection experiences={full.experiences} />
          <EducationSection educations={full.educations} />
          <ProjectSection projects={full.projects} />
          <SkillSection skills={full.skills} />
          <ValuesSection values={full.workValues} />
          <AchievementSection achievements={full.achievements} />
          <CertificationSection certifications={full.certifications} />
        </div>

        <ResumeCard documents={full.documents} />
      </div>
    </div>
  );
}
