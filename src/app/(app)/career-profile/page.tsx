import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
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
        title="My career"
        description="Everything Work-ly knows about you. Matches and resumes are built from this."
        action={
          <div className="flex items-center gap-2">
            {!user.isPro ? (
              <UpgradeModal title="Unlock Career Pivot" description="Get a tailored AI strategy to transition your career, map your competencies, and generate a superpower pitch.">
                <Button variant="outline" size="sm">
                  <Lock className="size-3.5" />
                  Plan a career change
                </Button>
              </UpgradeModal>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href="/career-pivot">
                  <Sparkles className="size-3.5" />
                  Plan a career change
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

      <CareerReadinessHeader
        completeness={completeness}
        readiness={readiness}
        identity={{
          name: user.name ?? null,
          headline: full.profile?.headline ?? null,
          role: full.profile?.currentRole ?? null,
          company: full.profile?.currentCompany ?? null,
          location: full.profile?.location ?? null,
          years: full.profile?.yearsExperience ?? null,
        }}
      />

      <CareerProfileForm profile={full.profile} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <ExperienceSection experiences={full.experiences} />
          <ProjectSection projects={full.projects} />
          <AchievementSection achievements={full.achievements} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <ResumeCard documents={full.documents} />
          <SkillSection skills={full.skills} />
          <EducationSection educations={full.educations} />
          <CertificationSection certifications={full.certifications} />
          <ValuesSection values={full.workValues} />
        </div>
      </div>
    </div>
  );
}
